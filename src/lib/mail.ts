import { all, run, newId, nowIso } from "./db";

// The site's public address, used in emails. On Vercel it falls back to the project's production domain.
export const APP_URL = (process.env.APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");

/**
 * Sends an email. Every email is also saved in the database (see /dev/outbox while developing).
 * - With GMAIL_USER and GMAIL_APP_PASSWORD set, it is sent from that Gmail account (no domain needed, about 500 a day).
 * - With RESEND_API_KEY and EMAIL_FROM set (e.g. EMAIL_FROM="papr <hello@yourdomain.com>"), it is really sent via Resend.
 * - Without them, nothing leaves the server: the email is printed in the terminal / Vercel logs.
 */
export async function sendEmail(to: string, subject: string, body: string) {
  const id = newId();
  await run('INSERT INTO emails (id, "to", subject, body, created_at, status) VALUES (?,?,?,?,?,?)', [id, to, subject, body, nowIso(), "sending"]);
  const mark = (status: string, provider: string, error?: string) =>
    run("UPDATE emails SET status = ?, provider = ?, error = ? WHERE id = ?", [status, provider, error ? error.slice(0, 300) : null, id]).catch(() => 0);
  const gUser = process.env.GMAIL_USER, gPass = process.env.GMAIL_APP_PASSWORD;
  if (gUser && gPass) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const t = nodemailer.createTransport({ service: "gmail", auth: { user: gUser, pass: gPass.replace(/\s+/g, "") } });
      await t.sendMail({ from: `papr <${gUser}>`, to, subject, text: body });
      await mark("sent", "gmail");
      return true;
    } catch (e) {
      console.error(`Email to ${to} failed (Gmail):`, (e as Error).message);
      await mark("failed", "gmail", (e as Error).message);
      return false;
    }
  }
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (key && from) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text: body }),
      });
      if (!r.ok) {
        const msg = `${r.status}: ${(await r.text()).slice(0, 300)}`;
        console.error(`Email to ${to} failed (${msg})`);
        await mark("failed", "resend", msg);
      } else await mark("sent", "resend");
      return r.ok;
    } catch (e) {
      console.error(`Email to ${to} failed:`, e);
      await mark("failed", "resend", String(e));
      return false;
    }
  }
  await mark("not_sent", "none");
  if (process.env.NODE_ENV === "production") console.warn(`Email not sent (RESEND_API_KEY / EMAIL_FROM not set): "${subject}" to ${to}`);
  else console.log(`\n----- EMAIL -----\nTo: ${to}\nSubject: ${subject}\n\n${body}\n-----------------\n`);
  return false;
}

export async function emailModerators(subject: string, body: string) {
  const mods = await all<{ email: string }>("SELECT email FROM users WHERE role IN ('moderator','admin')");
  for (const m of mods) await sendEmail(m.email, subject, body);
}
