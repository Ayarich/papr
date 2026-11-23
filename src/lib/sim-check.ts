import { one, type Submission, type Version } from "./db";
import { ensureIndexed, versionText } from "./indexer";
import { checkText, type Report } from "./plagiarism";

/** Full-text similarity report for a submission's current version (used by moderators). */
export async function reportForSubmission(id: string): Promise<{ sub: Submission; report: Report } | null> {
  await ensureIndexed(100);
  const sub = await one<Submission>("SELECT * FROM submissions WHERE id = ?", [id]);
  if (!sub) return null;
  const v = await one<Version>("SELECT * FROM versions WHERE submission_id = ? AND number = ?", [sub.id, sub.current_version]);
  const text = (v ? await versionText(v) : "") || `${sub.title}\n${sub.abstract}`;
  return { sub, report: await checkText(text, { excludeSubmissionId: sub.id }) };
}
