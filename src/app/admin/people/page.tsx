import { requireModerator } from "@/lib/auth";
import { all, type User } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import AdminNav from "../AdminNav";
import { setRole } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "People" };

export default async function People({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireModerator();
  const { q = "" } = await searchParams;
  const users = await all<User>(
    `SELECT * FROM users WHERE role != 'system' AND (? = '' OR email LIKE ? OR name LIKE ?) ORDER BY lecturer_requested DESC, created_at DESC LIMIT 100`, [q, `%${q}%`, `%${q}%`]);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <AdminNav active="people" />
      <h1>People</h1>
      <form className="row" action="/admin/people"><input type="search" name="q" defaultValue={q} placeholder="Search name or email" style={{ maxWidth: 360 }} /><button className="btn" type="submit">Search</button></form>
      <div className="card tblwrap" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Person</th><th>Joined</th><th>Role</th></tr></thead><tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td><b>{u.name || "—"}</b>{u.lecturer_requested && u.role !== "lecturer" ? <span className="pill changes" style={{ marginLeft: 8 }}>Asked for lecturer access</span> : null}<br /><span className="small muted">{u.email}</span></td>
            <td className="small">{fmtDate(u.created_at)}</td>
            <td><form action={setRole} className="row" style={{ gap: 6 }}><input type="hidden" name="id" value={u.id} />
              <select name="role" defaultValue={u.role} style={{ width: "auto", minHeight: 38, padding: "6px 10px" }}>{["student", "reader", "lecturer", "moderator"].map((r) => <option key={r}>{r}</option>)}</select>
              <button className="btn sm" type="submit">Save</button></form></td>
          </tr>
        ))}
      </tbody></table></div>
    </div>
  );
}
