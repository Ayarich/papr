// Slide decks: shared types, themes and the "paper -> slides" outline builder.
// Used by the server (to create a deck) and by the browser editor (to show and export it).

export type Layout = "title" | "bullets" | "section" | "statement" | "end";

export type Slide = {
  id: string;
  layout: Layout;
  title: string;
  subtitle: string;
  bullets: string[];
  notes: string;
};

export type Deck = {
  title: string;
  theme: ThemeKey;
  source: "auto" | "ai";
  slides: Slide[];
};

export type ThemeKey = "charcoal" | "paper" | "forest" | "ocean" | "sunrise";

export const THEMES: Record<ThemeKey, { name: string; bg: string; text: string; muted: string; accent: string; panel: string }> = {
  charcoal: { name: "Charcoal", bg: "#15171A", text: "#FFFFFF", muted: "#A3AAB2", accent: "#34C27F", panel: "#22262B" },
  paper: { name: "Paper", bg: "#FFFFFF", text: "#111316", muted: "#6B7178", accent: "#111316", panel: "#F2F3F5" },
  forest: { name: "Forest", bg: "#0B3D2E", text: "#F2F7F4", muted: "#A8C5B9", accent: "#F2C14E", panel: "#11523E" },
  ocean: { name: "Ocean", bg: "#0D2440", text: "#F3F7FB", muted: "#A9BCD3", accent: "#5EC8F2", panel: "#163456" },
  sunrise: { name: "Sunrise", bg: "#FFF8EC", text: "#2A1A0A", muted: "#7A6650", accent: "#D9822B", panel: "#FBEBD2" },
};

export const LAYOUTS: { key: Layout; name: string }[] = [
  { key: "title", name: "Title" },
  { key: "bullets", name: "Title + bullets" },
  { key: "section", name: "Section header" },
  { key: "statement", name: "Big statement" },
  { key: "end", name: "Closing" },
];

export const sid = () => Math.random().toString(36).slice(2, 10);

export function newSlide(layout: Layout = "bullets", title = "New slide"): Slide {
  return { id: sid(), layout, title, subtitle: "", bullets: layout === "bullets" ? ["Your point here"] : [], notes: "" };
}

// ---------------------------------------------------------------------------
// Building an outline from a paper's text, without AI.
// Finds the usual research sections (Introduction, Methodology, Results…), then picks
// the most informative sentences from each and shortens them into bullet points.
// ---------------------------------------------------------------------------

type Meta = { title?: string; authors?: string; institution?: string; programme?: string; year?: string; abstract?: string; link?: string };

const SECTIONS: { key: string; title: string; re: RegExp }[] = [
  { key: "abstract", title: "Overview", re: /^(abstract|summary|executive summary)$/ },
  { key: "background", title: "Background", re: /^(introduction|background( (of|to) the study)?|background|general introduction)$/ },
  { key: "problem", title: "Problem statement", re: /^(problem statement|statement of (the )?problem|research problem|justification)$/ },
  { key: "objectives", title: "Objectives", re: /^(objectives?( of the (study|research|project))?|aims?( and objectives)?|research objectives|research questions?)$/ },
  { key: "literature", title: "Literature review", re: /^(literature review|review of (related )?literature)$/ },
  { key: "study", title: "Study area", re: /^(study area|the study area|description of (the )?study area)$/ },
  { key: "method", title: "Methodology", re: /^(methodology|methods?|research methodology|materials and methods|data and methods|data|data collection|methods and materials|research design)$/ },
  { key: "results", title: "Key findings", re: /^(results?|findings|results and discussions?|discussions?|analysis( and discussion)?|data analysis)$/ },
  { key: "conclusion", title: "Conclusion", re: /^(conclusions?|conclusion and recommendations?|conclusions and recommendations|summary and conclusions?)$/ },
  { key: "recommend", title: "Recommendations", re: /^(recommendations?|suggestions for further (study|research))$/ },
  { key: "stop", title: "", re: /^(references|bibliography|appendix|appendices|acknowledg(e)?ments?|dedication|declaration)$/ },
];

export function headingKey(line: string): { key: string; title: string } | null {
  const raw = line.trim();
  if (raw.length > 80 || raw.split(/\s+/).length > 9 || /[.;]$/.test(raw)) return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/^chapter\s+(\w+)\s*[:.\-–]?\s*/, "")
    .replace(/^(\d+(\.\d+)*|[ivx]+)[.)]?\s+/, "")
    .replace(/[:.]$/, "")
    .trim();
  for (const s of SECTIONS) if (s.re.test(cleaned)) return { key: s.key, title: s.title };
  return null;
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(“"])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 400 && !/^(table|figure|fig\.)\s*\d/i.test(s) && !/et al\.,? \(\d{4}\)$/.test(s));
}

