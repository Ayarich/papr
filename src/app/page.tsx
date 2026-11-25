import Link from "next/link";
import { all, one, type Submission } from "@/lib/db";
import { FIELDS } from "@/lib/constants";
import PaperCard from "@/components/PaperCard";
import Reveal from "@/components/Reveal";
import Counter from "@/components/Counter";
import HeroScene from "@/components/HeroScene";
import PromoCarousel from "@/components/PromoCarousel";
import { TOOL_LIST } from "@/lib/tool-list";
import { monthName } from "@/lib/badges";
import { shortInst } from "@/lib/constants";
import { ensureIndexed } from "@/lib/indexer";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

const Arrow = () => (
  <svg className="arr" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);


export default async function Home({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const recent = await all<Submission>("SELECT * FROM submissions WHERE status = 'published' ORDER BY published_at DESC LIMIT 6");
  const stats = await one<{ papers: number; insts: number; downloads: number }>(
    "SELECT COUNT(*) AS papers, COUNT(DISTINCT institution) AS insts, COALESCE(SUM(downloads),0) AS downloads FROM submissions WHERE status = 'published'"
  );
  const counts = await all<{ field: string; n: number }>("SELECT field, COUNT(*) AS n FROM submissions WHERE status = 'published' GROUP BY field");
  const countOf = (f: string) => counts.find((c) => c.field === f)?.n || 0;
  const popular = ["galamsey", "GIS", "mobile money", "malaria", "solar"];
  await ensureIndexed(20);
  const potm = await one<Submission & { month: string; prize: string; sponsor: string; citation: string }>(
    "SELECT s.*, a.month, a.prize, a.sponsor, a.citation FROM awards a JOIN submissions s ON s.id = a.submission_id WHERE s.status = 'published' ORDER BY a.month DESC LIMIT 1");
  const ideas = await all<{ text: string; ref: string; field: string }>("SELECT t.text, s.ref, t.field FROM topic_ideas t JOIN submissions s ON s.id = t.submission_id WHERE s.status = 'published' ORDER BY RANDOM() LIMIT 3");
  const opps = await all<{ title: string; org: string; type: string; deadline: string | null }>(
    "SELECT title, org, type, deadline FROM opportunities WHERE deadline IS NULL OR deadline >= ? ORDER BY CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline LIMIT 3", [new Date().toISOString().slice(0, 10)]);

  return (
    <>
      {/* ---- Hero ---- */}
      <section className="hero-full bleed">
        <HeroScene />
        <div className="wrap hero-inner">
          {notice === "moderators-only" && <div className="notice info" style={{ color: "var(--ink)" }}>That page is for moderators. Log in with a moderator account to see it.</div>}
          <span className="hero-pill anim"><i /> Free for every student in Ghana</span>
          <h1 className="anim" style={{ ["--d" as string]: "80ms" }}>Drop your research. <span>Get it seen.</span></h1>
          <p className="lead anim" style={{ ["--d" as string]: "160ms" }}><b>papr</b> is Ghana&apos;s open library of final-year projects, theses and papers. Read and cite them for free, or publish your own in about ten minutes.</p>
          <form className="searchbar anim" style={{ ["--d" as string]: "240ms" }} action="/library" role="search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <label htmlFor="hq" className="sr-only">Search research</label>
            <input type="search" id="hq" name="q" placeholder="Search topics, authors or keywords" autoComplete="off" />
            <button className="btn primary" type="submit">Search</button>
          </form>
          <div className="popular anim" style={{ ["--d" as string]: "320ms" }}>
            <span>Popular:</span>
            {popular.map((p) => <Link key={p} href={`/library?q=${encodeURIComponent(p)}`}>{p}</Link>)}
          </div>
          <div className="hero-stats num anim" style={{ ["--d" as string]: "400ms" }}>
            <div><b><Counter value={stats?.papers ?? 0} /></b><span>papers published</span></div>
            <div><b><Counter value={stats?.insts ?? 0} /></b><span>institutions</span></div>
            <div><b><Counter value={stats?.downloads ?? 0} /></b><span>downloads</span></div>
          </div>
        </div>
        <span className="scroll-cue" aria-hidden="true" />
      </section>

      {/* ---- Institutions strip ---- */}
      <div className="strip bleed">
        <div className="wrap"><span>Students from</span><span>UMaT</span><span>KNUST</span><span>UG</span><span>UCC</span><span>UDS</span><span>UEW</span><span>Ashesi</span><span>UENR</span></div>
      </div>

      {/* ---- Paper of the Month ---- */}
      {potm && (
        <Reveal as="section" className="home-sec">
          <Link href={`/papers/${potm.ref}`} className="potm">
            <span className="trophy"><Icon name="trophy" size={34} strokeWidth={1.75} /></span>
            <div className="stack" style={{ gap: 8 }}>
              <span className="eyebrow">Paper of the Month · {monthName(potm.month)}</span>
              <h2>{potm.title}</h2>
              <p className="muted">{potm.authors_text} · {shortInst(potm.institution)}{potm.citation ? ` · ${potm.citation}` : ""}</p>
              <span className="small">Prize: <b>{potm.prize}</b>{potm.sponsor ? ` · sponsored by ${potm.sponsor}` : ""}</span>
            </div>
          </Link>
        </Reveal>
      )}

      {/* ---- Recent papers ---- */}
      <Reveal as="section" className="home-sec">
        <div className="sec-head">
          <div><span className="eyebrow">Latest</span><h2>Recently published</h2></div>
          <Link href="/library" className="link-arrow">View all papers <Arrow /></Link>
        </div>
        <div className="grid stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {recent.map((p) => <PaperCard key={p.id} p={p} />)}
        </div>
      </Reveal>

      {/* ---- Fields ---- */}
      <Reveal as="section" className="home-sec">
        <div className="sec-head">
          <div><span className="eyebrow">Explore</span><h2>Browse by field</h2><p>From mining and GIS to health, business and education.</p></div>
        </div>
        <div className="fieldgrid stagger">
          {FIELDS.map((f) => (
            <Link key={f} className="fieldcard" href={`/library?field=${encodeURIComponent(f)}`}>
              <span><b>{f}</b><small className="num">{countOf(f)} {countOf(f) === 1 ? "paper" : "papers"}</small></span>
              <Arrow />
            </Link>
          ))}
        </div>
      </Reveal>

      {/* ---- Tools ---- */}
      <Reveal as="section" className="home-sec">
        <div className="promo">
          <div>
            <span className="newpill">Free tools</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, letterSpacing: "-.035em", marginTop: 12 }}>Everything for your final-year project</h2>
            <p className="muted" style={{ marginTop: 10 }}>Upload your PDF once and use it everywhere, from the first draft to the project fair.</p>
            <ul>
              <li>Similarity pre-check and abstract polisher</li>
              <li>Reference checker with APA 7 formatting</li>
              <li>Slides, an A0 poster, and defence practice</li>
            </ul>
            <Link className="btn primary" href="/tools">Open the tools <Arrow /></Link>
          </div>
          <PromoCarousel />
        </div>
        <div className="toolgrid compact stagger" style={{ marginTop: 16 }}>
          {TOOL_LIST.map((t) => <Link key={t.href} href={t.href} className="toolcard"><span className="emo"><Icon name={t.icon} size={20} /></span><h3>{t.name}</h3><p className="small muted">{t.desc}</p></Link>)}
        </div>
      </Reveal>

      {/* ---- Topics + opportunities ---- */}
      <Reveal as="section" className="home-sec">
        <div className="duo">
          <div className="card pad-lg stack">
            <span className="eyebrow">Level 300? Start here</span>
            <h2>Find your project topic</h2>
            <p className="muted small">Ready-made ideas from the &ldquo;future research&rdquo; sections of real papers.</p>
            <div className="stack" style={{ gap: 8 }}>{ideas.map((i, n) => <Link key={n} href={`/papers/${i.ref}`} className="mini-idea"><Icon name="idea" size={16} /> {i.text}</Link>)}</div>
            <div><Link href="/topics" className="link-arrow">Browse all ideas <Arrow /></Link></div>
          </div>
          <div className="card pad-lg stack">
            <span className="eyebrow">Updated weekly</span>
            <h2>Opportunities for you</h2>
            <p className="muted small">Internships, national service, scholarships and grad-school deadlines by field.</p>
            <div className="stack" style={{ gap: 8 }}>{opps.map((o, n) => <Link key={n} href="/opportunities" className="mini-idea"><b>{o.title}</b><span className="small muted"> · {o.org}</span></Link>)}</div>
            <div><Link href="/opportunities" className="link-arrow">See opportunities <Arrow /></Link></div>
          </div>
        </div>
      </Reveal>

      {/* ---- How it works ---- */}
      <Reveal as="section" className="home-sec">
        <div className="sec-head">
          <div><span className="eyebrow">For students</span><h2>Publish in three simple steps</h2><p>Give your final-year project a permanent home that employers, lecturers and grad schools can find.</p></div>
        </div>
        <div className="steps3 stagger">
          <div className="step3"><div className="num">1</div><h3>Log in with your student email</h3><p>Any university email ending in .edu.gh. No password: we email you a code.</p></div>
          <div className="step3"><div className="num">2</div><h3>Fill in the form, upload your PDF</h3><p>About ten minutes. Your progress is saved as you go, even on a phone.</p></div>
          <div className="step3"><div className="num">3</div><h3>Get checked and published</h3><p>A moderator reviews it within about three working days. Then you get a permanent link and a DOI.</p></div>
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>Lecturer? <Link href="/collections">Create a collection</Link> and share one link with your class. Graduated already? Your department can add past projects, and you can claim yours.</p>
      </Reveal>

      {/* ---- Call to action ---- */}
      <section className="cta-band bleed">
        <Reveal className="wrap">
          <div>
            <h2>Your final-year project deserves readers.</h2>
            <p>Drop it on papr and share one link on your CV, LinkedIn and grad school applications.</p>
          </div>
          <Link className="btn light" href="/submit">Submit your research <Arrow /></Link>
        </Reveal>
      </section>
    </>
  );
}
