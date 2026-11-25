import type { IconName } from "@/components/Icon";
import { one, all } from "./db";

export type Badge = { key: string; icon: IconName; label: string; desc: string };

/** Badges are worked out from what a student has done, so they can never get out of sync. */
export async function badgesFor(userId: string): Promise<Badge[]> {
  const b: Badge[] = [];
  const s = await one<{ subs: number; pub: number; conf: number; maxviews: number; downloads: number }>(
    `SELECT COUNT(*) AS subs, SUM(status = 'published') AS pub, SUM(supervisor_confirmed_at IS NOT NULL AND status = 'published') AS conf,
            COALESCE(MAX(views), 0) AS maxviews, COALESCE(SUM(downloads), 0) AS downloads FROM submissions WHERE owner_id = ?`, [userId]);
  if (s?.subs) b.push({ key: "first-drop", icon: "drop", label: "First Drop", desc: "Submitted a first paper" });
  if (s?.pub) b.push({ key: "published", icon: "file", label: "Published Author", desc: "Has a paper live on papr" });
  if (s?.conf) b.push({ key: "verified", icon: "verified", label: "Supervisor Verified", desc: "A supervisor confirmed their work" });
  if ((s?.maxviews || 0) >= 100) b.push({ key: "100-reads", icon: "eye", label: "100 Reads", desc: "A paper passed 100 views" });
  if ((s?.downloads || 0) >= 100) b.push({ key: "100-downloads", icon: "download", label: "100 Downloads", desc: "Papers downloaded 100+ times" });
  const deck = await one("SELECT 1 FROM decks WHERE owner_id = ? LIMIT 1", [userId]);
  if (deck) b.push({ key: "slides", icon: "slides", label: "Slide Maker", desc: "Turned a paper into slides" });
  const camps = await all<{ badge: string }>("SELECT DISTINCT c.badge FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.owner_id = ?", [userId]);
  for (const c of camps) b.push({ key: "campaign-" + c.badge, icon: "flame", label: c.badge, desc: "Dropped a paper during a papr campaign" });
  const saved = await one<{ n: number }>("SELECT COUNT(*) AS n FROM topic_saves ts JOIN topic_ideas t ON t.id = ts.idea_id JOIN submissions s ON s.id = t.submission_id WHERE s.owner_id = ? AND ts.user_id != ?", [userId, userId]);
  if ((saved?.n || 0) > 0) b.push({ key: "inspirer", icon: "idea", label: "Topic Inspirer", desc: "Other students saved research ideas from their paper" });
  const award = await all<{ month: string }>("SELECT a.month FROM awards a JOIN submissions s ON s.id = a.submission_id WHERE s.owner_id = ?", [userId]);
  for (const a of award) b.push({ key: "potm-" + a.month, icon: "trophy", label: "Paper of the Month", desc: monthName(a.month) });
  return b;
}

export function monthName(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}
