import { all, one } from "./db";

// A simple, free similarity check: what share of this paper's three-word phrases
// (from title + abstract) also appear in another paper already in the repository.
// A paid service (e.g. iThenticate) would also compare the full PDF against the web.

function shingles(text: string): Set<string> {
  const w = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(" "));
  return out;
}

export type Similarity = { score: number; matchRef: string | null; matchTitle: string | null };

export async function similarityFor(submissionId: string): Promise<Similarity> {
  const none: Similarity = { score: 0, matchRef: null, matchTitle: null };
  const sub = await one<{ title: string; abstract: string }>("SELECT title, abstract FROM submissions WHERE id = ?", [submissionId]);
  if (!sub) return none;
  const mine = shingles(sub.title + " " + sub.abstract);
  if (mine.size === 0) return none;
  const others = await all<{ ref: string; title: string; abstract: string }>(
    "SELECT ref, title, abstract FROM submissions WHERE id != ? AND status IN ('published','pending','withdrawn')",
    [submissionId]
  );
  let best = none;
  for (const o of others) {
    const theirs = shingles(o.title + " " + o.abstract);
    let hit = 0;
    mine.forEach((s) => { if (theirs.has(s)) hit++; });
    const score = Math.round((hit / mine.size) * 100);
    if (score > best.score) best = { score, matchRef: o.ref, matchTitle: o.title };
  }
  return best;
}
