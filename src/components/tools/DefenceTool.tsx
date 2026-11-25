"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "@/lib/defence";
import { answerFeedback, femaleVoices, lead, makeRecognizer, speechSupported } from "@/lib/panel-voice";
import SourcePicker, { PublishCTA } from "./SourcePicker";
import Icon from "@/components/Icon";

export default function DefenceTool({ papers }: { papers: { id: string; title: string; ref: string }[] }) {
  const [res, setRes] = useState<{ questions: Question[]; fromPaper: boolean } | null>(null);
  const [mode, setMode] = useState<"list" | "practice">("list");
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState<Record<string, "good" | "work">>({});
  const [secs, setSecs] = useState(120);
  const [running, setRunning] = useState(false);

  // ---- Panel voice (reads questions aloud) and listening (writes down the spoken answer) ----
  const [voiceOn, setVoiceOn] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [rate, setRate] = useState(0.95);
  const [speaking, setSpeaking] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [said, setSaid] = useState("");
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState("");
  const [feedback, setFeedback] = useState<ReturnType<typeof answerFeedback> | null>(null);
  const recRef = useRef<ReturnType<typeof makeRecognizer>>(null);
  const wantListen = useRef(false);
  const saidRef = useRef("");

  useEffect(() => {
    if (!speechSupported()) { setVoiceOn(false); return; }
    let saved = "";
    try { saved = localStorage.getItem("papr-voice") || ""; const r = localStorage.getItem("papr-voice-rate"); if (r) setRate(Number(r)); } catch {}
    const load = () => {
      const list = femaleVoices(window.speechSynthesis.getVoices());
      setVoices(list);
      setVoiceName((cur) => cur || (list.find((v) => v.name === saved) || list[0])?.name || "");
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    setCanListen(!!makeRecognizer());
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", load); window.speechSynthesis.cancel(); recRef.current?.abort(); };
  }, []);

  const say = useCallback((text: string, then?: () => void) => {
    if (!speechSupported()) { then?.(); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = window.speechSynthesis.getVoices().find((x) => x.name === voiceName);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
    u.rate = rate; u.pitch = 1.05;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); then?.(); };
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }, [voiceName, rate]);

  const stopListening = useCallback(() => {
    wantListen.current = false;
    recRef.current?.stop();
    setListening(false); setInterim("");
  }, []);

  const startListening = useCallback(() => {
    setMicError("");
    const r = makeRecognizer();
    if (!r) return;
    recRef.current?.abort();
    recRef.current = r;
    wantListen.current = true;
    r.onresult = (e) => {
      let fin = "", mid = "";
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const t = e.results[k][0].transcript;
        if (e.results[k].isFinal) fin += t + " "; else mid += t;
      }
      if (fin) { saidRef.current += fin; setSaid(saidRef.current); }
      setInterim(mid);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { setMicError("Microphone blocked. Allow the microphone for this site in your browser's address bar."); wantListen.current = false; }
      else if (e.error === "network") { setMicError("Listening needs an internet connection (Chrome/Edge send audio to their speech service)."); wantListen.current = false; }
    };
    r.onend = () => { if (wantListen.current) { try { r.start(); } catch { setListening(false); } } else setListening(false); };
    try { r.start(); setListening(true); } catch { setListening(false); }
  }, []);

  const startAnswer = useCallback(() => {
    setFeedback(null);
    setRunning(true);
    if (micOn) startListening();
  }, [micOn, startListening]);

  const finishAnswer = useCallback((timeUp = false) => {
    setRunning(false);
    stopListening();
    if (timeUp && voiceOn) say("Time. Thank you.");
  }, [stopListening, say, voiceOn]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecs((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => { if (running && secs === 0) finishAnswer(true); }, [secs, running, finishAnswer]);

  // When a new question appears in practice mode, the panel asks it; the timer (and listening) start when she finishes.
  useEffect(() => {
    if (!res || mode !== "practice") { if (speechSupported()) window.speechSynthesis.cancel(); return; }
    if (!voiceOn) return;
    const qq = res.questions[i];
    const t = setTimeout(() => say(lead(i) + qq.q, () => startAnswer()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, mode, res, voiceOn]);

  // Feedback once an answer that was listened to has finished.
  useEffect(() => {
    if (!running && !listening && saidRef.current.trim() && res && !feedback) {
      setFeedback(answerFeedback(saidRef.current, 120 - secs, res.questions[i].tip));
    }
  }, [running, listening, secs, res, i, feedback]);
  if (!res) return <SourcePicker tool="defence" papers={papers} cta="Get my panel questions" steps={["Reading your paper…", "Thinking like your panel…", "Writing tough questions…"]} onResult={(r) => setRes(r as never)} />;
  const qs = res.questions;
  const q = qs[i];
  const done = Object.keys(rating).length;
  const work = qs.filter((x) => rating[x.id] === "work");
  const next = (r?: "good" | "work") => {
    if (r) setRating({ ...rating, [q.id]: r });
    stopListening(); saidRef.current = ""; setSaid(""); setFeedback(null);
    setShow(false); setSecs(120); setRunning(false);
    if (i < qs.length - 1) setI(i + 1);
    else if (voiceOn) say(work.length || r === "work" ? "That's the end of the questions. Go back over the ones you marked for more work. Well done." : "That's all our questions. Thank you, that was a strong defence.");
  };
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row between">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={mode === "list"} onClick={() => setMode("list")}>All questions ({qs.length})</button>
          <button role="tab" aria-selected={mode === "practice"} onClick={() => setMode("practice")}>Practice mode</button>
        </div>
        <span className="small muted num">{done} practised · {work.length} need work</span>
      </div>
      {mode === "list" ? (
        <div className="stack" style={{ gap: 10 }}>
          {qs.map((x, n) => (
            <details key={x.id} className="qcard">
              <summary><span className={`lvl ${x.level}`}>{x.level}</span><b>{n + 1}. {x.q}</b></summary>
              <div className="stack" style={{ gap: 6, paddingTop: 8 }}>
                {x.from && <p className="small muted">From your paper: “{x.from}”</p>}
                <p className="small ih"><Icon name="idea" size={15} /> {x.tip}</p>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="card pad-lg practice">
          <div className="row between small muted"><span>{q.category} · question {i + 1} of {qs.length}</span><span className={`lvl ${q.level}`}>{q.level}</span></div>
          <div className={`panelist${speaking ? " talking" : ""}`}>
            <div className="pav" aria-hidden><Icon name="mic" size={20} /><em><i /><i /><i /><i /></em></div>
            <div className="stack" style={{ gap: 2, minWidth: 0 }}>
              <b className="small">Panel chair</b>
              <span className="small muted">{!voiceOn ? "Voice off" : speaking ? "Asking…" : listening ? "Listening to your answer…" : running ? "Waiting for your answer" : "Ready"}</span>
            </div>
            <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
              {voiceOn && <button type="button" className="btn ghost sm" onClick={() => { setRunning(false); stopListening(); say(q.q); }} disabled={speaking}><Icon name="again" size={14} /> Ask again</button>}
              <button type="button" className="btn sm" aria-pressed={voiceOn} onClick={() => { if (voiceOn) window.speechSynthesis?.cancel(); setVoiceOn(!voiceOn); }} disabled={!speechSupported()}>{voiceOn ? <><Icon name="volume" size={15} /> Voice on</> : <><Icon name="mute" size={15} /> Voice off</>}</button>
            </div>
          </div>
          <h2>{q.q}</h2>
          {q.from && <p className="small muted">From your paper: “{q.from}”</p>}
          <div className="timer">
            <b className={`num${secs <= 20 ? " low" : ""}`}>{fmt(secs)}</b>
            {running
              ? <button type="button" className="btn sm" onClick={() => finishAnswer()}><Icon name="stop" size={13} /> Finish answer</button>
              : secs < 120
                ? <button type="button" className="btn sm" onClick={() => { saidRef.current = ""; setSaid(""); setFeedback(null); setSecs(120); startAnswer(); }} disabled={speaking}><Icon name="again" size={14} /> Try again</button>
                : <button type="button" className="btn sm" onClick={startAnswer} disabled={speaking}>Start 2-minute answer</button>}
            {canListen
              ? <label className="small row" style={{ gap: 6 }}><input type="checkbox" checked={micOn} onChange={(e) => { setMicOn(e.target.checked); if (!e.target.checked) stopListening(); else if (running) startListening(); }} /> <Icon name="mic" size={14} /> Write down what I say</label>
              : <span className="small muted ih"><Icon name="mic" size={14} /> Speech-to-text works in Chrome or Edge.</span>}
          </div>
          {micError && <div className="notice bad small">{micError}</div>}
          {(listening || said) && (
            <div className="transcript small">{said}<span className="muted">{interim}</span>{listening && <span className="caret" />}</div>
          )}
          {feedback && (
            <div className="notice info small stack" style={{ gap: 4 }}>
              <b>How that sounded</b>
              <span>{feedback.words} words in {fmt(120 - secs)}{feedback.wpm ? ` · ${feedback.wpm} words a minute (${feedback.pace})` : ""}</span>
              {Object.keys(feedback.fillers).length > 0 && <span>Filler words: {Object.entries(feedback.fillers).map(([w, n]) => `“${w}” ×${n}`).join(", ")}</span>}
              {feedback.hit.length > 0 && <span className="ih"><Icon name="ok" size={15} /> You covered: {feedback.hit.join(", ")}</span>}
              {feedback.miss.length > 0 && <span className="ih"><Icon name="plus" size={15} /> Consider mentioning: {feedback.miss.join(", ")}</span>}
            </div>
          )}
          <p className="small muted">Answer out loud, as if the panel is in front of you.</p>
          {show ? <div className="notice info small ih"><Icon name="idea" size={15} /> {q.tip}</div> : <button type="button" className="btn ghost sm" onClick={() => setShow(true)}>Show what the panel wants to hear</button>}
          <div className="row">
            <button type="button" className="btn primary" onClick={() => next("good")}>I nailed it</button>
            <button type="button" className="btn" onClick={() => next("work")}>Needs more work</button>
            <button type="button" className="btn ghost" onClick={() => next()}>Skip</button>
          </div>
          {i === qs.length - 1 && done > 0 && <div className="notice ok small">You&apos;ve been through every question. {work.length ? `Go back over the ${work.length} marked "needs more work".` : "Great job: you're ready!"}</div>}
        </div>
      )}
      {mode === "practice" && voiceOn && voices.length > 0 && (
        <div className="row small" style={{ gap: 12, flexWrap: "wrap" }}>
          <label className="row" style={{ gap: 6 }}>Voice
            <select value={voiceName} onChange={(e) => { setVoiceName(e.target.value); try { localStorage.setItem("papr-voice", e.target.value); } catch {} }}>
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name.replace(/^(Microsoft|Google)\s+/, "").replace(/\s+-\s+.*$/, "")} ({v.lang})</option>)}
            </select>
          </label>
          <label className="row" style={{ gap: 6 }}>Speed
            <input type="range" min={0.7} max={1.3} step={0.05} value={rate} onChange={(e) => { setRate(Number(e.target.value)); try { localStorage.setItem("papr-voice-rate", e.target.value); } catch {} }} />
          </label>
          <button type="button" className="btn ghost sm" onClick={() => say("Hello. I'll be chairing your panel today.")}>Test voice</button>
        </div>
      )}
      <div className="row"><button type="button" className="btn" onClick={() => { window.speechSynthesis?.cancel(); stopListening(); setRes(null); setRating({}); setI(0); }}>Use another paper</button></div>
      <PublishCTA show={!res.fromPaper} />
    </div>
  );
}
