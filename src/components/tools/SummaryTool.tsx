"use client";
import { useState } from "react";
import type { ResearchSummary } from "@/lib/research-summary";
import SourcePicker, { PublishCTA } from "./SourcePicker";
import Icon from "@/components/Icon";
import { track } from "@/lib/track";

// One-page research summary for applications. Everything is editable before downloading.
type Extra = { email: string; programme: string; profile: string };

export default function SummaryTool({ papers, me }: { papers: { id: string; title: string; ref: string }[]; me: { name: string; email: string; programme: string } }) {
  const [res, setRes] = useState<{ summary: ResearchSummary; fromPaper: boolean } | null>(null);
  const [s, setS] = useState<ResearchSummary | null>(null);
  const [x, setX] = useState<Extra>({ email: me.email, programme: me.programme, profile: "" });
  if (!res || !s) return <SourcePicker tool="summary" papers={papers} cta="Make my summary" steps={["Reading your paper…", "Pulling out your findings…", "Listing your skills…"]} onResult={(r) => { const sum = (r as { summary: ResearchSummary }).summary; setRes(r as never); setS({ ...sum, name: sum.name || me.name }); }} />;

  const set = (p: Partial<ResearchSummary>) => setS({ ...s, ...p });
  const Text = ({ k, tag = "p", ph }: { k: "title" | "name" | "institution" | "supervisor" | "year" | "overview" | "problem"; tag?: "p" | "h2" | "b"; ph: string }) => {
    const T = tag;
    return <T className={`rs-edit${!s[k] ? " empty" : ""}`} contentEditable suppressContentEditableWarning data-ph={ph} onBlur={(e) => set({ [k]: e.currentTarget.innerText.trim() })}>{s[k]}</T>;
  };
  const List = ({ k, ph }: { k: "objectives" | "methods" | "findings" | "impact"; ph: string }) => (
    <ul className="rs-list">
      {(s[k].length ? s[k] : [""]).map((b, i) => <li key={i} className={`rs-edit${!b ? " empty" : ""}`} data-ph={ph} contentEditable suppressContentEditableWarning onBlur={(e) => { const v = e.currentTarget.innerText.trim(); const arr = [...s[k]]; if (v) arr[i] = v; else arr.splice(i, 1); set({ [k]: arr }); }}>{b}</li>)}
      <li className="rs-add"><button type="button" className="linkbtn small" onClick={() => set({ [k]: [...s[k], "New point"] })}>+ Add a point</button></li>
    </ul>
  );

  const download = async () => {
    track("summary-docx");
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import("docx");
    const F = "Arial";
    const head = (t: string) => new Paragraph({ spacing: { before: 200, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 2 } }, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 20, font: F, color: "333333" })] });
    const para = (t: string) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: t, size: 20, font: F })] });
    const bullets = (a: string[]) => a.map((t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: t, size: 20, font: F })] }));
    const meta = [s.name, x.programme, s.institution, s.year].filter(Boolean).join("  ·  ");
    const contact = [x.email, x.profile, s.link].filter(Boolean).join("  ·  ");
    const doc = new Document({ sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children: [
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "RESEARCH SUMMARY", bold: true, size: 18, font: F, color: "777777" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: s.title, bold: true, size: 30, font: F })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: meta, size: 20, font: F })] }),
      ...(s.supervisor ? [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `Supervisor: ${s.supervisor}`, size: 20, font: F })] })] : []),
      ...(contact ? [new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: contact, size: 18, font: F, color: "555555" })] })] : []),
      head("Overview"), para(s.overview),
      ...(s.problem ? [head("The problem"), para(s.problem)] : []),
      ...(s.objectives.length ? [head("Objectives"), ...bullets(s.objectives)] : []),
      ...(s.methods.length ? [head("What I did"), ...bullets(s.methods)] : []),
      ...(s.findings.length ? [head("Key findings"), ...bullets(s.findings)] : []),
      ...(s.impact.length ? [head("Why it matters"), ...bullets(s.impact)] : []),
      ...(s.skills.length ? [head("Skills used"), para(s.skills.join("  ·  "))] : []),
      new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240 }, children: [new TextRun({ text: s.link ? "Full paper on papr" : "Made with papr", size: 16, font: F, color: "999999" })] }),
    ] }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Research summary - ${s.name || "papr"}.docx`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
        <p className="small muted" style={{ maxWidth: "60ch" }}>Click any text to edit it. Keep it to one page and only include what you really did. Admissions panels may ask about every line.</p>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn sm" onClick={() => window.print()}><Icon name="download" size={15} /> Print or PDF</button>
          <button type="button" className="btn primary sm" onClick={download}><Icon name="download" size={15} /> Word file</button>
        </div>
      </div>
      <div className="cite-grid">
        <div className="field span2"><label className="lbl small" htmlFor="rs-prog">Programme</label><input id="rs-prog" value={x.programme} onChange={(e) => setX({ ...x, programme: e.target.value })} placeholder="BSc Geomatic Engineering" /></div>
        <div className="field"><label className="lbl small" htmlFor="rs-mail">Email</label><input id="rs-mail" value={x.email} onChange={(e) => setX({ ...x, email: e.target.value })} /></div>
        <div className="field"><label className="lbl small" htmlFor="rs-prof">LinkedIn or profile</label><input id="rs-prof" value={x.profile} onChange={(e) => setX({ ...x, profile: e.target.value })} placeholder="linkedin.com/in/…" /></div>
      </div>
      <article className="rs-page">
        <span className="rs-eyebrow">Research summary</span>
        <Text k="title" tag="h2" ph="Project title" />
        <p className="rs-meta"><Text k="name" tag="b" ph="Your name" />{x.programme && <span> · {x.programme}</span>} · <Text k="institution" tag="b" ph="University" /> · <Text k="year" tag="b" ph="Year" /></p>
        <p className="rs-meta">Supervisor: <Text k="supervisor" tag="b" ph="Supervisor's name" /></p>
        <p className="rs-meta muted">{[x.email, x.profile, s.link].filter(Boolean).join(" · ")}</p>
        <h4>Overview</h4><Text k="overview" ph="Two sentences on what you studied and what you found." />
        <h4>The problem</h4><Text k="problem" ph="What gap or problem did your project address?" />
        <h4>Objectives</h4><List k="objectives" ph="An objective" />
        <h4>What I did</h4><List k="methods" ph="Data, tools and methods you used" />
        <h4>Key findings</h4><List k="findings" ph="A finding, with a number if you have one" />
        <h4>Why it matters</h4><List k="impact" ph="Who can use your results, and how" />
        <h4>Skills used</h4>
        <div className="rs-skills">{s.skills.map((k, i) => <span key={i} className="tag plain">{k}<button type="button" aria-label={`Remove ${k}`} onClick={() => set({ skills: s.skills.filter((_, j) => j !== i) })}><Icon name="x" size={11} /></button></span>)}
          <input aria-label="Add a skill" placeholder="+ Add a skill, press Enter" onKeyDown={(e) => { const v = e.currentTarget.value.trim(); if (e.key === "Enter" && v) { set({ skills: [...s.skills, v] }); e.currentTarget.value = ""; } }} /></div>
      </article>
      <div className="row"><button type="button" className="btn" onClick={() => { setRes(null); setS(null); }}>Use another paper</button></div>
      <PublishCTA show={!res.fromPaper} />
    </div>
  );
}
