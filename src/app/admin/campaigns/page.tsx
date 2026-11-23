import { requireModerator } from "@/lib/auth";
import { all, type Campaign } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import AdminNav from "../AdminNav";
import { addCampaign, endCampaign } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns" };

export default async function Campaigns({ searchParams }: { searchParams: Promise<{ added?: string; error?: string }> }) {
  await requireModerator();
  const { added, error } = await searchParams;
  const list = await all<Campaign & { n: number }>("SELECT c.*, (SELECT COUNT(*) FROM submissions s WHERE s.campaign_id = c.id) AS n FROM campaigns c ORDER BY starts_at DESC");
  const now = new Date().toISOString();
  return (
    <div className="stack" style={{ gap: 24 }}>
      <AdminNav active="campaigns" />
      <div><h1>Upload campaigns</h1><p className="muted" style={{ marginTop: 8 }}>Run a &ldquo;Drop Week&rdquo; around defence season (June–August). While it runs, every page shows a banner, and every upload earns the campaign badge.</p></div>
      {added && <div className="notice ok">Campaign saved.</div>}
      {error && <div className="notice bad">Fill in the title and both dates.</div>}
      <form action={addCampaign} className="card pad-lg stack">
        <div className="grid g2">
          <div className="field"><label className="lbl" htmlFor="cp-title">Name</label><input type="text" id="cp-title" name="title" placeholder="Drop Week 2027" /></div>
          <div className="field"><label className="lbl" htmlFor="cp-badge">Badge name</label><input type="text" id="cp-badge" name="badge" placeholder="Drop Week 2027" /></div>
        </div>
        <div className="field"><label className="lbl" htmlFor="cp-msg">Banner message</label><input type="text" id="cp-msg" name="message" placeholder="Defended your project? Drop it on papr this week and earn the Drop Week badge." /></div>
        <div className="grid g2">
          <div className="field"><label className="lbl" htmlFor="cp-s">Starts</label><input type="date" id="cp-s" name="starts" className="dateinput" /></div>
          <div className="field"><label className="lbl" htmlFor="cp-e">Ends</label><input type="date" id="cp-e" name="ends" className="dateinput" /></div>
        </div>
        <div><button className="btn primary" type="submit">Save campaign</button></div>
      </form>
      <div className="card tblwrap" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Campaign</th><th>Dates</th><th>Uploads</th><th /></tr></thead><tbody>
        {list.map((c) => {
          const live = c.starts_at <= now && c.ends_at >= now;
          return <tr key={c.id}><td><b>{c.title}</b> {live && <span className="pill published">Live</span>}<br /><span className="small muted">{c.message}</span></td>
            <td className="small">{fmtDate(c.starts_at)} – {fmtDate(c.ends_at)}</td><td className="num">{c.n}</td>
            <td>{live && <form action={endCampaign}><input type="hidden" name="id" value={c.id} /><button className="btn sm" type="submit">End now</button></form>}</td></tr>;
        })}
      </tbody></table></div>
    </div>
  );
}
