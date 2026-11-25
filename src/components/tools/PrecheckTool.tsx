"use client";
import { useState } from "react";
import type { Report } from "@/lib/plagiarism";
import type { AbstractReport } from "@/lib/abstract";
import type { ProviderResult } from "@/lib/plagiarism-providers";
import SourcePicker, { PublishCTA } from "./SourcePicker";
import PlagiarismView from "./PlagiarismView";
import Icon from "@/components/Icon";

type Res = { report: Report; abstract: AbstractReport; external: ProviderResult | null; provider: string | null; fromPaper: boolean };

export default function PrecheckTool({ papers }: { papers: { id: string; title: string; ref: string }[] }) {
  const [res, setRes] = useState<Res | null>(null);
  const [tab, setTab] = useState<"sim" | "abs">("sim");
  if (!res) return <SourcePicker tool="precheck" papers={papers} cta="Run my pre-check" steps={["Reading your paper…", "Fingerprinting every sentence…", "Comparing with papr's library…", "Checking your abstract…"]} onResult={(r) => setRes(r as never)} />;
  const a = res.abstract;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === "sim"} onClick={() => setTab("sim")}>Similarity <span className="num">{res.report.percent}%</span></button>
        <button role="tab" aria-selected={tab === "abs"} onClick={() => setTab("abs")}>Abstract <span className="num">{a.score}/100</span></button>
      </div>
      {tab === "sim" ? (
        <div className="card pad-lg stack">
          <PlagiarismView report={res.report} />
          <div className="notice info small">papr compares your text with every paper in its library. {res.external ? `${res.external.provider} also checked the web: ${res.external.percent}% similar.` : "Web and journal checking can be added by connecting a commercial service such as Crossref Similarity Check (iThenticate)."}</div>
        </div>
      ) : (
        <div className="card pad-lg stack" style={{ gap: 18 }}>
          <div className="plag-top">
            <div className={`ring ${a.score >= 75 ? "low" : a.score >= 50 ? "medium" : "high"}`} style={{ ["--p" as string]: a.score }}><b className="num">{a.score}</b><span>out of 100</span></div>
            <div><h3>Abstract check</h3><p className="small muted"><span className="num">{a.words}</span> words · <span className="num">{a.sentences}</span> sentences</p></div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <b className="small">Does it have the five parts examiners look for?</b>
            {a.parts.map((p) => (
              <div key={p.key} className={`part-row ${p.found ? "ok" : "no"}`}>
                <span>{p.found ? <Icon name="check" size={15} /> : <Icon name="x" size={15} />}</span>
                <div><b>{p.label}</b>{p.found ? <p className="small muted">“{p.example}”</p> : <p className="small">{p.tip}</p>}</div>
              </div>
            ))}
          </div>
          {a.issues.length > 0 && (
            <div className="stack" style={{ gap: 8 }}><b className="small">Suggestions</b>
              {a.issues.map((x, i) => <div key={i} className="fix-row"><b className="small">{x.problem}</b>{x.sentence && <div className="small muted">“{x.sentence}”</div>}<div className="small">→ {x.suggestion}</div></div>)}
            </div>
          )}
          {!a.abstract && <div className="notice gold">We couldn&apos;t find your abstract. Start it with a heading called <b>Abstract</b>.</div>}
        </div>
      )}
      <div className="row"><button type="button" className="btn" onClick={() => setRes(null)}>Check another paper</button></div>
      <PublishCTA show={!res.fromPaper} />
    </div>
  );
}
