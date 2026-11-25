"use client";
import { useState } from "react";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [testAcct, setTestAcct] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setError("");
    const r = await fetch("/api/auth/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(j.error || "Something went wrong. Try again."); return; }
    setSent(true); setDevCode(j.devCode || null); setTestAcct(!!j.testAccount); setCode("");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setError(j.error || "Something went wrong. Try again."); return; }
    window.location.href = next || j.home || "/";
  }

  if (!sent) {
    return (
      <form className="stack" onSubmit={sendCode} noValidate>
        <div className="field">
          <label className="lbl" htmlFor="email">Email</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. ama.mensah@st.umat.edu.gh" autoComplete="email" className={error ? "invalid" : ""} autoFocus />
          {error ? <p className="err">{error}</p> : <p className="hint">Students: use your university email ending in <b>.edu.gh</b> so you can publish. Anyone else (recruiters, lecturers, readers) can use any email.</p>}
        </div>
        <button className="btn primary" type="submit" disabled={busy || !email.trim()}>{busy ? "Sending…" : "Send me a code"}</button>
      </form>
    );
  }

  return (
    <form className="stack" onSubmit={verify} noValidate>
      <p>We sent a code to <b>{email}</b>. <button type="button" className="btn ghost sm" onClick={() => { setSent(false); setError(""); }}>Change email</button></p>
      {testAcct && (
        <div className="notice info small">This is a shared test account, so no email is sent. Enter the 6-digit code you were given.</div>
      )}
      {devCode && (
        <div className="notice info small">Test mode: no real email was sent. Your code is <b className="num">{devCode}</b>. You can also see it in the <a href="/dev/outbox" target="_blank">email outbox</a> or in the terminal.</div>
      )}
      <div className="field">
        <label className="lbl" htmlFor="code">6-digit code</label>
        <input type="text" id="code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`codebox ${error ? "invalid" : ""}`} autoComplete="one-time-code" autoFocus />
        {error ? <p className="err">{error}</p> : <p className="hint">The code expires in 10 minutes.</p>}
      </div>
      <div className="row">
        <button className="btn primary" type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Log in"}</button>
        <button className="btn ghost" type="button" onClick={() => sendCode()} disabled={busy}>Send a new code</button>
      </div>
    </form>
  );
}
