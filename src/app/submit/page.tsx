import Link from "next/link";
import { requireUser } from "@/lib/auth";
import Wizard from "@/components/Wizard";
import BehindTheScenes from "@/components/BehindTheScenes";
import { collectionFor } from "@/app/collections/actions";

export const metadata = { title: "Submit research" };

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const user = await requireUser(c ? `/submit?c=${encodeURIComponent(c)}` : "/submit");
  const coll = c ? await collectionFor(c) : null;
  if (user.role !== "student" && user.role !== "lecturer") {
    return <div className="card empty"><h2>Publishing needs a university account</h2><p style={{ marginTop: 8 }}>You&apos;re logged in as {user.email}. To publish research, log out and log in with your university email ending in <b>.edu.gh</b>. <Link href="/library">Browse the library</Link></p></div>;
  }
  return (
    <div className="stack">
      <div className="narrow notice info small row between" style={{ flexWrap: "wrap", gap: 8 }}>
        <span>📘 First time? Read the <Link href="/guidelines">author guidelines</Link> or start from the <a href="/papr-article-template.docx" download>papr article template</a>.</span>
      </div>
      <Wizard
        mode="new"
        email={user.email}
        initial={{ name: user.name, institution: user.institution || coll?.institution || "", programme: user.programme || "", level: user.level || "Level 400",
          ...(coll ? { supName: coll.owner_name, supEmail: coll.owner_email } : {}) }}
        collection={coll ? { slug: coll.slug, title: coll.title, owner: coll.owner_name } : undefined}
      />
      <div className="narrow">
        <BehindTheScenes points={[
          "Your answers are saved in this browser as you type, so you can close the tab and continue later. The PDF has to be chosen again after a reload.",
          "On submit, the form and PDF go to /api/submissions. The server checks every field again, checks the file really is a PDF, and saves it in the uploads folder.",
          "You get a reference number. Moderators, your supervisor (if you asked) and any co-authors with emails are notified. See them in the Dev email outbox.",
        ]} />
      </div>
    </div>
  );
}
