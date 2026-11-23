// papr's plagiarism engine.
//
// How it works (the same idea as Turnitin and Stanford's MOSS):
// 1. Every paper's full text is split into overlapping 6-word phrases.
// 2. Each phrase is turned into a number (a "hash"), and a smart sample of them ("winnowing")
//    is kept as the paper's fingerprints in the database.
// 3. To check a new text, we fingerprint it the same way and look up which papers share fingerprints.
// 4. Shared phrases are stretched back into matching passages (8+ words) and highlighted.
//
// It compares against everything in papr. To also compare against the web and journals,
// connect a commercial service in src/lib/plagiarism-providers.ts.

import { all, run, qs, nowIso, newId } from "./db";

const K = 6;       // words per phrase
const WINDOW = 4;  // winnowing window: guarantees any shared passage of K + WINDOW - 1 words is detected
export const MIN_MATCH_WORDS = 8;

type Token = { w: string; start: number; end: number };

/** Words with their character positions in the original text (so we can highlight later). */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /[A-Za-z0-9À-ɏ]+(?:['’][A-Za-z]+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ w: m[0].toLowerCase().replace(/’/g, "'"), start: m.index, end: m.index + m[0].length });
  return out;
}

// 32-bit FNV-1a hash, stored as a signed integer (SQLite INTEGER)
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h | 0;
}

/** All phrase hashes, position = index of the first word. */
function phraseHashes(tokens: Token[]): number[] {
  const hs: number[] = [];
  for (let i = 0; i + K <= tokens.length; i++) hs.push(hash(tokens.slice(i, i + K).map((t) => t.w).join(" ")));
  return hs;
}

/** Winnowing: keep the smallest hash in each sliding window. */
export function fingerprints(tokens: Token[]): { hash: number; pos: number }[] {
  const hs = phraseHashes(tokens);
  const out: { hash: number; pos: number }[] = [];
  let last = -1;
  for (let i = 0; i + WINDOW <= hs.length; i++) {
    let min = i;
    for (let j = i + 1; j < i + WINDOW; j++) if (hs[j] <= hs[min]) min = j;
    if (min !== last) { out.push({ hash: hs[min], pos: min }); last = min; }
  }
  if (hs.length && hs.length < WINDOW) hs.forEach((h, i) => out.push({ hash: h, pos: i }));
  return out;
}

/** Character ranges to ignore: text in quotation marks, and (optionally) the reference list. */
function excludedRanges(text: string, opts: { quotes: boolean; references: boolean }): [number, number][] {
  const r: [number, number][] = [];
  if (opts.quotes) {
    const re = /["“]([^"”]{20,600})["”]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) r.push([m.index, m.index + m[0].length]);
  }
  if (opts.references) {
    const m = text.match(/\n\s*((\d+(\.\d+)*\.?\s+)?(references|bibliography|works cited))\s*\n/i);
    if (m && m.index !== undefined) r.push([m.index, text.length]);
  }
  return r;
}

/** Stores a paper version's fingerprints so future checks can find it. */
export async function indexVersion(versionId: string, text: string) {
  await run("DELETE FROM fingerprints WHERE version_id = ?", [versionId]);
  const fps = fingerprints(tokenize(text));
  for (let i = 0; i < fps.length; i += 200) {
    const chunk = fps.slice(i, i + 200);
    await run(`INSERT INTO fingerprints (hash, version_id, pos) VALUES ${chunk.map(() => "(?,?,?)").join(",")}`,
      chunk.flatMap((f) => [f.hash, versionId, f.pos]));
  }
  await run("UPDATE versions SET indexed_at = ? WHERE id = ?", [nowIso(), versionId]);
}

export type Source = { submissionId: string; ref: string; title: string; authors: string; status: string; percent: number; words: number; colour: number };
export type Span = { start: number; end: number; source: number }; // character range in the checked text + index into sources
export type Report = { id: string; percent: number; words: number; matchedWords: number; sources: Source[]; spans: Span[]; text: string; excluded: { quotes: boolean; references: boolean }; createdAt: string };

/**
 * Checks a text against every paper in papr.
 * excludeSubmissionId: leave out the paper itself (and its earlier versions).
 */
