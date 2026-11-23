"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { one, run, nowIso } from "@/lib/db";
import { addEvent } from "@/lib/submissions";

export async function withdraw(form: FormData) {
  const user = await requireUser("/my");
  const id = String(form.get("id"));
  const sub = await one<{ status: string }>("SELECT status FROM submissions WHERE id = ? AND owner_id = ?", [id, user.id]);
  if (!sub || sub.status !== "published") return;
  await run("UPDATE submissions SET status = 'withdrawn', withdrawn_at = ?, updated_at = ? WHERE id = ?", [nowIso(), nowIso(), id]);
  await addEvent(id, "Withdrawn by author");
  revalidatePath("/my");
}
