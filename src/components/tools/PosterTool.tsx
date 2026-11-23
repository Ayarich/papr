"use client";
import { useState } from "react";
import type { PosterContent } from "@/lib/poster-content";
import { THEMES, type ThemeKey } from "@/lib/deck";
import { downloadPoster } from "@/lib/poster-pptx";
import SourcePicker, { PublishCTA } from "./SourcePicker";

export default function PosterTool({ papers }: { papers: { id: string; title: string; ref: string }[] }) {
  const [res, setRes] = useState<{ poster: PosterContent; fromPaper: boolean } | null>(null);
  const [p, setP] = useState<PosterContent | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("forest");
  const [busy, setBusy] = useState(false);
  if (!res || !p) return <SourcePicker tool="poster" papers={papers} cta="Make my poster" steps={["Reading your paper…", "Picking your key findings…", "Laying out your poster…"]} onResult={(r) => { setRes(r as never); setP((r as { poster: PosterContent }).poster); }} />;
  const t = THEMES[theme];
  const light = theme === "paper" || theme === "sunrise";
  const list = (k: keyof PosterContent) => (p[k] as string[]);
  const edit = (k: keyof PosterContent, i: number, v: string) => setP({ ...p, [k]: list(k).map((x, j) => (j === i ? v : x)) });
  const Block = ({ k, head }: { k: keyof PosterContent; head: string }) => list(k).length ? (
    <div className="pb"><h4 style={{ color: light ? (theme === "paper" ? t.text : t.accent) : t.bg }}>{head}</h4><ul>{list(k).map((b, i) => <li key={i} contentEditable suppressContentEditableWarning onBlur={(e) => edit(k, i, e.currentTarget.innerText)}>{b}</li>)}</ul></div>
  ) : null;
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row between">
        <div className="row" style={{ gap: 6 }}>{(Object.keys(THEMES) as ThemeKey[]).map((k) => <button key={k} type="button" className={`swatch${theme === k ? " on" : ""}`} style={{ background: THEMES[k].bg }} onClick={() => setTheme(k)} aria-label={THEMES[k].name} title={THEMES[k].name}><i style={{ background: THEMES[k].accent }} /></button>)}</div>
        <button type="button" className="btn primary" disabled={busy} onClick={async () => { setBusy(true); try { await downloadPoster(p, theme); } finally { setBusy(false); } }}>{busy ? "Building…" : "Download A0 poster (.pptx)"}</button>
      </div>
      <p className="hint">Click any text on the poster to edit it. The download is an editable PowerPoint at A0 size (841 × 1189 mm), ready for printing.</p>
      <div className="poster" style={{ background: light ? t.bg : "#fff", color: light ? t.text : "#111316" }}>
        <div className="p-head" style={{ background: t.bg, color: t.text }}>
          <span className="bar" style={{ background: t.accent }} />
          <h2 contentEditable suppressContentEditableWarning onBlur={(e) => setP({ ...p, title: e.currentTarget.innerText })}>{p.title}</h2>
          <p style={{ color: t.muted }}>{[p.authors, p.supervisor && `Supervisor: ${p.supervisor}`, p.institution, p.year].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="p-cols">
          <div><Block k="background" head="Background" /><Block k="objectives" head="Objectives" /><Block k="method" head="Methodology" /></div>
          <div>
            <div className="p-key" style={{ background: t.bg, color: t.text }}><span style={{ color: t.accent }}>KEY FINDING</span><b contentEditable suppressContentEditableWarning onBlur={(e) => setP({ ...p, headline: e.currentTarget.innerText })}>{p.headline}</b></div>
            <Block k="findings" head="Results" /><Block k="conclusion" head="Conclusion" /><Block k="recommendations" head="Recommendations" />
          </div>
        </div>
        <div className="p-foot"><div>{p.references.length > 0 && <><b>References</b>{p.references.map((r, i) => <p key={i}>{r}</p>)}</>}</div>
          <div className="p-qr">{p.link ? <><span className="qr-ph" aria-hidden="true">QR</span><span>Scan to read the full paper</span></> : <span className="muted">Publish on papr to add a QR code to your full paper</span>}</div></div>
      </div>
      <div className="row"><button type="button" className="btn" onClick={() => { setRes(null); setP(null); }}>Make another poster</button></div>
      <PublishCTA show={!res.fromPaper} />
    </div>
  );
}
