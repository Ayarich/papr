"use server";
import { clip } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModerator } from "@/lib/auth";
import { one, run, newId, nowIso, type Submission } from "@/lib/db";
import { FIELDS } from "@/lib/constants";
import { notify } from "@/lib/notify";
import { sendEmail, APP_URL } from "@/lib/mail";
import { sendDigests } from "@/lib/follows";
import { monthName } from "@/lib/badges";
import { refreshLive, refreshSource } from "@/lib/live-opps";

export async function setRole(form: FormData) {
  await requireModerator();
  const id = String(form.get("id")), role = String(form.get("role"));
  if (!["student", "reader", "lecturer", "moderator"].includes(role)) return;
  await run("UPDATE users SET role = ?, lecturer_requested = 0 WHERE id = ?", [role, id]);
  if (role === "lecturer") await notify(id, { kind: "role", text: "🎓 You now have lecturer access. Create your first collection.", link: "/collections" });
  revalidatePath("/admin/people");
}

export async function addOpportunity(form: FormData) {
  const mod = await requireModerator();
  const g = (k: string) => String(form.get(k) || "").trim();
  if (!g("title") || !g("org") || !g("type")) redirect("/admin/opportunities?error=1");
  const fields = form.getAll("fields").map(String).filter((f) => FIELDS.includes(f)).join(",");
  const url = /^https?:\/\//.test(g("url")) ? g("url") : "";
  await run("INSERT INTO opportunities (id, title, org, type, fields, location, deadline, url, description, sample, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)",
    [newId(), g("title").slice(0, 160), g("org").slice(0, 120), g("type"), fields, g("location").slice(0, 80), /^\d{4}-\d{2}-\d{2}$/.test(g("deadline")) ? g("deadline") : null, url, g("description").slice(0, 1500), mod.id, nowIso()]);
  revalidatePath("/opportunities"); revalidatePath("/admin/opportunities");
  redirect("/admin/opportunities?added=1");
}

export async function deleteOpportunity(form: FormData) {
  await requireModerator();
  // Live items are hidden rather than deleted, so the next feed refresh doesn't bring them back.
  const id = String(form.get("id"));
  await run("UPDATE opportunities SET hidden = 1 WHERE id = ? AND live = 1", [id]);
  await run("DELETE FROM opportunities WHERE id = ? AND live = 0", [id]);
  revalidatePath("/admin/opportunities"); revalidatePath("/opportunities");
}

export async function addSource(form: FormData) {
  await requireModerator();
  const name = String(form.get("name") || "").trim().slice(0, 80), url = String(form.get("url") || "").trim();
  if (!name || !/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(url)) redirect("/admin/opportunities?srcerror=1");
  await run("INSERT OR IGNORE INTO feed_sources (id, name, url, enabled, created_at) VALUES (?,?,?,1,?)", [newId(), name, url, nowIso()]);
  const src = await one<{ id: string; name: string; url: string }>("SELECT id, name, url FROM feed_sources WHERE url = ?", [url]);
  if (src) await refreshSource(src);
  redirect("/admin/opportunities?srcadded=1");
}

export async function toggleSource(form: FormData) {
  await requireModerator();
  await run("UPDATE feed_sources SET enabled = 1 - enabled WHERE id = ?", [String(form.get("id"))]);
  revalidatePath("/admin/opportunities");
}

export async function deleteSource(form: FormData) {
  await requireModerator();
  await run("DELETE FROM feed_sources WHERE id = ?", [String(form.get("id"))]);
  revalidatePath("/admin/opportunities");
}

export async function refreshNow() {
  await requireModerator();
  const n = await refreshLive(true);
  redirect(`/admin/opportunities?refreshed=${n}`);
}

export async function addCampaign(form: FormData) {
  await requireModerator();
  const g = (k: string) => String(form.get(k) || "").trim();
  if (!g("title") || !/^\d{4}-\d{2}-\d{2}$/.test(g("starts")) || !/^\d{4}-\d{2}-\d{2}$/.test(g("ends"))) redirect("/admin/campaigns?error=1");
  await run("INSERT INTO campaigns (id, title, message, badge, starts_at, ends_at, created_at) VALUES (?,?,?,?,?,?,?)",
    [newId(), g("title").slice(0, 80), g("message").slice(0, 200) || "Upload your project this week to earn a badge.", g("badge").slice(0, 40) || g("title").slice(0, 40), g("starts") + "T00:00:00.000Z", g("ends") + "T23:59:59.000Z", nowIso()]);
  revalidatePath("/", "layout");
  redirect("/admin/campaigns?added=1");
}

export async function endCampaign(form: FormData) {
  await requireModerator();
  await run("UPDATE campaigns SET ends_at = ? WHERE id = ?", [new Date(Date.now() - 1000).toISOString(), String(form.get("id"))]);
  revalidatePath("/", "layout");
}

export async function giveAward(form: FormData) {
  await requireModerator();
  const month = String(form.get("month")), subId = String(form.get("submissionId"));
  const prize = String(form.get("prize") || "").trim() || "Paper of the Month badge";
  const sub = await one<Submission>("SELECT * FROM submissions WHERE id = ? AND status = 'published'", [subId]);
  if (!sub || !/^\d{4}-\d{2}$/.test(month)) return;
  await run("DELETE FROM awards WHERE month = ?", [month]);
  await run("INSERT INTO awards (id, month, submission_id, prize, sponsor, citation, created_at) VALUES (?,?,?,?,?,?,?)",
    [newId(), month, subId, prize, String(form.get("sponsor") || "").trim(), String(form.get("citation") || "").trim(), nowIso()]);
  await notify(sub.owner_id, { kind: "award", text: `🏆 “${clip(sub.title)}” is papr's Paper of the Month for ${monthName(month)}!`, link: `/papers/${sub.ref}` });
  const owner = await one<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", [sub.owner_id]);
  if (owner && !owner.email.endsWith("@papr.local"))
    await sendEmail(owner.email, `🏆 You won Paper of the Month!`, `Congratulations ${owner.name}!\n\n"${sub.title}" is papr's Paper of the Month for ${monthName(month)}.\nPrize: ${prize}\n\nWe'll be in touch about your prize. Share the news: ${APP_URL}/papers/${sub.ref}`);
  revalidatePath("/", "layout");
}

export async function runDigest() {
  await requireModerator();
  const n = await sendDigests();
  redirect(`/admin/digest?sent=${n}`);
}
