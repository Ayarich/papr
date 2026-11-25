import Link from "next/link";
import { requireModerator } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { blobEnabled } from "@/lib/storage";
import AdminNav from "./AdminNav";
import AutoRefresh from "@/components/AutoRefresh";
import MiniBars from "@/components/MiniBars";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard" };

const DAY = 86400000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const ago = (t?: string | null) => {
  if (!t) return "never";
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const maskEmail = (e: string) => e.replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");
const maskCodes = (s: string) => s.replace(/\b\d{6}\b/g, "••••••");

type Level = "ok" | "warn" | "bad";
const ICON: Record<Level, string> = { ok: "✅", warn: "⚠️", bad: "⛔" };

export default async function AdminDashboard() {
  await requireModerator();
  const n = async (sql: string, args: (string | number)[] = []) => (await one<{ n: number }>(sql, args))?.n || 0;

  const t0 = Date.now();
  await one("SELECT 1 AS n");
  const dbMs = Date.now() - t0;

  const d7 = iso(7 * DAY), d30 = iso(30 * DAY), d1 = iso(DAY);
  const today = new Date().toISOString().slice(0, 10);

  const [
    users, users7, published, published7, pending, oldestPending, views30, downloads30, tools7, logins7, active7,
    sentToday, failed24, errors24, storageBytes, decks, roles, statuses, toolUse, topInst, topPapers,
    errors, emails, recent, feeds, cronFeeds, cronDigest, lastRefresh,
  ] = await Promise.all([
    n("SELECT COUNT(*) AS n FROM users WHERE email != 'unclaimed@papr.local'"),
    n("SELECT COUNT(*) AS n FROM users WHERE created_at > ? AND email != 'unclaimed@papr.local'", [d7]),
    n("SELECT COUNT(*) AS n FROM submissions WHERE status = 'published'"),
    n("SELECT COUNT(*) AS n FROM submissions WHERE status = 'published' AND published_at > ?", [d7]),
    n("SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'"),
    one<{ t: string }>("SELECT MIN(created_at) AS t FROM submissions WHERE status = 'pending'"),
    n("SELECT COUNT(*) AS n FROM read_events WHERE kind = 'view' AND created_at > ?", [d30]),
    n("SELECT COUNT(*) AS n FROM read_events WHERE kind = 'download' AND created_at > ?", [d30]),
    n("SELECT COUNT(*) AS n FROM activity WHERE kind IN ('tool','deck') AND created_at > ?", [d7]),
    n("SELECT COUNT(*) AS n FROM activity WHERE kind IN ('login','signup') AND created_at > ?", [d7]),
    n("SELECT COUNT(DISTINCT user_id) AS n FROM activity WHERE user_id IS NOT NULL AND created_at > ?", [d7]),
    n("SELECT COUNT(*) AS n FROM emails WHERE status = 'sent' AND created_at >= ?", [today]),
    n("SELECT COUNT(*) AS n FROM emails WHERE status IN ('failed','not_sent') AND created_at > ?", [d1]),
    n("SELECT COUNT(*) AS n FROM activity WHERE kind = 'error' AND created_at > ?", [d1]),
    n("SELECT COALESCE(SUM(pdf_size), 0) AS n FROM versions"),
    n("SELECT COUNT(*) AS n FROM decks"),
    all<{ role: string; n: number }>("SELECT role, COUNT(*) AS n FROM users WHERE email != 'unclaimed@papr.local' GROUP BY role ORDER BY n DESC"),
    all<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM submissions GROUP BY status ORDER BY n DESC"),
    all<{ k: string; n: number }>("SELECT CASE WHEN kind = 'deck' THEN 'slides' ELSE detail END AS k, COUNT(*) AS n FROM activity WHERE kind IN ('tool','deck') AND created_at > ? GROUP BY k ORDER BY n DESC", [d30]),
    all<{ inst: string; u: number }>("SELECT COALESCE(NULLIF(institution, ''), 'Not set') AS inst, COUNT(*) AS u FROM users WHERE email != 'unclaimed@papr.local' GROUP BY inst ORDER BY u DESC LIMIT 6"),
    all<{ ref: string; title: string; n: number }>("SELECT s.ref, s.title, COUNT(*) AS n FROM read_events r JOIN submissions s ON s.id = r.submission_id WHERE r.created_at > ? GROUP BY s.id ORDER BY n DESC LIMIT 6", [d30]),
    all<{ detail: string; created_at: string }>("SELECT detail, created_at FROM activity WHERE kind = 'error' ORDER BY created_at DESC LIMIT 12"),
    all<{ to: string; subject: string; status: string | null; provider: string | null; error: string | null; created_at: string }>('SELECT "to", subject, status, provider, error, created_at FROM emails ORDER BY created_at DESC LIMIT 15'),
    all<{ kind: string; detail: string | null; email: string | null; created_at: string }>("SELECT a.kind, a.detail, u.email, a.created_at FROM activity a LEFT JOIN users u ON u.id = a.user_id WHERE a.kind != 'error' ORDER BY a.created_at DESC LIMIT 20"),
    all<{ name: string; enabled: number; last_ok: number | null; last_error: string | null; last_fetched_at: string | null; last_count: number | null }>("SELECT name, enabled, last_ok, last_error, last_fetched_at, last_count FROM feed_sources ORDER BY name"),
    one<{ value: string }>("SELECT value FROM app_state WHERE key = 'cron:feeds'"),
    one<{ value: string }>("SELECT value FROM app_state WHERE key = 'cron:digest'"),
    one<{ value: string }>("SELECT value FROM app_state WHERE key = 'opps_refreshed_at'"),
  ]);

  // Daily series for the last 30 days
  const days = Array.from({ length: 30 }, (_, k) => new Date(Date.now() - (29 - k) * DAY).toISOString().slice(0, 10));
  const series = async (sql: string) => {
    const rows = await all<{ day: string; n: number }>(sql, [days[0]]);
    const m = new Map(rows.map((r) => [r.day, Number(r.n)]));
    return days.map((day) => ({ day, n: m.get(day) || 0 }));
  };
  const [sUsers, sSubs, sReads, sLogins] = await Promise.all([
    series("SELECT substr(created_at,1,10) AS day, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY day"),
    series("SELECT substr(created_at,1,10) AS day, COUNT(*) AS n FROM submissions WHERE created_at >= ? GROUP BY day"),
    series("SELECT substr(created_at,1,10) AS day, COUNT(*) AS n FROM read_events WHERE created_at >= ? GROUP BY day"),
    series("SELECT substr(created_at,1,10) AS day, COUNT(*) AS n FROM activity WHERE kind IN ('login','signup') AND created_at >= ? GROUP BY day"),
  ]);

  // ---- System health ----
  const gmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const resend = !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const emailLimit = gmail ? 500 : 100;
  const testLogins = (process.env.TEST_LOGINS || "").split(",").filter((x) => x.includes(":")).length;
  const parse = (v?: { value: string } | null) => { try { return v ? JSON.parse(v.value) as { at: string; result: string } : null; } catch { return null; } };
  const cf = parse(cronFeeds), cd = parse(cronDigest);
  const feedsBad = feeds.filter((f) => f.enabled && f.last_ok === 0).length;
  const GB = 1024 ** 3;
  const health: { label: string; level: Level; value: string; note?: string }[] = [
    { label: "Database", level: dbMs < 300 ? "ok" : "warn", value: `Connected · ${dbMs} ms`, note: process.env.TURSO_DATABASE_URL ? "Turso" : "Local file" },
    { label: "File storage", level: blobEnabled() ? (storageBytes > 0.8 * GB ? "warn" : "ok") : process.env.VERCEL ? "bad" : "ok",
      value: `${(storageBytes / 1024 ** 2).toFixed(1)} MB of PDFs`, note: blobEnabled() ? "Vercel Blob · free plan 1 GB" : process.env.VERCEL ? "Blob not connected: uploads will fail" : "Local uploads folder" },
    { label: "Email", level: !gmail && !resend ? "bad" : failed24 > 0 ? "warn" : sentToday > emailLimit * 0.8 ? "warn" : "ok",
      value: gmail ? `Gmail · ${sentToday}/${emailLimit} today` : resend ? `Resend · ${sentToday} today` : "Not set up",
      note: !gmail && !resend ? "New users can't get login codes" : failed24 ? `${failed24} failed in the last 24 h` : "All sending" },
    { label: "Login safety", level: process.env.SHOW_DEV_CODES === "true" ? "bad" : testLogins ? "warn" : "ok",
      value: process.env.SHOW_DEV_CODES === "true" ? "Codes shown on screen!" : testLogins ? `${testLogins} shared test accounts on` : "Email codes only",
      note: process.env.SHOW_DEV_CODES === "true" ? "Set SHOW_DEV_CODES=false now" : testLogins ? "Remove TEST_LOGINS after testing" : undefined },
    { label: "Errors", level: errors24 === 0 ? "ok" : errors24 < 5 ? "warn" : "bad", value: `${errors24} in the last 24 h`, note: errors24 ? "See the list below" : "No server errors" },
    { label: "Scheduled jobs", level: !process.env.CRON_SECRET && process.env.VERCEL ? "bad" : feedsBad ? "warn" : "ok",
      value: `Feeds ${ago(lastRefresh?.value || cf?.at)}`, note: !process.env.CRON_SECRET && process.env.VERCEL ? "CRON_SECRET not set" : `Digest ${ago(cd?.at)}${feedsBad ? ` · ${feedsBad} feed(s) failing` : ""}` },
  ];

  const kpis: [string, string | number, string, string][] = [
    ["Users", users, `+${users7} this week`, "/admin/people"],
    ["Active this week", active7, `${logins7} logins`, "/admin/people"],
    ["Published papers", published, `+${published7} this week`, "/library"],
    ["Waiting for review", pending, pending ? `oldest ${ago(oldestPending?.t)}` : "queue is empty", "/moderate"],
    ["Reads (30 days)", views30 + downloads30, `${views30} views · ${downloads30} downloads`, "/library?sort=views"],
    ["Tool uses (7 days)", tools7, `${decks} slide decks in total`, "/tools"],
  ];
  const env = [process.env.VERCEL_ENV || "local", process.env.VERCEL_REGION, process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)].filter(Boolean).join(" · ");

  return (
    <div className="stack dash" style={{ gap: 24 }}>
      <AdminNav active="overview" />
      <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
        <div><h1>Dashboard</h1><p className="small muted" style={{ marginTop: 4 }}>Everything happening on papr. Running on {env}.</p></div>
        <AutoRefresh />
      </div>

      <section className="health" aria-label="System health">
        {health.map((h) => (
          <div key={h.label} className={`hcard ${h.level}`}>
            <span className="small muted">{ICON[h.level]} {h.label}</span>
            <b>{h.value}</b>
            {h.note && <span className="small muted">{h.note}</span>}
          </div>
        ))}
      </section>

      <section className="kpis">
        {kpis.map(([label, v, sub, href]) => (
          <Link key={label} href={href} className="card stat"><span>{label}</span><b className="num">{v}</b><span className="small">{sub}</span></Link>
        ))}
      </section>

      <section className="chartgrid">
        <MiniBars title="New users" data={sUsers} unit="sign-ups" />
        <MiniBars title="Logins" data={sLogins} unit="logins" />
        <MiniBars title="New submissions" data={sSubs} unit="submissions" />
        <MiniBars title="Reads (views and downloads)" data={sReads} unit="reads" />
      </section>

      <section className="dash-cols">
        <div className="card">
          <h3 className="dash-h">People by role</h3>
          <table className="tbl"><tbody>{roles.map((r) => <tr key={r.role}><td style={{ textTransform: "capitalize" }}>{r.role}</td><td className="num" style={{ textAlign: "right" }}>{r.n}</td></tr>)}</tbody></table>
          <h3 className="dash-h" style={{ marginTop: 18 }}>Submissions by status</h3>
          <table className="tbl"><tbody>{statuses.map((r) => <tr key={r.status}><td style={{ textTransform: "capitalize" }}>{r.status}</td><td className="num" style={{ textAlign: "right" }}>{r.n}</td></tr>)}</tbody></table>
        </div>
        <div className="card">
          <h3 className="dash-h">Tool use (30 days)</h3>
          {toolUse.length ? <Meter rows={toolUse.map((t) => [t.k || "other", Number(t.n)])} /> : <p className="small muted">No tool use yet.</p>}
          <h3 className="dash-h" style={{ marginTop: 18 }}>Top institutions</h3>
          <Meter rows={topInst.map((t) => [t.inst.replace(/\s*\(.*\)/, ""), Number(t.u)])} unit="users" plain />
        </div>
        <div className="card">
          <h3 className="dash-h">Most read (30 days)</h3>
          {topPapers.length ? (
            <ol className="toplist">{topPapers.map((p) => <li key={p.ref}><Link href={`/papers/${p.ref}`}>{p.title}</Link><span className="small muted num">{p.n}</span></li>)}</ol>
          ) : <p className="small muted">No reads yet.</p>}
        </div>
      </section>

      <section className="card">
        <div className="row between"><h3 className="dash-h">Server errors</h3><span className="small muted">Last 12</span></div>
        {errors.length ? (
          <div className="tblwrap"><table className="tbl"><thead><tr><th>When</th><th>What happened</th></tr></thead>
            <tbody>{errors.map((e, k) => <tr key={k}><td className="small nowrap">{ago(e.created_at)}</td><td className="small mono">{e.detail}</td></tr>)}</tbody></table></div>
        ) : <p className="small muted">✅ No server errors recorded.</p>}
      </section>

      <section className="card">
        <div className="row between"><h3 className="dash-h">Emails</h3><span className="small muted">Last 15 · codes hidden</span></div>
        <div className="tblwrap"><table className="tbl"><thead><tr><th>When</th><th>To</th><th>Subject</th><th>Status</th></tr></thead>
          <tbody>{emails.map((e, k) => (
            <tr key={k}>
              <td className="small nowrap">{ago(e.created_at)}</td>
              <td className="small">{maskEmail(e.to)}</td>
              <td className="small">{maskCodes(e.subject)}</td>
              <td className="small">
                <span className={`pill ${e.status === "sent" ? "published" : e.status === "failed" || e.status === "not_sent" ? "rejected" : "pending"}`}>{e.status === "sent" ? "✓ Sent" : e.status === "failed" ? "✕ Failed" : e.status === "not_sent" ? "Not sent" : e.status || "Saved"}</span>
                {e.provider && e.provider !== "none" && <span className="muted"> via {e.provider}</span>}
                {e.error && <div className="muted mono" style={{ marginTop: 4 }}>{e.error}</div>}
              </td>
            </tr>))}</tbody></table></div>
      </section>

      <section className="dash-cols two">
        <div className="card">
          <h3 className="dash-h">Recent activity</h3>
          {recent.length ? (
            <ul className="feedlist">{recent.map((a, k) => (
              <li key={k}><span aria-hidden>{({ login: "🔑", signup: "🎉", tool: "🧰", deck: "🖥️", submit: "📄", cron: "⏱️" } as Record<string, string>)[a.kind] || "•"}</span>
                <span className="small"><b>{a.kind === "signup" ? "New user" : a.kind === "tool" ? `Used ${a.detail}` : a.kind === "deck" ? "Made slides" : a.kind === "submit" ? `Submitted ${a.detail}` : a.kind === "cron" ? a.detail : "Logged in"}</b>
                  {a.email && <span className="muted"> · {maskEmail(a.email)}</span>}{a.kind === "signup" || a.kind === "login" ? <span className="muted"> · {a.detail}</span> : null}</span>
                <span className="small muted nowrap" style={{ marginLeft: "auto" }}>{ago(a.created_at)}</span></li>
            ))}</ul>
          ) : <p className="small muted">Activity appears here as people log in and use papr.</p>}
        </div>
        <div className="card">
          <h3 className="dash-h">Live opportunity feeds</h3>
          {feeds.length ? (
            <table className="tbl"><tbody>{feeds.map((f) => (
              <tr key={f.name}><td className="small">{!f.enabled ? "⏸️" : f.last_ok === 0 ? "⚠️" : "✅"} {f.name}</td>
                <td className="small muted">{f.last_ok === 0 ? f.last_error : `${f.last_count ?? 0} items · ${ago(f.last_fetched_at)}`}</td></tr>))}</tbody></table>
          ) : <p className="small muted">Feeds load the first time someone opens Opportunities.</p>}
          <p className="small muted" style={{ marginTop: 10 }}>Weekly digest: {cd ? `${cd.result}, ${ago(cd.at)}` : "hasn't run yet (Mondays 07:00 UTC)"}. <Link href="/admin/opportunities">Manage feeds</Link></p>
        </div>
      </section>
    </div>
  );
}

function Meter({ rows, unit = "uses", plain = false }: { rows: [string, number][]; unit?: string; plain?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <ul className="meter">
      {rows.map(([k, v]) => (
        <li key={k} title={`${k}: ${v} ${unit}`}>
          <div className="row between small"><span style={plain ? undefined : { textTransform: "capitalize" }}>{k}</span><span className="num muted">{v}</span></div>
          <div className="track"><i style={{ width: `${(v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
