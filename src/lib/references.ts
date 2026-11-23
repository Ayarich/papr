// Reference checker: finds the reference list, matches it against citations in the text,
// and suggests APA 7 formatting for each entry.
import { splitSections } from "./deck";

export type Citation = { surname: string; year: string; raw: string; count: number };
export type RefEntry = { raw: string; surnames: string[]; year: string | null; apa: string; issues: string[]; cited: boolean };
export type RefReport = {
  references: RefEntry[];
  missingFromList: Citation[];   // cited in the text but not in the reference list
  uncited: RefEntry[];           // in the list but never cited
  orderOk: boolean;
  stats: { citations: number; references: number; matched: number };
  apaList: string;
};

const SURNAME = "[A-Z][A-Za-z'’\\-]+(?:\\s(?:van|de|der|von|da)\\s[A-Z][A-Za-z'’\\-]+)?";

/** Finds in-text citations like (Mensah, 2019), (Owusu & Boateng, 2018), (Asante et al., 2020; Darko, 2015) and Mensah (2019). */
export function findCitations(body: string): Citation[] {
  const found = new Map<string, Citation>();
  const add = (surname: string, year: string, raw: string) => {
    const k = `${surname.toLowerCase()}|${year}`;
    const c = found.get(k);
    if (c) c.count++; else found.set(k, { surname, year, raw, count: 1 });
  };
  // Parenthetical: (A, 2019) (A & B, 2019) (A et al., 2019; C, 2020)
  const paren = /\(([^()]{3,200}?\b(?:19|20)\d{2}[a-z]?[^()]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = paren.exec(body))) {
    for (const part of m[1].split(";")) {
      const pm = part.trim().match(new RegExp(`^(?:e\\.g\\.,?\\s*|see\\s+)?(${SURNAME})(?:\\s*(?:&|and)\\s*${SURNAME}|\\s+et al\\.?)?,?\\s*((?:19|20)\\d{2})[a-z]?`));
      if (pm) add(pm[1], pm[2], `(${part.trim()})`);
    }
  }
  // Narrative: Mensah (2019), Owusu and Boateng (2018), Asante et al. (2020)
  const narr = new RegExp(`\\b(${SURNAME})(?:\\s*(?:&|and)\\s*${SURNAME}|\\s+et al\\.?)?\\s*\\(((?:19|20)\\d{2})[a-z]?\\)`, "g");
  while ((m = narr.exec(body))) {
    if (["The", "In", "This", "Table", "Figure", "Chapter", "Section"].includes(m[1])) continue;
    add(m[1], m[2], m[0]);
  }
  return [...found.values()];
}

/** Splits the reference list into entries (an entry starts with "Surname, I." or a number). */
export function splitReferences(lines: string[]): string[] {
  const out: string[] = [];
  const start = new RegExp(`^(\\[?\\d+[\\].]\\s+)?${SURNAME},\\s*(?:[A-Z]\\.|[A-Z][a-z]+)|^\\[\\d+\\]|^\\d+\\.\\s+[A-Z]|^[A-Z][A-Za-z ]+\\.?\\s*\\((?:19|20)\\d{2}\\)`);
  for (const line of lines) {
    if (start.test(line) || !out.length) out.push(line);
    else out[out.length - 1] += " " + line;
  }
  return out.map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length > 15);
}

function sentenceCase(t: string) {
  const keep = (w: string, i: number) => i === 0 || /^[A-Z]{2,}/.test(w) || /^(Ghana|Ghanaian|Accra|Kumasi|Africa|African|Tarkwa|Takoradi|Sekondi|Tamale|Cape|Coast|Volta|Ashanti|Western|Eastern|Northern|Central|Upper|Region|English|GIS|COVID|Landsat)/.test(w);
  return t.split(" ").map((w, i) => (keep(w, i) ? w : w.toLowerCase())).join(" ").replace(/:\s+([a-z])/g, (_, c) => ": " + c.toUpperCase());
}

