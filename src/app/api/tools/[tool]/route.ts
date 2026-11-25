import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { one, type Submission, type Version } from "@/lib/db";
import { receivePdf, discardPdf, UploadError } from "@/lib/storage";
import { pdfText } from "@/lib/decks";
import { versionText, ensureIndexed } from "@/lib/indexer";
import { checkReferences } from "@/lib/references";
import { checkAbstract, findAbstract } from "@/lib/abstract";
import { checkText } from "@/lib/plagiarism";
import { externalCheck, providerName } from "@/lib/plagiarism-providers";
import { defenceQuestions } from "@/lib/defence";
import { posterContent } from "@/lib/poster-content";
import { APP_URL } from "@/lib/mail";
import { logActivity } from "@/lib/activity";

const TOOLS = ["references", "precheck", "poster", "defence"];

// Runs one of the student tools on an uploaded PDF or one of the student's papers.
// Uploaded PDFs are only read; they are never stored or added to the plagiarism index.
export async function POST(req: Request, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  if (!TOOLS.includes(tool)) return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Log in to use the tools. It's free." }, { status: 401 });

  const form = await req.formData();
  const submissionId = String(form.get("submissionId") || "");
  const file = form.get("pdf");
  let text = "", sub: Submission | null = null;
  if (submissionId) {
    sub = await one<Submission>("SELECT * FROM submissions WHERE id = ? AND owner_id = ?", [submissionId, user.id]);
    if (!sub) return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    const v = await one<Version>("SELECT * FROM versions WHERE submission_id = ? AND number = ?", [sub.id, sub.current_version]);
    text = v ? await versionText(v) : "";
  } else if (file) {
    let pdf;
    try { pdf = await receivePdf(file, "tmp"); } catch (e) {
      if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }
    if (!pdf) return NextResponse.json({ error: "Choose a PDF or one of your papers." }, { status: 400 });
    await discardPdf(pdf); // read once, never kept
    try { text = await pdfText(pdf.bytes); } catch { text = ""; }
  } else {
    return NextResponse.json({ error: "Choose a PDF or one of your papers." }, { status: 400 });
  }
  if (text.replace(/\s/g, "").length < 200 && !sub?.abstract) {
    return NextResponse.json({ error: "We couldn't read any text in this PDF. It may be a scanned image. Export it from Word or Google Docs as PDF and try again." }, { status: 400 });
  }
  const meta = {
    title: sub?.title, authors: sub?.authors_text || user.name, institution: sub?.institution || user.institution || "",
    supervisor: sub?.supervisor_name, year: sub?.year, abstract: sub?.abstract,
    link: sub?.status === "published" ? `${APP_URL}/papers/${sub.ref}` : null,
  };
  const base = { fromPaper: !!sub, published: sub?.status === "published" };

  await logActivity("tool", tool, user?.id);
  if (tool === "references") return NextResponse.json({ ...base, report: checkReferences(text) });
  if (tool === "defence") return NextResponse.json({ ...base, questions: defenceQuestions(text, { title: sub?.title }) });
  if (tool === "poster") return NextResponse.json({ ...base, poster: posterContent(text, meta) });

  // precheck: plagiarism against papr's library + abstract polisher
  await ensureIndexed(100);
  const report = await checkText(text || sub?.abstract || "", { excludeSubmissionId: sub?.id });
  report.text = report.text.slice(0, 60000);
  report.spans = report.spans.filter((s) => s.end <= 60000);
  const abstract = checkAbstract(sub?.abstract || findAbstract(text));
  const external = await externalCheck(text);
  return NextResponse.json({ ...base, report, abstract, external, provider: providerName() });
}

// Allow time for reading big PDFs on Vercel.
export const maxDuration = 60;
