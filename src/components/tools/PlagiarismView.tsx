"use client";
import { useMemo, useState } from "react";
import type { Report } from "@/lib/plagiarism";

const COLOURS = ["#E5484D", "#F76B15", "#E2A336", "#3E63DD", "#8E4EC6", "#12A594"];

function verdict(p: number) {
  if (p < 15) return { level: "low", label: "Low similarity" };
  if (p < 30) return { level: "medium", label: "Some overlap: check the highlighted passages" };
  return { level: "high", label: "High similarity: likely copied text" };
}

/** Similarity report: score, sources and the text with matching passages highlighted. */
export default function PlagiarismView({ report, linkSources = true }: { report: Report; linkSources?: boolean }) {
  const [only, setOnly] = useState<number | null>(null);
  const v = verdict(report.percent);
  const parts = useMemo(() => {
    const spans = [...report.spans].sort((a, b) => a.start - b.start);
    const out: { text: string; source: number | null }[] = [];
    let at = 0;
    for (const s of spans) {
      if (s.start < at) continue;
      if (s.start > at) out.push({ text: report.text.slice(at, s.start), source: null });
      out.push({ text: report.text.slice(s.start, s.end), source: s.source });
      at = s.end;
    }
    out.push({ text: report.text.slice(at), source: null });
    return out;
  }, [report]);
  const pct = Math.min(100, report.percent);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="plag-top">
        <div className={`ring ${v.level}`} style={{ ["--p" as string]: pct }}><b className="num">{report.percent}%</b><span>similar</span></div>
        <div className="stack" style={{ gap: 6 }}>
          <h3>{v.label}</h3>
          <p className="small muted"><span className="num">{report.matchedWords.toLocaleString()}</span> of <span className="num">{report.words.toLocaleString()}</span> words match {report.sources.length} source{report.sources.length === 1 ? "" : "s"} in papr. Passages under 8 words{report.excluded.quotes ? ", quoted text" : ""}{report.excluded.references ? " and the reference list" : ""} are left out.</p>
        </div>
      </div>
      {report.sources.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <b className="small">Matching sources</b>
          {report.sources.map((s, i) => (
            <button key={s.submissionId} type="button" className={`src-row${only === i ? " on" : ""}`} onClick={() => setOnly(only === i ? null : i)}>
              <i style={{ background: COLOURS[s.colour] }} />
              <span className="grow"><b>{s.title}</b><span className="small muted">{s.ref} · {s.authors}{s.status !== "published" ? " · not yet published" : ""}</span></span>
              <b className="num">{s.percent}%</b>
            </button>
          ))}
          {linkSources && <p className="hint">Tap a source to highlight only its passages.</p>}
        </div>
      )}
      <div className="plag-text">
        {parts.map((p, i) => p.source === null ? <span key={i}>{p.text}</span> : (
          <mark key={i} style={{ ["--c" as string]: COLOURS[report.sources[p.source]?.colour ?? 0], opacity: only === null || only === p.source ? 1 : 0.25 }} title={report.sources[p.source]?.title}>{p.text}</mark>
        ))}
      </div>
    </div>
  );
}
