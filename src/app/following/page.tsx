import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { FIELDS, INSTITUTIONS, shortInst } from "@/lib/constants";
import { myFollows, digestFor } from "@/lib/follows";
import PaperCard from "@/components/PaperCard";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Following" };

export default async function Following() {
  const user = await requireUser("/following");
  const follows = await myFollows(user.id);
  const feed = await digestFor(user.id, 30);
  const has = (k: string, v: string) => follows.some((f) => f.kind === k && f.value === v);
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div><span className="eyebrow">Your feed</span><h1 style={{ marginTop: 8 }}>Following</h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: "60ch" }}>Follow fields, universities and authors. New papers show up here, and you get one short email a week, e.g. &ldquo;4 new papers in Earth Sciences this week&rdquo;.</p></div>
      <section className="stack"><h2>Fields</h2><div className="row" style={{ gap: 8 }}>{FIELDS.map((f) => <FollowButton key={f} kind="field" value={f} following={has("field", f)} back="/following" label={f} />)}</div></section>
      <section className="stack"><h2>Universities</h2><div className="row" style={{ gap: 8 }}>{INSTITUTIONS.slice(0, -1).map((i) => <FollowButton key={i} kind="institution" value={i} following={has("institution", i)} back="/following" label={shortInst(i)} />)}</div></section>
      {follows.some((f) => f.kind === "author") && <section className="stack"><h2>Authors</h2><div className="row" style={{ gap: 8 }}>{follows.filter((f) => f.kind === "author").map((f) => <FollowButton key={f.value} kind="author" value={f.value} following back="/following" label={f.label || ""} />)}</div></section>}
      <section className="stack"><h2>New in the last 30 days</h2>
        {feed.length ? <div className="grid g2">{feed.map((p) => <PaperCard key={p.id} p={p} />)}</div> : <div className="card empty">{follows.length ? "Nothing new yet in what you follow." : "Follow a field or university above to fill your feed."} <Link href="/library">Browse the library</Link></div>}
      </section>
    </div>
  );
}
