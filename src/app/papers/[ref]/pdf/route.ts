import { getUser, isModerator } from "@/lib/auth";
import { one, run, type Submission, type Version } from "@/lib/db";
import { readPdf } from "@/lib/storage";
import { recordRead, countryFrom } from "@/lib/notify";

// Serves the PDF. Anyone can download a published paper (this counts as a download).
// The owner and moderators can also open papers that are still in review.
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const p = await one<Submission>("SELECT * FROM submissions WHERE ref = ?", [ref]);
  if (!p) return new Response("Not found", { status: 404 });

  const isPublic = p.status === "published";
  const user = await getUser();
  if (!isPublic) {
    const collOwner = p.collection_id ? await one<{ owner_id: string }>("SELECT owner_id FROM collections WHERE id = ?", [p.collection_id]) : null;
    const allowed = user && (isModerator(user) || user.id === p.owner_id || user.id === collOwner?.owner_id) && p.status !== "withdrawn";
    if (!allowed) return new Response("This PDF isn't available.", { status: 403 });
  }
  const v = await one<Version>("SELECT * FROM versions WHERE submission_id = ? AND number = ?", [p.id, p.current_version]);
  const file = v && (await readPdf(v.pdf_path));
  if (!v || !file) return new Response("File missing", { status: 404 });
  if (isPublic) {
    await run("UPDATE submissions SET downloads = downloads + 1 WHERE id = ?", [p.id]);
    await recordRead(p, "download", user ? { id: user.id, institution: user.institution } : null, countryFrom(req));
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${p.ref}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
