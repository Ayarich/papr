import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getUser } from "@/lib/auth";
import { recordRead } from "@/lib/notify";
import { isFollowing } from "@/lib/follows";
import { monthName } from "@/lib/badges";
import { toggleSaveIdea } from "@/app/social-actions";
import FollowButton from "@/components/FollowButton";
import { all, one, run, type Submission, type Version } from "@/lib/db";
import { apa, fmtDate, fmtSize, splitList } from "@/lib/format";
import { APP_URL } from "@/lib/mail";
import CopyButton from "@/components/CopyButton";
import BehindTheScenes from "@/components/BehindTheScenes";

export const dynamic = "force-dynamic";

async function load(ref: string) {
  const p = await one<Submission>("SELECT * FROM submissions WHERE ref = ? AND status IN ('published','withdrawn')", [ref]);
  if (!p) return null;
  const v = await one<Version>("SELECT * FROM versions WHERE submission_id = ? AND number = ?", [p.id, p.current_version]);
  return { p, v };
}

// These <meta> tags are what Google Scholar reads to index the paper.
export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const { ref } = await params;
  const d = await load(ref);
  if (!d) return { title: "Not found" };
  const { p } = d;
  return {
    title: p.title,
    description: p.abstract.slice(0, 200),
    other: {
      citation_title: p.title,
      citation_author: splitList(p.authors_text),
      citation_publication_date: (p.published_at || "").slice(0, 10).replace(/-/g, "/"),
      citation_dissertation_institution: p.institution,
      citation_keywords: p.keywords,
      ...(p.doi ? { citation_doi: p.doi } : {}),
      ...(p.status === "published" ? { citation_pdf_url: `${APP_URL}/papers/${p.ref}/pdf` } : {}),
    },
  };
}

