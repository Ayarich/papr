import { requireModerator } from "@/lib/auth";
import { all, one, type Award } from "@/lib/db";
import { shortInst } from "@/lib/constants";
import { monthName } from "@/lib/badges";
import AdminNav from "../AdminNav";
import { giveAward } from "../actions";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paper of the Month" };

export default async function Awards({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireModerator();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month || "") ? sp.month! : new Date().toISOString().slice(0, 7);
  const start = `${month}-01`, end = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 1)).toISOString().slice(0, 10);
  // Nominees: most read papers this month, with a boost for supervisor-confirmed work
  const nominees = await all<{ id: string; ref: string; title: string; authors_text: string; institution: string; reads: number; downloads: number; confirmed: number }>(
    `SELECT s.id, s.ref, s.title, s.authors_text, s.institution,
       (SELECT COUNT(*) FROM read_events r WHERE r.submission_id = s.id AND r.created_at >= ? AND r.created_at < ?) AS reads,
       s.downloads, s.supervisor_confirmed_at IS NOT NULL AS confirmed
     FROM submissions s WHERE s.status = 'published' ORDER BY reads DESC, s.downloads DESC LIMIT 10`, [start, end]);
  const current = await one<Award & { title: string; ref: string }>("SELECT a.*, s.title, s.ref FROM awards a JOIN submissions s ON s.id = a.submission_id WHERE a.month = ?", [month]);
  const past = await all<Award & { title: string; ref: string }>("SELECT a.*, s.title, s.ref FROM awards a JOIN submissions s ON s.id = a.submission_id ORDER BY a.month DESC LIMIT 12");
  return (
    <div className="stack" style={{ gap: 24 }}>
      <AdminNav active="awards" />
      <div><h1>Paper of the Month</h1><p className="muted" style={{ marginTop: 8 }}>Pick a winner for {monthName(month)}. They get a Paper of the Month badge, a spotlight on the home page and a notification. Data bundles make great prizes, and a telco may sponsor them.</p></div>
      {current && <div className="notice ok ih"><Icon name="trophy" size={16} /> Winner for {monthName(month)}: <a href={`/papers/${current.ref}`}>{current.title}</a> · {current.prize}{current.sponsor ? ` (sponsored by ${current.sponsor})` : ""}</div>}
      <form action={giveAward} className="card pad-lg stack">
        <input type="hidden" name="month" value={month} />
        <h3>Nominees, ranked by reads in {monthName(month)}</h3>
        <div className="stack" style={{ gap: 8 }}>
          {nominees.map((n, i) => (
            <label key={n.id} className="check" htmlFor={`nom-${n.id}`}>
              <input type="radio" id={`nom-${n.id}`} name="submissionId" value={n.id} defaultChecked={i === 0} />
              <span><b>{n.title}</b><br /><span className="small muted">{n.authors_text} · {shortInst(n.institution)} · {n.reads} reads this month · {n.downloads} downloads{n.confirmed ? " · supervisor confirmed" : ""}</span></span>
            </label>
          ))}
        </div>
        <div className="grid g3">
          <div className="field"><label className="lbl" htmlFor="aw-prize">Prize</label><input type="text" id="aw-prize" name="prize" defaultValue="10 GB data bundle" /></div>
          <div className="field"><label className="lbl" htmlFor="aw-sp">Sponsor <span className="muted">(optional)</span></label><input type="text" id="aw-sp" name="sponsor" /></div>
          <div className="field"><label className="lbl" htmlFor="aw-c">Why it won <span className="muted">(optional)</span></label><input type="text" id="aw-c" name="citation" /></div>
        </div>
        <div><button className="btn primary" type="submit">Award Paper of the Month</button></div>
      </form>
      {past.length > 0 && <section className="stack"><h2>Past winners</h2>{past.map((p) => <div key={p.id} className="small ih"><Icon name="trophy" size={14} /> <b>{monthName(p.month)}</b>: <a href={`/papers/${p.ref}`}>{p.title}</a> · {p.prize}</div>)}</section>}
    </div>
  );
}
