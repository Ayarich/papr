import { one, type Campaign } from "./db";

export async function activeCampaign(): Promise<Campaign | null> {
  const now = new Date().toISOString();
  return one<Campaign>("SELECT * FROM campaigns WHERE starts_at <= ? AND ends_at >= ? ORDER BY ends_at ASC LIMIT 1", [now, now]);
}

export function timeLeft(ends: string) {
  const ms = new Date(ends).getTime() - Date.now();
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d} day${d === 1 ? "" : "s"} left` : h > 0 ? `${h} hour${h === 1 ? "" : "s"} left` : "ends today";
}
