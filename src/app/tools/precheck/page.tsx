import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import PrecheckTool from "@/components/tools/PrecheckTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pre-check" };

export default async function Page() {
  const user = await requireUser("/tools/precheck");
  const papers = await all<{ id: string; title: string; ref: string }>("SELECT id, title, ref FROM submissions WHERE owner_id = ? ORDER BY updated_at DESC", [user.id]);
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div><Link href="/tools" className="small muted">← All tools</Link><h1 style={{ marginTop: 8 }}>Pre-check</h1><p className="muted" style={{ marginTop: 8, maxWidth: "60ch" }}>See your similarity score and get your abstract polished before your supervisor does. Your draft stays private.</p></div>
      <PrecheckTool papers={papers} />
    </div>
  );
}
