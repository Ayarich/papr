// APA 7 reference formatting for the citation generator. Pure functions: used in the browser and on the server.
import { sentenceCase } from "./references";

export type SourceType = "journal" | "book" | "chapter" | "website" | "report" | "thesis";
export type Person = { family: string; given?: string };
export type Source = {
  type: SourceType;
  authors: Person[];       // people, in order
  org?: string;            // or an organisation as author
  year?: string; month?: string; day?: string;
  title: string;
  container?: string;      // journal, website name or book title (for chapters)
  volume?: string; issue?: string; pages?: string; edition?: string;
  editors?: Person[];
  publisher?: string; university?: string; degree?: string; reportNo?: string;
  doi?: string; url?: string;
};
export type Part = { t: string; i?: boolean };

export const TYPE_LABEL: Record<SourceType, string> = {
  journal: "Journal article", book: "Book", chapter: "Book chapter", website: "Web page", report: "Report", thesis: "Thesis / project",
};

const initials = (given = "") => given.split(/[\s.]+|(?=-)/).filter(Boolean).map((g) => (g.startsWith("-") ? "-" + g[1]?.toUpperCase() + "." : g[0].toUpperCase() + ".")).join(" ").replace(/ -/g, "-");
const person = (p: Person) => (p.given ? `${p.family}, ${initials(p.given)}` : p.family);
const editorName = (p: Person) => (p.given ? `${initials(p.given)} ${p.family}` : p.family);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function authorList(s: Source): string {
  if (!s.authors.length) return s.org || "";
  const a = s.authors.map(person);
  if (a.length === 1) return a[0];
  if (a.length <= 20) return a.slice(0, -1).join(", ") + ", & " + a[a.length - 1];
  return a.slice(0, 19).join(", ") + ", . . . " + a[a.length - 1];
}

/** (Surname, 2021) and Surname (2021) versions for use in the text. */
export function inText(s: Source): { parenthetical: string; narrative: string } {
  const y = s.year || "n.d.";
  const f = s.authors.map((p) => p.family);
  const who = !f.length ? (s.org || shortTitle(s.title)) : f.length === 1 ? f[0] : f.length === 2 ? `${f[0]} & ${f[1]}` : `${f[0]} et al.`;
  return { parenthetical: `(${who}, ${y})`, narrative: `${who.replace(" & ", " and ")} (${y})` };
}
const shortTitle = (t: string) => { const w = t.split(/\s+/).slice(0, 4).join(" "); return `"${w}${t.split(/\s+/).length > 4 ? "…" : ""}"`; };

const cleanDoi = (d?: string) => d?.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
const link = (s: Source) => (cleanDoi(s.doi) ? `https://doi.org/${cleanDoi(s.doi)}` : s.url?.trim() || "");
const end = (t: string) => (/[.?!]$/.test(t.trim()) ? t.trim() : t.trim() + ".");
const sc = (t: string) => sentenceCase(t.trim().replace(/\s+/g, " ").replace(/[.]$/, ""));

/** The full reference as text parts; parts with i: true are in italics. */
export function formatApa(s: Source): Part[] {
  const P: Part[] = [];
  const add = (t: string, i = false) => { if (t) P.push({ t, i }); };
  const who = authorList(s);
  let date = s.year || "n.d.";
  if (s.type === "website" && s.year && s.month) date += `, ${MONTHS[Number(s.month) - 1] || s.month}${s.day ? " " + Number(s.day) : ""}`;
  const title = sc(s.title || "Untitled");
  const url = link(s);
  if (who) add(`${end(who)} (${date}). `); // "Mensah, K. A. (2021). "
  if (s.type === "journal") {
    if (!who) add(`${end(title)} (${date}). `); else add(`${end(title)} `);
    if (s.container) {
      add(s.container.trim(), true);
      if (s.volume) { add(", "); add(s.volume.trim(), true); }
      if (s.issue) add(`(${s.issue.trim()})`);
      if (s.pages) add(`, ${s.pages.trim().replace(/\s*[-–]\s*/, "–")}`);
      add(". ");
    }
  } else if (s.type === "chapter") {
    add(`${end(title)} `);
    const eds = (s.editors || []).map(editorName);
    const edStr = eds.length ? `In ${eds.length === 1 ? eds[0] : eds.length === 2 ? `${eds[0]} & ${eds[1]}` : eds.slice(0, -1).join(", ") + ", & " + eds[eds.length - 1]} (Ed${eds.length > 1 ? "s" : ""}.), ` : "In ";
    add(edStr); add(sc(s.container || "Book title"), true);
    const extra = [s.edition && `${ordinal(s.edition)} ed.`, s.pages && `pp. ${s.pages.replace(/\s*[-–]\s*/, "–")}`].filter(Boolean).join(", ");
    add(extra ? ` (${extra}). ` : ". ");
    if (s.publisher) add(`${end(s.publisher)} `);
  } else {
    const bits: string[] = [];
    if (s.type === "book" && s.edition) bits.push(`${ordinal(s.edition)} ed.`);
    if (s.type === "report" && s.reportNo) bits.push(`Report No. ${s.reportNo}`);
    if (!who) { add(title, true); add(` (${date})`); } else add(title, true);
    if (bits.length) add(` (${bits.join(", ")})`);
    if (s.type === "thesis") add(` [${s.degree || "Undergraduate project"}, ${s.university || "University"}]`);
    add(". ");
    if (s.type === "website" && s.container && s.container !== who) add(`${end(s.container)} `);
    if ((s.type === "book" || s.type === "report") && s.publisher && s.publisher !== s.org) add(`${end(s.publisher)} `);
  }
  if (url) add(url);
  // tidy
  return P.map((p, k) => ({ ...p, t: k === P.length - 1 && !url ? p.t.trimEnd() : p.t })).filter((p) => p.t);
}
const ordinal = (e: string) => { const n = parseInt(e, 10); if (!n) return e; const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

export const plain = (parts: Part[]) => parts.map((p) => p.t).join("").replace(/\s+/g, " ").trim();
export const html = (parts: Part[]) => parts.map((p) => (p.i ? `<i>${esc(p.t)}</i>` : esc(p.t))).join("").trim();
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** What's missing for a complete reference (shown as hints). */
export function missing(s: Source): string[] {
  const m: string[] = [];
  if (!s.authors.length && !s.org) m.push("author or organisation");
  if (!s.year) m.push("year");
  if (!s.title) m.push("title");
  if (s.type === "journal") { if (!s.container) m.push("journal name"); if (!s.volume) m.push("volume"); if (!s.pages) m.push("pages"); }
  if ((s.type === "book" || s.type === "chapter") && !s.publisher) m.push("publisher");
  if (s.type === "website" && !s.url) m.push("link");
  if (s.type === "thesis" && !s.university) m.push("university");
  return m;
}

/** Splits "Kofi A. Mensah" or "Mensah, Kofi A." into a person. */
export function parsePerson(raw: string): Person | null {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;
  if (t.includes(",")) { const [family, given] = t.split(",").map((x) => x.trim()); return { family, given }; }
  const parts = t.split(" ");
  if (parts.length === 1) return { family: parts[0] };
  return { family: parts.pop()!, given: parts.join(" ") };
}
