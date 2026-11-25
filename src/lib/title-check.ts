// Title helper: scores a project title and suggests sharper versions. Runs in the browser.

const PLACES = /\b(Ghana|Accra|Kumasi|Tamale|Takoradi|Sekondi|Cape Coast|Tarkwa|Obuasi|Koforidua|Ho|Sunyani|Bolgatanga|Wa|Techiman|Tema|Kasoa|Winneba|Nkawkaw|Prestea|Bogoso|Damongo|Nalerigu|Dambai|Goaso|Sefwi|Volta|Ashanti|Bono|Ahafo|Savannah|Oti|Greater Accra|Western|Eastern|Central|Northern|Upper East|Upper West|North East|Western North|Pra|Densu|Odaw|Ankobra|Kakum|Metropolis|Municipal(?:ity)?|District|Region|Community|Communities|Township|Basin|Catchment|Lagoon|Market|Hospital|University|Senior High)\b/i;
const METHOD = /\b(GIS|remote sensing|Landsat|Sentinel|survey|questionnaire|interviews?|case study|regression|model(?:ling|ing)?|simulation|experiment(?:al)?|laboratory|machine learning|AHP|multi-criteria|spatial|statistical|mixed[- ]methods?|qualitative|quantitative|using|approach|framework)\b/i;
const WEAK = /^(an?\s+)?(study|investigation|assessment|analysis|examination|evaluation|review|research|survey)\s+(of|on|into)\s+(the\s+)?/i;
const VAGUE = /\b(some|various|certain|issues|things|aspects|problems and prospects|a critical look)\b/i;
const KNOWN_ACRONYMS = new Set(["GIS", "GPS", "HIV", "AIDS", "COVID", "ICT", "NHIS", "SHS", "JHS", "UN", "SDG", "SDGS", "AI", "IT", "SME", "SMES", "NGO", "NGOS", "ECG", "UMaT", "KNUST"]);
const SMALL = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "so", "the", "to", "up", "via", "vs", "with", "yet", "from", "into"]);

export type Check = { label: string; ok: boolean; tip: string; weight: number };
export type TitleReport = { score: number; words: number; checks: Check[]; suggestions: string[]; cleaned: string };

