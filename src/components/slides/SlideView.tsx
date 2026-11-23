"use client";
import { useEffect, useRef, useState } from "react";
import { THEMES, type Slide, type ThemeKey } from "@/lib/deck";

// Slides are designed on a fixed 1280 x 720 canvas (16:9) and scaled to fit wherever they are shown.
export const W = 1280, H = 720;

/** Scales its 1280x720 child to the width of its container. */
export function Scaled({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.2);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setS(el.clientWidth / W));
    ro.observe(el);
    setS(el.clientWidth / W);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`scaled ${className}`} style={{ aspectRatio: `${W} / ${H}` }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, transform: `scale(${s})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

/** Text you can click into and type, like a PowerPoint text box. */
function Editable({ value, onChange, className, placeholder, editable, onKeyDown, dataKey }: {
  value: string; onChange?: (v: string) => void; className?: string; placeholder?: string; editable: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void; dataKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Only write into the box when the value changed from outside, so the cursor never jumps.
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);
  if (!editable) return <div className={className}>{value}</div>;
  return (
    <div
      ref={ref}
      className={`${className} editable`}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      data-key={dataKey}
      spellCheck
      onInput={(e) => onChange?.(e.currentTarget.innerText.replace(/\n$/, ""))}
      onKeyDown={onKeyDown}
      onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
    />
  );
}

export function SlideView({ slide, theme, number, editable = false, onChange, onEnterBullet, onRemoveBullet }: {
  slide: Slide; theme: ThemeKey; number?: number; editable?: boolean;
  onChange?: (patch: Partial<Slide>) => void;
  onEnterBullet?: (index: number) => void;
  onRemoveBullet?: (index: number) => void;
}) {
  const t = THEMES[theme];
  const set = (patch: Partial<Slide>) => onChange?.(patch);
  const many = slide.bullets.length > 5 || slide.bullets.join(" ").length > 420;
  const style = { background: t.bg, color: t.text, ["--accent" as string]: t.accent, ["--muted" as string]: t.muted, ["--panel" as string]: t.panel } as React.CSSProperties;

  return (
    <div className={`slide l-${slide.layout}`} style={style}>
      {slide.layout === "title" && (
        <div className="s-title-wrap">
          <span className="s-bar" />
          <Editable className="s-h1" value={slide.title} editable={editable} placeholder="Presentation title" onChange={(v) => set({ title: v })} />
          <Editable className="s-sub" value={slide.subtitle} editable={editable} placeholder="Your name · Institution · Year" onChange={(v) => set({ subtitle: v })} />
        </div>
      )}
      {slide.layout === "bullets" && (
        <>
          <Editable className="s-h2" value={slide.title} editable={editable} placeholder="Slide title" onChange={(v) => set({ title: v })} />
          <span className="s-underline" />
          <ul className={`s-bullets${many ? " small" : ""}`}>
            {slide.bullets.map((b, i) => (
              <li key={i}>
                <Editable
                  className="s-li" value={b} editable={editable} placeholder="Type a point" dataKey={`b${i}`}
                  onChange={(v) => set({ bullets: slide.bullets.map((x, j) => (j === i ? v : x)) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEnterBullet?.(i); }
                    if (e.key === "Backspace" && !e.currentTarget.innerText.trim() && slide.bullets.length > 1) { e.preventDefault(); onRemoveBullet?.(i); }
                  }}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {slide.layout === "section" && (
        <div className="s-section">
          <span className="s-num">{String(number || 1).padStart(2, "0")}</span>
          <Editable className="s-h1" value={slide.title} editable={editable} placeholder="Section title" onChange={(v) => set({ title: v })} />
          <Editable className="s-sub" value={slide.subtitle} editable={editable} placeholder="Optional subtitle" onChange={(v) => set({ subtitle: v })} />
        </div>
      )}
      {slide.layout === "statement" && (
        <div className="s-statement">
          <span className="s-quote">“</span>
          <Editable className="s-big" value={slide.title} editable={editable} placeholder="One big idea" onChange={(v) => set({ title: v })} />
          <Editable className="s-caption" value={slide.subtitle} editable={editable} placeholder="Caption" onChange={(v) => set({ subtitle: v })} />
        </div>
      )}
      {slide.layout === "end" && (
        <div className="s-end">
          <Editable className="s-h0" value={slide.title} editable={editable} placeholder="Thank you" onChange={(v) => set({ title: v })} />
          <Editable className="s-sub" value={slide.subtitle} editable={editable} placeholder="Questions?" onChange={(v) => set({ subtitle: v })} />
        </div>
      )}
      <div className="s-foot"><span>papr</span>{number ? <span>{number}</span> : null}</div>
    </div>
  );
}
