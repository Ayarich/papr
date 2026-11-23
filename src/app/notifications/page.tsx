import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all, run, nowIso } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const user = await requireUser("/notifications");
  const items = await all<{ id: string; text: string; link: string | null; read_at: string | null; created_at: string }>(
    "SELECT id, text, link, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", [user.id]);
  await run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", [nowIso(), user.id]);
  return (
    <div className="narrow stack" style={{ gap: 18, maxWidth: 720 }}>
      <h1>Notifications</h1>
      {items.length === 0 ? <div className="card empty">Nothing yet. When people read, download or save ideas from your work, you&apos;ll see it here.</div> : (
        <div className="card" style={{ padding: 0 }}>
          {items.map((n) => {
            const inner = <><span className="grow">{n.text}</span><time className="small muted">{fmtDate(n.created_at)}</time></>;
            return n.link ? <Link key={n.id} href={n.link} className={`notif${n.read_at ? "" : " unread"}`}>{inner}</Link> : <div key={n.id} className={`notif${n.read_at ? "" : " unread"}`}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
