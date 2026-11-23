import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all, type Submission } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { eventsFor } from "@/lib/submissions";
import StatusPill from "@/components/StatusPill";
import BehindTheScenes from "@/components/BehindTheScenes";
import WithdrawButton from "./WithdrawButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "My submissions" };

function Track({ status }: { status: string }) {
  const mid = status === "pending" ? "on" : status === "changes" ? "warn on" : status === "rejected" ? "bad on" : "on";
  const label = status === "changes" ? "Changes requested" : status === "rejected" ? "Not accepted" : "Moderator check";
  return (
    <div className="track">
      <div className="on"><i />Submitted</div>
      <div className={mid}><i />{label}</div>
      <div className={status === "published" || status === "withdrawn" ? "on" : ""}><i />Published</div>
    </div>
  );
}

export default async function MyPage({ searchParams }: { searchParams: Promise<{ submitted?: string; claimed?: string }> }) {
  const { submitted, claimed } = await searchParams;
  const user = await requireUser("/my");
  const subs = await all<Submission>("SELECT * FROM submissions WHERE owner_id = ? ORDER BY updated_at DESC", [user.id]);
  const events = await eventsFor(subs.map((s) => s.id));
  const notes = await all<{ submission_id: string; note: string; created_at: string; decision: string }>(
    "SELECT submission_id, note, created_at, decision FROM reviews WHERE note IS NOT NULL AND submission_id IN (SELECT id FROM submissions WHERE owner_id = ?) ORDER BY created_at DESC", [user.id]);
  const just = submitted ? subs.find((s) => s.ref === submitted) : null;
  const reach = await all<{ submission_id: string; insts: number; countries: number }>(
    `SELECT submission_id, COUNT(DISTINCT institution) AS insts, COUNT(DISTINCT country) AS countries FROM read_events
     WHERE submission_id IN (SELECT id FROM submissions WHERE owner_id = ?) GROUP BY submission_id`, [user.id]);

  return (
    <div className="stack">
      {claimed && <div className="notice ok">🎓 {claimed} is now yours. It shows on your profile, and you&apos;ll be notified when people read it.</div>}
      {just && (
        <div className="card pad-lg stack" style={{ gap: 14, borderColor: "var(--ok)" }}>
          <div className="row"><div className="success-mark"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5 9-10" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <div><h2>Submitted. Well done!</h2><p className="muted">Your reference number is <b className="num" style={{ color: "var(--ink)" }}>{just.ref}</b>. We&apos;ve emailed you a copy.</p></div></div>
          <ul className="history">
            <li><time>Today</time><span>Your submission joins the review queue.</span></li>
            <li><time>Today</time><span>{just.supervisor_name} gets an email asking them to confirm it&apos;s your work (if you ticked that box).</span></li>
            <li><time>1–3 days</time><span>A moderator checks it. If anything needs fixing, you&apos;ll get a clear note.</span></li>
            <li><time>Then</time><span>It goes live with a permanent link and DOI.</span></li>
          </ul>
          <p className="small muted">Testing tip: log out, log in as <b>moderator@papr.edu.gh</b>, and review it.</p>
        </div>
      )}
      <div className="row between">
        <div><h1>My submissions</h1><p className="muted" style={{ marginTop: 4 }}>Logged in as {user.email}</p></div>
        <Link className="btn primary" href="/submit">+ New submission</Link>
      </div>
      {subs.length === 0 && <div className="card empty"><b>You haven&apos;t submitted anything yet.</b><p className="small" style={{ marginTop: 6 }}><Link href="/submit">Submit your first paper</Link></p></div>}
      {subs.map((s) => {
        const note = notes.find((n) => n.submission_id === s.id);
        return (
          <div key={s.id} className="card stack" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 8 }}><StatusPill status={s.status} /><span className="small muted num">{s.ref} · version {s.current_version}</span></div>
            <h3>{s.title}</h3>
            <Track status={s.status} />
            {s.status === "pending" && <p className="small muted">A moderator usually reviews within 3 working days. We&apos;ll email you when there&apos;s an update.</p>}
            {note && (s.status === "changes" || s.status === "rejected") && (
              <div className={`comment ${s.status === "rejected" ? "bad" : ""}`}><b>Moderator&apos;s note · {fmtDate(note.created_at)}</b><p style={{ marginTop: 4 }}>{note.note}</p></div>
            )}
            {s.status === "published" && (() => { const r = reach.find((x) => x.submission_id === s.id); return <div className="notice ok small"><b>Live.</b> DOI <span className="num">{s.doi}</span> · <span className="num">{s.views}</span> views · <span className="num">{s.downloads}</span> downloads{r && r.insts ? <> · read at <span className="num">{r.insts}</span> institution{r.insts === 1 ? "" : "s"}</> : null}{r && r.countries > 1 ? <> in <span className="num">{r.countries}</span> countries</> : null}</div>; })()}
            {s.supervisor_confirmed_at && <span className="okbadge" style={{ alignSelf: "flex-start" }}>✓ Supervisor confirmed</span>}
            <details>
              <summary className="small muted" style={{ cursor: "pointer", fontWeight: 600 }}>History</summary>
              <ul className="history" style={{ marginTop: 10 }}>
                {events.filter((e) => e.submission_id === s.id).map((e, i) => <li key={i}><time>{fmtDate(e.created_at)}</time><span>{e.text}</span></li>)}
              </ul>
            </details>
            <div className="row">
              {s.status === "changes" && <Link className="btn primary" href={`/my/${s.id}/edit`}>Edit and resubmit</Link>}
              {s.status === "pending" && <a className="btn sm" href={`/papers/${s.ref}/pdf`} target="_blank" rel="noopener">View my PDF</a>}
              {s.status !== "withdrawn" && <Link className="btn sm" href={`/slides?from=${s.id}`}>✨ Make slides</Link>}
              {s.status === "published" && <><Link className="btn" href={`/papers/${s.ref}`}>View public page</Link><WithdrawButton id={s.id} /></>}
            </div>
          </div>
        );
      })}
      <BehindTheScenes points={[
        "Each change of status sends you an email and adds a line to the history.",
        "When you resubmit, a new version is saved. Old versions are kept, never overwritten.",
        "Withdrawing keeps the record and DOI but removes the PDF, so citations don't break.",
      ]} />
    </div>
  );
}
