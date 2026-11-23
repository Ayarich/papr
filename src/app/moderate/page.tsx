import Link from "next/link";
import { requireModerator } from "@/lib/auth";
import { all, one, type Submission, type Version } from "@/lib/db";
import { fmtDate, fmtSize } from "@/lib/format";
import { shortInst } from "@/lib/constants";
import { reportForSubmission } from "@/lib/sim-check";
import { words } from "@/lib/validate";
import ModPanel from "./ModPanel";
import BehindTheScenes from "@/components/BehindTheScenes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review queue" };

export default async function ModeratePage({ searchParams }: { searchParams: Promise<{ id?: string; done?: string }> }) {
  await requireModerator();
  const { id, done } = await searchParams;
  const queue = await all<Submission>("SELECT * FROM submissions WHERE status = 'pending' ORDER BY updated_at ASC");
  const doneMsg = done === "publish" ? "Published. The paper is now in the library." : done === "changes" ? "Sent back to the student with your note." : done === "reject" ? "Declined. The student has been told why." : "";

  if (!queue.length) {
    return (
      <div className="stack">
        <h1>Review queue</h1>
        {doneMsg && <div className="notice ok">{doneMsg}</div>}
        <div className="card empty">
          <div className="success-mark" style={{ margin: "0 auto 12px" }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5 9-10" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <b>All caught up.</b><p className="small" style={{ marginTop: 6 }}>No submissions are waiting.</p>
        </div>
      </div>
    );
  }

  const s = queue.find((q) => q.id === id) || queue[0];
  const v = (await one<Version>("SELECT * FROM versions WHERE submission_id = ? AND number = ?", [s.id, s.current_version]))!;
  const sim = (await reportForSubmission(s.id))!.report;
  const high = sim.percent >= 25;

  return (
    <div className="stack">
      <div><h1>Review queue</h1><p className="muted" style={{ marginTop: 4 }}><span className="num">{queue.length}</span> waiting · oldest first</p></div>
      {doneMsg && <div className="notice ok">{doneMsg}</div>}
      <div className="modgrid">
        <div className="qlist">
          {queue.map((q) => (
            <Link key={q.id} className="qitem" href={`/moderate?id=${q.id}`} aria-current={q.id === s.id}>
              <small className="num">{q.ref} · {fmtDate(q.updated_at)}</small>
              <b>{q.title}</b>
              <small>{q.authors_text.split(",")[0]} · {shortInst(q.institution)}</small>
              {q.current_version > 1 && <small style={{ color: "var(--info)", fontWeight: 700 }}>Resubmission · v{q.current_version}</small>}
            </Link>
          ))}
        </div>
        <div className="card stack" style={{ gap: 18 }}>
          <div className="row" style={{ gap: 6 }}><span className="tag">{s.field}</span><span className="tag plain">{s.type}</span><span className="small muted num">{s.ref} · v{s.current_version}</span>
            {s.supervisor_confirmed_at && <span className="okbadge">✓ Supervisor confirmed</span>}</div>
          <h2>{s.title}</h2>
          <p className="small"><b>{s.authors_text}</b> · {s.programme}, {shortInst(s.institution)} · Supervisor: {s.supervisor_name} ({s.supervisor_email})</p>
          <div><h3 style={{ fontSize: ".95rem", marginBottom: 6 }}>Abstract <span className="muted small num" style={{ fontWeight: 500 }}>({words(s.abstract)} words)</span></h3><p className="small abstract">{s.abstract}</p></div>
          <p className="small"><b>Keywords:</b> {s.keywords}</p>
          <div className="filebox plain">
            <span className="pdficon">PDF</span>
            <div style={{ flex: 1, minWidth: 0 }}><b style={{ overflowWrap: "anywhere" }}>{v.pdf_name}</b><p className="small muted num">{fmtSize(v.pdf_size)}</p></div>
            <a className="btn sm" href={`/papers/${s.ref}/pdf`} target="_blank" rel="noopener">Open</a>
          </div>
          <div>
            <div className="row between"><b className="small">Similarity check (full text)</b><b className="small num" style={{ color: high ? "var(--bad)" : "var(--ok)" }}>{sim.percent}% {high ? "· high" : "· fine"}</b></div>
            <div className="simbar" role="img" aria-label={`Similarity ${sim.percent} percent`}><i style={{ width: `${Math.max(Math.min(sim.percent, 100), 2)}%`, background: high ? "var(--bad)" : "var(--ok)" }} /></div>
            <p className="hint">{sim.sources.length ? <>Matches {sim.sources.slice(0, 3).map((x) => `${x.ref} (${x.percent}%)`).join(", ")}{sim.sources.length > 3 ? ` and ${sim.sources.length - 3} more` : ""}. </> : "No matching passages in papr's library. "}
              <Link href={`/moderate/report/${s.id}`}>Open the full report with highlighted passages →</Link></p>
          </div>
          <ModPanel id={s.id} />
          <BehindTheScenes points={[
            "Publish needs every checklist box ticked. Request changes and Decline need a note, which is emailed to the student.",
            <>Publishing sets status to <code>published</code> and assigns a DOI. Real DOI registration with Crossref is a stub in <code>src/app/moderate/actions.ts</code> for now.</>,
            "Every decision is saved in the reviews table with your name, the checklist and the time, so decisions can be audited.",
          ]} />
        </div>
      </div>
    </div>
  );
}
