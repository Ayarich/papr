import { requireModerator } from "@/lib/auth";
import { all } from "@/lib/db";
import { FIELDS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import ImportForm from "./ImportForm";
import AdminNav from "../AdminNav";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import past projects" };

export default async function ImportPage() {
  await requireModerator();
  const recent = await all<{ ref: string; title: string; claim_email: string; claimed_at: string | null; created_at: string }>(
    "SELECT ref, title, claim_email, claimed_at, created_at FROM submissions WHERE imported = 1 ORDER BY created_at DESC LIMIT 30");
  const claimed = recent.filter((r) => r.claimed_at).length;
  return (
    <div className="stack" style={{ gap: 28 }}>
      <AdminNav active="import" />
      <div><h1>Import past projects</h1><p className="muted" style={{ marginTop: 8, maxWidth: "64ch" }}>Bring in a department&apos;s past final-year projects in one go. Each one is published straight away, and its author gets an email: <i>&ldquo;Your 2023 project is on papr. Claim it.&rdquo;</i></p></div>
      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr", alignItems: "start" }}>
        <ImportForm />
        <div className="card stack">
          <h3>Spreadsheet columns</h3>
          <p className="small muted">Required: <code>title</code>, <code>authors</code>, <code>author_email</code>, <code>year</code>, <code>field</code>, <code>pdf_file</code>. Optional: <code>institution</code>, <code>programme</code>, <code>type</code>, <code>abstract</code>, <code>keywords</code>, <code>supervisor</code>.</p>
          <p className="small muted"><code>pdf_file</code> is the PDF&apos;s file name. <code>field</code> must be one of: {FIELDS.join(", ")}.</p>
          <a className="btn sm" href="/import-template.csv" download>Download template CSV</a>
          <p className="small muted">A ready-made example (CSV + 2 PDFs) is in the <code>samples</code> folder of the project.</p>
        </div>
      </div>
      {recent.length > 0 && (
        <section className="stack"><h2>Recently imported <span className="muted small">({claimed} of {recent.length} claimed)</span></h2>
          <div className="card tblwrap" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Paper</th><th>Author email</th><th>Imported</th><th>Claimed</th></tr></thead><tbody>
            {recent.map((r) => <tr key={r.ref}><td><a href={`/papers/${r.ref}`}>{r.ref}</a> · {r.title}</td><td className="small">{r.claim_email}</td><td className="small">{fmtDate(r.created_at)}</td><td>{r.claimed_at ? <span className="okbadge"><Icon name="check" size={13} /> {fmtDate(r.claimed_at)}</span> : <span className="small muted">Waiting</span>}</td></tr>)}
          </tbody></table></div>
        </section>
      )}
    </div>
  );
}
