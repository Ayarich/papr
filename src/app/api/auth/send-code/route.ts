import crypto from "crypto";
import { NextResponse } from "next/server";
import { sha256 } from "@/lib/auth";
import { one, run, newId, nowIso } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  // Anyone can sign up to read, follow and save ideas. Only .edu.gh accounts can publish (checked when submitting).

  // Limit: 5 codes per email per hour
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const recent = await one<{ n: number }>("SELECT COUNT(*) AS n FROM login_codes WHERE email = ? AND created_at > ?", [email, hourAgo]);
  if ((recent?.n || 0) >= 5) return NextResponse.json({ error: "Too many codes requested. Wait an hour and try again." }, { status: 429 });

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  await run("INSERT INTO login_codes (id, email, code_hash, expires_at, created_at) VALUES (?,?,?,?,?)",
    [newId(), email, sha256(code), new Date(Date.now() + 10 * 60000).toISOString(), nowIso()]);
  const sent = await sendEmail(email, `Your papr login code: ${code}`, `Your login code is ${code}.\n\nIt expires in 10 minutes. If you didn't ask for this, you can ignore this email.`);

  const showCode = process.env.SHOW_DEV_CODES === "true";
  if (!sent && !showCode && process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "We couldn't send the email just now. Try again in a minute." }, { status: 503 });
  return NextResponse.json({ ok: true, ...(showCode ? { devCode: code } : {}) });
}
