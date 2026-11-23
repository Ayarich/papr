import { requireModerator } from "@/lib/auth";
import { one } from "@/lib/db";
import AdminNav from "../AdminNav";
import { runDigest } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weekly digest" };

export default async function Digest({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  await requireModerator();
  const { sent } = await searchParams;
  const followers = (await one<{ n: number }>("SELECT COUNT(DISTINCT user_id) AS n FROM follows"))?.n || 0;
  return (
    <div className="stack" style={{ gap: 24 }}>
      <AdminNav active="digest" />
      <div><h1>Weekly digest</h1><p className="muted" style={{ marginTop: 8, maxWidth: "62ch" }}>Each person gets one email listing the past week&apos;s new papers in the fields, institutions and authors they follow, e.g. <i>&ldquo;4 new papers in Earth Sciences this week&rdquo;</i>. People with nothing new get nothing.</p></div>
      {sent !== undefined && <div className="notice ok">Sent {sent} digest email{sent === "1" ? "" : "s"}. See them in the <a href="/dev/outbox">email outbox</a>.</div>}
      <div className="card stack">
        <p><b className="num">{followers}</b> {followers === 1 ? "person follows" : "people follow"} something.</p>
        <form action={runDigest}><button className="btn primary" type="submit">Send this week&apos;s digest now</button></form>
        <p className="small muted">On a live server, schedule this weekly (e.g. Monday 8am) with a cron job that calls the same function. WhatsApp delivery needs a WhatsApp Business API account; the message text is ready to reuse.</p>
      </div>
    </div>
  );
}
