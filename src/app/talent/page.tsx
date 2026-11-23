import Link from "next/link";
import { getUser } from "@/lib/auth";
import { all, type User } from "@/lib/db";
import { FIELDS, INSTITUTIONS, shortInst } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Find talent" };

export default async function Talent({ searchParams }: { searchParams: Promise<{ skill?: string; field?: string; inst?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  const where = ["u.open_to_opps = 1", "u.handle IS NOT NULL"], args: string[] = [];
  if (sp.skill) { where.push("(u.skills LIKE ? OR u.headline LIKE ? OR EXISTS (SELECT 1 FROM submissions s WHERE s.owner_id = u.id AND s.status = 'published' AND (s.keywords LIKE ? OR s.title LIKE ?)))"); args.push(...Array(4).fill(`%${sp.skill}%`)); }
  if (sp.field) { where.push("(u.interests LIKE ? OR EXISTS (SELECT 1 FROM submissions s WHERE s.owner_id = u.id AND s.field = ?))"); args.push(`%${sp.field}%`, sp.field); }
  if (sp.inst) { where.push("u.institution = ?"); args.push(sp.inst); }
  const people = await all<User & { papers: number; reads: number }>(
    `SELECT u.*, (SELECT COUNT(*) FROM submissions s WHERE s.owner_id = u.id AND s.status = 'published') AS papers,
       (SELECT COALESCE(SUM(views),0) FROM submissions s WHERE s.owner_id = u.id) AS reads
     FROM users u WHERE ${where.join(" AND ")} ORDER BY papers DESC, reads DESC LIMIT 60`, args);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="slides-hero"><span className="eyebrow">For employers and grad programmes</span><h1>Find students by skill</h1>
        <p className="muted" style={{ maxWidth: "60ch", marginTop: 10 }}>Search students who are open to opportunities, by skill, field and university, and see the research they&apos;ve actually done. Contact requests go through papr; students choose whether to reply.</p></div>
      <form className="filters card" action="/talent" style={{ gridTemplateColumns: "2fr 1fr 1fr auto" }}>
        <div className="q"><label className="lbl small" htmlFor="tl-s">Skill or topic</label><input type="search" id="tl-s" name="skill" defaultValue={sp.skill || ""} placeholder="e.g. GIS, Python, survey design" /></div>
        <div><label className="lbl small" htmlFor="tl-f">Field</label><select id="tl-f" name="field" defaultValue={sp.field || ""}><option value="">Any</option>{FIELDS.map((f) => <option key={f}>{f}</option>)}</select></div>
        <div><label className="lbl small" htmlFor="tl-i">University</label><select id="tl-i" name="inst" defaultValue={sp.inst || ""}><option value="">Any</option>{INSTITUTIONS.map((i) => <option key={i} value={i}>{shortInst(i)}</option>)}</select></div>
        <button className="btn primary" type="submit">Search</button>
      </form>
      {user?.role === "student" && !user.open_to_opps && <div className="notice info small">Students: want to be found here? Turn on <b>Open to opportunities</b> on <Link href="/profile">your profile</Link>.</div>}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {people.map((p) => (
          <Link key={p.id} href={`/u/${p.handle}`} className="card person">
            <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}><span className="avatar lg">{(p.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
              <div><b>{p.name}</b><p className="small muted">{p.headline || p.programme || ""}</p></div></div>
            <p className="small muted">{shortInst(p.institution || "")}{p.papers ? ` · ${p.papers} paper${p.papers === 1 ? "" : "s"} · ${p.reads.toLocaleString()} reads` : ""}</p>
            <div className="chips">{(p.skills || "").split(",").filter(Boolean).slice(0, 5).map((s) => <span key={s} className="tag plain">{s.trim()}</span>)}</div>
          </Link>
        ))}
        {people.length === 0 && <div className="card empty" style={{ gridColumn: "1/-1" }}>No students match yet. Try a broader skill.</div>}
      </div>
    </div>
  );
}
