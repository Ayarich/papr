import { NextResponse } from "next/server";
import { getUser, isModerator, newToken } from "@/lib/auth";
import { one, run, newId, nowIso } from "@/lib/db";
import { parseCsv } from "@/lib/csv";
import { FIELDS, TYPES, INSTITUTIONS } from "@/lib/constants";
import { receivePdf, storePdf, UploadError } from "@/lib/storage";
import { pdfText } from "@/lib/decks";
import { splitSections, sentences } from "@/lib/deck";
import { indexVersion } from "@/lib/plagiarism";
import { nextRef, addEvent } from "@/lib/submissions";
import { sendEmail, APP_URL } from "@/lib/mail";
import { buildIdeas } from "@/lib/indexer";

const DOI_PREFIX = process.env.DOI_PREFIX || "10.99999";

/** The account that holds imported papers until their authors claim them. */
async function unclaimedOwner() {
  const u = await one<{ id: string }>("SELECT id FROM users WHERE email = 'unclaimed@papr.local'");
  if (u) return u.id;
  const id = newId();
  await run("INSERT INTO users (id, email, name, role, created_at) VALUES (?,?,?,?,?)", [id, "unclaimed@papr.local", "Awaiting claim", "system", nowIso()]);
  return id;
}

// Bulk-imports past projects from a department (CSV + PDFs), publishes them and emails each author a claim link.
export async function POST(req: Request) {
  const user = await getUser();
  if (!isModerator(user)) return NextResponse.json({ error: "Moderators only." }, { status: 403 });
  const form = await req.formData();
  const csv = form.get("csv");
  if (!(csv instanceof File)) return NextResponse.json({ error: "Choose the CSV file." }, { status: 400 });
  const rows = parseCsv(await csv.text());
  if (!rows.length) return NextResponse.json({ error: "The CSV has no rows." }, { status: 400 });
  // PDFs arrive as files (on your computer) or as Blob references (on Vercel); index them by file name.
  const pdfs = new Map<string, FormDataEntryValue>();
  for (const f of form.getAll("pdfs")) {
    if (f instanceof File) { if (f.size) pdfs.set(f.name.toLowerCase(), f); continue; }
    try { const name = String(JSON.parse(f).name || ""); if (name) pdfs.set(name.toLowerCase(), f); } catch { /* skip */ }
  }

  const owner = await unclaimedOwner();
  const results: { row: number; ok: boolean; message: string; ref?: string }[] = [];
  for (const [i, r] of rows.entries()) {
    const n = i + 2; // spreadsheet row number (row 1 = headings)
    const missing = ["title", "authors", "author_email", "year", "field", "pdf_file"].filter((k) => !r[k]);
    if (missing.length) { results.push({ row: n, ok: false, message: `Missing: ${missing.join(", ")}` }); continue; }
    const field = FIELDS.find((f) => f.toLowerCase() === r.field.toLowerCase());
    if (!field) { results.push({ row: n, ok: false, message: `Unknown field "${r.field}". Use one of: ${FIELDS.join("; ")}` }); continue; }
    const file = pdfs.get(r.pdf_file.toLowerCase());
    if (!file) { results.push({ row: n, ok: false, message: `PDF "${r.pdf_file}" wasn't uploaded` }); continue; }
    if (await one("SELECT 1 FROM submissions WHERE lower(title) = lower(?) AND year = ?", [r.title, r.year])) {
      results.push({ row: n, ok: false, message: "Already on papr (same title and year)" }); continue;
    }
    let saved, incoming;
    try {
      incoming = await receivePdf(file, "papers");
      if (!incoming) throw new UploadError("The PDF is empty.");
      saved = await storePdf(incoming);
    } catch (e) { results.push({ row: n, ok: false, message: e instanceof UploadError ? e.message : "Couldn't save the PDF" }); continue; }
    let text = "";
    try { text = await pdfText(incoming.bytes.slice()); } catch { text = ""; }
    const abstract = r.abstract || splitSections(text).merged.get("abstract")?.text || sentences(text).slice(0, 5).join(" ") || r.title;
    const institution = INSTITUTIONS.find((x) => x.toLowerCase().includes((r.institution || "").toLowerCase()) && r.institution) || r.institution || "Other institution";
    const id = newId(), ref = await nextRef(), now = nowIso(), token = newToken();
    const authors = r.authors.split(/;|,(?=\s*[A-Z])/).map((a) => a.trim()).filter(Boolean).join(", ");
    await run(
      `INSERT INTO submissions (id, ref, status, owner_id, title, abstract, keywords, authors_text, field, type, year, institution, programme,
        current_version, supervisor_name, supervisor_email, doi, published_at, created_at, updated_at, imported, claim_email, claim_token)
       VALUES (?,?,'published',?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,?,?)`,
      [id, ref, owner, r.title, abstract.slice(0, 4000), r.keywords || "", authors, field, TYPES.find((t) => t.toLowerCase() === (r.type || "").toLowerCase()) || "Final-year project",
        r.year, institution, r.programme || "", r.supervisor || "", "", `${DOI_PREFIX}/papr.${ref.split("-")[1]}.${ref.split("-")[2]}`, now, now, now, r.author_email.toLowerCase(), token]);
    const vid = newId();
    await run("INSERT INTO versions (id, submission_id, number, title, abstract, keywords, pdf_path, pdf_name, pdf_size, declarations, created_at, text) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [vid, id, 1, r.title, abstract.slice(0, 4000), r.keywords || "", saved.pdfPath, saved.pdfName, saved.pdfSize, JSON.stringify({ imported_by: user!.email, at: now }), now, text]);
    for (const [j, a] of authors.split(", ").entries()) await run("INSERT INTO authors (id, submission_id, name, position) VALUES (?,?,?,?)", [newId(), id, a, j]);
    await indexVersion(vid, text || `${r.title} ${abstract}`);
    await buildIdeas({ id, abstract, field, current_version: 1 });
    await addEvent(id, `Imported by ${user!.name || "a moderator"} from the department library`);
    await sendEmail(r.author_email, `Your ${r.year} project is on papr. Claim it.`,
      `Hi ${authors.split(", ")[0]},\n\nYour ${r.year} project "${r.title}" has been added to papr, Ghana's open library of student research, by your department.\n\nClaim it to put it on your profile, see who reads it, and get notified when people download it:\n${APP_URL}/claim/${token}\n\nYou can log in with any email address (your old student email isn't needed).`);
    results.push({ row: n, ok: true, message: `Imported and claim email sent to ${r.author_email}`, ref });
  }
  return NextResponse.json({ ok: true, imported: results.filter((x) => x.ok).length, results });
}

// Importing a whole department can take a few minutes.
export const maxDuration = 300;
