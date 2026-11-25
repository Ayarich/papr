"use client";
import { useEffect, useMemo, useState } from "react";
import { checkTitle } from "@/lib/title-check";
import Icon from "@/components/Icon";
import { track } from "@/lib/track";

export default function TitleTool() {
  const [t, setT] = useState("");
  const [copied, setCopied] = useState(-1);
  const r = useMemo(() => checkTitle(t), [t]);
  useEffect(() => { if (t.trim().split(/\s+/).length >= 4) { const h = setTimeout(() => track("title"), 2000); return () => clearTimeout(h); } }, [t]);
  const tone = r.score >= 80 ? "ok" : r.score >= 55 ? "warn" : "bad";
  const copy = async (s: string, k: number) => { try { await navigator.clipboard.writeText(s); setCopied(k); setTimeout(() => setCopied(-1), 1500); } catch {} };
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="card pad-lg stack" style={{ gap: 10 }}>
        <label className="lbl" htmlFor="title-in">Your project title</label>
        <textarea id="title-in" rows={3} value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. An assessment of the impact of galamsey on water quality in the Pra River" style={{ fontSize: "1.1rem", resize: "vertical" }} />
        <p className="small muted">Checks update as you type. Nothing is saved.</p>
      </div>
      {t.trim() && (
        <div className="duo">
          <section className="card pad-lg stack" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 16, alignItems: "center" }}>
              <div className={`ts-score ${tone}`}><b className="num">{r.score}</b><span>/100</span></div>
              <div className="stack" style={{ gap: 2 }}><b>{tone === "ok" ? "Strong title" : tone === "warn" ? "Nearly there" : "Needs work"}</b><span className="small muted">{r.words} words</span></div>
            </div>
            <ul className="ts-checks">{r.checks.map((c) => (
              <li key={c.label}><Icon name={c.ok ? "ok" : "warn"} size={16} className={c.ok ? "lv-ok" : "lv-warn"} /><span><b className="small">{c.label}</b><span className="small muted"> · {c.tip}</span></span></li>
            ))}</ul>
          </section>
          <section className="card pad-lg stack" style={{ gap: 12 }}>
            <h3>Try one of these</h3>
            <p className="small muted">Replace anything in [brackets] with your own details. Your supervisor has the final say on wording.</p>
            {[r.cleaned, ...r.suggestions].filter((s, i, a) => s && a.indexOf(s) === i).map((s, k) => (
              <div key={k} className="ts-sug">
                <span className="eyebrow">{k === 0 ? "Yours, in Title Case" : `Option ${k}`}</span>
                <p>{s.split(/(\[[^\]]*\])/).map((x, j) => (x.startsWith("[") ? <mark key={j}>{x}</mark> : <span key={j}>{x}</span>))}</p>
                <div className="row" style={{ gap: 6 }}>
                  <button type="button" className="btn sm" onClick={() => copy(s, k)}><Icon name={copied === k ? "check" : "copy"} size={14} /> {copied === k ? "Copied" : "Copy"}</button>
                  {k > 0 && <button type="button" className="btn ghost sm" onClick={() => setT(s)}>Check this one</button>}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
