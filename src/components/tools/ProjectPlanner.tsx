"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { track } from "@/lib/track";

// Final-year project planner: splits the time to the submission date into chapter milestones,
// shows a timeline, lets students tick things off, and exports reminders to their phone calendar (.ics).

type Task = { id: string; name: string; start: string; end: string; done: boolean; tool?: { href: string; label: string } };
type Plan = { start: string; submit: string; defence: string; fieldwork: boolean; meetEvery: number; tasks: Task[] };
const KEY = "papr-planner";
const DAY = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(s + "T12:00:00Z");
const fmt = (s: string) => parse(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / DAY);

const STEPS: { name: string; w: number; fieldOnly?: boolean; tool?: Task["tool"] }[] = [
  { name: "Topic and proposal approved", w: 0.1, tool: { href: "/tools/title", label: "Title helper" } },
  { name: "Chapter 1: Introduction", w: 0.08 },
  { name: "Chapter 2: Literature review", w: 0.14, tool: { href: "/tools/cite", label: "Citation generator" } },
  { name: "Chapter 3: Methodology", w: 0.1, tool: { href: "/tools/questionnaire", label: "Questionnaire builder" } },
  { name: "Data collection / fieldwork", w: 0.18, fieldOnly: true },
  { name: "Chapter 4: Results and discussion", w: 0.16 },
  { name: "Chapter 5: Conclusion and recommendations", w: 0.06 },
  { name: "Full draft to supervisor", w: 0.08, tool: { href: "/tools/structure", label: "Structure check" } },
  { name: "Corrections, references and formatting", w: 0.07, tool: { href: "/tools/precheck", label: "Pre-check" } },
  { name: "Print, bind and submit", w: 0.03 },
];

function build(start: string, submit: string, defence: string, fieldwork: boolean): Task[] {
  const steps = STEPS.filter((s) => fieldwork || !s.fieldOnly);
  const total = steps.reduce((a, s) => a + s.w, 0);
  const span = Math.max(steps.length, daysBetween(start, submit));
  let t = parse(start).getTime();
  const tasks: Task[] = steps.map((s, k) => {
    const len = k === steps.length - 1 ? parse(submit).getTime() - t : Math.max(DAY, Math.round((s.w / total) * span) * DAY);
    const task = { id: "t" + k, name: s.name, start: iso(new Date(t)), end: iso(new Date(t + len)), done: false, tool: s.tool };
    t += len; return task;
  });
  if (defence && defence > submit) {
    tasks.push({ id: "slides", name: "Slides and defence practice", start: submit, end: defence, done: false, tool: { href: "/tools/defence", label: "Defence practice" } });
    tasks.push({ id: "publish", name: "Publish your project on papr", start: defence, end: iso(new Date(parse(defence).getTime() + 14 * DAY)), done: false, tool: { href: "/submit", label: "Submit" } });
  }
  return tasks;
}

