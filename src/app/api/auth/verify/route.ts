import { NextResponse } from "next/server";
import { sha256, startSession, isStudentEmail } from "@/lib/auth";
import { one, run, newId, nowIso, type User } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").trim();

  const row = await one<{ id: string; code_hash: string; attempts: number }>(
    "SELECT id, code_hash, attempts FROM login_codes WHERE email = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
    [email, nowIso()]
  );
  if (!row) return NextResponse.json({ error: "That code has expired. Send a new code." }, { status: 400 });
  if (row.attempts >= 5) return NextResponse.json({ error: "Too many wrong tries. Send a new code." }, { status: 429 });
  if (row.code_hash !== sha256(code)) {
    await run("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?", [row.id]);
    return NextResponse.json({ error: "That code doesn't match. Check it and try again." }, { status: 400 });
  }
  await run("UPDATE login_codes SET used_at = ? WHERE id = ?", [nowIso(), row.id]);

  // First login creates a student account.
  let user = await one<User>("SELECT * FROM users WHERE email = ?", [email]);
  if (!user) {
    const guess = email.split("@")[0].split(/[._-]/).filter((w) => /^[a-z]+$/i.test(w)).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    await run("INSERT INTO users (id, email, name, role, created_at) VALUES (?,?,?,?,?)", [newId(), email, guess, isStudentEmail(email) ? "student" : "reader", nowIso()]);
    user = await one<User>("SELECT * FROM users WHERE email = ?", [email]);
  }
  // Emails listed in ADMIN_EMAILS (Vercel settings) become admins when they log in. Use it to create the first admin.
  const admins = (process.env.ADMIN_EMAILS || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
  if (admins.includes(email) && user!.role !== "admin") {
    await run("UPDATE users SET role = 'admin' WHERE id = ?", [user!.id]);
    user = await one<User>("SELECT * FROM users WHERE id = ?", [user!.id]);
  }
  await startSession(user!.id);
  const home = user!.role === "student" ? "/my" : user!.role === "reader" ? "/" : user!.role === "lecturer" ? "/collections" : "/moderate";
  return NextResponse.json({ ok: true, home });
}
