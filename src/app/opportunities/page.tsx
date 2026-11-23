import Link from "next/link";
import { after } from "next/server";
import { getUser } from "@/lib/auth";
import { all, type Opportunity } from "@/lib/db";
import { FIELDS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { OPP_TYPES, oppType } from "@/lib/opportunities";
import { refreshLive, lastRefresh, freshCutoff } from "@/lib/live-opps";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Opportunities" };

function ago(iso: string | null) {
  if (!iso) return "not yet";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 2 ? "just now" : m < 60 ? `${m} minutes ago` : m < 1440 ? `${Math.round(m / 60)} hour${m < 120 ? "" : "s"} ago` : fmtDate(iso);
}

export default async function Opps({ searchParams }: { searchParams: Promise<{ type?: string; field?: string; mine?: string; funded?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();

  // Live Master's & PhD listings: the first visit waits for them (up to 20s); after that they refresh in the background every few hours.
  const last = await lastRefresh();
  if (!last) await Promise.race([refreshLive().catch(() => 0), new Promise((r) => setTimeout(r, 20000))]);
  else after(() => refreshLive().catch(() => 0)); // runs after the page is sent (keeps working on Vercel)
  const sources = await all<{ name: string; last_ok: number | null }>("SELECT name, last_ok FROM feed_sources WHERE enabled = 1");
  const updated = await lastRefresh();

  let myFields: string[] = (user?.interests || "").split(",").filter(Boolean);
  if (user && !myFields.length) myFields = (await all<{ field: string }>("SELECT DISTINCT field FROM submissions WHERE owner_id = ?", [user.id])).map((r) => r.field);
  const today = new Date().toISOString().slice(0, 10);
  let opps = await all<Opportunity>(
    `SELECT * FROM opportunities WHERE hidden = 0 AND (deadline >= ? OR (deadline IS NULL AND (live = 0 OR published_at >= ?)))
     ORDER BY CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC, published_at DESC LIMIT 300`, [today, freshCutoff()]);
  const matches = (o: Opportunity, f: string) => !o.fields || o.fields.split(",").includes(f);
  if (sp.type) opps = opps.filter((o) => o.type === sp.type);
  if (sp.field) opps = opps.filter((o) => matches(o, sp.field!));
  if (sp.funded) opps = opps.filter((o) => o.funded);
  if (sp.mine && myFields.length) opps = opps.filter((o) => myFields.some((f) => matches(o, f)));
  const counts = { masters: 0, phd: 0 } as Record<string, number>;
  (await all<{ type: string; n: number }>(`SELECT type, COUNT(*) AS n FROM opportunities WHERE live = 1 AND hidden = 0 AND type IN ('masters','phd') AND (deadline >= ? OR (deadline IS NULL AND published_at >= ?)) GROUP BY type`, [today, freshCutoff()]))
    .forEach((r) => (counts[r.type] = r.n));
  const q = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(sp.type && { type: sp.type }), ...(sp.field && { field: sp.field }), ...(sp.mine && { mine: sp.mine }), ...(sp.funded && { funded: sp.funded }), ...extra });
    [...p.entries()].forEach(([k, v]) => { if (!v) p.delete(k); });
    return "/opportunities" + (p.toString() ? "?" + p : "");
  };
  const soon = (d: string | null) => d && (new Date(d).getTime() - Date.now()) / 86400000 <= 10;

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="slides-hero"><span className="eyebrow">Check back weekly</span><h1>Opportunities</h1>
        <p className="muted" style={{ maxWidth: "62ch", marginTop: 10 }}>Master&apos;s and PhD places, scholarships, internships, national service postings and conferences, matched to your field.</p></div>

      <div className="live-strip">
        <span className="live-dot" aria-hidden="true" />
        <span><b>Live Master&apos;s &amp; PhD listings</b> from {sources.length} source{sources.length === 1 ? "" : "s"} · updated {ago(updated)}</span>
        <span className="row" style={{ gap: 8, marginLeft: "auto" }}>
          <Link className="tag" href={q({ type: "masters" })}>🎓 Master&apos;s <span className="num">{counts.masters}</span></Link>
          <Link className="tag" href={q({ type: "phd" })}>🔬 PhD <span className="num">{counts.phd}</span></Link>
        </span>
      </div>

      <div className="chipbar">
        {user && myFields.length > 0 && <Link className={`tag ${sp.mine ? "" : "plain"}`} href={q({ mine: sp.mine ? "" : "1" })}>✨ For you</Link>}
        <Link className={`tag ${sp.funded ? "" : "plain"}`} href={q({ funded: sp.funded ? "" : "1" })}>💸 Fully funded</Link>
        <Link className={`tag ${!sp.type ? "" : "plain"}`} href={q({ type: "" })}>All types</Link>
        {OPP_TYPES.map((t) => <Link key={t.key} className={`tag ${sp.type === t.key ? "" : "plain"}`} href={q({ type: t.key })}>{t.emoji} {t.label}</Link>)}
      </div>
      <form action="/opportunities" className="row">
        {sp.type && <input type="hidden" name="type" value={sp.type} />}
        {sp.funded && <input type="hidden" name="funded" value="1" />}
        <select name="field" defaultValue={sp.field || ""} style={{ maxWidth: 320 }}><option value="">Any field</option>{FIELDS.map((f) => <option key={f}>{f}</option>)}</select>
        <button className="btn sm" type="submit">Filter</button>
        {user && !myFields.length && <span className="small muted">Tip: add your fields on <Link href="/profile">your profile</Link> to get a &ldquo;For you&rdquo; feed.</span>}
      </form>
      <div className="stack" style={{ gap: 12 }}>
        {opps.map((o) => {
          const t = oppType(o.type);
          return (
            <article key={o.id} className="card opp">
              <span className="opp-emoji" aria-hidden="true">{t.emoji}</span>
              <div className="grow stack" style={{ gap: 6 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="tag plain">{t.label}</span>
                  {o.live ? <span className="tag live">● Live</span> : null}
                  {o.funded ? <span className="pill published">Fully funded</span> : null}
                  {o.sample ? <span className="tag plain">Sample listing</span> : null}
                  {soon(o.deadline) && <span className="pill changes">Closing soon</span>}
                </div>
                <h3>{o.title}</h3>
                <p className="small muted">{[o.live ? (o.org !== o.source ? o.org : null) : o.org, o.country || o.location || null].filter(Boolean).join(" · ")}{o.deadline ? ` · Apply by ${fmtDate(o.deadline)}` : o.live ? ` · Posted ${fmtDate(o.published_at)}` : " · Open"}</p>
                {o.description && <p className="small">{o.description}</p>}
                {o.fields && <p className="small muted">For: {o.fields.split(",").join(", ")}</p>}
                {o.live ? <p className="small muted">Source: {o.source}. Always check details and deadlines on the original page.</p> : null}
              </div>
              {o.url ? <a className="btn sm" href={o.url} target="_blank" rel="noopener noreferrer">{o.live ? "View →" : "Apply →"}</a> : null}
            </article>
          );
        })}
        {opps.length === 0 && <div className="card empty">Nothing matches right now. Try another filter. New listings arrive automatically.</div>}
      </div>
    </div>
  );
}
