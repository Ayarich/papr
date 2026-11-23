import { notFound } from "next/navigation";
import { all } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email outbox (dev)" };

// Shows every email the app would have sent. Only available while developing.
export default async function Outbox() {
  if (process.env.NODE_ENV === "production") notFound();
  const emails = await all<{ id: string; to: string; subject: string; body: string; created_at: string }>(
    'SELECT id, "to", subject, body, created_at FROM emails ORDER BY created_at DESC LIMIT 100');
  const linkify = (s: string) => s.split(/(https?:\/\/\S+)/g).map((part, i) => /^https?:\/\//.test(part) ? <a key={i} href={part}>{part}</a> : part);
  return (
    <div className="stack narrow">
      <div><h1>Email outbox</h1><p className="muted" style={{ marginTop: 4 }}>Development only. These emails were not really sent. Click links inside them to test, e.g. the supervisor confirmation.</p></div>
      {emails.length === 0 && <div className="card empty">No emails yet.</div>}
      {emails.map((e, i) => (
        <details key={e.id} className="mail" open={i === 0}>
          <summary><b>{e.subject}</b><span className="small muted">To {e.to} · {fmtDate(e.created_at)} {new Date(e.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></summary>
          <pre>{linkify(e.body)}</pre>
        </details>
      ))}
    </div>
  );
}
