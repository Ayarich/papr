import Link from "next/link";
import { notFound } from "next/navigation";
import { all, type Submission } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { shortInst } from "@/lib/constants";
import { timeLeft } from "@/lib/campaigns";
import PaperCard from "@/components/PaperCard";
import { collectionFor } from "@/app/collections/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await collectionFor(slug);
  return { title: c ? c.title : "Collection" };
}

// The page students open from their lecturer's link.
export default async function PublicCollection({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await collectionFor(slug);
  if (!c) notFound();
  const published = await all<Submission>("SELECT * FROM submissions WHERE collection_id = ? AND status = 'published' ORDER BY published_at DESC", [c.id]);
  const count = (await all<{ n: number }>("SELECT COUNT(*) AS n FROM submissions WHERE collection_id = ?", [c.id]))[0]?.n || 0;
  const open = !c.deadline || new Date(c.deadline) > new Date();

  return (
    <div className="stack" style={{ gap: 32 }}>
      <div className="coll-hero">
        <span className="eyebrow">{shortInst(c.institution) || "Collection"} · curated by {c.owner_name}</span>
        <h1>{c.title}</h1>
        {c.description && <p className="muted" style={{ maxWidth: "60ch" }}>{c.description}</p>}
        <div className="row small muted">
          <span><b style={{ color: "var(--ink)" }}>{count}</b> student{count === 1 ? "" : "s"} have uploaded</span>
          {c.deadline && <span>· Deadline {fmtDate(c.deadline)} {open ? `(${timeLeft(c.deadline)})` : "(closed)"}</span>}
        </div>
        {open && <div><Link className="btn primary" href={`/submit?c=${c.slug}`}>Upload your project to this collection</Link></div>}
      </div>
      <section className="stack">
        <h2>Published from this collection</h2>
        {published.length ? <div className="grid g2">{published.map((p) => <PaperCard key={p.id} p={p} />)}</div>
          : <div className="card empty">Papers appear here once a moderator publishes them.</div>}
      </section>
    </div>
  );
}
