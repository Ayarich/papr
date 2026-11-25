"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Scaled, SlideView } from "@/components/slides/SlideView";
import Icon, { type IconName } from "@/components/Icon";

// The home page preview of papr's tools: one card at a time in front, the next two waiting behind.
// Turns every 4 seconds, pauses while you hover or focus it, and stops moving for people who prefer reduced motion.

type Item = { key: string; tool: string; icon: IconName; caption: string; href: string; card: React.ReactNode };

const ITEMS: Item[] = [
  {
    key: "slides", tool: "Slides", icon: "slides", href: "/slides", caption: "An editable PowerPoint deck, made from your PDF",
    card: <Scaled><SlideView theme="forest" number={1} slide={{ id: "a", layout: "title", title: "Urban Growth in Sekondi-Takoradi", subtitle: "Final-year project · UMaT · 2026", bullets: [], notes: "" }} /></Scaled>,
  },
  {
    key: "precheck", tool: "Pre-check", icon: "precheck", href: "/tools/precheck", caption: "Similarity and abstract score before your supervisor sees it",
    card: (
      <div className="pc pc-precheck">
        <div className="pc-head"><Icon name="precheck" size={16} /> Pre-check report</div>
        <div className="pc-row">
          <div className="pc-gauge" style={{ ["--v" as string]: 8 }}><b>8%</b><span>similarity</span></div>
          <div className="pc-list">
            <p><Icon name="ok" size={15} className="lv-ok" /> Looks original</p>
            <p><Icon name="ok" size={15} className="lv-ok" /> Quotes and references excluded</p>
            <p><Icon name="warn" size={15} className="lv-warn" /> 1 passage to cite: Mensah (2019)</p>
          </div>
        </div>
        <div className="pc-bar"><span>Abstract score</span><i style={{ width: "82%" }} /><b>82/100</b></div>
      </div>
    ),
  },
  {
    key: "slides2", tool: "Slides", icon: "slides", href: "/slides", caption: "Your key findings, ready to present",
    card: <Scaled><SlideView theme="paper" number={6} slide={{ id: "b", layout: "bullets", title: "Key findings", subtitle: "", bullets: ["Built-up area tripled, 1994–2024", "Fastest growth after oil production began", "Vegetation declined by 41%"], notes: "" }} /></Scaled>,
  },
  {
    key: "refs", tool: "Reference checker", icon: "references", href: "/tools/references", caption: "Missing citations found, list formatted to APA 7",
    card: (
      <div className="pc pc-refs">
        <div className="pc-head"><Icon name="references" size={16} /> Reference check</div>
        <div className="pc-chips"><span><b>24</b> citations</span><span><b>23</b> in your list</span><span className="bad"><b>1</b> missing</span></div>
        <div className="pc-ref"><Icon name="bad" size={15} className="lv-bad" /><span><b>Mensah (2019)</b> is cited on page 4 but not in your reference list.</span></div>
        <div className="pc-ref fixed"><Icon name="pencil" size={15} /><span>Owusu, A., &amp; Boateng, E. (2021). Land cover change in coastal Ghana. <i>Journal of Remote Sensing, 12</i>(3), 45–60.</span></div>
      </div>
    ),
  },
  {
    key: "defence", tool: "Defence practice", icon: "defence", href: "/tools/defence", caption: "A panel voice asks real questions from your paper",
    card: (
      <div className="pc pc-defence">
        <div className="pc-head"><Icon name="mic" size={16} /> Defence practice · question 3 of 12</div>
        <div className="pc-panel"><span className="pc-av"><Icon name="mic" size={16} /><em><i /><i /><i /></em></span><span><b>Panel chair</b><small>Asking…</small></span></div>
        <p className="pc-q">Why did you choose Landsat data? What are its limitations for this study?</p>
        <div className="pc-timer"><b>2:00</b><span>Your answer starts when she finishes</span></div>
      </div>
    ),
  },
  {
    key: "statement", tool: "Slides", icon: "slides", href: "/slides", caption: "Big statement slides for your main result",
    card: <Scaled><SlideView theme="charcoal" number={7} slide={{ id: "c", layout: "statement", title: "The city tripled in size in thirty years.", subtitle: "The main finding", bullets: [], notes: "" }} /></Scaled>,
  },
];

export default function PromoCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const n = ITEMS.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setStill(mq.matches);
    set(); mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  useEffect(() => {
    if (paused || still) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 4000);
    return () => clearInterval(t);
  }, [paused, still, n]);

  const item = ITEMS[i];
  return (
    <div className="pcar" ref={wrap}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) setPaused(false); }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); }}
      role="region" aria-roledescription="carousel" aria-label="What papr's tools make">
      <div className="pcar-stage">
        {ITEMS.map((it, k) => {
          const pos = (k - i + n) % n; // 0 = front, 1 and 2 waiting behind, the rest hidden
          return (
            <div key={it.key} className={`pcar-card pos-${pos < 3 ? pos : "x"}`} aria-hidden={pos !== 0}
              role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}: ${it.tool}`}
              onClick={() => pos !== 0 && go(k)}>
              {it.card}
            </div>
          );
        })}
      </div>
      <div className="pcar-foot">
        <Link href={item.href} className="pcar-cap" aria-live="polite">
          <span className="pcar-ic"><Icon name={item.icon} size={16} /></span>
          <span><b>{item.tool}</b><span className="muted">{item.caption}</span></span>
        </Link>
        <div className="pcar-ctrl">
          <button type="button" className="pcar-btn" onClick={() => go(i - 1)} aria-label="Previous"><Icon name="prev" size={16} /></button>
          <div className="pcar-dots" role="tablist" aria-label="Choose a preview">
            {ITEMS.map((it, k) => <button key={it.key} type="button" role="tab" aria-selected={k === i} aria-label={`${it.tool}: ${it.caption}`} onClick={() => go(k)}><i className={k === i && !paused && !still ? "run" : ""} /></button>)}
          </div>
          <button type="button" className="pcar-btn" onClick={() => go(i + 1)} aria-label="Next"><Icon name="next" size={16} /></button>
        </div>
      </div>
    </div>
  );
}
