"use server";
import { clip } from "@/lib/format";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, isModerator } from "@/lib/auth";
import { all, one, run, newId, nowIso, type Collection, type Submission } from "@/lib/db";
import { notify } from "@/lib/notify";
import { addEvent } from "@/lib/submissions";
import { sendEmail, APP_URL } from "@/lib/mail";

const canRunCollections = (role: string) => ["lecturer", "moderator", "admin"].includes(role);

export async function createCollection(form: FormData) {
  const user = await requireUser("/collections");
  if (!canRunCollections(user.role)) redirect("/collections");
  const title = String(form.get("title") || "").trim().slice(0, 140);
  if (title.length < 5) redirect("/collections?error=title");
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const id = newId();
  const expected = parseInt(String(form.get("expected") || ""), 10);
  const deadline = String(form.get("deadline") || "");
  await run("INSERT INTO collections (id, slug, title, description, owner_id, institution, expected, deadline, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [id, slug, title, String(form.get("description") || "").trim().slice(0, 600), user.id, String(form.get("institution") || user.institution || ""),
      Number.isFinite(expected) && expected > 0 ? expected : null, /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline + "T23:59:59.000Z" : null, nowIso()]);
  redirect(`/collections/${id}?created=1`);
}

/** The lecturer confirms a student's work in one click (same as the supervisor email link). */
export async function confirmInCollection(form: FormData) {
  const user = await requireUser("/collections");
  const subId = String(form.get("submissionId"));
  const sub = await one<Submission & { coll_owner: string }>(
    "SELECT s.*, c.owner_id AS coll_owner FROM submissions s JOIN collections c ON c.id = s.collection_id WHERE s.id = ?", [subId]);
  if (!sub || (sub.coll_owner !== user.id && !isModerator(user))) return;
  if (!sub.supervisor_confirmed_at) {
    await run("UPDATE submissions SET supervisor_confirmed_at = ? WHERE id = ?", [nowIso(), subId]);
    await addEvent(subId, `${user.name || "Your lecturer"} confirmed the work`);
    await notify(sub.owner_id, { kind: "confirmed", text: `✅ ${user.name || "Your lecturer"} confirmed “${clip(sub.title)}”`, link: "/my" });
  }
  revalidatePath(`/collections/${sub.collection_id}`);
}

/** A student-role user asks to become a lecturer; moderators approve on the People page. */
export async function requestLecturer() {
  const user = await requireUser("/collections");
  await run("UPDATE users SET lecturer_requested = 1 WHERE id = ?", [user.id]);
  const mods = await all<{ id: string; email: string }>("SELECT id, email FROM users WHERE role IN ('moderator','admin')");
  for (const m of mods) {
    await notify(m.id, { kind: "lecturer-request", text: `${user.name || user.email} asked for lecturer access`, link: "/admin/people" });
    await sendEmail(m.email, "Lecturer access request", `${user.name || ""} (${user.email}) asked to become a lecturer on papr.\nApprove: ${APP_URL}/admin/people`);
  }
  revalidatePath("/collections");
}

export async function collectionFor(slugOrId: string) {
  return one<Collection & { owner_name: string; owner_email: string }>(
    "SELECT c.*, u.name AS owner_name, u.email AS owner_email FROM collections c JOIN users u ON u.id = c.owner_id WHERE c.slug = ? OR c.id = ?", [slugOrId, slugOrId]);
}
