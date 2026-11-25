"use client";
import { useState } from "react";
import type { RefReport } from "@/lib/references";
import SourcePicker, { PublishCTA } from "./SourcePicker";
import CopyButton from "@/components/CopyButton";
import Icon from "@/components/Icon";

export default function ReferencesTool({ papers }: { papers: { id: string; title: string; ref: string }[] }) {
  const [res, setRes] = useState<{ report: RefReport; fromPaper: boolean } | null>(null);
  if (!res) return <SourcePicker tool="references" papers={papers} cta="Check my references" steps={["Reading your paper…", "Finding citations…", "Matching your reference list…", "Formatting to APA 7…"]} onResult={(r) => setRes(r as never)} />;
  const r = res.report;
  const withIssues = r.references.filter((e) => e.issues.length);
  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="grid g3">
        <div className="card stat"><b className="num">{r.stats.citations}</b><span>citations found in your text</span></div>
        <div className="card stat"><b className="num">{r.stats.references}</b><span>entries in your reference list</span></div>
        <div className={`card stat ${r.missingFromList.length || r.uncited.length ? "warn" : "good"}`}><b className="num">{r.missingFromList.length + r.uncited.length}</b><span>mismatches to fix</span></div>
      </div>
      {r.stats.references === 0 && <div className="notice gold">We couldn&apos;t find a reference list. Make sure it starts with a heading called <b>References</b>.</div>}
      {r.missingFromList.length > 0 && (
        <section className="card stack"><h3 className="ih"><Icon name="bad" size={18} /> Cited in your text, missing from your reference list</h3>
          {r.missingFromList.map((c, i) => <div key={i} className="issue-row"><b>{c.surname} ({c.year})</b><span className="small muted">cited {c.count}× as {c.raw}. {c.hint || "Add the full reference."}</span></div>)}</section>
      )}
      {r.uncited.length > 0 && (
        <section className="card stack"><h3 className="ih"><Icon name="warn" size={18} /> In your reference list, but never cited</h3>
          {r.uncited.map((e, i) => <div key={i} className="issue-row"><span className="small">{e.raw}</span><span className="small muted">Cite it in the text, or remove it.</span></div>)}</section>
      )}
      {!r.orderOk && <div className="notice gold">Your reference list isn&apos;t in alphabetical order. APA lists references A–Z by first author&apos;s surname. The corrected list below is sorted for you.</div>}
      {withIssues.length > 0 && (
        <section className="card stack"><h3 className="ih"><Icon name="pencil" size={18} /> Formatting fixes</h3>
          {withIssues.map((e, i) => (
            <div key={i} className="fix-row"><div className="small muted strike">{e.raw}</div><div className="small"><b>{e.apa}</b></div><ul className="small">{e.issues.map((x) => <li key={x}>{x}</li>)}</ul></div>
          ))}</section>
      )}
      {r.references.length > 0 && (
        <section className="card stack"><div className="row between"><h3>Your reference list in APA 7</h3><CopyButton text={r.apaList} label="Copy list" /></div>
          <div className="apa-list">{r.apaList.split("\n\n").map((x, i) => <p key={i}>{x}</p>)}</div>
          <p className="hint">Check each entry: automatic formatting can&apos;t know every detail (e.g. whether a source is a book or a journal).</p></section>
      )}
      <div className="row"><button type="button" className="btn" onClick={() => setRes(null)}>Check another paper</button></div>
      <PublishCTA show={!res.fromPaper} />
    </div>
  );
}