/** Shortens a sentence into a punchy bullet (about 20 words). */
function toBullet(s: string): string {
  let b = s
    .replace(/^(this|the present|the) (study|research|project|paper|work) (also )?(shows|showed|found|revealed|indicates|indicated) that\s+/i, "")
    .replace(/^(it was (found|observed|revealed) that|results (show|showed|indicate) that|the results (show|showed|indicate) that)\s+/i, "")
    .replace(/^the (main|general|overall|broad|specific) (objectives?|aims?) (of (this|the) (study|research|project) )?(is|are|was|were) to\s+/i, "")
    .replace(/\s*\([^)]*\d{4}[^)]*\)/g, "") // drop citations like (Mensah, 2019)
    .replace(/\s+/g, " ")
    .trim();
  b = b.charAt(0).toUpperCase() + b.slice(1);
  const words = b.split(" ");
  if (words.length > 26) {
    const cut = b.slice(0, 160);
    const at = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "), cut.lastIndexOf(" while "), cut.lastIndexOf(" and "));
    b = (at > 60 ? cut.slice(0, at) : words.slice(0, 20).join(" ")).replace(/[,;:]$/, "") + "…";
  }
  return b.replace(/\.$/, "");
}

/** Scores a sentence: numbers, findings words and short length are good. */
function score(s: string, key: string): number {
  let n = 0;
  if (/\d/.test(s)) n += 2;
  if (/%|per ?cent/i.test(s)) n += 2;
  if (key === "results" && /(increase|decrease|declin|grew|higher|lower|found|show|significant|most|majority|accuracy)/i.test(s)) n += 2;
  if (key === "method" && /(used|collected|surveyed|sampled|analys|classified|interview|questionnaire|software|model|images?)/i.test(s)) n += 2;
  if (key === "recommend" && /(should|recommend|suggest|need)/i.test(s)) n += 3;
  if (key === "objectives" && /(objective|aim|to (assess|determine|analy|examine|identify|evaluate|map|investigate|design))/i.test(s)) n += 3;
  n -= Math.max(0, s.split(" ").length - 30) * 0.1;
  return n;
}

function pick(text: string, key: string, max = 4): string[] {
  let ss = sentences(text);
  // "The specific objectives are to A, to B and to C." becomes three bullets
  if (key === "objectives") {
    ss = ss.flatMap((x) => {
      const m = x.match(/^(.*?\bto )(.+)$/i);
      const parts = m ? m[2].split(/,\s*(?:and\s+)?to\s+|\s+and to\s+/i) : [];
      return parts.length > 1 ? parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).replace(/\.$/, "")) : [x];
    });
  }
  const ranked = ss.map((s, i) => ({ s, i, v: score(s, key) - i * 0.15 })).sort((a, b) => b.v - a.v).slice(0, max);
  return ranked.sort((a, b) => a.i - b.i).map((r) => toBullet(r.s));
}

function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  const small = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "using", "with", "from"]);
  const keepUpper = new Set(["gis", "gps", "ict", "ussd", "hiv", "aids", "covid-19", "ngo", "sme", "smes", "uav", "lidar", "dem", "ndvi", "it", "ai", "iot", "ghs", "who", "umat", "knust", "ucc", "uds", "uew", "gh"]);
  return s.toLowerCase().split(" ").map((w, i) => (keepUpper.has(w) ? w.toUpperCase() : i > 0 && small.has(w) ? w : w.replace(/(^|-)([a-z])/g, (_, a, b) => a + b.toUpperCase()))).join(" ");
}

/** Classifies abstract sentences when a paper has no clear section headings. */
function fromAbstract(abs: string) {
  const out: Record<string, string[]> = { background: [], method: [], results: [], recommend: [] };
  for (const s of sentences(abs)) {
    if (/(recommend|should|suggest)/i.test(s)) out.recommend.push(s);
    else if (/(found|show|result|increase|decrease|grew|declin|%|majority|only \d|main reason|strongest|predictor|exceed)/i.test(s)) out.results.push(s);
    else if (/(this (study|project|research)|we |used|collected|surveyed|analys|classified|interviewed|tested|designed|built|sampled)/i.test(s)) out.method.push(s);
    else out.background.push(s);
  }
  return out;
}

