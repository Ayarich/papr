// Abstract polisher: checks that an abstract has the parts examiners look for and reads clearly.
import { splitSections, sentences } from "./deck";

export type AbstractReport = {
  abstract: string;
  words: number;
  sentences: number;
  parts: { key: string; label: string; found: boolean; example: string | null; tip: string }[];
  issues: { sentence: string; problem: string; suggestion: string }[];
  score: number; // 0-100
};

const PARTS = [
  { key: "context", label: "Context / problem", re: /(problem|challenge|concern|issue|limited|lack|threat|pressure|growing|rapid|increase in|has (grown|changed|become))/i, tip: "Open with one sentence on why the topic matters in Ghana or your study area." },
  { key: "aim", label: "Aim of the study", re: /(this (study|project|research|paper)|aim(ed|s)? (to|at)|objective|sought to|we (assessed|examined|investigated|mapped|designed))/i, tip: "Say plainly what the study set out to do: \"This study assessed…\"." },
  { key: "method", label: "Method and data", re: /(survey|questionnaire|interview|sample|samples|imagery|data|analys|classif|model|experiment|tested|measured|collected|software|regression|GIS)/i, tip: "Name your data and method in one or two sentences, with the sample size." },
  { key: "results", label: "Key results with numbers", re: /(\d+(\.\d+)?\s?(%|per ?cent|kg|km|mg|times|households|respondents|samples)|found that|showed|revealed|results)/i, tip: "Give your most important finding with a number, e.g. \"Built-up area grew by 41%\"." },
  { key: "conclusion", label: "Conclusion / recommendation", re: /(recommend|suggest|conclude|should|implication)/i, tip: "End with what should happen because of your findings." },
];

const VAGUE: [RegExp, string][] = [
  [/\b(very|really|quite|a lot of|lots of)\b/i, "Replace vague words with a number or a precise word."],
  [/\b(things|stuff|etc\.?)\b/i, "Name the specific items instead."],
  [/\b(I|my|we|our)\b/, "Most Ghanaian departments prefer the third person in abstracts (\"This study…\")."],
  [/\b(it was observed that|it is worthy to note that|it should be noted that)\b/i, "Cut filler phrases; start with the finding."],
  [/\b(prove[sd]?)\b/i, "Research rarely \"proves\"; say \"shows\" or \"suggests\"."],
];

export function findAbstract(text: string): string {
  const { merged, before } = splitSections(text);
  return merged.get("abstract")?.text || before.slice(-6).join(" ");
}

export function checkAbstract(abstract: string): AbstractReport {
  const ss = sentences(abstract);
  const words = (abstract.match(/\S+/g) || []).length;
  const parts = PARTS.map((p) => {
    const ex = ss.find((s) => p.re.test(s)) || null;
    return { key: p.key, label: p.label, found: !!ex, example: ex, tip: p.tip };
  });
  const issues: AbstractReport["issues"] = [];
  for (const s of ss) {
    const w = s.split(/\s+/).length;
    if (w > 35) issues.push({ sentence: s, problem: `Long sentence (${w} words)`, suggestion: "Split it into two sentences of under 25 words each." });
    for (const [re, tip] of VAGUE) if (re.test(s)) { issues.push({ sentence: s, problem: `Contains “${s.match(re)![0]}”`, suggestion: tip }); break; }
    if (/\b(was|were|is|are|been)\s+\w+ed\b.*\b(was|were|is|are|been)\s+\w+ed\b/i.test(s)) issues.push({ sentence: s, problem: "Heavy passive voice", suggestion: "Try active voice: \"The study surveyed…\" instead of \"…were surveyed by…\"." });
  }
  if (words < 120) issues.unshift({ sentence: "", problem: `Short abstract (${words} words)`, suggestion: "Most departments expect 150–300 words. Add your method and key numbers." });
  if (words > 350) issues.unshift({ sentence: "", problem: `Long abstract (${words} words)`, suggestion: "Cut background detail; keep it under 300 words." });
  const found = parts.filter((p) => p.found).length;
  const score = Math.max(0, Math.min(100, Math.round(found * 16 + (words >= 120 && words <= 350 ? 20 : 8) - issues.length * 4)));
  return { abstract, words, sentences: ss.length, parts, issues: issues.slice(0, 12), score };
}
