// Defence practice: likely panel questions built from the student's own paper.
import { splitSections, sentences, pick, toBullet } from "./deck";

export type Question = { id: string; category: string; q: string; from: string | null; tip: string; level: "warm-up" | "core" | "tough" };

const METHOD_CUES: [RegExp, (m: string) => string, string][] = [
  [/(\d[\d,]*)\s+(households|respondents|students|traders|farmers|participants|women|samples|patients|people)/i, (m) => `Why did you study ${m}? How did you choose them, and is that enough to generalise?`, "Explain your sampling method and how you decided the sample size (e.g. a formula like Yamane or Krejcie & Morgan)."],
  [/(questionnaire|survey|interview)/i, () => "How did you design and pre-test your questionnaire? How did you make sure answers were reliable?", "Mention a pilot test, clear questions, and how you handled non-responses."],
  [/(Landsat|Sentinel|satellite|imagery|images)/i, (m) => `Why did you choose ${m} data? What are its limitations for this study?`, "Talk about resolution, cost, availability and dates, and what higher-resolution data would add."],
  [/(classification|classified|maximum likelihood|random forest|regression|AHP|t-test|chi-square|ANOVA|correlation|model)/i, (m) => `Why did you use ${m}? What assumptions does it make?`, "Name an alternative method and say why yours suited your data better."],
  [/(ArcGIS|QGIS|SPSS|Excel|Python|R software|STATA|MATLAB|AutoCAD|Google Earth Engine)/i, (m) => `Why ${m}? Would a different tool change your results?`, "Software is a tool; focus on the method it ran and how you checked the outputs."],
  [/(accuracy|kappa|validat|reliab|calibrat)/i, () => "How did you validate your results? How confident are you in them?", "Quote your accuracy or validation numbers and what they mean."],
];

export function defenceQuestions(text: string, meta: { title?: string } = {}): Question[] {
  const { merged } = splitSections(text);
  const sec = (k: string) => merged.get(k)?.text || "";
  const all = text.replace(/\s+/g, " ");
  const qs: Question[] = [];
  let n = 0;
  const add = (category: string, q: string, tip: string, level: Question["level"], from: string | null = null) => qs.push({ id: `q${++n}`, category, q, tip, level, from });

  add("Opening", "Briefly summarise your study in two minutes.", "Cover the problem, what you did, your main finding and your recommendation. Practise it until it's smooth.", "warm-up");
  add("Opening", `Why did you choose this topic${meta.title ? `, “${meta.title}”` : ""}?`, "Link it to a real problem you care about and why it matters for Ghana.", "warm-up");

  const problem = pick(sec("problem") || sec("background"), "background", 1)[0];
  if (problem) add("Problem", "What exactly is the gap or problem your study addresses?", "State the gap in one sentence, then say who is affected by it.", "core", problem);

  for (const o of pick(sec("objectives"), "objectives", 3)) add("Objectives", `How did you achieve this objective: “${o}”?`, "Point to the specific method and result that answers this objective.", "core", o);

  const methodText = sec("method") || sec("study") || all;
  for (const [re, make, tip] of METHOD_CUES) {
    const m = methodText.match(re) || all.match(re);
    if (m) { const ss = sentences(methodText).find((s) => re.test(s)) || null; add("Method", make(m[0]), tip, "core", ss ? toBullet(ss) : null); }
  }

  const findings = sentences(sec("results") || all).filter((s) => /\d/.test(s)).slice(0, 3);
  for (const f of findings) add("Results", `You found that “${toBullet(f)}”. What explains this result?`, "Offer one or two reasons, and compare with a study you cited.", "core", toBullet(f));
  if (findings.length) add("Results", "Were any of your results unexpected? How do you explain them?", "Being honest about surprises shows maturity. Suggest a cause and how you'd test it.", "tough");

  add("Limitations", "What are the main limitations of your study?", "Name two real limitations (data, sample, time) and how they might affect your results.", "tough");
  add("Limitations", "If you did this study again, what would you do differently?", "Pick one concrete improvement, like a larger sample or newer data.", "tough");

  for (const r of pick(sec("recommend") || sec("conclusion"), "recommend", 2)) add("Recommendations", `How practical is this recommendation: “${r}”? Who would carry it out, and at what cost?`, "Name the responsible body (e.g. the municipal assembly) and a first step.", "tough", r);

  add("Contribution", "What does your study add that previous studies didn't?", "Mention your study area, time period, data or method as what's new.", "tough");
  add("Contribution", "How could your work be extended in future research?", "Give one or two specific follow-up studies.", "core");
  return qs;
}
