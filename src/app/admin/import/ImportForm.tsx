"use client";
import { attachPdf } from "@/lib/upload-client";
import { useState } from "react";

type Result = { row: number; ok: boolean; message: string; ref?: string };

export default function ImportForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(""); setResults(null);
    const form = new FormData(e.currentTarget), fd = new FormData();
    fd.append("csv", form.get("csv") as File);
    const pdfs = form.getAll("pdfs").filter((f): f is File => f instanceof File && f.size > 0);
    try {
      for (const [i, f] of pdfs.entries()) { setProgress(`Uploading PDF ${i + 1} of ${pdfs.length}…`); await attachPdf(fd, "pdfs", f, "papers"); }
    } catch (err) { setBusy(false); setProgress(""); setError((err as Error).message); return; }
    setProgress("Importing…");
    const r = await fetch("/api/admin/import", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    setBusy(false); setProgress("");
    if (!r.ok) { setError(j.error || "Import failed."); return; }
    setResults(j.results);
  }
  return (
    <form className="card pad-lg stack" onSubmit={submit}>
      <div className="field"><label className="lbl" htmlFor="csv">1. Spreadsheet (CSV)</label><input type="file" id="csv" name="csv" accept=".csv,text/csv" required /></div>
      <div className="field"><label className="lbl" htmlFor="pdfs">2. The project PDFs <span className="muted">(select them all at once)</span></label><input type="file" id="pdfs" name="pdfs" accept="application/pdf,.pdf" multiple required /></div>
      <div><button className="btn primary" type="submit" disabled={busy}>{busy ? progress || "Importing…" : "Import and send claim emails"}</button></div>
      {error && <div className="notice bad">{error}</div>}
      {results && (
        <div className="stack" style={{ gap: 8 }}>
          <b>{results.filter((r) => r.ok).length} of {results.length} imported</b>
          {results.map((r) => (
            <div key={r.row} className={`notice small ${r.ok ? "ok" : "bad"}`}>Row {r.row}: {r.message}{r.ref ? <> · <a href={`/papers/${r.ref}`}>{r.ref}</a></> : null}</div>
          ))}
        </div>
      )}
    </form>
  );
}
