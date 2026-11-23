import { all, one, type Submission } from "./db";
import { sendEmail, APP_URL } from "./mail";
import { shortInst } from "./constants";

export type FollowKind = "field" | "institution" | "author";

export async function isFollowing(userId: string | undefined, kind: FollowKind, value: string) {
  if (!userId) return false;
  return !!(await one("SELECT 1 FROM follows WHERE user_id = ? AND kind = ? AND value = ?", [userId, kind, value]));
}

export async function myFollows(userId: string) {
  return all<{ kind: FollowKind; value: string; label: string | null }>(
    `SELECT f.kind, f.value, CASE WHEN f.kind = 'author' THEN u.name ELSE NULL END AS label
     FROM follows f LEFT JOIN users u ON f.kind = 'author' AND u.id = f.value WHERE f.user_id = ? ORDER BY f.created_at DESC`, [userId]);
}

/** New published papers in the last `days` that match someone's follows. */
export async function digestFor(userId: string, days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return all<Submission & { reason: string }>(
    `SELECT s.*, MIN(CASE f.kind WHEN 'field' THEN f.value WHEN 'institution' THEN f.value ELSE 'an author you follow' END) AS reason
     FROM submissions s JOIN follows f ON f.user_id = ? AND (
       (f.kind = 'field' AND s.field = f.value) OR (f.kind = 'institution' AND s.institution = f.value) OR (f.kind = 'author' AND s.owner_id = f.value))
     WHERE s.status = 'published' AND s.published_at >= ? AND s.owner_id != ?
     GROUP BY s.id ORDER BY s.published_at DESC LIMIT 20`, [userId, since, userId]);
}

export function digestText(name: string, papers: (Submission & { reason: string })[]) {
  const groups = new Map<string, (Submission & { reason: string })[]>();
  for (const p of papers) { const k = p.reason; if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(p); }
  let body = `Hi ${name || "there"},\n\nHere's what's new on papr this week:\n`;
  for (const [reason, ps] of groups) {
    body += `\n${ps.length} new in ${reason.includes("(") ? shortInst(reason) : reason}\n`;
    for (const p of ps) body += `  • ${p.title} (${p.authors_text}, ${shortInst(p.institution)})\n    ${APP_URL}/papers/${p.ref}\n`;
  }
  body += `\nManage what you follow: ${APP_URL}/following`;
  return body;
}

/** New live Master's/PhD listings from the past week that match someone's fields of interest. */
async function oppsFor(interests: string | null) {
  const fields = (interests || "").split(",").filter(Boolean);
  if (!fields.length) return [];
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const rows = await all<{ title: string; url: string; type: string; fields: string; funded: number; deadline: string | null }>(
    "SELECT title, url, type, fields, funded, deadline FROM opportunities WHERE live = 1 AND hidden = 0 AND type IN ('masters','phd') AND created_at >= ? ORDER BY funded DESC, created_at DESC LIMIT 40", [since]);
  return rows.filter((o) => !o.fields || o.fields.split(",").some((f) => fields.includes(f))).slice(0, 6);
}

/** Sends the weekly digest to everyone with new matching papers or postgraduate opportunities. Returns how many emails went out. */
export async function sendDigests() {
  const users = await all<{ id: string; email: string; name: string; interests: string | null }>(
    "SELECT DISTINCT u.id, u.email, u.name, u.interests FROM users u LEFT JOIN follows f ON f.user_id = u.id WHERE f.user_id IS NOT NULL OR (u.interests IS NOT NULL AND u.interests != '')");
  let sent = 0;
  for (const u of users) {
    const papers = await digestFor(u.id);
    const opps = await oppsFor(u.interests);
    if (!papers.length && !opps.length) continue;
    let subject: string;
    if (papers.length) {
      const fieldCounts = new Map<string, number>();
      papers.forEach((p) => fieldCounts.set(p.field, (fieldCounts.get(p.field) || 0) + 1));
      const [topField, n] = [...fieldCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      subject = `${n} new paper${n === 1 ? "" : "s"} in ${topField} this week`;
    } else subject = `${opps.length} new Master's & PhD opportunit${opps.length === 1 ? "y" : "ies"} for you`;
    let body = papers.length ? digestText(u.name, papers) : `Hi ${u.name || "there"},\n`;
    if (opps.length) {
      body += `\n\n🎓 New Master's & PhD opportunities in your fields:\n`;
      for (const o of opps) body += `  • ${o.title}${o.funded ? " (fully funded)" : ""}${o.deadline ? `, apply by ${o.deadline}` : ""}\n    ${o.url}\n`;
      body += `\nMore: ${APP_URL}/opportunities`;
    }
    await sendEmail(u.email, subject, body);
    sent++;
  }
  return sent;
}
