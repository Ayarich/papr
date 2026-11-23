import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, run, newId, nowIso, type User } from "./db";

export const SESSION_COOKIE = "papr_session";
export const SESSION_DAYS = 30;

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const newToken = () => crypto.randomBytes(32).toString("hex");

/** Students sign in with a Ghanaian university email (anything ending in .edu.gh). */
export function isStudentEmail(email: string): boolean {
  return /^[^\s@]+@([a-z0-9-]+\.)*edu\.gh$/i.test(email.trim());
}

export async function getUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return one<User>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [sha256(token), nowIso()]
  );
}

export async function requireUser(nextPath: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export const isModerator = (u: User | null) => !!u && (u.role === "moderator" || u.role === "admin");

export async function requireModerator(): Promise<User> {
  const user = await requireUser("/moderate");
  if (!isModerator(user)) redirect("/?notice=moderators-only");
  return user;
}

export async function startSession(userId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  // Only a hash of the token is stored, so a leaked database can't be used to log in.
  await run("INSERT INTO sessions (id, token_hash, user_id, expires_at, created_at) VALUES (?,?,?,?,?)",
    [newId(), sha256(token), userId, expires.toISOString(), nowIso()]);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (!!process.env.VERCEL || (process.env.APP_URL || "").startsWith("https")),
    path: "/",
    expires,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
  store.delete(SESSION_COOKIE);
}
