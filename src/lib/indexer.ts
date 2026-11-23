import { all, one, run, newId, nowIso, type Version } from "./db";
import { readPdf } from "./storage";
import { pdfText } from "./decks";
import { indexVersion } from "./plagiarism";
import { extractIdeas } from "./topics";

/** Reads a version's text (from the database, or from its PDF the first time) and saves it. */
export async function versionText(v: Pick<Version, "id" | "text" | "pdf_path">): Promise<string> {
  if (v.text) return v.text;
  const buf = await readPdf(v.pdf_path);
  let text = "";
  try { if (buf) text = await pdfText(new Uint8Array(buf)); } catch { text = ""; }
  await run("UPDATE versions SET text = ? WHERE id = ?", [text, v.id]);
  return text;
}

/**
 * Catches up on background work: adds new papers to the plagiarism index and builds
 * topic ideas for newly published papers. Cheap to call; does nothing when up to date.
 */
export async function ensureIndexed(limit = 50) {
  const pending = await all<Version>("SELECT * FROM versions WHERE indexed_at IS NULL LIMIT ?", [limit]);
  for (const v of pending) {
    const text = await versionText(v);
    await indexVersion(v.id, text || "");
  }
  const noIdeas = await all<{ id: string; abstract: string; field: string; current_version: number }>(
    "SELECT id, abstract, field, current_version FROM submissions WHERE status = 'published' AND ideas_at IS NULL LIMIT ?", [limit]);
  for (const s of noIdeas) await buildIdeas(s);
}

export async function buildIdeas(s: { id: string; abstract: string; field: string; current_version: number }) {
  const v = await one<Version>("SELECT * FROM versions WHERE submission_id = ? AND number = ?", [s.id, s.current_version]);
  const text = v ? await versionText(v) : "";
  const ideas = extractIdeas(text, s.abstract);
  await run("DELETE FROM topic_ideas WHERE submission_id = ? AND id NOT IN (SELECT idea_id FROM topic_saves)", [s.id]);
  for (const t of ideas) await run("INSERT INTO topic_ideas (id, submission_id, text, field, created_at) VALUES (?,?,?,?,?)", [newId(), s.id, t, s.field, nowIso()]);
  await run("UPDATE submissions SET ideas_at = ? WHERE id = ?", [nowIso(), s.id]);
}