export function titleCaseApa(input: string) {
  let t = input;
  if (t.length > 10 && t === t.toUpperCase()) t = t.split(" ").map((w) => (KNOWN_ACRONYMS.has(w.replace(/[^A-Z]/g, "")) ? w : w.toLowerCase())).join(" ");
  return t.trim().replace(/\s+/g, " ").split(/(\[[^\]]*\])/).map((chunk) => (chunk.startsWith("[") ? chunk : titleWords(chunk))).join("");
}
function titleWords(t: string) {
  return t.split(" ").map((w, i, a) => {
    if (/^[A-Z0-9]{2,}$/.test(w) || /[A-Z].*[A-Z]/.test(w.slice(1))) return w; // acronyms, iPhone-style
    const lw = w.toLowerCase();
    const afterColon = i > 0 && /[:?!]$/.test(a[i - 1]);
    if (i > 0 && !afterColon && SMALL.has(lw.replace(/[^a-z]/g, "")) && lw.length <= 4) return lw;
    return lw.replace(/(^|[-–(])([a-z])/g, (_, p, c) => p + c.toUpperCase());
  }).join(" ");
}

export function checkTitle(raw: string): TitleReport {
  const t = raw.trim().replace(/\s+/g, " ").replace(/[.]+$/, "");
  const words = t ? t.split(" ").length : 0;
  const years = t.match(/\b(19|20)\d{2}\b/g) || [];
  const acr = (t.match(/\b[A-Z]{2,6}s?\b/g) || []).filter((a) => !KNOWN_ACRONYMS.has(a.toUpperCase()) && !PLACES.test(a));
  const allCaps = t.length > 10 && t === t.toUpperCase();
  const checks: Check[] = [
    { label: "Length", ok: words >= 8 && words <= 22, weight: 18, tip: words < 8 ? "Too short to tell readers what you did. Aim for 10–20 words." : words > 22 ? `${words} words is long. Cut filler so it's 10–20 words.` : `${words} words: a good length.` },
    { label: "Starts strong", ok: !WEAK.test(t), weight: 16, tip: WEAK.test(t) ? `Drop "${t.match(WEAK)![0].trim()}". Start with the topic itself.` : "Starts with the topic, not filler." },
    { label: "Says where", ok: PLACES.test(t) || /\bin\s+(the\s+)?[A-Z][a-z]+/.test(t), weight: 18, tip: PLACES.test(t) || /\bin\s+(the\s+)?[A-Z][a-z]+/.test(t) ? "Names the study area." : 'Add where you studied, e.g. "in the Tarkwa-Nsuaem Municipality".' },
    { label: "Says when", ok: years.length > 0, weight: 10, tip: years.length ? "Includes the time period." : "If your data covers a period, add it, e.g. 1994–2024." },
    { label: "Says how", ok: METHOD.test(t), weight: 12, tip: METHOD.test(t) ? "Mentions the method." : 'If your method is a strength, mention it, e.g. "using GIS and remote sensing".' },
    { label: "Specific words", ok: !VAGUE.test(t), weight: 10, tip: VAGUE.test(t) ? `"${t.match(VAGUE)![0]}" is vague. Name the actual thing you measured.` : "No vague words." },
    { label: "Acronyms", ok: acr.length === 0, weight: 8, tip: acr.length ? `Spell out ${acr.slice(0, 3).join(", ")} (readers may not know ${acr.length > 1 ? "them" : "it"}).` : "No unexplained acronyms." },
    { label: "Capitals", ok: !allCaps, weight: 8, tip: allCaps ? "Don't write the whole title in capitals. Use Title Case." : "Capitalisation is fine." },
  ];
  const score = t ? checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0) : 0;

  // Build suggestions from the pieces we can find.
  const base = t.length > 10 && t === t.toUpperCase() ? titleCaseApa(t) : t;
  let core = base.replace(WEAK, "").replace(/^(the\s+)?(impact|effects?|role|influence)\s+of\s+/i, "$2 of ");
  core = core.charAt(0).toUpperCase() + core.slice(1);
  const placeM = t.match(new RegExp(`\\b(?:in|at|within|around)\\s+((?:the\\s+)?[^,:;]*?${PLACES.source}[^,:;]*?)(?=,|:|;|\\s+(?:using|from|between|\\d{4})|$)`, "i"));
  const place = placeM ? placeM[1].trim() : "[your study area]";
  const period = years.length >= 2 ? `${years[0]}–${years[years.length - 1]}` : years[0] || "[years]";
  const methodM = t.match(/\busing\s+([^,:;]+?)(?=,|:|;|$)/i) || t.match(METHOD);
  const method = methodM ? (methodM[1] || methodM[0]).trim() : "[your main method]";
  const topic = core.replace(/\b(?:in|at|within)\s+(?:the\s+)?[^,:;]*?(?=,|:|;|\s+using|\s+\d{4}|$)/i, "").replace(/\busing\s+[^,:;]+/i, "").replace(/[,:;]?\s*\(?(19|20)\d{2}(\s*[-–]\s*(19|20)\d{2})?\)?/g, "").replace(/\s+[,:;]\s*$/, "").replace(/\s{2,}/g, " ").trim() || "[Your topic]";
  const T = titleCaseApa;
  const suggestions = [...new Set([
    T(`${topic} in ${place}, ${period}`),
    T(`${topic} in ${place}: Evidence from ${method}`),
    T(`${topic} in ${place} Using ${method.replace(/^using\s+/i, "")}`),
  ])].filter((s) => s.toLowerCase() !== t.toLowerCase());
  return { score, words, checks, suggestions, cleaned: T(t) };
}
