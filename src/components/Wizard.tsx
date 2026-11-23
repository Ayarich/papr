"use client";
import { attachPdf } from "@/lib/upload-client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FIELDS, INSTITUTIONS, LEVELS, TYPES, YEARS, MAX_PDF_BYTES, shortInst } from "@/lib/constants";
import { emptyDraft, validateStep, words, ABSTRACT_MIN, ABSTRACT_MAX, type DraftData, type Errors } from "@/lib/validate";
import { fmtSize } from "@/lib/format";

const STEPS = ["About you", "Your research", "People", "Upload PDF", "Licence", "Review"];

type Props = {
  mode: "new" | "edit";
  submissionId?: string;
  submissionRef?: string;
  nextVersion?: number;
  moderatorNote?: string | null;
  initial: Partial<DraftData>;
  existingFile?: { name: string; size: number } | null;
  email: string;
  collection?: { slug: string; title: string; owner: string };
};

export default function Wizard(props: Props) {
  const router = useRouter();
  const storageKey = `papr-draft-${props.mode === "edit" ? props.submissionId : "new"}`;
  const [d, setD] = useState<DraftData>({ ...emptyDraft(), ...props.initial });
  const [step, setStep] = useState(props.mode === "edit" ? 1 : 0);
  const [errors, setErrors] = useState<Errors>({});
  const [file, setFile] = useState<File | null>(null);
  const [keepExisting, setKeepExisting] = useState(!!props.existingFile);
  const [kw, setKw] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [restored, setRestored] = useState(false);
  const loaded = useRef(false);

  // Restore a saved draft from this device (the PDF itself can't be saved in the browser).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.d) { setD((cur) => ({ ...cur, ...saved.d })); setStep(saved.step || 0); setRestored(true); }
      }
    } catch { /* storage unavailable */ }
    loaded.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ d, step })); } catch { /* ignore */ }
  }, [d, step, storageKey]);

  const hasFile = !!file || keepExisting;
  const set = <K extends keyof DraftData>(k: K, v: DraftData[K]) => setD((cur) => ({ ...cur, [k]: v }));

  function maxReach() {
    for (let i = 0; i < 5; i++) if (Object.keys(validateStep(i, d, hasFile)).length) return i;
    return 5;
  }

  function goTo(n: number) {
    setErrors({}); setStep(n); window.scrollTo(0, 0);
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (step < 5) {
      const errs = validateStep(step, d, hasFile);
      setErrors(errs);
      if (Object.keys(errs).length) {
        setTimeout(() => {
          const el = document.querySelector(".invalid, .err") as HTMLElement | null;
          el?.scrollIntoView({ block: "center" }); el?.focus?.();
        }, 0);
        return;
      }
      goTo(step + 1);
    } else submit();
  }

  async function submit() {
    setBusy(true); setServerError("");
    const fd = new FormData();
    fd.append("data", JSON.stringify(d));
    if (props.collection) fd.append("collection", props.collection.slug);
    const url = props.mode === "edit" ? `/api/submissions/${props.submissionId}` : "/api/submissions";
    try {
      if (file) {
        try { await attachPdf(fd, "pdf", file, "papers"); } catch (e) {
          setBusy(false); setServerError((e as Error).message); return;
        }
      }
      const r = await fetch(url, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setBusy(false);
        if (j.errors) { setErrors(j.errors); setServerError("Some details need fixing. Use Edit next to each section."); }
        else setServerError(j.error || "Something went wrong. Your draft is saved; try again.");
        return;
      }
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
      router.push(`/my?submitted=${encodeURIComponent(j.ref)}`);
      router.refresh();
    } catch {
      setBusy(false);
      setServerError("Couldn't reach the server. Check your connection; your draft is saved.");
    }
  }

  function addKeyword(v: string) {
    const k = v.replace(/,/g, "").trim();
    if (!k) return;
    if (d.keywords.length >= 6) { setErrors({ ...errors, keywords: "You can add up to 6 keywords." }); return; }
    if (d.keywords.some((x) => x.toLowerCase() === k.toLowerCase())) { setKw(""); return; }
    set("keywords", [...d.keywords, k]); setKw("");
    const { keywords: _omit, ...rest } = errors; setErrors(rest);
  }

  function takeFile(f: File) {
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (!isPdf) { setErrors({ file: `"${f.name}" isn't a PDF. Save your report as PDF (in Word: File > Save As > PDF) and try again.` }); return; }
    if (f.size > MAX_PDF_BYTES) { setErrors({ file: `This file is ${fmtSize(f.size)}. The limit is 20 MB. Try compressing the images in your report.` }); return; }
    setFile(f); setKeepExisting(false); setErrors({});
  }

  const E = (k: string) => errors[k] ? <p className="err" id={`err-${k}`}>{errors[k]}</p> : null;
  const inv = (k: string) => errors[k] ? { className: "invalid", "aria-invalid": true, "aria-describedby": `err-${k}` } : {};
  const reach = maxReach();

  return (
    <div className="narrow">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 6 }}>
        <div>
          <p className="muted small" style={{ fontWeight: 600 }}>{props.mode === "edit" ? `Editing ${props.submissionRef} · this will be version ${props.nextVersion}` : "New submission"}</p>
          <h1>Submit your research</h1>
        </div>
        <span className="muted small">Draft saved on this device</span>
      </div>
      <ol className="steps" aria-label="Progress">
        {STEPS.map((t, i) => (
          <li key={t} className={i < step ? "done" : i === step ? "now" : ""}>
            <button type="button" onClick={() => i <= reach && goTo(i)} disabled={i > reach} aria-current={i === step ? "step" : undefined}>
              <span className="bar" /><span className="t">{i + 1}. {t}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mstep">Step {step + 1} of 6 · {STEPS[step]}</p>

      {props.collection && (
        <div className="notice ok" style={{ marginBottom: 16 }}>📚 Submitting to <b>{props.collection.title}</b>, curated by {props.collection.owner}. They&apos;ll see your upload and can confirm your work.</div>
      )}
      {props.moderatorNote && (
        <div className="comment" style={{ marginBottom: 16 }}><b>Moderator&apos;s note</b><p style={{ marginTop: 4 }}>{props.moderatorNote}</p></div>
      )}
      {restored && props.mode === "new" && step > 0 && (
        <div className="notice info small" style={{ marginBottom: 16 }}>We restored your saved draft. {!hasFile && step >= 3 && "You'll need to choose your PDF again."}</div>
      )}

      <div className="card pad-lg">
        <form onSubmit={next} noValidate>
          {step === 0 && (
            <div className="stack">
              <div><h2>About you</h2><p className="muted" style={{ marginTop: 4 }}>This appears on your paper.</p></div>
              <div className="notice ok small">✓ Logged in as <b>{props.email}</b></div>
              <div className="grid g2">
                <div className="field"><label className="lbl" htmlFor="name">Full name</label><input type="text" id="name" value={d.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" {...inv("name")} />{E("name")}<p className="hint">As it should appear on the paper.</p></div>
                <div className="field"><label className="lbl" htmlFor="level">Level</label><select id="level" value={d.level} onChange={(e) => set("level", e.target.value)}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
              </div>
              <div className="field"><label className="lbl" htmlFor="institution">Institution</label>
                <select id="institution" value={d.institution} onChange={(e) => set("institution", e.target.value)} {...inv("institution")}><option value="">Choose your institution</option>{INSTITUTIONS.map((i) => <option key={i}>{i}</option>)}</select>{E("institution")}</div>
              <div className="field"><label className="lbl" htmlFor="programme">Programme</label><input type="text" id="programme" value={d.programme} onChange={(e) => set("programme", e.target.value)} placeholder="e.g. BSc Geomatic Engineering" {...inv("programme")} />{E("programme")}</div>
            </div>
          )}

          {step === 1 && (() => {
            const w = words(d.abstract);
            const color = w < ABSTRACT_MIN ? "var(--warn)" : w > ABSTRACT_MAX ? "var(--bad)" : "var(--ok)";
            return (
              <div className="stack">
                <div><h2>Your research</h2><p className="muted" style={{ marginTop: 4 }}>This is what readers see first, so write it clearly.</p></div>
                <div className="field"><label className="lbl" htmlFor="title">Title</label><input type="text" id="title" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Mapping Flood-Prone Areas in Kumasi Using GIS" {...inv("title")} />{E("title")}<p className="hint">Use the same title as on your project report.</p></div>
                <div className="field"><label className="lbl" htmlFor="abstract">Abstract</label>
                  <textarea id="abstract" value={d.abstract} onChange={(e) => set("abstract", e.target.value)} placeholder="What problem did you study, how did you do it, what did you find, and why does it matter?" {...inv("abstract")} />
                  <div className="row between"><p className="hint">Aim for {ABSTRACT_MIN}–{ABSTRACT_MAX} words: problem, method, findings, recommendation.</p><p className="hint num" style={{ color, fontWeight: 700 }}>{w} words</p></div>{E("abstract")}</div>
                <div className="field"><label className="lbl" htmlFor="kw">Keywords</label>
                  <input type="text" id="kw" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Type a keyword and press Enter" disabled={d.keywords.length >= 6}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(kw); } }} onBlur={() => kw.trim() && addKeyword(kw)} {...inv("keywords")} />
                  <div className="chips">{d.keywords.map((k, i) => <span className="chip" key={k}>{k}<button type="button" aria-label={`Remove ${k}`} onClick={() => set("keywords", d.keywords.filter((_, j) => j !== i))}>×</button></span>)}</div>
                  {E("keywords")}<p className="hint">3 to 6 keywords help other students find your work.</p></div>
                <div className="grid g3">
                  <div className="field"><label className="lbl" htmlFor="field">Field</label><select id="field" value={d.field} onChange={(e) => set("field", e.target.value)} {...inv("field")}><option value="">Choose a field</option>{FIELDS.map((f) => <option key={f}>{f}</option>)}</select>{E("field")}</div>
                  <div className="field"><label className="lbl" htmlFor="type">Type of work</label><select id="type" value={d.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                  <div className="field"><label className="lbl" htmlFor="year">Year completed</label><select id="year" value={d.year} onChange={(e) => set("year", e.target.value)}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></div>
                </div>
              </div>
            );
          })()}

          {step === 2 && (
            <div className="stack">
              <div><h2>People</h2><p className="muted" style={{ marginTop: 4 }}>Add everyone who wrote the work, and your supervisor.</p></div>
              <div className="card" style={{ padding: 14, background: "var(--bg)" }}><b>{d.name || "You"}</b> <span className="muted small">· main author · {shortInst(d.institution || "")}</span></div>
              {d.coauthors.map((c, i) => (
                <div key={i} className="stack" style={{ gap: 4 }}>
                  <div className="grid" style={{ gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                    <div className="field"><label className="lbl small" htmlFor={`ca-${i}-name`}>Co-author {i + 1} name</label><input type="text" id={`ca-${i}-name`} value={c.name} onChange={(e) => set("coauthors", d.coauthors.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} {...inv("ca" + i)} /></div>
                    <div className="field"><label className="lbl small" htmlFor={`ca-${i}-email`}>Their email (optional)</label><input type="email" id={`ca-${i}-email`} value={c.email} onChange={(e) => set("coauthors", d.coauthors.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} /></div>
                    <button type="button" className="btn sm" style={{ minHeight: 46 }} onClick={() => set("coauthors", d.coauthors.filter((_, j) => j !== i))} aria-label={`Remove co-author ${i + 1}`}>Remove</button>
                  </div>
                  {E("ca" + i)}
                </div>
              ))}
              <div><button type="button" className="btn sm" disabled={d.coauthors.length >= 5} onClick={() => set("coauthors", [...d.coauthors, { name: "", email: "" }])}>+ Add co-author</button></div>
              <div className="grid g2" style={{ marginTop: 8 }}>
                <div className="field"><label className="lbl" htmlFor="supName">Supervisor&apos;s name</label><input type="text" id="supName" value={d.supName} onChange={(e) => set("supName", e.target.value)} placeholder="e.g. Dr. J. K. Annan" {...inv("supName")} />{E("supName")}</div>
                <div className="field"><label className="lbl" htmlFor="supEmail">Supervisor&apos;s email</label><input type="email" id="supEmail" value={d.supEmail} onChange={(e) => set("supEmail", e.target.value)} placeholder="name@umat.edu.gh" {...inv("supEmail")} />{E("supEmail")}</div>
              </div>
              <label className={`check ${d.notifySup ? "on" : ""}`} htmlFor="notifySup">
                <input type="checkbox" id="notifySup" checked={d.notifySup} onChange={(e) => set("notifySup", e.target.checked)} />
                <span><b>Ask my supervisor to confirm</b><br /><span className="small muted">We&apos;ll email them a link to confirm this is your work. Confirmed papers show a badge.</span></span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="stack">
              <div><h2>Upload your PDF</h2><p className="muted" style={{ marginTop: 4 }}>Upload the final version of your report or paper.</p></div>
              {file || keepExisting ? (
                <div className="filebox">
                  <span className="pdficon">PDF</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ overflowWrap: "anywhere" }}>{file ? file.name : props.existingFile!.name}</b>
                    <p className="small muted num">{fmtSize(file ? file.size : props.existingFile!.size)} · {file ? "ready to submit" : "current file (kept unless you replace it)"}</p>
                  </div>
                  <button type="button" className="btn sm" onClick={() => { setFile(null); setKeepExisting(false); }}>Replace</button>
                </div>
              ) : (
                <label className={`drop ${over ? "over" : ""}`} htmlFor="file"
                  onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                  onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) takeFile(f); }}>
                  <input type="file" id="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) takeFile(f); }} />
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "var(--accent)" }}><path d="M12 15V4m0 0L8 8m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <p style={{ marginTop: 8 }}><b>Tap to choose a PDF</b> or drag it here</p>
                  <p className="small muted">PDF only, up to 20 MB</p>
                </label>
              )}
              {E("file")}
              <div className="notice info small"><b>Before you upload:</b> remove names, phone numbers or photos of anyone who took part in your study, and any confidential company data from your internship.</div>
            </div>
          )}

          {step === 4 && (
            <div className="stack">
              <div><h2>Licence and declarations</h2><p className="muted" style={{ marginTop: 4 }}>This decides how others can use your work.</p></div>
              <div className="card" style={{ background: "var(--accent-soft)", borderColor: "transparent" }}>
                <b>Creative Commons Attribution 4.0 (CC BY 4.0)</b>
                <p className="small" style={{ marginTop: 6 }}>Anyone can read, share and build on your work, <b>as long as they credit you</b>. This is the standard for open research and helps your work get cited. You keep your copyright.</p>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {([
                  ["author", "I am an author of this work, and all co-authors agree to publishing it.", ""],
                  ["original", "This is my own work. Anything I took from others is properly cited.", "Moderators run a similarity check on every submission."],
                  ["privacy", "The PDF contains no personal details of research participants and no confidential data.", ""],
                  ["supervisor", "My supervisor knows I am publishing this, and my university allows it.", ""],
                ] as const).map(([k, t, sub]) => (
                  <label key={k} className={`check ${d.decl[k] ? "on" : ""}`} htmlFor={`decl-${k}`}>
                    <input type="checkbox" id={`decl-${k}`} checked={d.decl[k]} onChange={(e) => set("decl", { ...d.decl, [k]: e.target.checked })} />
                    <span><b>{t}</b>{sub && <><br /><span className="small muted">{sub}</span></>}</span>
                  </label>
                ))}
              </div>
              {E("decl")}
            </div>
          )}

          {step === 5 && (
            <div className="stack review">
              <div><h2>Check and submit</h2><p className="muted" style={{ marginTop: 4 }}>Make sure everything is right. You can edit later if a moderator asks for changes.</p></div>
              {serverError && <div className="notice bad">{serverError}</div>}
              {[
                { s: 0, h: "About you", rows: [["Name", d.name], ["Institution", d.institution], ["Programme", `${d.programme} · ${d.level}`]] },
                { s: 1, h: "Your research", rows: [["Title", d.title], ["Abstract", `${words(d.abstract)} words · ${d.abstract.slice(0, 160)}${d.abstract.length > 160 ? "…" : ""}`], ["Keywords", d.keywords.join(", ")], ["Field", d.field], ["Type", `${d.type}, ${d.year}`]] },
                { s: 2, h: "People", rows: [["Authors", [d.name, ...d.coauthors.map((c) => c.name)].join(", ")], ["Supervisor", `${d.supName} · ${d.supEmail}${d.notifySup ? " · will be asked to confirm" : ""}`]] },
                { s: 3, h: "File and licence", rows: [["PDF", file ? `${file.name} (${fmtSize(file.size)})` : keepExisting ? `${props.existingFile!.name} (unchanged)` : "None"], ["Licence", "CC BY 4.0"]] },
              ].map((sec) => (
                <div key={sec.h}>
                  <div className="sect-h"><h3>{sec.h}</h3><button type="button" className="btn ghost sm" onClick={() => goTo(sec.s)}>Edit</button></div>
                  <dl>{sec.rows.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                </div>
              ))}
            </div>
          )}

          <div className="wiz-foot">
            {step > 0 ? <button type="button" className="btn" onClick={() => goTo(step - 1)}>← Back</button> : <span />}
            {step < 5
              ? <button type="submit" className="btn primary">Continue →</button>
              : <button type="submit" className="btn primary" disabled={busy}>{busy ? "Uploading…" : props.mode === "edit" ? "Resubmit for review" : "Submit for review"}</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
