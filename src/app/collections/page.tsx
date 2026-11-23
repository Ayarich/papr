import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all, type Collection } from "@/lib/db";
import { INSTITUTIONS, shortInst } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { createCollection, requestLecturer } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collections" };

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireUser("/collections");
  const allowed = ["lecturer", "moderator", "admin"].includes(user.role);

  if (!allowed) {
    return (
      <div className="narrow stack" style={{ maxWidth: 640 }}>
        <span className="eyebrow">For lecturers</span>
        <h1>Collect your class&apos;s projects in one link</h1>
        <p className="muted">Lecturers and departments create a collection, such as <i>&ldquo;UMaT Geomatic Engineering · Final-Year Projects 2026&rdquo;</i>, share the link with students, and watch submissions arrive. Confirm each student&apos;s work with one click.</p>
        {user.lecturer_requested ? (
          <div className="notice ok">Thanks. Your request for lecturer access was sent to the papr team. We&apos;ll email you when it&apos;s approved.</div>
        ) : (
          <form action={requestLecturer}><button className="btn primary" type="submit">I&apos;m a lecturer: request access</button></form>
        )}
        <p className="small muted">Students: ask your lecturer for their collection link, or just <Link href="/submit">submit your research</Link>.</p>
      </div>
    );
  }

  const mine = await all<Collection & { n: number; confirmed: number }>(
    `SELECT c.*, COUNT(s.id) AS n, SUM(s.supervisor_confirmed_at IS NOT NULL) AS confirmed
     FROM collections c LEFT JOIN submissions s ON s.collection_id = c.id WHERE c.owner_id = ? GROUP BY c.id ORDER BY c.created_at DESC`, [user.id]);

  return (
    <div className="stack" style={{ gap: 32 }}>
      <div><span className="eyebrow">Lecturer tools</span><h1 style={{ marginTop: 8 }}>Collections</h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: "60ch" }}>Create a link for your class. Students upload into it, you see who has submitted, and you confirm their work in one click.</p></div>
      {mine.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {mine.map((c) => (
            <Link key={c.id} href={`/collections/${c.id}`} className="card paper">
              <span className="eyebrow">{shortInst(c.institution) || "Collection"}</span>
              <h3>{c.title}</h3>
              <div className="progress"><i style={{ width: `${c.expected ? Math.min(100, (c.n / c.expected) * 100) : c.n ? 100 : 0}%` }} /></div>
              <div className="foot"><span>{c.n}{c.expected ? ` of ${c.expected}` : ""} submitted · {c.confirmed || 0} confirmed</span><span>{c.deadline ? `Due ${fmtDate(c.deadline)}` : ""}</span></div>
            </Link>
          ))}
        </div>
      )}
      <form action={createCollection} className="card pad-lg stack" style={{ maxWidth: 760 }}>
        <h2>New collection</h2>
        {error === "title" && <p className="err">Give the collection a title of at least 5 characters.</p>}
        <div className="field"><label className="lbl" htmlFor="c-title">Title</label><input type="text" id="c-title" name="title" required placeholder="e.g. UMaT Geomatic Engineering · Final-Year Projects 2026" /></div>
        <div className="field"><label className="lbl" htmlFor="c-desc">Message to students <span className="muted">(optional)</span></label><textarea id="c-desc" name="description" style={{ minHeight: 90 }} placeholder="e.g. Upload your final report PDF after your defence. Deadline is 30 June." /></div>
        <div className="grid g3">
          <div className="field"><label className="lbl" htmlFor="c-inst">Institution</label><select id="c-inst" name="institution" defaultValue={user.institution || ""}><option value="">Choose…</option>{INSTITUTIONS.map((i) => <option key={i}>{i}</option>)}</select></div>
          <div className="field"><label className="lbl" htmlFor="c-exp">Students expected</label><input type="text" inputMode="numeric" id="c-exp" name="expected" placeholder="e.g. 40" /></div>
          <div className="field"><label className="lbl" htmlFor="c-dl">Deadline</label><input type="date" id="c-dl" name="deadline" className="dateinput" /></div>
        </div>
        <div><button className="btn primary" type="submit">Create collection</button></div>
      </form>
    </div>
  );
}