/** Best-effort APA 7 version of a reference, plus notes on what was wrong. */
export function toApa(raw: string): { apa: string; issues: string[]; surnames: string[]; year: string | null } {
  const issues: string[] = [];
  const r = raw.replace(/^\[?\d+[\].]\s*/, "").trim();
  const ym = r.match(/\(?((?:19|20)\d{2}[a-z]?|n\.d\.)\)?/);
  const year = ym ? ym[1] : null;
  if (!year) issues.push("No year found");
  else if (!/\((?:19|20)\d{2}[a-z]?\)/.test(r)) issues.push("Year should be in brackets after the authors, e.g. (2019).");
  const authorPart = (ym ? r.slice(0, ym.index) : r.split(/\.\s/)[0]).trim().replace(/,?\s*et al\.?/i, "").replace(/[,\s]+$/, "");
  const rest = ym ? r.slice((ym.index || 0) + ym[0].length).replace(/^[.,\s]+/, "") : r.slice(authorPart.length).replace(/^[.,\s]+/, "");
  // Authors written as "Surname, I. I." (APA style)
  const apaNames = [...authorPart.matchAll(/([A-Z][A-Za-z'’\-]+(?:\s(?:van|de|der|von|da)\s[A-Z][A-Za-z'’\-]+)?),\s*((?:[A-Z]\.?\s*(?:-\s*)?)+)(?=,|\s*&|\s+and\s|$)/g)];
  let authors: string[] = [];
  if (apaNames.length) {
    authors = apaNames.map((m) => `${m[1]}, ${m[2].replace(/\s+/g, " ").trim().replace(/([A-Z])(?!\.)/g, "$1.")}`);
  } else {
    // Authors written as "Kofi Asante and Efua Boateng" or an organisation name
    authors = authorPart.split(/,\s*|\s+(?:&|and)\s+/).map((a) => a.trim()).filter(Boolean).map((a) => {
      const parts = a.split(/\s+/);
      const org = /(Organi[sz]ation|Ministry|Service|Authority|Council|Bank|University|Assembly|Agency|Commission|Institute|Department|Association|Society|Board|Programme|Statistical|Ghana|United Nations|Nations)/i;
      if (parts.length < 2 || parts.length > 3 || org.test(a) || !parts.every((p) => /^[A-Z]/.test(p))) return a;
      const last = parts.pop() || "";
      issues.push("Authors should be written as Surname, Initials.");
      return `${last}, ${parts.map((p) => p[0].toUpperCase() + ".").join(" ")}`;
    });
  }
  authors = [...new Set(authors)].filter((a) => a.length > 1);
  if (/et al/i.test(ym ? r.slice(0, ym.index) : r)) issues.push("Don't use \"et al.\" in the reference list. List up to 20 authors.");
  const surnames = authors.map((a) => a.split(",")[0].trim());
  const authorStr = authors.length <= 1 ? authors[0] || "" : authors.length === 2 ? `${authors[0]}, & ${authors[1]}` : authors.slice(0, -1).join(", ") + ", & " + authors[authors.length - 1];
  // Title = up to the first full stop; source = the rest
  const tm = rest.match(/^(.+?[.?!])\s+(.*)$/);
  const title = tm ? tm[1].replace(/[.]$/, "") : rest.replace(/[.]$/, "");
  const source = tm ? tm[2] : "";
  const st = sentenceCase(title);
  if (title.split(" ").filter((w) => /^[A-Z]/.test(w)).length > 3 && st !== title) issues.push("Use sentence case for article and book titles.");
  if (!source) issues.push("Missing the journal, publisher or website.");
  if (/https?:\/\/(dx\.)?doi\.org/i.test(r) === false && /doi:\s*10\./i.test(r)) issues.push("Write DOIs as links: https://doi.org/…");
  const apa = `${authorStr} (${year || "n.d."}). ${st}.${source ? " " + source.replace(/doi:\s*(10\.\S+)/i, "https://doi.org/$1") : ""}`.replace(/\.\./g, ".").trim();
  return { apa, issues: [...new Set(issues)], surnames, year: year ? year.slice(0, 4) : null };
}

export function checkReferences(text: string): RefReport {
  const { references, lines } = splitSections(text);
  const refIdx = lines.findIndex((l) => /^(\d+(\.\d+)*\.?\s+)?(references|bibliography)\s*$/i.test(l.trim()));
  const body = (refIdx > 0 ? lines.slice(0, refIdx) : lines).join(" ");
  const cites = findCitations(body);
  const entries = splitReferences(references).map((raw) => ({ raw, ...toApa(raw), cited: false }));
  const missing: Citation[] = [];
  let matched = 0;
  for (const c of cites) {
    const hit = entries.find((e) => e.year === c.year && e.surnames.some((s) => s.toLowerCase() === c.surname.toLowerCase()));
    if (hit) { hit.cited = true; matched++; } else missing.push(c);
  }
  const firstSurnames = entries.map((e) => (e.surnames[0] || e.raw).toLowerCase());
  const orderOk = firstSurnames.every((s, i) => i === 0 || firstSurnames[i - 1].localeCompare(s) <= 0);
  const sorted = [...entries].sort((a, b) => (a.surnames[0] || a.raw).localeCompare(b.surnames[0] || b.raw));
  return {
    references: entries,
    missingFromList: missing,
    uncited: entries.filter((e) => !e.cited),
    orderOk,
    stats: { citations: cites.length, references: entries.length, matched },
    apaList: sorted.map((e) => e.apa).join("\n\n"),
  };
}
