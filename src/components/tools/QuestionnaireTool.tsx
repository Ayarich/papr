"use client";
import { useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import { track } from "@/lib/track";

// Questionnaire builder: sections of questions (choice, tick-all, Likert grids, ratings, open answers),
// with ready-made blocks, a printable Word download and a codebook for data entry in Excel or SPSS.

type QType = "single" | "multi" | "likert" | "rating" | "short" | "long" | "yesno";
type Q = { id: string; type: QType; text: string; options: string[]; statements: string[]; scale: string[]; max: number };
type Section = { id: string; title: string; questions: Q[] };
type Survey = { title: string; intro: string; sections: Section[] };
const KEY = "papr-questionnaire";
const uid = () => Math.random().toString(36).slice(2, 9);
const SCALES: Record<string, string[]> = {
  Agreement: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
  Frequency: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  Satisfaction: ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"],
  Importance: ["Not important", "Slightly important", "Moderately important", "Important", "Very important"],
};
const TYPES: { type: QType; label: string; icon: IconName }[] = [
  { type: "single", label: "One answer", icon: "ok" }, { type: "multi", label: "Tick all", icon: "list" }, { type: "likert", label: "Likert grid", icon: "grid" },
  { type: "rating", label: "Rating", icon: "sparkles" }, { type: "yesno", label: "Yes / No", icon: "check" }, { type: "short", label: "Short answer", icon: "text" }, { type: "long", label: "Long answer", icon: "write" },
];
const newQ = (type: QType, text = ""): Q => ({
  id: uid(), type, text: text || (type === "likert" ? "To what extent do you agree with the following statements?" : type === "yesno" ? "Have you …?" : "Question text"),
  options: type === "single" || type === "multi" ? ["Option 1", "Option 2", "Option 3"] : [],
  statements: type === "likert" ? ["Statement 1", "Statement 2", "Statement 3"] : [], scale: SCALES.Agreement, max: 5,
});
const DEMOGRAPHICS = (): Section => ({ id: uid(), title: "Section A: Background information", questions: [
  { ...newQ("single", "Gender"), options: ["Male", "Female", "Prefer not to say"] },
  { ...newQ("single", "Age (years)"), options: ["Below 20", "20–29", "30–39", "40–49", "50 and above"] },
  { ...newQ("single", "Highest level of education"), options: ["No formal education", "Basic (JHS)", "Secondary (SHS)", "Tertiary", "Other"] },
  { ...newQ("short", "Occupation") },
  { ...newQ("single", "How long have you lived or worked in this area?"), options: ["Less than 1 year", "1–5 years", "6–10 years", "More than 10 years"] },
] });
const START = (): Survey => ({
  title: "Questionnaire on [your topic] in [your study area]",
  intro: "Dear respondent,\nI am a final-year student of [programme] at [university]. This questionnaire is for my project on [topic]. Your answers will be used for academic purposes only and will be kept confidential. Please do not write your name. Taking part is voluntary, and you can stop at any time. It takes about 10 minutes.\nThank you.",
  sections: [DEMOGRAPHICS(), { id: uid(), title: "Section B: [Objective 1]", questions: [newQ("likert")] }],
});

export default function QuestionnaireTool() {
  const [s, setS] = useState<Survey | null>(null);
  useEffect(() => { try { const r = localStorage.getItem(KEY); setS(r ? JSON.parse(r) : START()); } catch { setS(START()); } }, []);
  useEffect(() => { if (s) { const t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, 400); return () => clearTimeout(t); } }, [s]);
  if (!s) return null;

  const setSec = (id: string, p: Partial<Section>) => setS({ ...s, sections: s.sections.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const setQ = (sid: string, qid: string, p: Partial<Q>) => setS({ ...s, sections: s.sections.map((x) => (x.id === sid ? { ...x, questions: x.questions.map((q) => (q.id === qid ? { ...q, ...p } : q)) } : x)) });
  const moveQ = (sid: string, i: number, d: -1 | 1) => { const sec = s.sections.find((x) => x.id === sid)!; const qs = [...sec.questions]; const j = i + d; if (j < 0 || j >= qs.length) return; [qs[i], qs[j]] = [qs[j], qs[i]]; setSec(sid, { questions: qs }); };
  let n = 0; // running question number
  const numbering = new Map<string, number>(); s.sections.forEach((x) => x.questions.forEach((q) => numbering.set(q.id, ++n)));

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="pe-bar" role="toolbar" aria-label="Questionnaire">
        <div className="pe-group">
          <button type="button" className="pe-tool" onClick={() => setS({ ...s, sections: [...s.sections, { id: uid(), title: `Section ${String.fromCharCode(65 + s.sections.length)}: [Title]`, questions: [newQ("single")] }] })}><Icon name="plus" size={17} /><span>Section</span></button>
          <button type="button" className="pe-tool" onClick={() => setS({ ...s, sections: [DEMOGRAPHICS(), ...s.sections] })}><Icon name="supervisor" size={17} /><span>Background block</span></button>
        </div>
        <div className="pe-group">
          <button type="button" className="pe-tool" onClick={() => { if (confirm("Start a new questionnaire? This one will be cleared.")) setS(START()); }}><Icon name="reset" size={17} /><span>New</span></button>
        </div>
        <div className="pe-group pe-dl">
          <button type="button" className="btn sm" onClick={() => downloadCodebook(s)}><Icon name="download" size={15} /> Codebook (CSV)</button>
          <button type="button" className="btn primary sm" onClick={() => downloadDocx(s)}><Icon name="download" size={15} /> Word file</button>
        </div>
      </div>

      <div className="qb-main">
        <div className="stack" style={{ gap: 14 }}>
          <section className="card pad-lg stack" style={{ gap: 10 }}>
            <div className="field"><label className="lbl small" htmlFor="qb-title">Title</label><input id="qb-title" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} /></div>
            <div className="field"><label className="lbl small" htmlFor="qb-intro">Introduction and consent</label><textarea id="qb-intro" rows={6} value={s.intro} onChange={(e) => setS({ ...s, intro: e.target.value })} /></div>
            <p className="hint">Keep the consent wording: it tells people their answers are confidential and voluntary. Don&apos;t ask for names or phone numbers.</p>
          </section>

          {s.sections.map((sec, si) => (
            <section key={sec.id} className="card pad-lg stack" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                <input aria-label="Section title" value={sec.title} onChange={(e) => setSec(sec.id, { title: e.target.value })} style={{ fontWeight: 800, flex: 1 }} />
                <button type="button" className="pe-mini danger" aria-label="Delete section" title="Delete section" onClick={() => s.sections.length > 1 && confirm("Delete this section and its questions?") && setS({ ...s, sections: s.sections.filter((x) => x.id !== sec.id) })}><Icon name="trash" size={14} /></button>
              </div>
              {sec.questions.map((q, qi) => (
                <div key={q.id} className="qb-q">
                  <div className="row between" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span className="small muted num">Q{numbering.get(q.id)} · {TYPES.find((t) => t.type === q.type)?.label}</span>
                    <div className="row" style={{ gap: 4 }}>
                      <select aria-label="Question type" value={q.type} onChange={(e) => { const t = e.target.value as QType; const base = newQ(t, q.text); setQ(sec.id, q.id, { type: t, options: q.options.length ? q.options : base.options, statements: q.statements.length ? q.statements : base.statements }); }} style={{ width: "auto", padding: "4px 8px", fontSize: ".82rem" }}>
                        {TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                      </select>
                      <button type="button" className="pe-mini" aria-label="Move up" onClick={() => moveQ(sec.id, qi, -1)}><Icon name="prev" size={14} className="rot90" /></button>
                      <button type="button" className="pe-mini" aria-label="Move down" onClick={() => moveQ(sec.id, qi, 1)}><Icon name="next" size={14} className="rot90" /></button>
                      <button type="button" className="pe-mini" aria-label="Duplicate" onClick={() => setSec(sec.id, { questions: [...sec.questions.slice(0, qi + 1), { ...q, id: uid() }, ...sec.questions.slice(qi + 1)] })}><Icon name="copy" size={14} /></button>
                      <button type="button" className="pe-mini danger" aria-label="Delete question" onClick={() => setSec(sec.id, { questions: sec.questions.filter((x) => x.id !== q.id) })}><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                  <input aria-label="Question" value={q.text} onChange={(e) => setQ(sec.id, q.id, { text: e.target.value })} />
                  {(q.type === "single" || q.type === "multi") && <ListEdit label="Options" items={q.options} onChange={(options) => setQ(sec.id, q.id, { options })} />}
                  {q.type === "likert" && <>
                    <ListEdit label="Statements" items={q.statements} onChange={(statements) => setQ(sec.id, q.id, { statements })} />
                    <div className="row small" style={{ gap: 6, flexWrap: "wrap" }}><span className="muted">Scale:</span>{Object.entries(SCALES).map(([k, v]) => <button key={k} type="button" className={`tag ${q.scale.join() === v.join() ? "" : "plain"}`} onClick={() => setQ(sec.id, q.id, { scale: v })}>{k}</button>)}</div>
                  </>}
                  {q.type === "rating" && <div className="row small" style={{ gap: 6 }}><span className="muted">Scale 1 to</span><select value={q.max} onChange={(e) => setQ(sec.id, q.id, { max: Number(e.target.value) })} style={{ width: "auto", padding: "4px 8px" }}><option value={5}>5</option><option value={10}>10</option></select></div>}
                </div>
              ))}
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <span className="small muted">Add:</span>
                {TYPES.map((t) => <button key={t.type} type="button" className="btn ghost sm" onClick={() => setSec(sec.id, { questions: [...sec.questions, newQ(t.type)] })}><Icon name={t.icon} size={14} /> {t.label}</button>)}
              </div>
              {si === s.sections.length - 1 && <p className="hint">Tip: give each objective its own section, so your Chapter 4 can follow the same order.</p>}
            </section>
          ))}
        </div>

        <aside className="qb-preview" aria-label="Preview">
          <div className="qb-paper">
            <h4>{s.title}</h4>
            {s.intro.split("\n").map((l, k) => <p key={k} className="qb-intro">{l}</p>)}
            {s.sections.map((sec) => (
              <div key={sec.id}>
                <h5>{sec.title}</h5>
                {sec.questions.map((q) => (
                  <div key={q.id} className="qb-pq">
                    <p><b>{numbering.get(q.id)}.</b> {q.text}{q.type === "multi" ? " (Tick all that apply)" : ""}</p>
                    {(q.type === "single" || q.type === "multi") && <div className="qb-opts">{q.options.map((o, k) => <span key={k}>☐ {o}</span>)}</div>}
                    {q.type === "yesno" && <div className="qb-opts"><span>☐ Yes</span><span>☐ No</span></div>}
                    {q.type === "rating" && <div className="qb-opts">{Array.from({ length: q.max }, (_, k) => <span key={k}>☐ {k + 1}</span>)}</div>}
                    {q.type === "short" && <div className="qb-line" />}
                    {q.type === "long" && <><div className="qb-line" /><div className="qb-line" /><div className="qb-line" /></>}
                    {q.type === "likert" && (
                      <table className="qb-grid"><thead><tr><th />{q.scale.map((x) => <th key={x}>{x}</th>)}</tr></thead>
                        <tbody>{q.statements.map((st, k) => <tr key={k}><td>{st}</td>{q.scale.map((x) => <td key={x}>☐</td>)}</tr>)}</tbody></table>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <p className="qb-intro" style={{ textAlign: "center", marginTop: 12 }}><b>Thank you for your time.</b></p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ListEdit({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small muted">{label}</span>
      {items.map((it, k) => (
        <div key={k} className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
          <input aria-label={`${label} ${k + 1}`} value={it} onChange={(e) => onChange(items.map((x, j) => (j === k ? e.target.value : x)))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onChange([...items.slice(0, k + 1), "", ...items.slice(k + 1)]); } }} style={{ padding: "6px 10px", fontSize: ".9rem" }} />
          <button type="button" className="pe-mini" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== k))}><Icon name="x" size={13} /></button>
        </div>
      ))}
      <div><button type="button" className="btn ghost sm" onClick={() => onChange([...items, ""])}><Icon name="plus" size={13} /> Add</button></div>
    </div>
  );
}

// ---- exports ----
function codebookRows(s: Survey) {
  const rows: string[][] = [["Variable", "Question", "Type", "Values"]]; let n = 0;
  for (const sec of s.sections) for (const q of sec.questions) {
    n++;
    if (q.type === "single") rows.push([`Q${n}`, q.text, "Single choice", q.options.map((o, k) => `${k + 1} = ${o}`).join("; ")]);
    else if (q.type === "multi") q.options.forEach((o, k) => rows.push([`Q${n}_${k + 1}`, `${q.text}: ${o}`, "Ticked", "1 = Yes; 0 = No"]));
    else if (q.type === "likert") q.statements.forEach((st, k) => rows.push([`Q${n}_${k + 1}`, st, "Likert", q.scale.map((x, j) => `${j + 1} = ${x}`).join("; ")]));
    else if (q.type === "yesno") rows.push([`Q${n}`, q.text, "Yes / No", "1 = Yes; 0 = No"]);
    else if (q.type === "rating") rows.push([`Q${n}`, q.text, "Rating", `1–${q.max}`]);
    else rows.push([`Q${n}`, q.text, "Text", "Type the answer"]);
  }
  return rows;
}
function downloadCodebook(s: Survey) {
  const csv = codebookRows(s).map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = "Questionnaire codebook.csv"; a.click(); URL.revokeObjectURL(a.href);
}
async function downloadDocx(s: Survey) {
  track("questionnaire");
  const D = await import("docx");
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = D;
  const kids: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  const P = (text: string, o: { bold?: boolean; size?: number; center?: boolean; after?: number; italic?: boolean } = {}) =>
    new Paragraph({ alignment: o.center ? AlignmentType.CENTER : undefined, spacing: { after: o.after ?? 120 }, children: [new TextRun({ text, bold: o.bold, italics: o.italic, size: o.size ?? 22, font: "Arial" })] });
  kids.push(P(s.title.toUpperCase(), { bold: true, size: 26, center: true, after: 200 }));
  s.intro.split("\n").forEach((l) => kids.push(P(l, { italic: true, size: 20 })));
  let n = 0;
  const cell = (t: string, bold = false, w?: number) => new TableCell({ width: w ? { size: w, type: WidthType.PERCENTAGE } : undefined, children: [new Paragraph({ alignment: t === "☐" ? AlignmentType.CENTER : undefined, children: [new TextRun({ text: t, bold, size: 18, font: "Arial" })] })] });
  for (const sec of s.sections) {
    kids.push(P(sec.title, { bold: true, size: 23, after: 120 }));
    for (const q of sec.questions) {
      n++;
      kids.push(P(`${n}. ${q.text}${q.type === "multi" ? " (Tick all that apply)" : ""}`, { bold: true, after: 60 }));
      if (q.type === "single" || q.type === "multi") kids.push(P(q.options.map((o) => `☐ ${o}`).join("      "), { after: 160 }));
      if (q.type === "yesno") kids.push(P("☐ Yes      ☐ No", { after: 160 }));
      if (q.type === "rating") kids.push(P(Array.from({ length: q.max }, (_, k) => `☐ ${k + 1}`).join("   "), { after: 160 }));
      if (q.type === "short") kids.push(P("…………………………………………………………………………………………", { after: 160 }));
      if (q.type === "long") for (let k = 0; k < 3; k++) kids.push(P("…………………………………………………………………………………………", { after: k === 2 ? 160 : 60 }));
      if (q.type === "likert") {
        const w = Math.floor(55 / q.scale.length);
        kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: { style: BorderStyle.SINGLE, size: 4, color: "999999" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" }, left: { style: BorderStyle.SINGLE, size: 4, color: "999999" }, right: { style: BorderStyle.SINGLE, size: 4, color: "999999" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "999999" }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "999999" } },
          rows: [new TableRow({ tableHeader: true, children: [cell("Statement", true, 45), ...q.scale.map((x) => cell(x, true, w))] }),
            ...q.statements.map((st) => new TableRow({ children: [cell(st, false, 45), ...q.scale.map(() => cell("☐", false, w))] }))] }));
        kids.push(P("", { after: 160 }));
      }
    }
  }
  kids.push(P("Thank you for your time.", { bold: true, center: true }));
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: kids }] });
  const blob = await Packer.toBlob(doc);
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${s.title.replace(/[^\w\s-]/g, "").slice(0, 60).trim() || "Questionnaire"}.docx`; a.click(); URL.revokeObjectURL(a.href);
}