export type Sections = { lines: string[]; before: string[]; merged: Map<string, { title: string; text: string }>; references: string[] };

/** Splits a paper's text into its usual sections (background, method, results…) plus the reference list. */
export function splitSections(text: string): Sections {
  const lines = text.replace(/-\n(?=[a-z])/g, "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const found: { key: string; title: string; body: string[] }[] = [];
  let cur: { key: string; title: string; body: string[] } | null = null;
  const before: string[] = [];
  const references: string[] = [];
  let inRefs = false;
  for (const line of lines) {
    const h = headingKey(line);
    if (h?.key === "stop") { inRefs = /^(\d+(\.\d+)*\.?\s+)?(references|bibliography)/i.test(line.trim()); cur = null; if (found.length) continue; }
    if (inRefs) { if (h && h.key !== "stop") { inRefs = false; } else { references.push(line); continue; } }
    if (h && h.key !== "stop") { cur = { ...h, body: [] }; found.push(cur); continue; }
    if (cur) cur.body.push(line); else if (!found.length) before.push(line);
  }
  const merged = new Map<string, { title: string; text: string }>();
  for (const s of found) {
    const t = s.body.join(" ");
    const prev = merged.get(s.key);
    merged.set(s.key, { title: s.title, text: prev ? prev.text + " " + t : t });
  }
  return { lines, before, merged, references };
}

export { sentences, toBullet, pick, titleCase };

export function buildOutline(text: string, meta: Meta = {}): Deck {
  // 1-2. Split into sections and merge sections that map to the same slide
  const { lines, before, merged } = splitSections(text);

  // 3. Title and author details
  const guessTitle = before.slice(0, 4).filter((l) => l === l.toUpperCase() && l.length > 3).join(" ");
  const title = titleCase(meta.title || guessTitle || before[0] || "My research");
  const byline = [meta.authors, meta.institution].filter(Boolean).join(" · ") || before.find((l) => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(l) && l.split(" ").length <= 5) || "";

  const content: Slide[] = [];
  const order = ["background", "problem", "objectives", "literature", "study", "method", "results", "conclusion", "recommend"];
  for (const key of order) {
    const sec = merged.get(key);
    if (!sec || sentences(sec.text).length === 0) continue;
    const bullets = pick(sec.text, key, key === "results" ? 5 : 4);
    if (bullets.length) content.push({ id: sid(), layout: "bullets", title: sec.title, subtitle: "", bullets, notes: sec.text.slice(0, 900) });
  }

  // 4. Not enough structure? Fall back to the abstract.
  if (content.length < 3) {
    const abs = merged.get("abstract")?.text || meta.abstract || lines.slice(before.length).join(" ") || text;
    const c = fromAbstract(abs);
    content.length = 0;
    const add = (t: string, ss: string[]) => { if (ss.length) content.push({ id: sid(), layout: "bullets", title: t, subtitle: "", bullets: ss.slice(0, 4).map(toBullet), notes: ss.join(" ") }); };
    add("Background", c.background);
    add("What we did", c.method);
    add("Key findings", c.results);
    add("Recommendations", c.recommend);
  }

  // 5. A headline statement from the strongest finding
  const findings = content.find((s) => s.title === "Key findings");
  const strong = (b: string) => (/\d/.test(b) ? 1 : 0) + (/(grew|increase|declin|decreas|tripled|doubled|times|majority|most|exceed|only)/i.test(b) ? 2 : 0) - (/(accuracy|kappa)/i.test(b) ? 3 : 0);
  const headline = findings ? [...findings.bullets].sort((a, b) => strong(b) - strong(a))[0] : undefined;

  const slides: Slide[] = [
    { id: sid(), layout: "title", title, subtitle: [byline, meta.year].filter(Boolean).join(" · "), bullets: [], notes: "Introduce yourself, your programme and your supervisor." },
    { id: sid(), layout: "bullets", title: "Outline", subtitle: "", bullets: content.map((s) => s.title), notes: "Walk the audience through what you will cover." },
    ...content,
  ];
  if (headline) {
    const idx = slides.findIndex((s) => s.title === "Key findings");
    slides.splice(idx + 1, 0, { id: sid(), layout: "statement", title: headline, subtitle: "The main finding", bullets: [], notes: "Pause here. This is the one thing you want people to remember." });
  }
  slides.push({ id: sid(), layout: "end", title: "Thank you", subtitle: meta.link ? `Questions? Read the full paper: ${meta.link}` : "Questions?", bullets: [], notes: "" });

  return { title, theme: "charcoal", source: "auto", slides };
}
