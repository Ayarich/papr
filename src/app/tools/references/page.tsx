import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import ReferencesTool from "@/components/tools/ReferencesTool";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reference checker" };

export default async function Page() {
  const user = await requireUser("/tools/references");
  const papers = await all<{ id: string; title: string; ref: string }>("SELECT id, title, ref FROM submissions WHERE owner_id = ? ORDER BY updated_at DESC", [user.id]);
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div><Link href="/tools" className="small muted">← All tools</Link><h1 style={{ marginTop: 8 }}>Reference checker</h1><p className="muted" style={{ marginTop: 8, maxWidth: "60ch" }}>Finds citations missing from your reference list (and the other way round), then formats everything to APA 7.</p></div>
      <ReferencesTool papers={papers} />
    </div>
  );
}
