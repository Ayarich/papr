import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { one, run, newId, nowIso, type Submission, type Version } from "@/lib/db";
import { receivePdf, storePdf, UploadError, type IncomingPdf } from "@/lib/storage";
import { validateAll, type DraftData } from "@/lib/validate";
import { saveAuthors, addEvent, notifyAfterSubmit, authorList } from "@/lib/submissions";
import { pdfText } from "@/lib/decks";
import { indexVersion } from "@/lib/plagiarism";

// Resubmits after a moderator asked for changes. Saves a new version; old versions are kept.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Your login has expired. Log in again; your draft is saved." }, { status: 401 });
  const sub = await one<Submission>("SELECT * FROM submissions WHERE id = ?", [id]);
  if (!sub || sub.owner_id !== user.id) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  if (sub.status !== "changes") return NextResponse.json({ error: "This submission can't be edited right now." }, { status: 409 });

  const form = await req.formData();
  let d: DraftData;
  try { d = JSON.parse(String(form.get("data"))); } catch { return NextResponse.json({ error: "The form data was incomplete." }, { status: 400 }); }
  let file: IncomingPdf | null;
  try { file = await receivePdf(form.get("pdf"), "papers"); } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ errors: { file: e.message } }, { status: 400 });
    throw e;
  }
  const prev = (await one<Version>("SELECT * FROM versions WHERE submission_id = ? AND number = ?", [id, sub.current_version]))!;

  const errors = validateAll(d, true);
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 400 });

  let fileInfo = { pdfPath: prev.pdf_path, pdfName: prev.pdf_name, pdfSize: prev.pdf_size };
  let text = prev.text || "";
  if (file) {
    try { text = await pdfText(file.bytes.slice()); } catch { text = ""; }
    fileInfo = await storePdf(file);
  }
  const v = sub.current_version + 1;
  const now = nowIso();
  const keywords = d.keywords.join(", ");
  const vid = newId();
  await run(
    "INSERT INTO versions (id, submission_id, number, title, abstract, keywords, pdf_path, pdf_name, pdf_size, declarations, created_at, text) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    [vid, id, v, d.title.trim(), d.abstract.trim(), keywords, fileInfo.pdfPath, fileInfo.pdfName, fileInfo.pdfSize, JSON.stringify({ ...d.decl, at: now }), now, text]
  );
  await indexVersion(vid, text || `${d.title} ${d.abstract}`);
  await run(
    `UPDATE submissions SET status = 'pending', current_version = ?, title = ?, abstract = ?, keywords = ?, authors_text = ?, field = ?, type = ?, year = ?,
       institution = ?, programme = ?, supervisor_name = ?, supervisor_email = ?, updated_at = ? WHERE id = ?`,
    [v, d.title.trim(), d.abstract.trim(), keywords, authorList(d).join(", "), d.field, d.type, d.year, d.institution, d.programme.trim(), d.supName.trim(), d.supEmail.trim(), now, id]
  );
  await saveAuthors(id, d);
  await addEvent(id, `Resubmitted as version ${v}`);
  const updated = (await one<Submission>("SELECT * FROM submissions WHERE id = ?", [id]))!;
  await notifyAfterSubmit(updated, user.email, d, true);
  return NextResponse.json({ ok: true, ref: sub.ref, id });
}

// Allow time for reading big PDFs on Vercel.
export const maxDuration = 60;
