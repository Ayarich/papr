"use client";
import { attachPdf } from "@/lib/upload-client";
import { useEffect, useState } from "react";

type Paper = { id: string; title: string; ref: string };

/** Lets a student pick a PDF (or one of their papers) and runs a tool on it. */
export default function SourcePicker({ tool, papers, steps, cta, onResult }: {
  tool: string; papers: Paper[]; steps: string[]; cta: string; onResult: (r: Record<string, unknown>) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [paper, setPaper] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(steps.length - 1, s + 1)), 800);
    return () => clearInterval(t);
  }, [busy, steps.length]);

  async function run(fromPaper?: string) {
    setError(""); setBusy(true); setStep(0);
    const fd = new FormData();
    try {
      if (fromPaper) fd.append("submissionId", fromPaper); else if (file) await attachPdf(fd, "pdf", file, "tmp");
      const r = await fetch(`/api/tools/${tool}`, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      setBusy(false);
      if (!r.ok) { setError(j.error || "Something went wrong. Try again."); return; }
      onResult(j);
    } catch (e) { setBusy(false); setError(e instanceof Error && e.name !== "TypeError" ? e.message : "Couldn't reach the server. Check your connection."); }
  }
  function take(f: File) {
    if (!(f.type === "application/pdf" || /\.pdf$/i.test(f.name))) { setError(`"${f.name}" isn't a PDF.`); return; }
    setError(""); setFile(f);
  }

  if (busy) return (
    <div className="card pad-lg maker">
      <div className="maker-anim" aria-hidden="true"><span /><span /><span /></div>
      <b>{steps[step]}</b><p className="small muted">This usually takes a few seconds.</p>
    </div>
  );
  return (
    <div className="grid g2" style={{ alignItems: "stretch" }}>
      <div className="card pad-lg stack">
        <h3>Upload a PDF</h3>
        <label className={`drop ${over ? "over" : ""}`} htmlFor={`pdf-${tool}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) take(f); }}>
          <input id={`pdf-${tool}`} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) take(f); }} />
          {file ? <><b style={{ overflowWrap: "anywhere" }}>{file.name}</b><p className="small muted">Ready. Tap to choose a different file.</p></>
            : <><b>Tap to choose a PDF</b><p className="small muted">or drag it here. Your draft stays private.</p></>}
        </label>
        <button type="button" className="btn primary" disabled={!file} onClick={() => run()}>{cta}</button>
      </div>
      <div className="card pad-lg stack">
        <h3>Or use a paper on papr</h3>
        {papers.length ? (<>
          <div className="field"><label className="lbl small" htmlFor={`paper-${tool}`}>Your papers</label>
            <select id={`paper-${tool}`} value={paper} onChange={(e) => setPaper(e.target.value)}>
              <option value="">Choose one of your submissions</option>
              {papers.map((p) => <option key={p.id} value={p.id}>{p.ref} · {p.title.slice(0, 70)}</option>)}
            </select></div>
          <button type="button" className="btn" disabled={!paper} onClick={() => run(paper)}>{cta}</button>
        </>) : <p className="muted small">Papers you submit to papr will show up here.</p>}
        <p className="hint" style={{ marginTop: "auto" }}>Uploaded drafts are only read to run the tool. They aren&apos;t saved or added to papr&apos;s plagiarism database.</p>
      </div>
      {error && <div className="notice bad" style={{ gridColumn: "1 / -1" }}>{error}</div>}
    </div>
  );
}

export function PublishCTA({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="publish-cta">
      <div><b>Publish it on papr too?</b><p className="small muted">Get a permanent link and DOI for your CV, and let employers and grad schools find your work. It takes about 10 minutes.</p></div>
      <a className="btn primary" href="/submit">Publish my research</a>
    </div>
  );
}
