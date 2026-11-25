import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, isModerator } from "@/lib/auth";
import { all, type Submission } from "@/lib/db";
import { APP_URL } from "@/lib/mail";
import { fmtDate } from "@/lib/format";
import StatusPill from "@/components/StatusPill";
import CopyButton from "@/components/CopyButton";
import { collectionFor, confirmInCollection } from "../actions";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage collection" };

export default async function ManageCollection({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const user = await requireUser(`/collections/${id}`);
  const c = await collectionFor(id);
  if (!c || (c.owner_id !== user.id && !isModerator(user))) notFound();
  const subs = await all<Submission>("SELECT * FROM submissions WHERE collection_id = ? ORDER BY created_at DESC", [c.id]);
  const link = `${APP_URL}/c/${c.slug}`;
  const reminder = `📚 ${c.title}\n\nPlease upload your final project to our class collection on papr${c.deadline ? ` by ${fmtDate(c.deadline)}` : ""}. It takes about 10 minutes and you get a permanent link and DOI for your CV.\n\n👉 ${link}`;
  const confirmed = subs.filter((s) => s.supervisor_confirmed_at).length;

  return (
    <div className="stack" style={{ gap: 28 }}>
      {created && <div className="notice ok">Collection created. Share the link below with your class.</div>}
      <div><Link href="/collections" className="small muted">← All collections</Link><h1 style={{ marginTop: 8 }}>{c.title}</h1></div>
      <div className="grid g3">
        <div className="card stat"><b className="num">{subs.length}{c.expected ? <small> / {c.expected}</small> : null}</b><span>submitted</span>
          {c.expected ? <div className="progress"><i style={{ width: `${Math.min(100, (subs.length / c.expected) * 100)}%` }} /></div> : null}</div>
        <div className="card stat"><b className="num">{confirmed}</b><span>confirmed by you</span></div>
        <div className="card stat"><b className="num">{subs.filter((s) => s.status === "published").length}</b><span>published</span></div>
      </div>
      <div className="card stack">
        <h3>Share with your class</h3>
        <div className="sharebox"><code>{link}</code></div>
        <div className="row">
          <CopyButton text={link} label="Copy link" />
          <CopyButton text={reminder} label="Copy WhatsApp message" />
          <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(reminder)}`} target="_blank" rel="noopener">Share on WhatsApp</a>
          <Link className="btn ghost" href={`/c/${c.slug}`}>Open public page</Link>
        </div>
      </div>
      <section className="stack">
        <h2>Submissions</h2>
        {subs.length === 0 ? <div className="card empty"><b>No submissions yet.</b><p className="small" style={{ marginTop: 6 }}>Share the link and they&apos;ll appear here.</p></div> : (
          <div className="card tblwrap" style={{ padding: 0 }}>
            <table className="tbl">
              <thead><tr><th>Student</th><th>Project</th><th>Status</th><th>Submitted</th><th>Your confirmation</th></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.authors_text.split(",")[0]}</b><br /><span className="small muted">{s.programme}</span></td>
                    <td><span className="small muted num">{s.ref}</span><br />{s.title}<br /><a className="small" href={`/papers/${s.ref}/pdf`} target="_blank" rel="noopener">Open PDF</a></td>
                    <td><StatusPill status={s.status} /></td>
                    <td className="small num">{fmtDate(s.created_at)}</td>
                    <td>{s.supervisor_confirmed_at ? <span className="okbadge"><Icon name="verified" size={13} /> Confirmed</span> : (
                      <form action={confirmInCollection}><input type="hidden" name="submissionId" value={s.id} /><button className="btn sm" type="submit">Confirm work</button></form>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
