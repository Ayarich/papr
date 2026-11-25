import { splitSections, sentences, pick, toBullet, titleCase } from "./deck";

export type PosterContent = {
  title: string; authors: string; institution: string; supervisor: string; year: string;
  background: string[]; objectives: string[]; method: string[]; findings: string[]; headline: string;
  conclusion: string[]; recommendations: string[]; references: string[]; link: string | null;
};

/** Picks the content for a conference/project-fair poster from a paper's text. */
export function posterContent(text: string, meta: { title?: string; authors?: string; institution?: string; supervisor?: string; year?: string; abstract?: string; link?: string | null }): PosterContent {
  const { merged, before, references } = splitSections(text);
  const sec = (k: string) => merged.get(k)?.text || "";
  const abs = sec("abstract") || meta.abstract || "";
  const findings = pick(sec("results") || abs, "results", 4);
  const strong = (b: string) => (/\d/.test(b) ? 1 : 0) + (/(grew|increase|declin|decreas|tripled|doubled|times|majority|most|exceed|only)/i.test(b) ? 2 : 0) - (/(accuracy|kappa)/i.test(b) ? 3 : 0);
  const headline = [...findings].sort((a, b) => strong(b) - strong(a))[0] || toBullet(sentences(abs)[0] || meta.title || "");
  // Without a title from papr, use the first lines of the PDF up to the author / university line.
  const head: string[] = [];
  for (const l of before) { if (head.length >= 3 || /·|\b(Department|University|Faculty|Supervisor|College|Institute|School of)\b|@|^by\s/i.test(l)) break; head.push(l); }
  return {
    title: titleCase(meta.title || head.join(" ") || before[0] || "My research"),
    authors: meta.authors || "", institution: meta.institution || "", supervisor: meta.supervisor || "", year: meta.year || "",
    background: pick(sec("background") || sec("problem") || abs, "background", 3),
    objectives: pick(sec("objectives"), "objectives", 4),
    method: pick(sec("method") || sec("study"), "method", 4),
    findings, headline,
    conclusion: pick(sec("conclusion"), "conclusion", 2),
    recommendations: pick(sec("recommend"), "recommend", 3),
    references: references.join(" ").split(/(?<=\.)\s+(?=[A-Z][A-Za-z'’\-]+,\s*[A-Z]\.)/).map((r) => r.trim()).filter((r) => r.length > 20).slice(0, 4),
    link: meta.link || null,
  };
}
