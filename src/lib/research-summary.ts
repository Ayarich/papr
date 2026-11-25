// One-page research summary for grad school, scholarship and job applications, built from the student's own paper.
import { posterContent } from "./poster-content";
import { splitSections, sentences, toBullet } from "./deck";

export type ResearchSummary = {
  title: string; name: string; institution: string; supervisor: string; year: string; link: string | null;
  overview: string; problem: string; objectives: string[]; methods: string[]; findings: string[]; impact: string[]; skills: string[];
};

const SKILLS: [RegExp, string][] = [
  [/\bArcGIS\b/i, "ArcGIS"], [/\bQGIS\b/i, "QGIS"], [/Google Earth Engine/i, "Google Earth Engine"], [/\bERDAS\b/i, "ERDAS Imagine"], [/\bENVI\b/, "ENVI"],
  [/\bLandsat\b/i, "Landsat image analysis"], [/\bSentinel\b/i, "Sentinel image analysis"], [/remote sensing/i, "Remote sensing"], [/\bGIS\b/, "GIS"],
  [/supervised classification|maximum likelihood|random forest|support vector/i, "Image classification"], [/\bGPS\b|GNSS/i, "GNSS/GPS surveying"],
  [/total station|levelling|leveling/i, "Land surveying"], [/\bAutoCAD\b/i, "AutoCAD"], [/\bSPSS\b/, "SPSS"], [/\bSTATA\b|\bStata\b/, "Stata"],
  [/\bR (software|studio|programming)|\bRStudio\b/i, "R"], [/\bPython\b/, "Python"], [/\bMATLAB\b/i, "MATLAB"], [/\bExcel\b/, "Microsoft Excel"],
  [/regression/i, "Regression analysis"], [/chi-square|t-test|ANOVA|correlation/i, "Statistical testing"], [/\bAHP\b|analytic hierarchy|multi-criteria/i, "Multi-criteria analysis (AHP)"],
  [/questionnaire|survey/i, "Survey design"], [/interview|focus group/i, "Interviews and focus groups"], [/laborator|spectrophotomet|AAS\b|titration/i, "Laboratory analysis"],
  [/machine learning|neural network|deep learning/i, "Machine learning"], [/kappa|accuracy assessment/i, "Accuracy assessment"], [/\bNVivo\b/i, "NVivo"],
];

const noRefs = (a: string[]) => a.filter((x) => !/\b(Table|Figure|Fig\.)\s+\d/i.test(x));

export function researchSummary(text: string, meta: { title?: string; authors?: string; institution?: string; supervisor?: string; year?: string; abstract?: string; link?: string | null }): ResearchSummary {
  const p = posterContent(text, meta);
  const { merged } = splitSections(text);
  const abs = merged.get("abstract")?.text || meta.abstract || "";
  const absS = sentences(abs);
  const probS = sentences(merged.get("problem")?.text || merged.get("background")?.text || abs);
  const skills = [...new Set(SKILLS.filter(([re]) => re.test(text)).map(([, s]) => s))].slice(0, 10);
  return {
    title: p.title, name: meta.authors || "", institution: meta.institution || "", supervisor: meta.supervisor || "", year: meta.year || "", link: meta.link || null,
    overview: absS.slice(0, 2).join(" ") || p.headline,
    problem: probS.slice(0, 2).map(toBullet).join(" ") || p.background[0] || "",
    objectives: noRefs(p.objectives).slice(0, 4),
    methods: noRefs(p.method).slice(0, 4),
    findings: noRefs(p.findings.length ? p.findings : [p.headline]).filter(Boolean).slice(0, 4),
    impact: [...p.conclusion, ...p.recommendations].slice(0, 3),
    skills,
  };
}
