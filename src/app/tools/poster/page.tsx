import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import PosterTool from "@/components/tools/PosterTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Poster maker" };

export default async function Page() {
  const user = await requireUser("/tools/poster");
  const papers = await all<{ id: string; title: string; ref: string }>("SELECT id, title, ref FROM submissions WHERE owner_id = ? ORDER BY updated_at DESC", [user.id]);
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div><Link href="/tools" className="small muted">← All tools</Link><h1 style={{ marginTop: 8 }}>Poster maker</h1><p className="muted" style={{ marginTop: 8, maxWidth: "60ch" }}>Turn your paper into an A0 poster for project fairs, with a QR code that links to your full paper.</p></div>
      <PosterTool papers={papers} />
    </div>
  );
}