export default async function PaperPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const d = await load(ref);
  if (!d) notFound();
  const { p, v } = d;
  const me = await getUser();
  const h = await headers();
  if (me?.id !== p.owner_id) {
    await run("UPDATE submissions SET views = views + 1 WHERE id = ?", [p.id]);
    await recordRead(p, "view", me ? { id: me.id, institution: me.institution } : null, h.get("cf-ipcountry") || h.get("x-vercel-ip-country"));
    p.views++;
  }
  const award = await one<{ month: string; prize: string }>("SELECT month, prize FROM awards WHERE submission_id = ? ORDER BY month DESC LIMIT 1", [p.id]);
  const campaign = p.campaign_id ? await one<{ badge: string }>("SELECT badge FROM campaigns WHERE id = ?", [p.campaign_id]) : null;
  const ideas = await all<{ id: string; text: string; saves: number; mine: number }>(
    "SELECT t.id, t.text, (SELECT COUNT(*) FROM topic_saves x WHERE x.idea_id = t.id) AS saves, (SELECT COUNT(*) FROM topic_saves x WHERE x.idea_id = t.id AND x.user_id = ?) AS mine FROM topic_ideas t WHERE t.submission_id = ?", [me?.id || "", p.id]);
  const owner = await one<{ id: string; handle: string | null; name: string; role: string }>("SELECT id, handle, name, role FROM users WHERE id = ?", [p.owner_id]);
  const realOwner = owner && owner.role !== "system" && !owner.name.startsWith("Example");
  const followingAuthor = realOwner ? await isFollowing(me?.id, "author", owner!.id) : false;
  const followingField = await isFollowing(me?.id, "field", p.field);
  const back = `/papers/${p.ref}`;
  const history = await all<{ number: number; created_at: string }>("SELECT number, created_at FROM versions WHERE submission_id = ? ORDER BY number", [p.id]);
  const citation = apa(p);
  const share = encodeURIComponent(`${p.title}, by ${p.authors_text}. Read it free on papr: ${APP_URL}/papers/${p.ref}`);

  return (
    <>
      <div className="crumbs"><Link href="/library">Library</Link> › <Link href={`/library?field=${encodeURIComponent(p.field)}`}>{p.field}</Link></div>
      {p.status === "withdrawn" && (
        <div className="notice bad" style={{ marginBottom: 16 }}>
          <b>Withdrawn.</b> The author withdrew this paper on {fmtDate(p.withdrawn_at)}. The record stays so existing links and citations still work, but the PDF is no longer offered.
        </div>
      )}
      <div className="twocol">
        <article className="stack" style={{ gap: 20 }}>
          <div className="stack paperhead" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="tag">{p.field}</span>
              <span className="tag plain">{p.type}</span>
              <span className="npr" title="Checked by a moderator but not peer-reviewed">Not peer-reviewed</span>
              {p.supervisor_confirmed_at && <span className="okbadge">✓ Supervisor confirmed</span>}
              {award && <span className="award">🏆 Paper of the Month · {monthName(award.month)}</span>}
              {campaign && <span className="tag plain">🔥 {campaign.badge}</span>}
              {p.imported && !p.claimed_at ? <span className="tag plain">Added by the department</span> : null}
            </div>
            <h1>{p.title}</h1>
            <p><b>{realOwner && owner!.handle ? <Link href={`/u/${owner!.handle}`}>{p.authors_text}</Link> : p.authors_text}</b><br /><span className="muted">{p.programme}, {p.institution}</span></p>
            <div className="row" style={{ gap: 8 }}>
              {realOwner && me?.id !== owner!.id && <FollowButton kind="author" value={owner!.id} following={followingAuthor} back={back} label={p.authors_text.split(",")[0].split(" ")[0]} />}
              <FollowButton kind="field" value={p.field} following={followingField} back={back} label={p.field} />
            </div>
          </div>
          <div className="row">
            {p.status === "published" && v && <a className="btn primary" href={`/papers/${p.ref}/pdf`} target="_blank" rel="noopener">Download PDF · {fmtSize(v.pdf_size)}</a>}
            <CopyButton text={citation} label="Copy citation" />
            <a className="btn" href={`https://wa.me/?text=${share}`} target="_blank" rel="noopener">Share on WhatsApp</a>
          </div>
          <section className="stack" style={{ gap: 10 }}><h2>Abstract</h2><p className="abstract">{p.abstract}</p></section>
          <section className="stack" style={{ gap: 10 }}>
            <h3>Keywords</h3>
            <div className="row" style={{ gap: 6 }}>{splitList(p.keywords).map((k) => <Link key={k} className="tag plain" href={`/library?q=${encodeURIComponent(k)}`}>{k}</Link>)}</div>
          </section>
          {ideas.length > 0 && (
            <section className="stack" style={{ gap: 10 }}>
              <h3>💡 Research ideas from this paper</h3>
              <p className="small muted">Looking for a final-year project topic? These come from the author&apos;s recommendations.</p>
              {ideas.map((i) => (
                <div key={i.id} className="idea-row">
                  <span className="grow">{i.text}</span>
                  <form action={toggleSaveIdea}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="back" value={back} /><button className={`btn sm ${i.mine ? "" : "outline"}`} type="submit">{i.mine ? "✓ Saved" : "Save"}</button></form>
                </div>
              ))}
            </section>
          )}
          <section className="stack" style={{ gap: 10 }}><h3>How to cite (APA 7)</h3><div className="cite">{citation}</div></section>
          <BehindTheScenes points={[
            <>This page has a permanent address: <code>/papers/{p.ref}</code>.</>,
            <>The page&apos;s HTML includes Google Scholar <code>citation_*</code> meta tags. Open your browser&apos;s &ldquo;View page source&rdquo; to see them.</>,
            <>Each view adds 1 to the view count, and each PDF download adds 1 to downloads. A live site would count once per visitor per day.</>,
          ]} />
        </article>
        <aside className="card stack" style={{ gap: 16 }}>
          <div className="kv">
            <div><span>Published</span><b>{fmtDate(p.published_at)}</b></div>
            <div><span>DOI</span><b className="num">{p.doi || "Not assigned"}</b></div>
            <div><span>Supervisor</span><b>{p.supervisor_name}</b></div>
            <div><span>Year completed</span><b>{p.year}</b></div>
            <div><span>Version</span><b>{p.current_version}{history.length > 1 ? ` (earlier: ${history.slice(0, -1).map((h) => "v" + h.number).join(", ")})` : ""}</b></div>
            <div><span>Licence</span><b>CC BY 4.0</b><p className="small muted" style={{ marginTop: 2 }}>Anyone may share and reuse this work if they credit the authors.</p></div>
          </div>
          <div className="row num small muted" style={{ gap: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <span><b style={{ color: "var(--ink)" }}>{p.views.toLocaleString()}</b> views</span>
            <span><b style={{ color: "var(--ink)" }}>{p.downloads.toLocaleString()}</b> downloads</span>
          </div>
          <div className="notice gold small">Moderators check that this is genuine student research with complete details and no copied work. It has not been peer-reviewed, so read it critically.</div>
        </aside>
      </div>
    </>
  );
}
