import { all, one, run, newId, nowIso, type Submission } from "./db";
import { newToken } from "./auth";
import { sendEmail, emailModerators, APP_URL } from "./mail";
import type { DraftData } from "./validate";

export async function nextRef(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await one<{ ref: string }>("SELECT ref FROM submissions WHERE ref LIKE ? ORDER BY ref DESC LIMIT 1", [`PPR-${year}-%`]);
  const n = last ? parseInt(last.ref.split("-")[2], 10) + 1 : 1;
  return `PPR-${year}-${String(n).padStart(4, "0")}`;
}

export const authorList = (d: DraftData) => [d.name.trim(), ...d.coauthors.map((c) => c.name.trim()).filter(Boolean)];

export async function saveAuthors(submissionId: string, d: DraftData) {
  await run("DELETE FROM authors WHERE submission_id = ?", [submissionId]);
  const list = [{ name: d.name.trim(), email: null as string | null }, ...d.coauthors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), email: c.email.trim() || null }))];
  for (const [i, a] of list.entries()) await run("INSERT INTO authors (id, submission_id, name, email, position) VALUES (?,?,?,?,?)", [newId(), submissionId, a.name, a.email, i]);
}

export async function addEvent(submissionId: string, text: string) {
  await run("INSERT INTO events (id, submission_id, text, created_at) VALUES (?,?,?,?)", [newId(), submissionId, text, nowIso()]);
}

/** Emails sent after a (re)submission: the student, the supervisor (if asked), the moderators, and co-authors. */
export async function notifyAfterSubmit(sub: Submission, studentEmail: string, d: DraftData, isResubmit: boolean) {
  await sendEmail(studentEmail, `We received your submission ${sub.ref}`,
    `Hi ${d.name},\n\nThanks for submitting "${sub.title}"${isResubmit ? ` (version ${sub.current_version})` : ""}.\nYour reference number is ${sub.ref}.\n\nA moderator usually reviews submissions within 3 working days. You can track progress at ${APP_URL}/my`);
  if (d.notifySup && !sub.supervisor_confirmed_at) {
    let token = sub.supervisor_token;
    if (!token) { token = newToken(); await run("UPDATE submissions SET supervisor_token = ? WHERE id = ?", [token, sub.id]); }
    await sendEmail(d.supEmail, `Please confirm your student's research: ${sub.title}`,
      `Dear ${d.supName},\n\n${d.name} has submitted "${sub.title}" to papr, Ghana's open library of undergraduate research, and named you as supervisor.\n\nIf this is your student's work, please confirm with one click:\n${APP_URL}/confirm/${token}\n\nIf you don't recognise this work, you can ignore this email.`);
  }
  if (!isResubmit) {
    for (const c of d.coauthors) if (c.email.trim())
      await sendEmail(c.email.trim(), `You were listed as a co-author on papr`, `${d.name} listed you as a co-author of "${sub.title}" (${sub.ref}). If this is wrong, reply to this email.`);
  }
  await emailModerators(`New ${isResubmit ? "resubmission" : "submission"} to review: ${sub.ref}`,
    `"${sub.title}" by ${sub.authors_text} is waiting for review.\n\nOpen the review queue: ${APP_URL}/moderate?id=${sub.id}`);
}

export async function eventsFor(ids: string[]) {
  if (!ids.length) return [];
  return all<{ submission_id: string; text: string; created_at: string }>(
    `SELECT submission_id, text, created_at FROM events WHERE submission_id IN (${ids.map(() => "?").join(",")}) ORDER BY created_at`, ids);
}
