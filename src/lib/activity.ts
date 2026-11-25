import { run, newId, nowIso } from "./db";

export type ActivityKind = "login" | "signup" | "tool" | "deck" | "submit" | "error" | "cron";

/** Records something for the admin dashboard. Never throws: monitoring must not break the app. */
export async function logActivity(kind: ActivityKind, detail?: string | null, userId?: string | null) {
  try {
    await run("INSERT INTO activity (id, kind, user_id, detail, created_at) VALUES (?,?,?,?,?)",
      [newId(), kind, userId ?? null, detail ? String(detail).slice(0, 500) : null, nowIso()]);
  } catch { /* ignore */ }
}

/** Remembers when a scheduled job last ran, and how it went. */
export async function noteCron(job: string, result: string) {
  try {
    await run("INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [`cron:${job}`, JSON.stringify({ at: nowIso(), result })]);
  } catch { /* ignore */ }
  await logActivity("cron", `${job}: ${result}`);
}
