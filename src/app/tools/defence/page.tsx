import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import DefenceTool from "@/components/tools/DefenceTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Defence practice" };

export default async function Page() {
  const user = await requireUser("/tools/defence");
  const papers = await all<{ id: string; title: string; ref: string }>("SELECT id, title, ref FROM submissions WHERE owner_id = ? ORDER BY updated_at DESC", [user.id]);
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div><Link href="/tools" className="small muted">← All tools</Link><h1 style={{ marginTop: 8 }}>Defence practice</h1><p className="muted" style={{ marginTop: 8, maxWidth: "60ch" }}>Likely panel questions built from your own paper. Practise out loud with a 2-minute timer.</p></div>
      <DefenceTool papers={papers} />
    </div>
  );
}
