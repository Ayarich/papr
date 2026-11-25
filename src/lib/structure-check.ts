// Report structure check: which chapters are there, how long each one is, and whether tables and figures
// are numbered in order, captioned and mentioned in the text.
import { headingKey } from "./deck";
import { splitReferences, findCitations } from "./references";

export type Mode = "report" | "article";
export type Part = { key: string; name: string; words: number; found: boolean; min: number; max: number; optional?: boolean; status: "ok" | "short" | "long" | "missing" };
export type Item = { kind: "Table" | "Figure"; num: string; caption: string; mentioned: boolean };
export type StructureReport = {
  mode: Mode; totalWords: number; pages: number; parts: Part[];
  items: Item[]; itemIssues: string[]; references: number; citations: number; keywords: boolean; score: number; tips: string[];
};

const GROUPS: { key: string; name: string; from: string[]; report: [number, number]; article: [number, number]; optional?: boolean }[] = [
  { key: "abstract", name: "Abstract", from: ["abstract"], report: [150, 400], article: [120, 400] },
  { key: "intro", name: "Introduction", from: ["background", "problem", "objectives"], report: [1000, 3500], article: [350, 1300] },
  { key: "lit", name: "Literature review", from: ["literature"], report: [2000, 7000], article: [300, 1600], optional: true },
  { key: "method", name: "Methodology", from: ["study", "method"], report: [1200, 4500], article: [350, 1600] },
  { key: "results", name: "Results and discussion", from: ["results"], report: [2000, 8000], article: [600, 2800] },
  { key: "conclusion", name: "Conclusion and recommendations", from: ["conclusion", "recommend"], report: [400, 1800], article: [150, 700] },
];
const count = (t: string) => (t.match(/[A-Za-z0-9][\w'’-]*/g) || []).length;
const CAPTION = /^(Table|Figure|Fig\.?)\s+(\d+(?:[.\-]\d+)?)\s*[:.\-–—]?\s*(.*)$/i;

export function checkStructure(text: string, mode: Mode = "report"): StructureReport {
  const lines = text.replace(/-\n(?=[a-z])/g, "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const words = new Map<string, number>();
  let cur: string | null = null, inRefs = false;
  const refLines: string[] = [], bodyLines: string[] = [];
  for (const l of lines) {
    const h = headingKey(l);
    if (h) {
      if (h.key === "stop") { inRefs = /^(\d+(\.\d+)*\.?\s+)?(references|bibliography)/i.test(l); cur = null; continue; }
      inRefs = false; cur = h.key; words.set(cur, words.get(cur) || 0); continue;
    }
    if (inRefs) { refLines.push(l); continue; }
    bodyLines.push(l);
    if (cur) words.set(cur, (words.get(cur) || 0) + count(l));
  }
  const parts: Part[] = GROUPS.map((g) => {
    const has = g.from.some((k) => words.has(k));
    const w = g.from.reduce((a, k) => a + (words.get(k) || 0), 0);
    const [min, max] = g[mode];
    const status: Part["status"] = !has ? "missing" : w < min ? "short" : w > max ? "long" : "ok";
    return { key: g.key, name: g.name, words: w, found: has, min, max, optional: g.optional, status };
  });

  // Tables and figures
  const items: Item[] = [];
  const captionIdx = new Set<number>();
  bodyLines.forEach((l, i) => {
    const m = l.match(CAPTION);
    if (m && l.length < 220 && !/\b(shows?|presents?|illustrates?|indicates?|below|above)\b/i.test(m[3].split(/\s+/).slice(0, 3).join(" "))) {
      items.push({ kind: /^t/i.test(m[1]) ? "Table" : "Figure", num: m[2].replace("-", "."), caption: m[3].trim(), mentioned: false });
      captionIdx.add(i);
    }
  });
  const body = bodyLines.filter((_, i) => !captionIdx.has(i)).join(" ");
  const mentions = [...body.matchAll(/\b(Tables?|Figures?|Figs?\.?)\s+(\d+(?:\.\d+)?)/gi)].map((m) => ({ kind: /^t/i.test(m[1]) ? "Table" : "Figure", num: m[2] }));
  for (const it of items) it.mentioned = mentions.some((m) => m.kind === it.kind && m.num === it.num);
  const itemIssues: string[] = [];
  for (const kind of ["Table", "Figure"] as const) {
    const list = items.filter((i) => i.kind === kind);
    const seen = new Set<string>();
    for (const i of list) { if (seen.has(i.num)) itemIssues.push(`${kind} ${i.num} is used for two different ${kind.toLowerCase()}s.`); seen.add(i.num); }
    // numbering in order (works for 1, 2, 3 and 4.1, 4.2 styles)
    const key = (n: string) => n.split(".").map(Number);
    for (let k = 1; k < list.length; k++) {
      const a = key(list[k - 1].num), b = key(list[k].num);
      const sameCh = a.length === 2 && b.length === 2 && a[0] === b[0];
      const expected = a.length === 1 ? [a[0] + 1] : sameCh ? [a[0], a[1] + 1] : [b[0], 1];
      if (b.join(".") !== expected.join(".") && !(a.length === 2 && b.length === 2 && b[0] > a[0] && b[1] === 1)) {
        itemIssues.push(`${kind} ${list[k].num} comes after ${kind} ${list[k - 1].num}. Expected ${kind} ${expected.join(".")}.`);
      }
    }
    for (const i of list) {
      if (!i.mentioned) itemIssues.push(`${kind} ${i.num} is never mentioned in the text. Refer to it, e.g. "as shown in ${kind} ${i.num}".`);
      if (i.caption.length < 8) itemIssues.push(`${kind} ${i.num} needs a descriptive caption, e.g. "${kind} ${i.num}: Land cover change, 2004–2024".`);
    }
    const missingCap = [...new Set(mentions.filter((m) => m.kind === kind && !list.some((i) => i.num === m.num)).map((m) => m.num))];
    for (const n of missingCap) itemIssues.push(`${kind} ${n} is mentioned in the text, but there's no ${kind} ${n} caption.`);
  }

  const totalWords = count(bodyLines.join(" "));
  const references = splitReferences(refLines).length;
  const citations = findCitations(body).reduce((a, c) => a + c.count, 0);
  const keywords = /\bkey\s?words?\s*[:\-–]/i.test(text);
  const tips: string[] = [];
  for (const p of parts) {
    if (p.status === "missing" && !p.optional) tips.push(`Add a "${p.name}" section with a clear heading${p.key === "lit" ? "" : ""}.`);
    if (p.status === "short") tips.push(`${p.name} is short (${p.words} words). Aim for at least ${p.min}.`);
    if (p.status === "long") tips.push(`${p.name} is long (${p.words} words). Aim for under ${p.max}.`);
  }
  if (!keywords) tips.push("Add 3–6 keywords under your abstract.");
  if (!references) tips.push('Add a reference list under a heading called "References".');
  else if (citations < references / 2) tips.push(`Only ${citations} citations in the text for ${references} references. Check every reference is cited.`);
  const penalty = parts.filter((p) => p.status === "missing" && !p.optional).length * 12 + parts.filter((p) => p.status === "short" || p.status === "long").length * 5 + Math.min(30, itemIssues.length * 4) + (keywords ? 0 : 4) + (references ? 0 : 12);
  return { mode, totalWords, pages: Math.max(1, Math.round(totalWords / 330)), parts, items, itemIssues: [...new Set(itemIssues)].slice(0, 30), references, citations, keywords, score: Math.max(0, 100 - penalty), tips };
}
