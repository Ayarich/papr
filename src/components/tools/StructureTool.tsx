"use client";
import { useState } from "react";
import type { StructureReport } from "@/lib/structure-check";
import SourcePicker, { PublishCTA } from "./SourcePicker";
import Icon from "@/components/Icon";

export default function StructureTool({ papers }: { papers: { id: string; title: string; ref: string }[] }) {
  const [res, setRes] = useState<{ structure: { report: StructureReport; article: StructureReport }; fromPaper: boolean } | null>(null);
  const [mode, setMode] = useState<"report" | "article">("report");
  if (!res) return <SourcePicker tool="structure" papers={papers} cta="Check my structure" steps={["Reading your report…", "Finding your chapters…", "Checking tables and figures…"]} onResult={(r) => setRes(r as never)} />;
  const r = res.structure[mode];
  const max = Math.max(...r.parts.map((p) => Math.max(p.words, p.max)), 1);
  const tone = r.score >= 80 ? "ok" : r.score >= 55 ? "warn" : "bad";
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="seg" role="tablist" aria-label="What are you checking?">
          <button role="tab" aria-selected={mode === "report"} onClick={() => setMode("report")}>Full project report</button>
          <button role="tab" aria-selected={mode === "article"} onClick={() => setMode("article")}>Short papr article</button>
        </div>
        <span className="small muted">Word ranges change with what you&apos;re writing.</span>
      </div>
      <div className="kpis">
        <div className="card stat"><span>Structure score</span><b className={`num lv-${tone}`}>{r.score}</b><span className="small">out of 100</span></div>
        <div className="card stat"><span>Words</span><b className="num">{r.totalWords.toLocaleString()}</b><span className="small">about {r.pages} pages at 1.5 spacing</span></div>
        <div className="card stat"><span>Tables and figures</span><b className="num">{r.items.length}</b><span className="small">{r.itemIssues.length ? `${r.itemIssues.length} to fix` : "all in order"}</span></div>
        <div className="card stat"><span>References</span><b className="num">{r.references}</b><span className="small">{r.citations} citations in the text</span></div>
      </div>

      <section className="card pad-lg stack" style={{ gap: 12 }}>
        <h3>Chapters and length</h3>
        {r.parts.map((p) => (
          <div key={p.key} className={`sc-row ${p.status}`}>
            <div className="row between small"><b className="ih"><Icon name={p.status === "ok" ? "ok" : p.status === "missing" ? (p.optional ? "info" : "bad") : "warn"} size={15} className={p.status === "ok" ? "lv-ok" : p.status === "missing" && !p.optional ? "lv-bad" : "lv-warn"} /> {p.name}</b>
              <span className="muted num">{p.found ? `${p.words.toLocaleString()} words` : p.optional ? "Not found (can be part of the introduction)" : "Not found"} · aim {p.min.toLocaleString()}–{p.max.toLocaleString()}</span></div>
            <div className="sc-track" aria-hidden><i className="sc-range" style={{ left: `${(p.min / max) * 100}%`, width: `${((p.max - p.min) / max) * 100}%` }} /><i className="sc-bar" style={{ width: `${Math.min(100, (p.words / max) * 100)}%` }} /></div>
          </div>
        ))}
        <p className="hint">The shaded band is the usual range. Headings are found from lines like “CHAPTER THREE”, “3.0 METHODOLOGY” or “Results and Discussion”.</p>
      </section>

      <div className="duo">
        <section className="card pad-lg stack" style={{ gap: 10 }}>
          <h3>Tables and figures</h3>
          {r.items.length === 0 ? <p className="small muted">No captions found. Captions should start like “Table 1:” or “Figure 2.1:”.</p> : (
            <ul className="sc-items">{r.items.map((i, k) => <li key={k} className="small"><Icon name={i.mentioned ? "ok" : "warn"} size={14} className={i.mentioned ? "lv-ok" : "lv-warn"} /> <b>{i.kind} {i.num}</b> {i.caption || <span className="muted">(no caption)</span>}</li>)}</ul>
          )}
          {r.itemIssues.length > 0 && <div className="stack" style={{ gap: 6 }}>{r.itemIssues.map((x, k) => <p key={k} className="small ih lv-warn" style={{ alignItems: "flex-start" }}><Icon name="warn" size={14} /> <span className="ink">{x}</span></p>)}</div>}
        </section>
        <section className="card pad-lg stack" style={{ gap: 10 }}>
          <h3>What to do next</h3>
          {r.tips.length ? <ol className="toplist small">{r.tips.map((t, k) => <li key={k}>{t}</li>)}</ol> : <p className="small lv-ok ih"><Icon name="ok" size={15} /> The structure looks complete.</p>}
        </section>
      </div>
      <div className="row"><button type="button" className="btn" onClick={() => setRes(null)}>Check another report</button></div>
      <PublishCTA show={!res.fromPaper} />
    </div>
  );
}