export default function ProjectPlanner() {
  const today = iso(new Date());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState({ start: today, submit: iso(new Date(Date.now() + 120 * DAY)), defence: "", fieldwork: true, meetEvery: 2 });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { try { const r = localStorage.getItem(KEY); if (r) setPlan(JSON.parse(r)); } catch {} setLoaded(true); }, []);
  const save = (p: Plan | null) => { setPlan(p); try { p ? localStorage.setItem(KEY, JSON.stringify(p)) : localStorage.removeItem(KEY); } catch {} };

  const make = () => {
    if (form.submit <= form.start) return;
    save({ ...form, tasks: build(form.start, form.submit, form.defence, form.fieldwork) });
    track("planner");
  };

  if (!loaded) return null;
  if (!plan) {
    const weeks = Math.round(daysBetween(form.start, form.submit) / 7);
    return (
      <div className="card pad-lg stack" style={{ gap: 16, maxWidth: 720 }}>
        <h3>When is your project due?</h3>
        <div className="cite-grid">
          <div className="field span2"><label className="lbl small" htmlFor="pl-start">Start date</label><input id="pl-start" type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
          <div className="field span2"><label className="lbl small" htmlFor="pl-submit">Submission deadline</label><input id="pl-submit" type="date" value={form.submit} min={form.start} onChange={(e) => setForm({ ...form, submit: e.target.value })} /></div>
          <div className="field span2"><label className="lbl small" htmlFor="pl-def">Defence date (optional)</label><input id="pl-def" type="date" value={form.defence} min={form.submit} onChange={(e) => setForm({ ...form, defence: e.target.value })} /></div>
          <div className="field span2"><label className="lbl small" htmlFor="pl-meet">Supervisor meetings</label>
            <select id="pl-meet" value={form.meetEvery} onChange={(e) => setForm({ ...form, meetEvery: Number(e.target.value) })}><option value={1}>Every week</option><option value={2}>Every 2 weeks</option><option value={3}>Every 3 weeks</option><option value={4}>Every month</option><option value={0}>Not regular</option></select></div>
        </div>
        <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={form.fieldwork} onChange={(e) => setForm({ ...form, fieldwork: e.target.checked })} /> My project needs data collection (survey, fieldwork, lab work or downloading images)</label>
        {form.submit <= form.start ? <div className="notice bad small">The deadline must be after the start date.</div>
          : <p className="small muted">That&apos;s about <b className="ink">{weeks} week{weeks === 1 ? "" : "s"}</b>. {weeks < 8 ? "That's tight: the plan will be packed, so start Chapter 1 this week." : "Good: the plan leaves time for your supervisor to read your draft."}</p>}
        <div><button type="button" className="btn primary" onClick={make} disabled={form.submit <= form.start}><Icon name="clock" size={16} /> Make my plan</button></div>
      </div>
    );
  }
  return <PlanView plan={plan} save={save} today={today} />;
}

