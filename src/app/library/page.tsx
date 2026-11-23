import Link from "next/link";
import { all, type Submission } from "@/lib/db";
import { FIELDS, shortInst } from "@/lib/constants";
import PaperCard from "@/components/PaperCard";
import AutoSubmit from "./AutoSubmit";
import BehindTheScenes from "@/components/BehindTheScenes";
import FollowButton from "@/components/FollowButton";
import { getUser } from "@/lib/auth";
import { isFollowing } from "@/lib/follows";

export const dynamic = "force-dynamic";
export const metadata = { title: "Library" };

type SP = { q?: string; field?: string; inst?: string; year?: string; sort?: string };

export default async function Library({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const where: string[] = ["status = 'published'"];
  const args: string[] = [];
  // Each word must appear somewhere in the title, abstract, keywords, authors, institution or programme.
  for (const w of q.split(/\s+/).filter(Boolean).slice(0, 8)) {
    where.push("(title LIKE ? OR abstract LIKE ? OR keywords LIKE ? OR authors_text LIKE ? OR institution LIKE ? OR programme LIKE ?)");
    const like = `%${w}%`;
    args.push(like, like, like, like, like, like);
  }
  if (sp.field) { where.push("field = ?"); args.push(sp.field); }
  if (sp.inst) { where.push("institution = ?"); args.push(sp.inst); }
  if (sp.year) { where.push("year = ?"); args.push(sp.year); }
  const order = sp.sort === "views" ? "views DESC" : sp.sort === "title" ? "title COLLATE NOCASE ASC" : "published_at DESC";
  const results = await all<Submission>(`SELECT * FROM submissions WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT 100`, args);

  const insts = await all<{ institution: string }>("SELECT DISTINCT institution FROM submissions WHERE status = 'published' ORDER BY institution");
  const years = await all<{ year: string }>("SELECT DISTINCT year FROM submissions WHERE status = 'published' ORDER BY year DESC");
  const filtered = !!(q || sp.field || sp.inst || sp.year);
  const me = await getUser();
  const backUrl = `/library?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()}`;
  const fieldFollow = sp.field ? await isFollowing(me?.id, "field", sp.field) : false;
  const instFollow = sp.inst ? await isFollowing(me?.id, "institution", sp.inst) : false;

  return (
    <div className="stack">
      <h1>Library</h1>
      <p className="muted">Every paper here is open access and has been checked by a moderator. Papers are not peer-reviewed.</p>
      <form className="filters card" id="filters" action="/library">
        <AutoSubmit formId="filters" />
        <div className="q"><label className="lbl small" htmlFor="f-q">Search</label><input type="search" id="f-q" name="q" defaultValue={q} placeholder="Title, author, keyword…" /></div>
        <div><label className="lbl small" htmlFor="f-field">Field</label>
          <select id="f-field" name="field" defaultValue={sp.field || ""}><option value="">All fields</option>{FIELDS.map((f) => <option key={f}>{f}</option>)}</select></div>
        <div><label className="lbl small" htmlFor="f-inst">Institution</label>
          <select id="f-inst" name="inst" defaultValue={sp.inst || ""}><option value="">All institutions</option>{insts.map((i) => <option key={i.institution} value={i.institution}>{shortInst(i.institution)}</option>)}</select></div>
        <div><label className="lbl small" htmlFor="f-year">Year</label>
          <select id="f-year" name="year" defaultValue={sp.year || ""}><option value="">Any year</option>{years.map((y) => <option key={y.year}>{y.year}</option>)}</select></div>
        <input type="hidden" name="sort" value={sp.sort || "new"} />
        <button className="btn primary" type="submit">Search</button>
      </form>
      <div className="row between">
        <span className="row" style={{ gap: 10 }}><span className="muted small num">{results.length} paper{results.length === 1 ? "" : "s"}</span>
          {sp.field && <FollowButton kind="field" value={sp.field} following={fieldFollow} back={backUrl} label={sp.field} />}
          {sp.inst && <FollowButton kind="institution" value={sp.inst} following={instFollow} back={backUrl} label={shortInst(sp.inst)} />}</span>
        <div className="row small" style={{ gap: 6 }}>
          Sort:
          {[["new", "Newest"], ["views", "Most viewed"], ["title", "Title A–Z"]].map(([k, l]) => {
            const params = new URLSearchParams({ ...(q && { q }), ...(sp.field && { field: sp.field }), ...(sp.inst && { inst: sp.inst }), ...(sp.year && { year: sp.year }), sort: k });
            return <Link key={k} className={`tag ${(sp.sort || "new") === k ? "" : "plain"}`} href={`/library?${params}`}>{l}</Link>;
          })}
        </div>
      </div>
      <div className="grid g2">
        {results.map((p) => <PaperCard key={p.id} p={p} />)}
        {results.length === 0 && (
          <div className="card empty" style={{ gridColumn: "1/-1" }}>
            <b>No papers match your search.</b>
            <p className="small" style={{ marginTop: 6 }}>Try fewer words or clear a filter.</p>
            {filtered && <Link className="btn sm" style={{ marginTop: 12 }} href="/library">Clear filters</Link>}
          </div>
        )}
      </div>
      <BehindTheScenes points={[
        <>Search runs on the server with SQL <code>LIKE</code> queries over title, abstract, keywords and authors. On PostgreSQL you&apos;d switch to full-text search for better ranking.</>,
        <>Only papers with status <code>published</code> appear. Pending, declined and withdrawn papers never show here.</>,
      ]} />
    </div>
  );
}
