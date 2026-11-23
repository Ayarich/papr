import { one, run, nowIso, type Submission } from "@/lib/db";
import { addEvent } from "@/lib/submissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const metadata = { title: "Confirm a student's work" };
export const dynamic = "force-dynamic";

async function confirmAction(form: FormData) {
  "use server";
  const token = String(form.get("token"));
  const sub = await one<Submission>("SELECT * FROM submissions WHERE supervisor_token = ?", [token]);
  if (sub && !sub.supervisor_confirmed_at) {
    await run("UPDATE submissions SET supervisor_confirmed_at = ? WHERE id = ?", [nowIso(), sub.id]);
    await addEvent(sub.id, `Supervisor ${sub.supervisor_name} confirmed the work`);
    revalidatePath("/", "layout");
  }
  redirect(`/confirm/${token}`);
}

// Supervisors don't need an account. They get a private link by email and click one button.
// (A button, not the link itself, so email scanners that open links can't confirm by accident.)
export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sub = await one<Submission>("SELECT * FROM submissions WHERE supervisor_token = ?", [token]);
  if (!sub) return <div className="card empty narrow"><h2>This link isn&apos;t valid</h2><p style={{ marginTop: 8 }}>It may have been copied incorrectly.</p></div>;
  return (
    <div className="narrow card pad-lg stack" style={{ maxWidth: 560 }}>
      <h1>Confirm a student&apos;s work</h1>
      <div className="card" style={{ background: "var(--bg)" }}>
        <p className="small muted num">{sub.ref}</p>
        <h3 style={{ marginTop: 4 }}>{sub.title}</h3>
        <p className="small" style={{ marginTop: 6 }}>{sub.authors_text} · {sub.programme}, {sub.institution}</p>
      </div>
      {sub.supervisor_confirmed_at ? (
        <div className="notice ok"><b>Thank you, {sub.supervisor_name}.</b> You&apos;ve confirmed this work. The paper will show a &ldquo;Supervisor confirmed&rdquo; badge.</div>
      ) : (
        <form action={confirmAction} className="stack">
          <input type="hidden" name="token" value={token} />
          <p>You were named as supervisor of this work. Please confirm that it was done by this student under your supervision.</p>
          <div><button className="btn primary" type="submit">Yes, I confirm this is my student&apos;s work</button></div>
          <p className="small muted">If you don&apos;t recognise this work, simply close this page.</p>
        </form>
      )}
    </div>
  );
}
