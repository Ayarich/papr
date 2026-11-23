"use server";
import { clip } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser, requireUser } from "@/lib/auth";
import { one, run, newId, nowIso } from "@/lib/db";
import { FIELDS } from "@/lib/constants";
import { notify } from "@/lib/notify";
import { sendEmail, APP_URL } from "@/lib/mail";

async function userOrLogin(next: string) {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function toggleFollow(form: FormData) {
  const kind = String(form.get("kind")), value = String(form.get("value")), back = String(form.get("back") || "/");
  const user = await userOrLogin(back);
  if (!["field", "institution", "author"].includes(kind) || !value) return;
  const ex = await one("SELECT 1 FROM follows WHERE user_id = ? AND kind = ? AND value = ?", [user.id, kind, value]);
  if (ex) await run("DELETE FROM follows WHERE user_id = ? AND kind = ? AND value = ?", [user.id, kind, value]);
  else {
    await run("INSERT INTO follows (user_id, kind, value, created_at) VALUES (?,?,?,?)", [user.id, kind, value, nowIso()]);
    if (kind === "author" && value !== user.id) await notify(value, { kind: "follower", text: `👋 ${user.name || "Someone"} started following your research`, link: user.handle ? `/u/${user.handle}` : undefined, group: `followers-${value}` });
  }
  revalidatePath(back);
}

export async function toggleSaveIdea(form: FormData) {
  const id = String(form.get("id")), back = String(form.get("back") || "/topics");
  const user = await userOrLogin(back);
  const ex = await one("SELECT 1 FROM topic_saves WHERE user_id = ? AND idea_id = ?", [user.id, id]);
  if (ex) await run("DELETE FROM topic_saves WHERE user_id = ? AND idea_id = ?", [user.id, id]);
  else {
    await run("INSERT INTO topic_saves (user_id, idea_id, created_at) VALUES (?,?,?)", [user.id, id, nowIso()]);
    const idea = await one<{ owner_id: string; title: string; ref: string }>(
      "SELECT s.owner_id, s.title, s.ref FROM topic_ideas t JOIN submissions s ON s.id = t.submission_id WHERE t.id = ?", [id]);
    if (idea && idea.owner_id !== user.id)
      await notify(idea.owner_id, { kind: "idea-saved", text: `💡 A student saved a research idea from “${clip(idea.title)}”. Your work is inspiring new projects.`, link: `/papers/${idea.ref}`, group: `ideas-${idea.ref}` });
  }
  revalidatePath(back);
}

export async function updateProfile(form: FormData) {
  const user = await requireUser("/profile");
  const g = (k: string) => String(form.get(k) || "").trim();
  let handle = g("handle").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  if (handle.length < 3) handle = "";
  if (handle && (await one("SELECT 1 FROM users WHERE handle = ? AND id != ?", [handle, user.id]))) redirect("/profile?error=handle");
  const skills = g("skills").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 15).join(", ");
  const interests = form.getAll("interests").map(String).filter((f) => FIELDS.includes(f)).join(",");
  const linkedin = /^https?:\/\/(www\.)?linkedin\.com\//i.test(g("linkedin")) ? g("linkedin") : "";
  await run("UPDATE users SET name = ?, handle = ?, headline = ?, bio = ?, skills = ?, linkedin = ?, open_to_opps = ?, interests = ? WHERE id = ?",
    [g("name") || user.name, handle || null, g("headline").slice(0, 120), g("bio").slice(0, 600), skills, linkedin, form.get("open") ? 1 : 0, interests, user.id]);
  revalidatePath("/profile");
  redirect("/profile?saved=1");
}

/** A recruiter or grad programme asks to contact a student. The student gets the message and decides; their email stays private. */
export async function requestContact(form: FormData) {
  const toId = String(form.get("to")), message = String(form.get("message") || "").trim().slice(0, 1000), back = String(form.get("back") || "/talent");
  const from = await userOrLogin(back);
  if (message.length < 20) redirect(`${back}?contact=short`);
  const to = await one<{ id: string; email: string; name: string; open_to_opps: number }>("SELECT id, email, name, open_to_opps FROM users WHERE id = ?", [toId]);
  if (!to || !to.open_to_opps) return;
  const recent = await one<{ n: number }>("SELECT COUNT(*) AS n FROM contact_requests WHERE from_id = ? AND created_at > ?", [from.id, new Date(Date.now() - 86400000).toISOString()]);
  if ((recent?.n || 0) >= 20) redirect(`${back}?contact=limit`);
  await run("INSERT INTO contact_requests (id, from_id, to_id, message, created_at) VALUES (?,?,?,?,?)", [newId(), from.id, to.id, message, nowIso()]);
  await notify(to.id, { kind: "contact", text: `✉️ ${from.name || from.email} wants to get in touch about an opportunity. Check your email.`, link: "/notifications" });
  await sendEmail(to.email, `${from.name || "Someone"} found you on papr`,
    `Hi ${to.name},\n\n${from.name || "Someone"} (${from.email}) found your profile on papr and sent you this message:\n\n"${message}"\n\nIf you're interested, reply to them directly at ${from.email}. papr never shares your email unless you reply.\n\nManage your profile: ${APP_URL}/profile`);
  redirect(`${back}?contact=sent`);
}