function PlanView({ plan, save, today }: { plan: Plan; save: (p: Plan | null) => void; today: string }) {
  const tasks = plan.tasks;
  const first = tasks[0].start, last = tasks[tasks.length - 1].end;
  const span = Math.max(1, daysBetween(first, last));
  const pct = (d: string) => Math.min(100, Math.max(0, (daysBetween(first, d) / span) * 100));
  const done = tasks.filter((t) => t.done).length;
  const next = tasks.find((t) => !t.done);
  const late = tasks.filter((t) => !t.done && t.end < today);
  const daysLeft = daysBetween(today, plan.submit);
  const meetings = useMemo(() => {
    if (!plan.meetEvery) return [] as string[];
    const out: string[] = []; let t = parse(plan.start).getTime() + plan.meetEvery * 7 * DAY;
    while (t < parse(plan.submit).getTime()) { out.push(iso(new Date(t))); t += plan.meetEvery * 7 * DAY; }
    return out;
  }, [plan]);
  const months = useMemo(() => {
    const out: { label: string; at: number }[] = []; const d = parse(first); d.setUTCDate(1);
    while (iso(d) <= last) { if (iso(d) >= first) out.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), at: pct(iso(d)) }); d.setUTCMonth(d.getUTCMonth() + 1); }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, last]);
  const update = (id: string, p: Partial<Task>) => save({ ...plan, tasks: tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) });

  const ics = () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const d = (s: string) => s.replace(/-/g, "");
    const plus1 = (s: string) => iso(new Date(parse(s).getTime() + DAY)).replace(/-/g, "");
    const ev = (uid: string, date: string, summary: string, desc: string, alarmDays: number) => [
      "BEGIN:VEVENT", `UID:${uid}@papr`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d(date)}`, `DTEND;VALUE=DATE:${plus1(date)}`,
      `SUMMARY:${summary.replace(/[,;]/g, "\\$&")}`, `DESCRIPTION:${desc.replace(/[,;]/g, "\\$&")}`,
      ...(alarmDays ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${summary.replace(/[,;]/g, "\\$&")}`, `TRIGGER:-P${alarmDays}D`, "END:VALARM"] : []), "END:VEVENT"];
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//papr//Project planner//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Final-year project",
      ...tasks.flatMap((t) => ev(`${t.id}-${plan.submit}`, t.end, `Due: ${t.name}`, "From your papr project plan", 3)),
      ...meetings.flatMap((m, k) => ev(`meet${k}-${plan.submit}`, m, "Supervisor meeting", "Bring your latest draft and questions", 1)),
      ...(plan.defence ? ev(`defence-${plan.defence}`, plan.defence, "Project defence", "Practise with papr's defence practice tool", 7) : []),
      "END:VCALENDAR"];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" })); a.download = "Final-year project plan.ics"; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="kpis">
        <div className="card stat"><span>Days to submission</span><b className="num">{daysLeft >= 0 ? daysLeft : "Past"}</b><span className="small">{fmt(plan.submit)}</span></div>
        <div className="card stat"><span>Progress</span><b className="num">{Math.round((done / tasks.length) * 100)}%</b><span className="small">{done} of {tasks.length} steps done</span></div>
        <div className={`card stat${late.length ? " warn" : " good"}`}><span>Status</span><b>{late.length ? "Behind" : "On track"}</b><span className="small">{late.length ? `${late.length} step${late.length === 1 ? "" : "s"} overdue` : "Keep it up"}</span></div>
        <div className="card stat"><span>Next deadline</span><b style={{ fontSize: "1.05rem", lineHeight: 1.3 }}>{next ? next.name : "All done"}</b><span className="small">{next ? `${fmt(next.end)} · ${daysBetween(today, next.end) >= 0 ? `in ${daysBetween(today, next.end)} days` : `${-daysBetween(today, next.end)} days late`}` : "Well done!"}</span></div>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn primary sm" onClick={ics}><Icon name="clock" size={15} /> Add reminders to my calendar</button>
        <button type="button" className="btn sm" onClick={() => window.print()}><Icon name="download" size={15} /> Print or save as PDF</button>
        <button type="button" className="btn ghost sm" onClick={() => { if (confirm("Start a new plan? Your ticks will be lost.")) save(null); }}><Icon name="reset" size={14} /> New plan</button>
      </div>

      <section className="card pad-lg gantt" aria-label="Timeline">
        <div className="g-head"><span />
          <div className="g-scale">{months.map((m) => <span key={m.label + m.at} style={{ left: `${m.at}%` }}>{m.label}</span>)}</div></div>
        {tasks.map((t) => {
          const lateT = !t.done && t.end < today;
          return (
            <div key={t.id} className={`g-row${t.done ? " done" : ""}${lateT ? " late" : ""}`}>
              <label className="g-name"><input type="checkbox" checked={t.done} onChange={(e) => update(t.id, { done: e.target.checked })} /><span>{t.name}</span></label>
              <div className="g-track">
                <div className="g-bar" style={{ left: `${pct(t.start)}%`, width: `${Math.max(1.5, pct(t.end) - pct(t.start))}%` }} title={`${fmt(t.start)} – ${fmt(t.end)}`} />
                {today >= first && today <= last && <i className="g-today" style={{ left: `${pct(today)}%` }} />}
              </div>
            </div>
          );
        })}
        <div className="g-legend small muted"><span><i className="sw bar" /> Planned</span><span><i className="sw done" /> Done</span><span><i className="sw late" /> Overdue</span><span><i className="sw today" /> Today</span>{meetings.length > 0 && <span>{meetings.length} supervisor meetings in the calendar file</span>}</div>
      </section>

      <section className="card pad-lg stack" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>Steps and dates</h3>
        {tasks.map((t) => (
          <div key={t.id} className="pl-step">
            <div className="stack" style={{ gap: 2, minWidth: 0 }}>
              <b className="small">{t.name}</b>
              {t.tool && <Link className="small" href={t.tool.href}>Use {t.tool.label} →</Link>}
            </div>
            <div className="row" style={{ gap: 6 }}>
              <input type="date" aria-label={`${t.name} starts`} value={t.start} onChange={(e) => update(t.id, { start: e.target.value })} />
              <span className="muted">→</span>
              <input type="date" aria-label={`${t.name} due`} value={t.end} min={t.start} onChange={(e) => update(t.id, { end: e.target.value })} />
            </div>
          </div>
        ))}
        <p className="hint" style={{ marginTop: 12 }}>Your plan is saved in this browser. Change any date to fit your department&apos;s calendar.</p>
      </section>
    </div>
  );
}
