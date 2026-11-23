import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { all, one, type Submission, type User } from "@/lib/db";
import { shortInst } from "@/lib/constants";
import { badgesFor } from "@/lib/badges";
import { isFollowing } from "@/lib/follows";
import PaperCard from "@/components/PaperCard";
import FollowButton from "@/components/FollowButton";
import { requestContact } from "@/app/social-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const u = await one<User>("SELECT * FROM users WHERE handle = ?", [handle]);
  return { title: u ? `${u.name}` : "Profile" };
}

export default async function PublicProfile({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ contact?: string }> }) {
  const { handle } = await params;
  const { contact } = await searchParams;
  const u = await one<User>("SELECT * FROM users WHERE handle = ?", [handle]);
  if (!u) notFound();
  const me = await getUser();
  const papers = await all<Submission>("SELECT * FROM submissions WHERE owner_id = ? AND status = 'published' ORDER BY published_at DESC", [u.id]);
  const badges = await badgesFor(u.id);
  const stats = await one<{ views: number; downloads: number; countries: number; insts: number }>(
    `SELECT COALESCE(SUM(s.views),0) AS views, COALESCE(SUM(s.downloads),0) AS downloads,
       (SELECT COUNT(DISTINCT r.country) FROM read_events r JOIN submissions x ON x.id = r.submission_id WHERE x.owner_id = ?1 AND r.country IS NOT NULL) AS countries,
       (SELECT COUNT(DISTINCT r.institution) FROM read_events r JOIN submissions x ON x.id = r.submission_id WHERE x.owner_id = ?1 AND r.institution IS NOT NULL) AS insts
     FROM submissions s WHERE s.owner_id = ?1 AND s.status = 'published'`, [u.id]);
  const following = await isFollowing(me?.id, "author", u.id);
  const back = `/u/${handle}`;
  const initials = (u.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="profile-head">
        <span className="avatar xl">{initials}</span>
        <div className="stack" style={{ gap: 6 }}>
          <h1>{u.name}</h1>
          {u.headline && <p className="muted">{u.headline}</p>}
          <p className="small muted">{[u.programme, shortInst(u.institution || "")].filter(Boolean).join(" · ")}</p>
          <div className="row" style={{ gap: 8 }}>
            {u.open_to_opps ? <span className="pill published">Open to opportunities</span> : null}
            {me?.id !== u.id && <FollowButton kind="author" value={u.id} following={following} back={back} label="" />}
            {u.linkedin && <a className="btn sm" href={u.linkedin} target="_blank" rel="noopener">LinkedIn</a>}
          </div>
        </div>
      </div>
      <div className="grid g3">
        <div className="card stat"><b className="num">{(stats?.views || 0).toLocaleString()}</b><span>reads</span></div>
        <div className="card stat"><b className="num">{(stats?.downloads || 0).toLocaleString()}</b><span>downloads</span></div>
        <div className="card stat"><b className="num">{papers.length}</b><span>published paper{papers.length === 1 ? "" : "s"}</span></div>
      </div>
      {badges.length > 0 && <section className="stack"><h2>Badges</h2><div className="badges">{badges.map((b) => <span key={b.key} className="badge" title={b.desc}>{b.emoji} {b.label}</span>)}</div></section>}
      {u.bio && <section className="stack"><h2>About</h2><p style={{ maxWidth: "65ch" }}>{u.bio}</p></section>}
      {u.skills && <section className="stack"><h2>Skills</h2><div className="chips">{u.skills.split(",").map((s) => <span key={s} className="tag plain">{s.trim()}</span>)}</div></section>}
      <section className="stack"><h2>Research</h2>{papers.length ? <div className="grid g2">{papers.map((p) => <PaperCard key={p.id} p={p} />)}</div> : <p className="muted">No published papers yet.</p>}</section>
      {u.open_to_opps && me?.id !== u.id ? (
        <section className="card pad-lg stack" id="contact">
          <h2>Get in touch</h2>
          {contact === "sent" ? <div className="notice ok">Message sent. {u.name.split(" ")[0]} will reply to you directly if interested.</div> : (
            me ? (
              <form action={requestContact} className="stack">
                <input type="hidden" name="to" value={u.id} /><input type="hidden" name="back" value={back} />
                {contact === "short" && <p className="err">Write a little more (at least a sentence) about the opportunity.</p>}
                {contact === "limit" && <p className="err">You&apos;ve sent a lot of messages today. Try again tomorrow.</p>}
                <textarea name="message" style={{ minHeight: 100 }} placeholder="Introduce yourself and the opportunity (internship, job, research position…)" />
                <div><button className="btn primary" type="submit">Send message</button></div>
                <p className="hint">Your name and email are shared with {u.name.split(" ")[0]} so they can reply. Their email stays private.</p>
              </form>
            ) : <p className="small"><a href={`/login?next=${encodeURIComponent(back)}`}>Log in</a> (any email works) to send {u.name.split(" ")[0]} a message.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
