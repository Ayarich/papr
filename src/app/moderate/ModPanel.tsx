"use client";
import { useRef, useState } from "react";
import { decide } from "./actions";
import { CHECKS } from "@/lib/constants";

export default function ModPanel({ id }: { id: string }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const allOk = CHECKS.every((c) => checks[c.key]);
  const decisionRef = useRef<HTMLInputElement>(null);

  // Records which button was pressed, then checks a note was written where one is needed.
  function guard(e: React.MouseEvent<HTMLButtonElement>) {
    const decision = e.currentTarget.value;
    if (decisionRef.current) decisionRef.current.value = decision;
    if (decision !== "publish" && note.trim().length < 15) {
      e.preventDefault();
      setErr("Write a note (at least a sentence) so the student knows what to do.");
      document.getElementById("mod-note")?.focus();
    }
    if (decision === "reject" && note.trim().length >= 15 && !window.confirm("Decline this submission? The student will see your note.")) e.preventDefault();
  }

  return (
    <form action={decide} className="stack" key={id}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" ref={decisionRef} defaultValue="" />
      <input type="hidden" name="checklist" value={JSON.stringify(checks)} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
        <legend style={{ fontWeight: 700, marginBottom: 8 }}>Checklist</legend>
        <div className="stack" style={{ gap: 8 }}>
          {CHECKS.map((c) => (
            <label key={c.key} className={`check ${checks[c.key] ? "on" : ""}`} htmlFor={`chk-${c.key}`}>
              <input type="checkbox" id={`chk-${c.key}`} checked={!!checks[c.key]} onChange={(e) => setChecks({ ...checks, [c.key]: e.target.checked })} />
              <span><b>{c.title}</b><br /><span className="small muted">{c.help}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label className="lbl" htmlFor="mod-note">Note to the student</label>
        <textarea id="mod-note" name="note" style={{ minHeight: 100 }} value={note} onChange={(e) => { setNote(e.target.value); setErr(""); }} className={err ? "invalid" : ""}
          placeholder="Required if you request changes or decline. Be specific and kind, e.g. 'Please add your method to the abstract.'" />
        {err && <p className="err">{err}</p>}
      </div>
      <div className="row">
        <button type="submit" value="publish" className="btn primary" disabled={!allOk} onClick={guard}>Publish</button>
        <button type="submit" value="changes" className="btn" onClick={guard}>Request changes</button>
        <button type="submit" value="reject" className="btn danger" onClick={guard}>Decline</button>
      </div>
      {!allOk && <p className="hint" style={{ marginTop: -8 }}>Tick every checklist item to enable Publish.</p>}
    </form>
  );
}
