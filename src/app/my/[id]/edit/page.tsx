import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { all, one, type Submission, type Version } from "@/lib/db";
import { splitList } from "@/lib/format";
import Wizard from "@/components/Wizard";

export const metadata = { title: "Edit submission" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/my/${id}/edit`);
  const sub = await one<Submission>("SELECT * FROM submissions WHERE id = ? AND owner_id = ?", [id, user.id]);
  if (!sub) notFound();
  if (sub.status !== "changes") redirect("/my");
  const v = (await one<Version>("SELECT * FROM versions WHERE submission_id = ? AND number = ?", [id, sub.current_version]))!;
  const authors = await all<{ name: string; email: string | null }>("SELECT name, email FROM authors WHERE submission_id = ? ORDER BY position", [id]);
  const note = await one<{ note: string }>("SELECT note FROM reviews WHERE submission_id = ? AND note IS NOT NULL ORDER BY created_at DESC LIMIT 1", [id]);
  return (
    <Wizard
      mode="edit"
      submissionId={sub.id}
      submissionRef={sub.ref}
      nextVersion={sub.current_version + 1}
      moderatorNote={note?.note}
      email={user.email}
      existingFile={{ name: v.pdf_name, size: v.pdf_size }}
      initial={{
        name: user.name, institution: sub.institution, programme: sub.programme, level: user.level || "Level 400",
        title: sub.title, abstract: sub.abstract, keywords: splitList(sub.keywords), field: sub.field, type: sub.type, year: sub.year,
        coauthors: authors.slice(1).map((a) => ({ name: a.name, email: a.email || "" })),
        supName: sub.supervisor_name, supEmail: sub.supervisor_email, notifySup: !sub.supervisor_confirmed_at,
      }}
    />
  );
}
