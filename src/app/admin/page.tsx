import Link from "next/link";
import { requireModerator } from "@/lib/auth";
import { one } from "@/lib/db";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireModerator();
  const n = async (sql: string) => (await one<{ n: number }>(sql))?.n || 0;
  const stats = [
    ["Waiting for review", await n("SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'"), "/moderate"],
    ["Published papers", await n("SELECT COUNT(*) AS n FROM submissions WHERE status = 'published'"), "/library"],
    ["Students", await n("SELECT COUNT(*) AS n FROM users WHERE role = 'student'"), "/admin/people"],
    ["Lecturer requests", await n("SELECT COUNT(*) AS n FROM users WHERE lecturer_requested = 1 AND role != 'lecturer'"), "/admin/people"],
    ["Imported, not yet claimed", await n("SELECT COUNT(*) AS n FROM submissions WHERE imported = 1 AND claimed_at IS NULL"), "/admin/import"],
    ["Uploads in the last 7 days", await n(`SELECT COUNT(*) AS n FROM submissions WHERE created_at > '${new Date(Date.now() - 7 * 86400000).toISOString()}'`), "/moderate"],
  ] as const;
  return (
    <div className="stack" style={{ gap: 28 }}>
      <AdminNav active="overview" />
      <h1>Admin</h1>
      <div className="grid g3">{stats.map(([label, v, href]) => <Link key={label} href={href} className="card stat"><b className="num">{v}</b><span>{label}</span></Link>)}</div>
    </div>
  );
}
