import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { one, run, newId, nowIso, type Submission, type Version } from "@/lib/db";
import { readPdf, receivePdf, discardPdf, UploadError } from "@/lib/storage";
import { MAX_PDF_BYTES } from "@/lib/constants";
import { buildOutline } from "@/lib/deck";
import { aiOutline } from "@/lib/ai-outline";
import { ensureDecks, pdfText } from "@/lib/decks";
import { APP_URL } from "@/lib/mail";
import { logActivity } from "@/lib/activity";

// Turns a PDF (uploaded now, or one of the student's papr submissions) into a slide deck.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Log in to make slides." }, { status: 401 });
  await ensureDecks();

  const today = new Date(Date.now() - 86400000).toISOString();
  const made = await one<{ n: number }>("SELECT COUNT(*) AS n FROM decks WHERE owner_id = ? AND created_at > ?", [user.id, today]);
  if ((made?.n || 0) >= 20) return NextResponse.json({ error: "You've made 20 decks today. Try again tomorrow." }, { status: 429 });

  const form = await req.formData();
  const submissionId = String(form.get("submissionId") || "");
  const file = form.get("pdf");
  let buf: Uint8Array | null = null;
  let meta: { title?: string; authors?: string; institution?: string; year?: string; abstract?: string; link?: string } = {
    authors: user.name || undefined,
    institution: user.institution || undefined,
  };
  let subId: string | null = null;

  if (submissionId) {
    const sub = await one<Submission>("SELECT * FROM submissions WHERE id = ? AND owner_id = ?", [submissionId, user.id]);
    if (!sub) return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    const v = await one<Version>("SELECT * FROM versions WHERE submission_id = ? AND number = ?", [sub.id, sub.current_version]);
    const b = v && (await readPdf(v.pdf_path));
    if (b) buf = new Uint8Array(b);
    subId = sub.id;
    meta = { title: sub.title, authors: sub.authors_text, institution: sub.institution, year: sub.year, abstract: sub.abstract,
      link: sub.status === "published" ? `${APP_URL.replace(/^https?:\/\//, "")}/papers/${sub.ref}` : undefined };
  } else if (file) {
    try {
      const pdf = await receivePdf(file, "tmp");
      if (pdf) { buf = pdf.bytes; await discardPdf(pdf); }
    } catch (e) {
      if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }
    if (!buf) return NextResponse.json({ error: "Choose a PDF or one of your papers." }, { status: 400 });
  } else {
    return NextResponse.json({ error: "Choose a PDF or one of your papers." }, { status: 400 });
  }

  let text = "";
  try { if (buf) text = await pdfText(buf); } catch { text = ""; }
  if (text.replace(/\s/g, "").length < 200 && !meta.abstract) {
    return NextResponse.json({ error: "We couldn't read any text in this PDF. It may be a scanned image. Export it from Word or Google Docs as PDF and try again." }, { status: 400 });
  }

  const deck = (await aiOutline(text || meta.abstract || "", meta)) || buildOutline(text, meta);
  const id = newId();
  const now = nowIso();
  await run("INSERT INTO decks (id, owner_id, submission_id, title, data, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
    [id, user.id, subId, deck.title.slice(0, 200), JSON.stringify(deck), now, now]);
  await logActivity("deck", deck.title, user.id);
  return NextResponse.json({ ok: true, id });
}

// Allow time for reading big PDFs on Vercel.
export const maxDuration = 60;
