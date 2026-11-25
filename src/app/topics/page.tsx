import Link from "next/link";
import { getUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { FIELDS, shortInst } from "@/lib/constants";
import { ensureIndexed } from "@/lib/indexer";
import { toggleSaveIdea } from "@/app/social-actions";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Topic finder" };

type Idea = { id: string; text: string; field: string; ref: string; title: string; authors_text: string; institution: string; year: string; saves: number; mine: number };

export default async function Topics({ searchParams }: { searchParams: Promise<{ field?: string; q?: string; saved?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  await ensureIndexed(50);
  const where = ["s.status = 'published'"], args: string[] = [user?.id || ""];
  if (sp.field) { where.push("t.field = ?"); args.push(sp.field); }
  if (sp.q) { where.push("(t.text LIKE ? OR s.title LIKE ? OR s.keywords LIKE ?)"); args.push(`%${sp.q}%`, `%${sp.q}%`, `%${sp.q}%`); }
  if (sp.saved && user) where.push("EXISTS (SELECT 1 FROM topic_saves x WHERE x.idea_id = t.id AND x.user_id = ?1)");
  const ideas = await all<Idea>(
    `SELECT t.id, t.text, t.field, s.ref, s.title, s.authors_text, s.institution, s.year,
       (SELECT COUNT(*) FROM topic_saves x WHERE x.idea_id = t.id) AS saves,
       (SELECT COUNT(*) FROM topic_saves x WHERE x.idea_id = t.id AND x.user_id = ?1) AS mine
     FROM topic_ideas t JOIN submissions s ON s.id = t.submission_id WHERE ${where.join(" AND ")} ORDER BY saves DESC, t.created_at DESC LIMIT 120`,
    args);
  const back = `/topics${sp.field ? `?field=${encodeURIComponent(sp.field)}` : ""}`;

  return (
    <div className="stack" style={{ gap: 26 }}>
      <div className="slides-hero"><span className="eyebrow">For Level 300 students</span><h1>Find your final-year project topic</h1>
        <p className="muted" style={{ maxWidth: "60ch", marginTop: 10 }}>Every idea below comes from the &ldquo;recommendations for future research&rdquo; of a real paper on papr. Pick one, read the paper it came from, and build on it. Save ideas to discuss with your supervisor.</p></div>
      <form className="filters card" action="/topics" style={{ gridTemplateColumns: "2fr 1fr auto" }}>
        <div className="q"><label className="lbl small" htmlFor="t-q">Search ideas</label><input type="search" id="t-q" name="q" defaultValue={sp.q || ""} placeholder="e.g. water, GIS, mobile money" /></div>
        <div><label className="lbl small" htmlFor="t-f">Field</label><select id="t-f" name="field" defaultValue={sp.field || ""}><option value="">All fields</option>{FIELDS.map((f) => <option key={f}>{f}</option>)}</select></div>
        <button className="btn primary" type="submit">Search</button>
      </form>
      <div className="row between"><span className="small muted num">{ideas.length} idea{ideas.length === 1 ? "" : "s"}</span>
        {user && <Link className={`tag ${sp.saved ? "" : "plain"}`} href={sp.saved ? "/topics" : "/topics?saved=1"}><Icon name="idea" size={14} /> My saved ideas</Link>}</div>
      <div className="ideagrid stagger">
        {ideas.map((i) => (
          <div key={i.id} className="card idea">
            <span className="eyebrow">{i.field}</span>
            <p className="idea-text">{i.text}</p>
            <Link href={`/papers/${i.ref}`} className="idea-src small">From <b>{i.title}</b> · {i.authors_text.split(",")[0]} · {shortInst(i.institution)} · {i.year}</Link>
            <div className="row between">
              <span className="small muted num">{i.saves ? `${i.saves} saved` : "Be the first to save"}</span>
              <form action={toggleSaveIdea}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="back" value={back} />
                <button className={`btn sm ${i.mine ? "" : "outline"}`} type="submit">{i.mine ? <><Icon name="check" size={14} /> Saved</> : "Save idea"}</button></form>
            </div>
          </div>
        ))}
        {ideas.length === 0 && <div className="card empty" style={{ gridColumn: "1/-1" }}>No ideas match yet. Try another field.</div>}
      </div>
    </div>
  );
}
