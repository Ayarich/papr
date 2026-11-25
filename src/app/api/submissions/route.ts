import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { one, run, newId, nowIso, type Submission } from "@/lib/db";
import { receivePdf, storePdf, UploadError, type IncomingPdf } from "@/lib/storage";
import { validateAll, type DraftData } from "@/lib/validate";
import { nextRef, saveAuthors, addEvent, notifyAfterSubmit, authorList } from "@/lib/submissions";
import { pdfText } from "@/lib/decks";
import { indexVersion } from "@/lib/plagiarism";
import { activeCampaign } from "@/lib/campaigns";
import { notify } from "@/lib/notify";
import { collectionFor } from "@/app/collections/actions";
import { logActivity } from "@/lib/activity";

// Creates a new submission (version 1) from the form + PDF.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Your login has expired. Log in again; your draft is saved." }, { status: 401 });
  if (user.role !== "student" && user.role !== "lecturer") return NextResponse.json({ error: "Publishing needs a university account. Log in with your email ending in .edu.gh." }, { status: 403 });

  const form = await req.formData();
  let d: DraftData;
  try { d = JSON.parse(String(form.get("data"))); } catch { return NextResponse.json({ error: "The form data was incomplete." }, { status: 400 }); }
  let file: IncomingPdf | null;
  try { file = await receivePdf(form.get("pdf"), "papers"); } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ errors: { file: e.message } }, { status: 400 });
    throw e;
  }

  const errors = validateAll(d, !!file);
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 400 });

  const saved = await storePdf(file!);

  // Remember the student's details for next time
  await run("UPDATE users SET name = ?, institution = ?, programme = ?, level = ? WHERE id = ?", [d.name.trim(), d.institution, d.programme.trim(), d.level, user.id]);

  // Text for the plagiarism index (empty for scanned PDFs)
  let text = "";
  try { text = await pdfText(file!.bytes.slice()); } catch { text = ""; }
  const slug = String(form.get("collection") || "");
  const coll = slug ? await collectionFor(slug) : null;
  const camp = await activeCampaign();

  const id = newId();
  const ref = await nextRef();
  const now = nowIso();
  const keywords = d.keywords.join(", ");
  await run(
    `INSERT INTO submissions (id, ref, status, owner_id, title, abstract, keywords, authors_text, field, type, year, institution, programme,
      current_version, supervisor_name, supervisor_email, created_at, updated_at, collection_id, campaign_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?)`,
    [id, ref, "pending", user.id, d.title.trim(), d.abstract.trim(), keywords, authorList(d).join(", "), d.field, d.type, d.year,
      d.institution, d.programme.trim(), d.supName.trim(), d.supEmail.trim(), now, now, coll?.id || null, camp?.id || null]
  );
  const vid = newId();
  await run(
    "INSERT INTO versions (id, submission_id, number, title, abstract, keywords, pdf_path, pdf_name, pdf_size, declarations, created_at, text) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    [vid, id, 1, d.title.trim(), d.abstract.trim(), keywords, saved.pdfPath, saved.pdfName, saved.pdfSize, JSON.stringify({ ...d.decl, at: now }), now, text]
  );
  await indexVersion(vid, text || `${d.title} ${d.abstract}`);
  await saveAuthors(id, d);
  await addEvent(id, "Submitted for moderation (version 1)");

  const sub = (await one<Submission>("SELECT * FROM submissions WHERE id = ?", [id]))!;
  await notifyAfterSubmit(sub, user.email, d, false);
  if (coll) await notify(coll.owner_id, { kind: "collection", text: `📥 ${d.name} uploaded to “${coll.title}”`, link: `/collections/${coll.id}`, group: `coll-${coll.id}` });
  await logActivity("submit", ref, user.id);
  return NextResponse.json({ ok: true, ref, id });
}

// Allow time for reading big PDFs on Vercel.
export const maxDuration = 60;
