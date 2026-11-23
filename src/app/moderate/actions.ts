"use server";
import { clip } from "@/lib/format";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModerator } from "@/lib/auth";
import { all, one, run, newId, nowIso, type Submission } from "@/lib/db";
import { CHECKS } from "@/lib/constants";
import { reportForSubmission } from "@/lib/sim-check";
import { notify } from "@/lib/notify";
import { buildIdeas } from "@/lib/indexer";
import { addEvent } from "@/lib/submissions";
import { sendEmail, APP_URL } from "@/lib/mail";

const DOI_PREFIX = process.env.DOI_PREFIX || "10.99999";

/** Placeholder for Crossref registration. Replace with a call to the Crossref deposit API once you are a member. */
async function registerDoi(doi: string, sub: Submission) {
  console.log(`[DOI] Would register ${doi} for ${sub.ref} -> ${APP_URL}/papers/${sub.ref}`);
}

export async function decide(form: FormData) {
  const mod = await requireModerator();
  const id = String(form.get("id"));
  const decision = String(form.get("decision"));
  const note = String(form.get("note") || "").trim();
  let checklist: Record<string, boolean> = {};
  try { checklist = JSON.parse(String(form.get("checklist") || "{}")); } catch { /* empty */ }

  const sub = await one<Submission>("SELECT * FROM submissions WHERE id = ?", [id]);
  if (!sub || sub.status !== "pending") redirect("/moderate");
  if (!["publish", "changes", "reject"].includes(decision)) redirect(`/moderate?id=${id}`);
  if (decision === "publish" && !CHECKS.every((c) => checklist[c.key])) redirect(`/moderate?id=${id}`);
  if (decision !== "publish" && note.length < 15) redirect(`/moderate?id=${id}`);

  const sim = { score: Math.round((await reportForSubmission(id))?.report.percent || 0) };
  const now = nowIso();
  await run("INSERT INTO reviews (id, submission_id, version_number, moderator_id, decision, note, checklist, similarity, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [newId(), id, sub.current_version, mod.id, decision, note || null, JSON.stringify(checklist), sim.score, now]);

  const owner = await one<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", [sub.owner_id]);
  if (decision === "publish") {
    const doi = sub.doi || `${DOI_PREFIX}/papr.${sub.ref.split("-")[1]}.${sub.ref.split("-")[2]}`;
    await run("UPDATE submissions SET status = 'published', doi = ?, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?", [doi, now, now, id]);
    await registerDoi(doi, sub);
    await addEvent(id, "Published with permanent link and DOI");
    await buildIdeas({ id, abstract: sub.abstract, field: sub.field, current_version: sub.current_version });
    await notify(sub.owner_id, { kind: "published", text: `🎉 “${clip(sub.title)}” is live on papr`, link: `/papers/${sub.ref}` });
    // Tell followers of this author straight away; field/institution followers get it in the weekly digest
    const followers = await all<{ user_id: string }>("SELECT user_id FROM follows WHERE kind = 'author' AND value = ?", [sub.owner_id]);
    for (const f of followers) await notify(f.user_id, { kind: "follow", text: `📄 ${sub.authors_text.split(",")[0]} published “${clip(sub.title)}”`, link: `/papers/${sub.ref}` });
    if (owner) await sendEmail(owner.email, `Published: ${sub.title}`,
      `Congratulations ${owner.name}!\n\nYour paper is now live:\n${APP_URL}/papers/${sub.ref}\n\nDOI: ${doi}\nAdd this link to your CV and share it with your lecturers.${note ? `\n\nNote from the moderator: ${note}` : ""}`);
  } else if (decision === "changes") {
    await run("UPDATE submissions SET status = 'changes', updated_at = ? WHERE id = ?", [now, id]);
    await addEvent(id, "Moderator requested changes");
    await notify(sub.owner_id, { kind: "changes", text: `✏️ A moderator asked for changes to “${clip(sub.title)}”`, link: "/my" });
    if (owner) await sendEmail(owner.email, `Changes needed: ${sub.ref}`,
      `Hi ${owner.name},\n\nA moderator has looked at "${sub.title}" and asked for a few changes before it can be published:\n\n${note}\n\nEdit and resubmit here: ${APP_URL}/my`);
  } else {
    await run("UPDATE submissions SET status = 'rejected', updated_at = ? WHERE id = ?", [now, id]);
    await addEvent(id, "Declined by moderator");
    await notify(sub.owner_id, { kind: "declined", text: `“${clip(sub.title)}” wasn't accepted. See the moderator's note.`, link: "/my" });
    if (owner) await sendEmail(owner.email, `About your submission ${sub.ref}`,
      `Hi ${owner.name},\n\nThank you for submitting "${sub.title}". Unfortunately we can't publish it on papr. The moderator's reason:\n\n${note}\n\nYou're welcome to submit other work in the future.`);
  }
  revalidatePath("/", "layout");
  redirect(`/moderate?done=${decision}`);
}
