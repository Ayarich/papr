"use client";
import { attachPdf } from "@/lib/upload-client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Reading your paper…", "Finding the key points…", "Writing your bullets…", "Designing your slides…"];

export default function NewDeck({ papers, preselect }: { papers: { id: string; title: string; ref: string }[]; preselect: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [paper, setPaper] = useState(preselect);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 900);
    return () => clearInterval(t);
  }, [busy]);
  const started = useRef(false); // stops a second deck being made if this runs twice
  useEffect(() => {
    if (preselect && !started.current) { started.current = true; make(preselect); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function make(fromPaper?: string) {
    setError(""); setBusy(true); setStep(0);
    const fd = new FormData();
    try {
      if (fromPaper) fd.append("submissionId", fromPaper); else if (file) await attachPdf(fd, "pdf", file, "tmp");
      const r = await fetch("/api/decks", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setBusy(false); setError(j.error || "Something went wrong. Try again."); return; }
      router.push(`/slides/${j.id}`);
    } catch (e) { setBusy(false); setError(e instanceof Error && e.name !== "TypeError" ? e.message : "Couldn't reach the server. Check your connection."); }
  }

  function take(f: File) {
    if (!(f.type === "application/pdf" || /\.pdf$/i.test(f.name))) { setError(`"${f.name}" isn't a PDF.`); return; }
    setError(""); setFile(f);
  }

  if (busy) {
    return (
      <div className="card pad-lg maker">
        <div className="maker-anim" aria-hidden="true"><span /><span /><span /></div>
        <b>{STEPS[step]}</b>
        <p className="small muted">This usually takes a few seconds.</p>
      </div>
    );
  }

  return (
    <div className="grid g2" style={{ alignItems: "stretch" }}>
      <div className="card pad-lg stack">
        <h3>Upload a PDF</h3>
        <label className={`drop ${over ? "over" : ""}`} htmlFor="deck-pdf"
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) take(f); }}>
          <input id="deck-pdf" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) take(f); }} />
          {file ? <><b style={{ overflowWrap: "anywhere" }}>{file.name}</b><p className="small muted">Ready. Tap to choose a different file.</p></>
            : <><b>Tap to choose a PDF</b><p className="small muted">or drag it here. Your project, thesis or paper.</p></>}
        </label>
        <button type="button" className="btn primary" disabled={!file} onClick={() => make()}>Make my slides ✨</button>
      </div>
      <div className="card pad-lg stack">
        <h3>Or use a paper on papr</h3>
        {papers.length ? (
          <>
            <div className="field"><label className="lbl small" htmlFor="paper">Your papers</label>
              <select id="paper" value={paper} onChange={(e) => setPaper(e.target.value)}>
                <option value="">Choose one of your submissions</option>
                {papers.map((p) => <option key={p.id} value={p.id}>{p.ref} · {p.title.slice(0, 70)}</option>)}
              </select></div>
            <button type="button" className="btn" disabled={!paper} onClick={() => make(paper)}>Make slides from this paper</button>
          </>
        ) : <p className="muted small">Papers you submit to papr will show up here.</p>}
        <p className="hint" style={{ marginTop: "auto" }}>Works best with PDFs exported from Word or Google Docs. Scanned pages can&apos;t be read.</p>
      </div>
      {error && <div className="notice bad" style={{ gridColumn: "1 / -1" }}>{error}</div>}
    </div>
  );
}
