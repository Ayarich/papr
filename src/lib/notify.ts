import { all, one, run, newId, nowIso } from "./db";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Adds a notification to someone's bell. Notifications with the same `group` on the same day are combined
 * ("5 people downloaded your paper today") instead of piling up.
 */
export async function notify(userId: string | null | undefined, n: { kind: string; text: string; link?: string; ref?: string; group?: string }) {
  if (!userId) return;
  if (n.group) {
    const ex = await one<{ id: string }>("SELECT id FROM notifications WHERE user_id = ? AND kind = ? AND ref = ? AND day = ? AND read_at IS NULL", [userId, n.kind, n.group, today()]);
    if (ex) {
      await run("UPDATE notifications SET text = ?, count = count + 1, created_at = ? WHERE id = ?", [n.text, nowIso(), ex.id]);
      return;
    }
  }
  await run("INSERT INTO notifications (id, user_id, kind, text, link, ref, day, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [newId(), userId, n.kind, n.text, n.link || null, n.group || n.ref || null, today(), nowIso()]);
}

export async function unreadCount(userId: string) {
  const r = await one<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", [userId]);
  return r?.n || 0;
}

const COUNTRY: Record<string, string> = { GH: "Ghana", NG: "Nigeria", US: "the United States", GB: "the United Kingdom", KE: "Kenya", ZA: "South Africa", CA: "Canada", DE: "Germany", IN: "India", CN: "China", TG: "Togo", CI: "Côte d'Ivoire", BF: "Burkina Faso" };
export const countryName = (c: string | null) => (c ? COUNTRY[c.toUpperCase()] || c.toUpperCase() : null);

/** The reader's country, when the site runs behind Cloudflare or Vercel (they add this header). */
export function countryFrom(req: Request): string | null {
  return req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || null;
}

/**
 * Records a view or download and tells the author in a friendly, combined way.
 * Views only notify at milestones (100, 250, 500, 1000…) so it never feels spammy.
 */
export async function recordRead(sub: { id: string; ref: string; owner_id: string; title: string; views: number; downloads: number }, kind: "view" | "download",
  reader: { id: string; institution: string | null } | null, country: string | null) {
  if (reader?.id === sub.owner_id) return;
  await run("INSERT INTO read_events (id, submission_id, kind, reader_id, institution, country, created_at) VALUES (?,?,?,?,?,?,?)",
    [newId(), sub.id, kind, reader?.id || null, reader?.institution || null, country, nowIso()]);
  const short = sub.title.length > 60 ? sub.title.slice(0, 57) + "…" : sub.title;
  if (kind === "download") {
    const day = await all<{ institution: string | null; country: string | null }>(
      "SELECT institution, country FROM read_events WHERE submission_id = ? AND kind = 'download' AND created_at >= ?", [sub.id, today()]);
    const insts = [...new Set(day.map((d) => d.institution).filter(Boolean))] as string[];
    const countries = [...new Set(day.map((d) => d.country).filter(Boolean))] as string[];
    const shortInst = (s: string) => (s.match(/\(([^)]+)\)/) || [, s])[1];
    let text = day.length === 1
      ? `Someone${insts[0] ? ` at ${shortInst(insts[0])}` : countries[0] ? ` in ${countryName(countries[0])}` : ""} downloaded “${short}”`
      : `${day.length} people downloaded “${short}” today`;
    if (day.length > 1 && insts.length) text += `, including readers at ${insts.slice(0, 2).map(shortInst).join(" and ")}`;
    else if (day.length > 1 && countries.length > 1) text += ` from ${countries.length} countries`;
    await notify(sub.owner_id, { kind: "download", text, link: `/papers/${sub.ref}`, group: `dl-${sub.id}` });
  } else {
    const views = sub.views + 1;
    if ([25, 100, 250, 500, 1000, 2500, 5000, 10000].includes(views))
      await notify(sub.owner_id, { kind: "milestone", text: `🎉 “${short}” just passed ${views.toLocaleString()} views`, link: `/papers/${sub.ref}` });
  }
}
