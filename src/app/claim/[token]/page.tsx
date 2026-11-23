import { clip } from "@/lib/format";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { one, run, nowIso, type Submission } from "@/lib/db";
import { addEvent } from "@/lib/submissions";
import { notify } from "@/lib/notify";
import PaperCard from "@/components/PaperCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Claim your project" };

async function claim(form: FormData) {
  "use server";
  const token = String(form.get("token"));
  const user = await getUser();
  if (!user) redirect(`/login?next=/claim/${token}`);
  const sub = await one<Submission>("SELECT * FROM submissions WHERE claim_token = ? AND claimed_at IS NULL", [token]);
  if (!sub) redirect(`/claim/${token}`);
  await run("UPDATE submissions SET owner_id = ?, claimed_at = ?, claim_token = NULL, updated_at = ? WHERE id = ?", [user.id, nowIso(), nowIso(), sub.id]);
  await addEvent(sub.id, `Claimed by ${user.name || user.email}`);
  await notify(user.id, { kind: "claimed", text: `🎓 “${clip(sub.title)}” is now on your profile`, link: "/my" });
  redirect(`/my?claimed=${sub.ref}`);
}

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sub = await one<Submission>("SELECT * FROM submissions WHERE claim_token = ?", [token]);
  const user = await getUser();
  if (!sub) return <div className="card empty narrow"><h2>This claim link isn&apos;t valid</h2><p style={{ marginTop: 8 }}>It may already have been used. <Link href="/my">Go to my submissions</Link></p></div>;
  return (
    <div className="narrow stack" style={{ maxWidth: 680, gap: 22 }}>
      <span className="eyebrow">Claim your project</span>
      <h1>Is this your work?</h1>
      <p className="muted">Your department added this project to papr. Claim it to put it on your profile, see who reads it, and hear when people download it.</p>
      <PaperCard p={sub} />
      {user ? (
        <form action={claim} className="stack">
          <input type="hidden" name="token" value={token} />
          <p className="small">You&apos;re logged in as <b>{user.email}</b>. The paper will move to this account.</p>
          <div><button className="btn primary" type="submit">Yes, this is my project. Claim it</button></div>
        </form>
      ) : (
        <div className="stack"><p className="small">Log in with any email first. Your old student email isn&apos;t needed.</p>
          <div><Link className="btn primary" href={`/login?next=/claim/${token}`}>Log in to claim</Link></div></div>
      )}
    </div>
  );
}
