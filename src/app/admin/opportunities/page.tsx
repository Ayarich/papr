import { requireModerator } from "@/lib/auth";
import { all, type Opportunity } from "@/lib/db";
import { FIELDS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { OPP_TYPES } from "@/lib/opportunities";
import AdminNav from "../AdminNav";
import { addOpportunity, deleteOpportunity, addSource, toggleSource, deleteSource, refreshNow } from "../actions";
import { ensureSources } from "@/lib/live-opps";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage opportunities" };

export default async function AdminOpps({ searchParams }: { searchParams: Promise<{ added?: string; error?: string; srcadded?: string; srcerror?: string; refreshed?: string }> }) {
  await requireModerator();
  const { added, error, srcadded, srcerror, refreshed } = await searchParams;
  await ensureSources();
  const opps = await all<Opportunity>("SELECT * FROM opportunities WHERE hidden = 0 ORDER BY live ASC, created_at DESC LIMIT 150");
  const sources = await all<{ id: string; name: string; url: string; enabled: number; last_fetched_at: string | null; last_ok: number | null; last_count: number | null; last_error: string | null }>("SELECT * FROM feed_sources ORDER BY created_at");
  return (
    <div className="stack" style={{ gap: 24 }}>
      <AdminNav active="opportunities" />
      <h1>Opportunities</h1>
      {added && <div className="notice ok">Posted. Students in the matching fields will see it in their feed.</div>}
      {error && <div className="notice bad">Fill in the title, organisation and type.</div>}
      <section className="card pad-lg stack">
        <div className="row between"><div><h3>Live Master&apos;s &amp; PhD feeds</h3><p className="small muted">papr reads these every 3 hours and keeps only postgraduate items (Master&apos;s, PhD, scholarships, fellowships). Only add feeds from sites that allow it.</p></div>
          <form action={refreshNow}><button className="btn sm" type="submit">Refresh now</button></form></div>
        {refreshed !== undefined && <div className="notice ok small">Refreshed: {refreshed} postgraduate listings found.</div>}
        {srcadded && <div className="notice ok small">Source added and read.</div>}
        {srcerror && <div className="notice bad small">Give the source a name and an https:// feed address.</div>}
        <div className="tblwrap"><table className="tbl"><thead><tr><th>Source</th><th>Last read</th><th>Status</th><th /></tr></thead><tbody>
          {sources.map((s) => (
            <tr key={s.id}><td><b>{s.name}</b><br /><span className="small muted" style={{ overflowWrap: "anywhere" }}>{s.url}</span></td>
              <td className="small">{s.last_fetched_at ? fmtDate(s.last_fetched_at) + " " + new Date(s.last_fetched_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "Not yet"}</td>
              <td className="small">{!s.enabled ? <span className="muted">Switched off</span> : s.last_ok === null ? "Waiting" : s.last_ok ? <span className="pill published">{s.last_count} listings</span> : <span className="pill rejected" title={s.last_error || ""}>Error: {(s.last_error || "").slice(0, 40)}</span>}</td>
              <td><div className="row" style={{ gap: 6 }}>
                <form action={toggleSource}><input type="hidden" name="id" value={s.id} /><button className="btn sm" type="submit">{s.enabled ? "Switch off" : "Switch on"}</button></form>
                <form action={deleteSource}><input type="hidden" name="id" value={s.id} /><button className="btn sm danger" type="submit">Remove</button></form></div></td></tr>
          ))}
        </tbody></table></div>
        <form action={addSource} className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}><label className="lbl small" htmlFor="src-name">Name</label><input type="text" id="src-name" name="name" placeholder="e.g. jobs.ac.uk PhDs" /></div>
          <div className="field" style={{ flex: 2, minWidth: 240 }}><label className="lbl small" htmlFor="src-url">RSS or Atom feed address</label><input type="text" id="src-url" name="url" placeholder="https://…/feed" /></div>
          <button className="btn primary" type="submit">Add source</button>
        </form>
      </section>
      <form action={addOpportunity} className="card pad-lg stack">
        <h3>Post an opportunity</h3>
        <div className="grid g2">
          <div className="field"><label className="lbl" htmlFor="o-title">Title</label><input type="text" id="o-title" name="title" placeholder="e.g. GIS intern (6 months)" /></div>
          <div className="field"><label className="lbl" htmlFor="o-org">Organisation</label><input type="text" id="o-org" name="org" /></div>
        </div>
        <div className="grid g3">
          <div className="field"><label className="lbl" htmlFor="o-type">Type</label><select id="o-type" name="type">{OPP_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
          <div className="field"><label className="lbl" htmlFor="o-loc">Location</label><input type="text" id="o-loc" name="location" placeholder="e.g. Takoradi or Remote" /></div>
          <div className="field"><label className="lbl" htmlFor="o-dl">Deadline</label><input type="date" id="o-dl" name="deadline" className="dateinput" /></div>
        </div>
        <div className="field"><label className="lbl" htmlFor="o-url">Link to apply</label><input type="text" id="o-url" name="url" placeholder="https://…" /></div>
        <div className="field"><label className="lbl" htmlFor="o-desc">Description</label><textarea id="o-desc" name="description" style={{ minHeight: 90 }} /></div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="lbl">Fields it suits <span className="muted">(none = everyone)</span></legend>
          <div className="row" style={{ gap: 8 }}>{FIELDS.map((f) => <label key={f} className="tag plain" style={{ cursor: "pointer" }}><input type="checkbox" name="fields" value={f} /> {f}</label>)}</div></fieldset>
        <div><button className="btn primary" type="submit">Post opportunity</button></div>
      </form>
      <div className="card tblwrap" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Opportunity</th><th>Deadline</th><th /></tr></thead><tbody>
        {opps.map((o) => <tr key={o.id}><td><b>{o.title}</b>{o.sample ? <span className="tag plain" style={{ marginLeft: 6 }}>Sample</span> : null}{o.live ? <span className="tag live" style={{ marginLeft: 6 }}>Live · {o.source}</span> : null}<br /><span className="small muted">{o.org} · {o.type}</span></td><td className="small">{o.deadline ? fmtDate(o.deadline) : "Open"}</td>
          <td><form action={deleteOpportunity}><input type="hidden" name="id" value={o.id} /><button className="btn sm danger" type="submit">{o.live ? "Hide" : "Remove"}</button></form></td></tr>)}
      </tbody></table></div>
    </div>
  );
}
