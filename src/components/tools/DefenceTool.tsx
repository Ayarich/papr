"use client";
import { useEffect, useState } from "react";
import type { Question } from "@/lib/defence";
import SourcePicker, { PublishCTA } from "./SourcePicker";

export default function DefenceTool({ papers }: { papers: { id: string; title: string; ref: string }[] }) {
  const [res, setRes] = useState<{ questions: Question[]; fromPaper: boolean } | null>(null);
  const [mode, setMode] = useState<"list" | "practice">("list");
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState<Record<string, "good" | "work">>({});
  const [secs, setSecs] = useState(120);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecs((s) => (s <= 1 ? (setRunning(false), 0) : s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!res) return <SourcePicker tool="defence" papers={papers} cta="Get my panel questions" steps={["Reading your paper…", "Thinking like your panel…", "Writing tough questions…"]} onResult={(r) => setRes(r as never)} />;
  const qs = res.questions;
  const q = qs[i];
  const done = Object.keys(rating).length;
  const work = qs.filter((x) => rating[x.id] === "work");
  const next = (r?: "good" | "work") => { if (r) setRating({ ...rating, [q.id]: r }); setShow(false); setSecs(120); setRunning(false); setI(Math.min(qs.length - 1, i + 1)); };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row between">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={mode === "list"} onClick={() => setMode("list")}>All questions ({qs.length})</button>
          <button role="tab" aria-selected={mode === "practice"} onClick={() => setMode("practice")}>Practice mode</button>
        </div>
        <span className="small muted num">{done} practised · {work.length} need work</span>
      </div>
      {mode === "list" ? (
        <div className="stack" style={{ gap: 10 }}>
          {qs.map((x, n) => (
            <details key={x.id} className="qcard">
              <summary><span className={`lvl ${x.level}`}>{x.level}</span><b>{n + 1}. {x.q}</b></summary>
              <div className="stack" style={{ gap: 6, paddingTop: 8 }}>
                {x.from && <p className="small muted">From your paper: “{x.from}”</p>}
                <p className="small">💡 {x.tip}</p>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="card pad-lg practice">
          <div className="row between small muted"><span>{q.category} · question {i + 1} of {qs.length}</span><span className={`lvl ${q.level}`}>{q.level}</span></div>
          <h2>{q.q}</h2>
          {q.from && <p className="small muted">From your paper: “{q.from}”</p>}
          <div className="timer">
            <b className={`num${secs <= 20 ? " low" : ""}`}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</b>
            <button type="button" className="btn sm" onClick={() => setRunning(!running)}>{running ? "Pause" : secs < 120 ? "Resume" : "Start 2-minute answer"}</button>
          </div>
          <p className="small muted">Answer out loud, as if the panel is in front of you.</p>
          {show ? <div className="notice info small">💡 {q.tip}</div> : <button type="button" className="btn ghost sm" onClick={() => setShow(true)}>Show what the panel wants to hear</button>}
          <div className="row">
            <button type="button" className="btn primary" onClick={() => next("good")}>I nailed it</button>
            <button type="button" className="btn" onClick={() => next("work")}>Needs more work</button>
            <button type="button" className="btn ghost" onClick={() => next()}>Skip</button>
          </div>
          {i === qs.length - 1 && done > 0 && <div className="notice ok small">You&apos;ve been through every question. {work.length ? `Go back over the ${work.length} marked "needs more work".` : "Great job: you're ready!"}</div>}
        </div>
      )}
      <div className="row"><button type="button" className="btn" onClick={() => { setRes(null); setRating({}); setI(0); }}>Use another paper</button></div>
      <PublishCTA show={!res.fromPaper} />
    </div>
  );
}
