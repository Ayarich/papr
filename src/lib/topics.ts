import { splitSections, sentences, toBullet } from "./deck";

/**
 * Pulls research ideas out of a paper: "future research should…" sentences first,
 * then recommendations. These become ready-made topic ideas for younger students.
 */
export function extractIdeas(text: string, abstract = ""): string[] {
  const { merged } = splitSections(text || "");
  const pool = [merged.get("recommend")?.text, merged.get("conclusion")?.text, text, abstract].filter(Boolean).join(" ");
  const ss = sentences(pool);
  const future = ss.filter((s) => /(further|future) (research|studies|study|work|investigation)|should (investigate|explore|examine|assess|consider)|could (explore|investigate|examine)|more research|needs? to be (studied|investigated)/i.test(s));
  const recs = ss.filter((s) => /(recommend|should|suggest)/i.test(s) && !future.includes(s));
  const clean = (s: string) =>
    toBullet(
      s.replace(/^(it is (also )?recommended that|the (study|research|project) (also )?(recommends|suggests) that|the (study|research|project) (also )?(recommends|suggests))\s+/i, "")
        .replace(/^(future|further) (research|studies|study|work)( should| could| is needed to| are needed to)?\s+(also\s+)?/i, "")
    );
  const out: string[] = [];
  for (const s of [...future, ...recs]) {
    const c = clean(s);
    if (c.length > 25 && !out.some((o) => o.slice(0, 40) === c.slice(0, 40))) out.push(c);
    if (out.length >= 4) break;
  }
  return out;
}
