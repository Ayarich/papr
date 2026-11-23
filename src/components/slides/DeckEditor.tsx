"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LAYOUTS, THEMES, newSlide, sid, type Deck, type Layout, type Slide, type ThemeKey } from "@/lib/deck";
import { downloadPptx } from "@/lib/pptx";
import { Scaled, SlideView } from "./SlideView";

type SaveState = "saved" | "saving" | "error";

export default function DeckEditor({ id, initial }: { id: string; initial: Deck }) {
  const [deck, setDeck] = useState<Deck>(initial);
  const [cur, setCur] = useState(0);
  const [save, setSave] = useState<SaveState>("saved");
  const [presenting, setPresenting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const first = useRef(true);
  const focusReq = useRef<string | null>(null);

  const slide = deck.slides[cur] || deck.slides[0];

  // Autosave a moment after each change
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSave("saving");
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/decks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deck) });
        setSave(r.ok ? "saved" : "error");
      } catch { setSave("error"); }
    }, 800);
    return () => clearTimeout(t);
  }, [deck, id]);

  // Put the cursor into a newly created bullet
  useEffect(() => {
    if (!focusReq.current) return;
    const el = document.querySelector(`.editor-canvas [data-key="${focusReq.current}"]`) as HTMLElement | null;
    focusReq.current = null;
    if (el) {
      el.focus();
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
    }
  });

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };
  const setSlides = (fn: (s: Slide[]) => Slide[]) => setDeck((d) => ({ ...d, slides: fn(d.slides) }));
  const patch = useCallback((p: Partial<Slide>) => setSlides((ss) => ss.map((s, i) => (i === cur ? { ...s, ...p } : s))), [cur]);

  function addSlide() {
    setSlides((ss) => [...ss.slice(0, cur + 1), newSlide(), ...ss.slice(cur + 1)]);
    setCur(cur + 1);
  }
  function duplicate() {
    setSlides((ss) => [...ss.slice(0, cur + 1), { ...ss[cur], id: sid(), bullets: [...ss[cur].bullets] }, ...ss.slice(cur + 1)]);
    setCur(cur + 1);
  }
  function remove() {
    if (deck.slides.length <= 1) return;
    setSlides((ss) => ss.filter((_, i) => i !== cur));
    setCur(Math.max(0, cur - 1));
  }
  function move(dir: -1 | 1) {
    const to = cur + dir;
    if (to < 0 || to >= deck.slides.length) return;
    setSlides((ss) => { const c = [...ss]; [c[cur], c[to]] = [c[to], c[cur]]; return c; });
    setCur(to);
  }
  function changeLayout(layout: Layout) {
    patch({ layout, bullets: layout === "bullets" && slide.bullets.length === 0 ? ["Your point here"] : slide.bullets });
  }
  async function download() {
    setBusy(true);
    try { await downloadPptx(deck); flash("Downloaded. Open it in PowerPoint or Google Slides to keep editing."); }
    catch { flash("Couldn't build the file. Try again."); }
    setBusy(false);
  }

  return (
    <div className="editor">
      {/* Top bar */}
      <div className="ed-top">
        <Link href="/slides" className="icon-btn" aria-label="Back to my slides">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
        <input className="ed-title" aria-label="Deck title" value={deck.title} onChange={(e) => setDeck({ ...deck, title: e.target.value })} />
        <span className={`ed-save ${save}`}>{save === "saved" ? "✓ Saved" : save === "saving" ? "Saving…" : "Not saved. Check your connection."}</span>
        <div className="ed-actions">
          <button type="button" className="btn sm" onClick={() => setPresenting(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill="currentColor" /></svg> Present
          </button>
          <button type="button" className="btn primary sm" onClick={download} disabled={busy}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {busy ? "Building…" : "Download .pptx"}
          </button>
        </div>
      </div>

      {deck.source === "auto" && cur === 0 && (
        <div className="notice info small ed-hint">We drafted these slides from your paper. Click any text on a slide to edit it, just like PowerPoint. Press <b>Enter</b> in a bullet to add a new one.</div>
      )}

      <div className="ed-body">
        {/* Slide list */}
        <aside className="ed-rail" aria-label="Slides">
          {deck.slides.map((s, i) => (
            <button key={s.id} type="button" className={`ed-thumb${i === cur ? " on" : ""}`} onClick={() => setCur(i)} aria-label={`Slide ${i + 1}: ${s.title}`} aria-current={i === cur}>
              <span className="n">{i + 1}</span>
              <Scaled><SlideView slide={s} theme={deck.theme} number={i + 1} /></Scaled>
            </button>
          ))}
          <button type="button" className="ed-add" onClick={addSlide}>+ New slide</button>
        </aside>

        {/* Main slide */}
        <section className="ed-main">
          <div className="editor-canvas" key={slide.id}>
            <Scaled className="ed-stage">
              <SlideView
                slide={slide} theme={deck.theme} number={cur + 1} editable onChange={patch}
                onEnterBullet={(i) => { focusReq.current = `b${i + 1}`; patch({ bullets: [...slide.bullets.slice(0, i + 1), "", ...slide.bullets.slice(i + 1)] }); }}
                onRemoveBullet={(i) => { focusReq.current = `b${Math.max(0, i - 1)}`; patch({ bullets: slide.bullets.filter((_, j) => j !== i) }); }}
              />
            </Scaled>
          </div>
          <div className="ed-tools">
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn sm" onClick={() => move(-1)} disabled={cur === 0} aria-label="Move slide up">↑</button>
              <button type="button" className="btn sm" onClick={() => move(1)} disabled={cur === deck.slides.length - 1} aria-label="Move slide down">↓</button>
              <button type="button" className="btn sm" onClick={duplicate}>Duplicate</button>
              <button type="button" className="btn sm danger" onClick={remove} disabled={deck.slides.length <= 1}>Delete</button>
              {slide.layout === "bullets" && <button type="button" className="btn sm" onClick={() => { focusReq.current = `b${slide.bullets.length}`; patch({ bullets: [...slide.bullets, ""] }); }}>+ Bullet</button>}
            </div>
            <span className="muted small num">Slide {cur + 1} of {deck.slides.length}</span>
          </div>
          <div className="field">
            <label className="lbl small" htmlFor="notes">Speaker notes <span className="muted" style={{ fontWeight: 500 }}>(only you see these when presenting)</span></label>
            <textarea id="notes" className="ed-notes" value={slide.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="What you'll say on this slide…" />
          </div>
        </section>

        {/* Design panel */}
        <aside className="ed-panel">
          <div>
            <h3 className="ed-h">Theme</h3>
            <div className="ed-themes">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                <button key={k} type="button" className={`ed-theme${deck.theme === k ? " on" : ""}`} onClick={() => setDeck({ ...deck, theme: k })} aria-pressed={deck.theme === k}>
                  <span className="sw" style={{ background: THEMES[k].bg, color: THEMES[k].text }}><b>Aa</b><i style={{ background: THEMES[k].accent }} /></span>
                  <span className="small">{THEMES[k].name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="ed-h">Layout</h3>
            <div className="ed-layouts">
              {LAYOUTS.map((l) => (
                <button key={l.key} type="button" className={`ed-layout${slide.layout === l.key ? " on" : ""}`} onClick={() => changeLayout(l.key)} aria-pressed={slide.layout === l.key}>{l.name}</button>
              ))}
            </div>
          </div>
          <div className="notice small" style={{ background: "var(--subtle)" }}>
            <b>Tip:</b> the downloaded file is a real PowerPoint. Every title and bullet stays editable in PowerPoint, Google Slides or Keynote.
          </div>
        </aside>
      </div>

      {presenting && <Presenter deck={deck} start={cur} onClose={(i) => { setPresenting(false); setCur(i); }} />}
      {toast && <div className="ed-toast" role="status">{toast}</div>}
    </div>
  );
}

/** Full-screen slideshow. Arrow keys or click to move, Esc to leave. */
function Presenter({ deck, start, onClose }: { deck: Deck; start: number; onClose: (i: number) => void }) {
  const [i, setI] = useState(start);
  const ref = useRef<HTMLDivElement>(null);
  const n = deck.slides.length;
  useEffect(() => {
    ref.current?.requestFullscreen?.().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); setI((x) => Math.min(n - 1, x + 1)); }
      if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
      if (e.key === "Escape") close();
    };
    const onFs = () => { if (!document.fullscreenElement) close(); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFs); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const iRef = useRef(i); iRef.current = i;
  function close() { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); onClose(iRef.current); }
  return (
    <div className="presenter" ref={ref} onClick={(e) => { if ((e.target as HTMLElement).closest(".p-bar")) return; setI((x) => Math.min(n - 1, x + 1)); }}>
      <div className="p-stage" key={deck.slides[i].id}><Scaled><SlideView slide={deck.slides[i]} theme={deck.theme} number={i + 1} /></Scaled></div>
      <div className="p-bar">
        <button type="button" onClick={() => setI(Math.max(0, i - 1))} aria-label="Previous">←</button>
        <span className="num">{i + 1} / {n}</span>
        <button type="button" onClick={() => setI(Math.min(n - 1, i + 1))} aria-label="Next">→</button>
        <button type="button" onClick={close}>Exit</button>
      </div>
    </div>
  );
}