export async function checkText(text: string, opts: { excludeSubmissionId?: string; quotes?: boolean; references?: boolean } = {}): Promise<Report> {
  const excluded = { quotes: opts.quotes ?? true, references: opts.references ?? true };
  const tokens = tokenize(text);
  const skip = excludedRanges(text, excluded);
  const inSkip = (t: Token) => skip.some(([a, b]) => t.start >= a && t.end <= b);
  const counted = tokens.filter((t) => !inSkip(t)).length || 1;
  const hs = phraseHashes(tokens);

  // Step 1 (fast): find candidate papers that share fingerprints with this text.
  const unique = [...new Set(hs)];
  const shared = new Map<string, number>(); // version id -> shared fingerprint count
  for (let i = 0; i < unique.length; i += 400) {
    const chunk = unique.slice(i, i + 400);
    const rows = await all<{ version_id: string; n: number }>(
      `SELECT f.version_id, COUNT(*) AS n FROM fingerprints f JOIN versions v ON v.id = f.version_id
       WHERE f.hash IN (${qs(chunk.length)}) ${opts.excludeSubmissionId ? "AND v.submission_id != ?" : ""} GROUP BY f.version_id`,
      opts.excludeSubmissionId ? [...chunk, opts.excludeSubmissionId] : chunk
    );
    for (const r of rows) shared.set(r.version_id, (shared.get(r.version_id) || 0) + Number(r.n));
  }
  const candidates = [...shared.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([v]) => v);

  // Step 2 (precise): compare every phrase against each candidate's full text.
  const owner: (string | null)[] = new Array(tokens.length).fill(null);
  if (candidates.length) {
    const texts = await all<{ id: string; text: string | null }>(`SELECT id, text FROM versions WHERE id IN (${qs(candidates.length)})`, candidates);
    for (const vid of candidates) {
      const t = texts.find((x) => x.id === vid)?.text;
      if (!t) continue;
      const theirs = new Set(phraseHashes(tokenize(t)));
      hs.forEach((h, i) => {
        if (!theirs.has(h)) return;
        for (let j = i; j < i + K; j++) if (!owner[j]) owner[j] = vid;
      });
    }
  }

  // Turn runs of covered words into spans, dropping short ones and excluded text
  type Run = { from: number; to: number; v: string };
  const runs: Run[] = [];
  for (let i = 0; i < tokens.length; ) {
    if (!owner[i] || inSkip(tokens[i])) { i++; continue; }
    const v = owner[i]!; let j = i;
    while (j + 1 < tokens.length && owner[j + 1] && !inSkip(tokens[j + 1])) j++;
    if (j - i + 1 >= MIN_MATCH_WORDS) runs.push({ from: i, to: j, v });
    i = j + 1;
  }

  // Describe the sources
  const versionIds = [...new Set(runs.map((r) => r.v))];
  const meta = versionIds.length
    ? await all<{ vid: string; sid: string; ref: string; title: string; authors_text: string; status: string }>(
        `SELECT v.id AS vid, s.id AS sid, s.ref, s.title, s.authors_text, s.status FROM versions v JOIN submissions s ON s.id = v.submission_id WHERE v.id IN (${qs(versionIds.length)})`, versionIds)
    : [];
  const bySub = new Map<string, Source>();
  const vToSource = new Map<string, number>();
  const sources: Source[] = [];
  for (const r of runs) {
    const m = meta.find((x) => x.vid === r.v);
    if (!m) continue;
    let src = bySub.get(m.sid);
    if (!src) {
      src = { submissionId: m.sid, ref: m.ref, title: m.title, authors: m.authors_text, status: m.status, percent: 0, words: 0, colour: sources.length % 6 };
      bySub.set(m.sid, src); sources.push(src);
    }
    vToSource.set(r.v, sources.indexOf(src));
    src.words += r.to - r.from + 1;
  }
  const matchedWords = sources.reduce((a, s) => a + s.words, 0);
  sources.forEach((s) => (s.percent = Math.round((s.words / counted) * 1000) / 10));
  sources.sort((a, b) => b.words - a.words);
  const spans: Span[] = runs
    .filter((r) => vToSource.has(r.v))
    .map((r) => {
      const sub = meta.find((x) => x.vid === r.v)!.sid;
      return { start: tokens[r.from].start, end: tokens[r.to].end, source: sources.findIndex((s) => s.submissionId === sub) };
    });

  return {
    id: newId(),
    percent: Math.round((matchedWords / counted) * 1000) / 10,
    words: counted,
    matchedWords,
    sources,
    spans,
    text: text.slice(0, 200000),
    excluded,
    createdAt: nowIso(),
  };
}

/** Plain-language verdict for a score. */
export function verdict(p: number): { level: "low" | "medium" | "high"; label: string } {
  if (p < 15) return { level: "low", label: "Low similarity" };
  if (p < 30) return { level: "medium", label: "Some overlap: check the highlighted passages" };
  return { level: "high", label: "High similarity: likely copied text" };
}
