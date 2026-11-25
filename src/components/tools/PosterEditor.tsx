"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { THEMES, type ThemeKey } from "@/lib/deck";
import { PW, PH, eid, palette, resolve, SWATCHES, readImage, exportPptx, type PosterDoc, type PosterEl } from "@/lib/poster-layout";
import Icon, { type IconName } from "@/components/Icon";
import { track } from "@/lib/track";

// A small Canva-style editor for A0 posters: drag to move, handles to resize, double-click to type,
// add text, images, shapes and a QR code, with undo, snapping guides, layers and autosave.

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type Drag = { kind: "move" | Handle; id: string; startX: number; startY: number; orig: PosterEl; moved: boolean };
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const SNAP = 6; // units

export default function PosterEditor({ initial, storageKey, title, link, onRestart }: {
  initial: PosterDoc; storageKey: string; title: string; link: string | null; onRestart: () => void;
}) {
  const [doc, setDoc] = useState<PosterDoc>(initial);
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [scale, setScale] = useState(0.6);
  const [grid, setGrid] = useState(false);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [busy, setBusy] = useState<"" | "pptx" | "png">("");
  const [msg, setMsg] = useState("");
  const past = useRef<PosterDoc[]>([]);
  const future = useRef<PosterDoc[]>([]);
  const drag = useRef<Drag | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | null>(null);
  const pal = useMemo(() => palette(doc.theme), [doc.theme]);
  const selected = doc.els.find((e) => e.id === sel) || null;

  // ---- restore + autosave ----
  useEffect(() => {
    try { const raw = localStorage.getItem(storageKey); if (raw) { const d = JSON.parse(raw) as PosterDoc; if (d?.els?.length) setDoc(d); } } catch {}
  }, [storageKey]);
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify(doc)); } catch { setMsg("Too many large images to autosave in this browser. Download the poster to keep your work."); } }, 500);
    return () => clearTimeout(t);
  }, [doc, storageKey]);

  // ---- fit the page to the available width ----
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const fit = () => { const cs = getComputedStyle(el); setScale(Math.min(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), 820) / PW); };
    const ro = new ResizeObserver(fit); fit();
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // ---- first draft: shrink any text that doesn't fit its box (long sections from the paper) ----
  const fitted = useRef(false);
  useLayoutEffect(() => {
    if (fitted.current || !pageRef.current || scale < 0.05) return;
    fitted.current = true;
    if (doc !== initial) return; // a restored or edited poster keeps its sizes
    const patch = new Map<string, number>();
    for (const e of doc.els) {
      if (e.type !== "text" || !e.size) continue;
      const node = pageRef.current.querySelector<HTMLElement>(`[data-id="${e.id}"] .pe-text`);
      if (!node) continue;
      const need = node.scrollHeight / scale, have = e.h;
      if (need > have + 1) patch.set(e.id, Math.max(8.5, Math.floor(e.size * Math.sqrt(have / need) * 0.97 * 2) / 2));
    }
    if (patch.size) { const n = { ...doc, els: doc.els.map((e) => (patch.has(e.id) ? { ...e, size: patch.get(e.id) } : e)) }; docRef.current = n; setDoc(n); }
  });

  // ---- history ----
  const docRef = useRef(doc);
  docRef.current = doc;
  const commit = useCallback((next: PosterDoc | ((d: PosterDoc) => PosterDoc)) => {
    const cur = docRef.current;
    const n = typeof next === "function" ? next(cur) : next;
    past.current.push(cur); if (past.current.length > 80) past.current.shift();
    future.current = [];
    docRef.current = n; setDoc(n);
  }, []);
  const undo = useCallback(() => { const p = past.current.pop(); if (!p) return; future.current.push(docRef.current); docRef.current = p; setDoc(p); }, []);
  const redo = useCallback(() => { const f = future.current.pop(); if (!f) return; past.current.push(docRef.current); docRef.current = f; setDoc(f); }, []);
  const update = (id: string, patch: Partial<PosterEl>) => commit((d) => ({ ...d, els: d.els.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const remove = (id: string) => { commit((d) => ({ ...d, els: d.els.filter((e) => e.id !== id) })); setSel(null); };
  const addEl = (e: Omit<PosterEl, "id">) => { const id = eid(); commit((d) => ({ ...d, els: [...d.els, { id, ...e }] })); setSel(id); return id; };
  const duplicate = (id: string) => { const e = doc.els.find((x) => x.id === id); if (e) addEl({ ...e, x: Math.min(PW - e.w, e.x + 20), y: Math.min(PH - e.h, e.y + 20), locked: false }); };
  const reorder = (id: string, dir: "front" | "back") => commit((d) => {
    const e = d.els.find((x) => x.id === id)!; const rest = d.els.filter((x) => x.id !== id);
    return { ...d, els: dir === "front" ? [...rest, e] : [e, ...rest] };
  });

  // ---- adding things ----
  const centre = (w: number, h: number) => ({ x: Math.round((PW - w) / 2), y: Math.round((PH - h) / 2) });
  const addText = (heading = false) => { const id = addEl(heading ? { type: "text", ...centre(440, 34), w: 440, h: 34, text: "New heading", size: 21, bold: true, color: "@heading" } : { type: "text", ...centre(440, 80), w: 440, h: 80, text: "Write something here", size: 13.5, color: "@ink" }); setEditing(id); };
  const addShape = (shape: "rect" | "ellipse") => addEl({ type: "shape", shape, ...centre(240, shape === "ellipse" ? 240 : 140), w: 240, h: shape === "ellipse" ? 240 : 140, fill: "@soft", radius: shape === "rect" ? 12 : 0 });
  const addQr = () => link && addEl({ type: "qr", ...centre(125, 125), w: 125, h: 125, text: link });
  const insertImage = async (file: File, at?: { x: number; y: number }) => {
    if (!file.type.startsWith("image/")) { setMsg("That file isn't a picture. Use a JPG or PNG."); return; }
    if (file.size > 25 * 1024 * 1024) { setMsg("That picture is over 25 MB. Use a smaller one."); return; }
    try {
      const { src, ratio } = await readImage(file);
      const target = replaceId.current && doc.els.find((e) => e.id === replaceId.current);
      if (target) { update(target.id, { src, caption: undefined }); setSel(target.id); }
      else {
        const w = ratio >= 1 ? 440 : Math.round(300 * ratio), h = Math.round(w / ratio);
        const pos = at ? { x: Math.max(0, Math.min(PW - w, at.x - w / 2)), y: Math.max(0, Math.min(PH - h, at.y - h / 2)) } : centre(w, h);
        addEl({ type: "image", ...pos, w, h, src, fit: "cover", radius: 8 });
      }
    } catch { setMsg("Couldn't open that picture. Try saving it as JPG or PNG."); }
    finally { replaceId.current = null; }
  };
  const pickImage = (replace?: string) => { replaceId.current = replace || null; fileRef.current?.click(); };

  // ---- pointer: move and resize with snapping ----
  const toUnits = (clientX: number, clientY: number) => {
    const r = pageRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
  };
  const startDrag = (ev: React.PointerEvent, id: string, kind: Drag["kind"]) => {
    const e = doc.els.find((x) => x.id === id); if (!e || editing === id) return;
    ev.stopPropagation(); setSel(id);
    if (e.locked && kind === "move") return;
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    drag.current = { kind, id, startX: ev.clientX, startY: ev.clientY, orig: { ...e }, moved: false };
    past.current.push(docRef.current); future.current = []; // one undo step per drag
  };
  const onMove = (ev: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = (ev.clientX - d.startX) / scale, dy = (ev.clientY - d.startY) / scale;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 1.5) return;
    d.moved = true;
    const o = d.orig; let { x, y, w, h } = o;
    const others = doc.els.filter((e) => e.id !== d.id);
    const xs = [0, PW / 2, PW, 45, PW - 45, ...others.flatMap((e) => [e.x, e.x + e.w / 2, e.x + e.w])];
    const ys = [0, PH / 2, PH, ...others.flatMap((e) => [e.y, e.y + e.h / 2, e.y + e.h])];
    const near = (v: number, list: number[]) => list.reduce<{ v: number; d: number } | null>((best, l) => (Math.abs(l - v) < SNAP && (!best || Math.abs(l - v) < best.d) ? { v: l, d: Math.abs(l - v) } : best), null);
    const gx: number[] = [], gy: number[] = [];
    if (d.kind === "move") {
      x = o.x + dx; y = o.y + dy;
      if (!ev.altKey) {
        const cx = [x, x + w / 2, x + w].map((v, k) => ({ k, s: near(v, xs) })).filter((c) => c.s).sort((a, b) => a.s!.d - b.s!.d)[0];
        if (cx) { x += cx.s!.v - [x, x + w / 2, x + w][cx.k]; gx.push(cx.s!.v); }
        const cy = [y, y + h / 2, y + h].map((v, k) => ({ k, s: near(v, ys) })).filter((c) => c.s).sort((a, b) => a.s!.d - b.s!.d)[0];
        if (cy) { y += cy.s!.v - [y, y + h / 2, y + h][cy.k]; gy.push(cy.s!.v); }
      }
    } else {
      const k = d.kind; const keep = (o.type === "image" || o.type === "qr" || (o.type === "shape" && o.shape === "ellipse")) && k.length === 2 && !ev.shiftKey;
      if (k.includes("e")) w = o.w + dx;
      if (k.includes("s")) h = o.h + dy;
      if (k.includes("w")) { w = o.w - dx; x = o.x + dx; }
      if (k.includes("n")) { h = o.h - dy; y = o.y + dy; }
      if (keep || o.type === "qr") { const r = o.w / o.h; if (Math.abs(dx) > Math.abs(dy)) { const nh = w / r; if (k.includes("n")) y += h - nh; h = nh; } else { const nw = h * r; if (k.includes("w")) x += w - nw; w = nw; } }
      if (!ev.altKey) {
        if (k.includes("e")) { const s = near(x + w, xs); if (s) { w = s.v - x; gx.push(s.v); } }
        if (k.includes("w")) { const s = near(x, xs); if (s) { w += x - s.v; x = s.v; gx.push(s.v); } }
        if (k.includes("s")) { const s = near(y + h, ys); if (s) { h = s.v - y; gy.push(s.v); } }
        if (k.includes("n")) { const s = near(y, ys); if (s) { h += y - s.v; y = s.v; gy.push(s.v); } }
      }
      if (w < 16) { if (k.includes("w")) x -= 16 - w; w = 16; }
      if (h < 12) { if (k.includes("n")) y -= 12 - h; h = 12; }
    }
    const r = (v: number) => Math.round(v * 10) / 10;
    setGuides({ x: gx, y: gy });
    setDoc((cur) => ({ ...cur, els: cur.els.map((e) => (e.id === d.id ? { ...e, x: r(x), y: r(y), w: r(w), h: r(h) } : e)) }));
  };
  const endDrag = () => {
    const d = drag.current; drag.current = null; setGuides({ x: [], y: [] });
    if (d && !d.moved) past.current.pop(); // a plain click isn't an undo step
  };

  // ---- keyboard: delete, nudge, undo/redo, duplicate ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = editing || (e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='plaintext-only']");
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === "y" && !typing) { e.preventDefault(); redo(); return; }
      if (typing || !sel) return;
      const el = doc.els.find((x) => x.id === sel); if (!el) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(sel); }
      else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(sel); }
      else if (e.key === "Escape") setSel(null);
      else if (e.key === "Enter" && el.type === "text") { e.preventDefault(); setEditing(sel); }
      else if (e.key.startsWith("Arrow") && !el.locked) {
        e.preventDefault(); const st = e.shiftKey ? 10 : 1;
        update(sel, { x: el.x + (e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0), y: el.y + (e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0) });
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  // ---- paste or drop pictures straight onto the poster ----
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editing) return;
      const f = Array.from(e.clipboardData?.files || []).find((x) => x.type.startsWith("image/"));
      if (f) { e.preventDefault(); insertImage(f); }
    };
    window.addEventListener("paste", onPaste); return () => window.removeEventListener("paste", onPaste);
  });

  // ---- text editing ----
  const finishEdit = (id: string, node: HTMLElement) => {
    const text = node.innerText.replace(/\n{3,}/g, "\n\n").trimEnd();
    const el = doc.els.find((e) => e.id === id); setEditing(null);
    if (!el) return;
    const grow = Math.ceil(node.scrollHeight / scale);
    const patch: Partial<PosterEl> = {};
    if (text !== el.text) { patch.text = text; patch.placeholder = false; patch.italic = el.placeholder ? false : el.italic; }
    if (grow > el.h + 1) patch.h = grow;
    if (Object.keys(patch).length) update(id, patch);
  };

  // ---- downloads ----
  const visibleTitle = doc.els.find((e) => e.type === "text" && e.size && e.size >= 26)?.text || title;
  const placeholders = doc.els.filter((e) => e.placeholder || (e.type === "image" && !e.src)).length;
  const downloadPng = async () => {
    track("poster-png");
    setBusy("png"); setSel(null); setEditing(null);
    try {
      await new Promise((r) => setTimeout(r, 60));
      const { toPng } = await import("html-to-image");
      const node = pageRef.current!;
      const data = await toPng(node, { pixelRatio: 3000 / node.clientWidth, cacheBust: true, filter: (n) => !(n instanceof HTMLElement && (n.classList.contains("pe-ui") || n.classList.contains("pe-empty"))) });
      const a = document.createElement("a"); a.href = data; a.download = `Poster - ${visibleTitle.replace(/[^\w\s-]/g, "").slice(0, 50).trim() || "papr"}.png`; a.click();
    } catch { setMsg("Couldn't make the picture. Try the PowerPoint download instead."); }
    finally { setBusy(""); }
  };
  const downloadPptx = async () => { track("poster-pptx"); setBusy("pptx"); try { await exportPptx(doc, visibleTitle); } finally { setBusy(""); } };

  const u = (v: number) => v * scale;
  const tool = (icon: IconName, label: string, onClick: () => void, opts: { on?: boolean; disabled?: boolean } = {}) => (
    <button type="button" className={`pe-tool${opts.on ? " on" : ""}`} onClick={onClick} disabled={opts.disabled} title={label} aria-label={label} aria-pressed={opts.on}><Icon name={icon} size={17} /><span>{label}</span></button>
  );
  const colorRow = (label: string, value: string | undefined, onPick: (c: string | undefined) => void, allowNone = false) => (
    <div className="pe-prop"><span className="small muted">{label}</span><div className="pe-colors">
      {allowNone && <button type="button" className={`pe-sw none${!value ? " on" : ""}`} onClick={() => onPick(undefined)} title="None" aria-label="No colour" />}
      {SWATCHES.map((s) => <button key={s.token} type="button" className={`pe-sw${value === s.token ? " on" : ""}`} style={{ background: pal[s.token] }} onClick={() => onPick(s.token)} title={s.name} aria-label={s.name} />)}
      <label className="pe-sw custom" title="Pick any colour"><input type="color" value={value && !value.startsWith("@") ? value : "#3366cc"} onChange={(e) => onPick(e.target.value)} aria-label="Custom colour" /></label>
    </div></div>
  );

  return (
    <div className="pe">
      {/* Toolbar */}
      <div className="pe-bar" role="toolbar" aria-label="Poster tools">
        <div className="pe-group">
          {tool("heading", "Heading", () => addText(true))}
          {tool("text", "Text", () => addText(false))}
          {tool("addImage", "Image", () => pickImage())}
          {tool("rect", "Box", () => addShape("rect"))}
          {tool("ellipse", "Circle", () => addShape("ellipse"))}
          {link && tool("qr", "QR code", addQr)}
        </div>
        <div className="pe-group">
          {tool("undo", "Undo", undo, { disabled: !past.current.length })}
          {tool("redo", "Redo", redo, { disabled: !future.current.length })}
          {tool("grid", "Grid", () => setGrid(!grid), { on: grid })}
        </div>
        <div className="pe-group pe-themes" aria-label="Theme">
          {(Object.keys(THEMES) as ThemeKey[]).map((k) => <button key={k} type="button" className={`swatch${doc.theme === k ? " on" : ""}`} style={{ background: THEMES[k].bg }} onClick={() => commit((d) => ({ ...d, theme: k }))} aria-label={`${THEMES[k].name} theme`} title={THEMES[k].name}><i style={{ background: THEMES[k].accent }} /></button>)}
        </div>
        <div className="pe-group pe-dl">
          <button type="button" className="btn sm" onClick={downloadPng} disabled={!!busy}><Icon name="image" size={15} /> {busy === "png" ? "Making…" : "PNG"}</button>
          <button type="button" className="btn primary sm" onClick={downloadPptx} disabled={!!busy}><Icon name="download" size={15} /> {busy === "pptx" ? "Building…" : "A0 PowerPoint"}</button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ""; }} />
      {msg && <div className="notice bad small row between"><span>{msg}</span><button type="button" className="btn ghost sm" onClick={() => setMsg("")}>Dismiss</button></div>}

      <div className="pe-main">
        {/* Canvas */}
        <div className="pe-stage" ref={stageRef} onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}
          onPointerDown={(e) => { if (e.target === e.currentTarget) { setSel(null); setEditing(null); } }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/")); if (f) insertImage(f, toUnits(e.clientX, e.clientY)); }}>
          <div className="pe-page" ref={pageRef} style={{ width: u(PW), height: u(PH), background: pal["@page"], ["--u" as string]: `${scale}px` }}
            onPointerDown={(e) => { if (e.target === e.currentTarget) { setSel(null); setEditing(null); } }}>
            {grid && <div className="pe-grid pe-ui" style={{ backgroundSize: `${u(50)}px ${u(50)}px` }} />}
            {doc.els.map((e) => {
              const box: React.CSSProperties = { left: u(e.x), top: u(e.y), width: u(e.w), height: u(e.h) };
              const isSel = sel === e.id, isEdit = editing === e.id;
              const common = { "data-id": e.id, className: `pe-el t-${e.type}${isSel ? " sel" : ""}${e.locked ? " locked" : ""}`, style: box,
                onPointerDown: (ev: React.PointerEvent) => startDrag(ev, e.id, "move") };
              if (e.type === "shape") return <div key={e.id} {...common}><div className="pe-fill" style={{ background: resolve(e.fill, pal), borderRadius: e.shape === "ellipse" ? "50%" : u(e.radius || 0) }} /></div>;
              if (e.type === "qr") return <div key={e.id} {...common}><QrImg text={e.text || ""} /></div>;
              if (e.type === "image") return (
                <div key={e.id} {...common} onDoubleClick={() => pickImage(e.id)}>
                  {e.src ? <img src={e.src} alt="" draggable={false} style={{ objectFit: e.fit || "cover", borderRadius: u(e.radius || 0) }} />
                    : <div className="pe-empty" style={{ borderRadius: u(e.radius || 0) }}><Icon name="addImage" size={Math.max(16, u(36))} /><span style={{ fontSize: u(13) }}>{e.caption || "Add an image"}</span><span style={{ fontSize: u(10.5) }} className="muted">Double-click, drop or paste a picture</span></div>}
                </div>
              );
              const style: React.CSSProperties = { fontSize: u(e.size || 14), fontWeight: e.bold ? 800 : 400, fontStyle: e.italic ? "italic" : "normal", textAlign: e.align || "left",
                color: resolve(e.color, pal), background: e.fill ? resolve(e.fill, pal) : undefined, padding: e.fill ? u(10) : 0, borderRadius: e.fill ? u(8) : 0,
                textTransform: e.caps ? "uppercase" : undefined, letterSpacing: e.caps ? ".12em" : undefined, opacity: e.placeholder && !isEdit ? 0.55 : 1 };
              return (
                <div key={e.id} {...common} onDoubleClick={() => setEditing(e.id)}>
                  {isEdit ? (
                    <div className="pe-text editing" style={style} contentEditable suppressContentEditableWarning autoFocus spellCheck
                      ref={(n) => { if (n && document.activeElement !== n) { n.focus(); const r = document.createRange(); r.selectNodeContents(n); if (e.placeholder) { const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); } else { r.collapse(false); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); } } }}
                      onBlur={(ev) => finishEdit(e.id, ev.currentTarget)}
                      onKeyDown={(ev) => { if (ev.key === "Escape") (ev.currentTarget as HTMLElement).blur(); }}
                      onPaste={(ev) => { ev.preventDefault(); document.execCommand("insertText", false, ev.clipboardData.getData("text/plain")); }}>{e.text}</div>
                  ) : e.bullets ? (
                    <div className="pe-text" style={style}>{(e.text || "").split("\n").filter((l) => l.trim()).map((l, k) => <p key={k} className="pe-bullet"><span style={{ background: resolve(e.color === "@text" ? "@accent" : "@heading", pal) }} />{l}</p>)}</div>
                  ) : <div className="pe-text" style={style}>{e.text}</div>}
                </div>
              );
            })}
            {/* selection box + handles */}
            {selected && !editing && (
              <div className="pe-ui pe-selbox" style={{ left: u(selected.x), top: u(selected.y), width: u(selected.w), height: u(selected.h) }}>
                {!selected.locked && HANDLES.map((h) => <span key={h} className={`pe-h h-${h}`} onPointerDown={(ev) => startDrag(ev, selected.id, h)} />)}
                <span className="pe-size">{Math.round(selected.w * 0.841)} × {Math.round(selected.h * 0.841)} mm</span>
              </div>
            )}
            {guides.x.map((x, k) => <div key={"gx" + k} className="pe-ui pe-guide v" style={{ left: u(x) }} />)}
            {guides.y.map((y, k) => <div key={"gy" + k} className="pe-ui pe-guide h" style={{ top: u(y) }} />)}
          </div>
        </div>

        {/* Properties */}
        <aside className="pe-side" aria-label="Selected item">
          {!selected ? (
            <div className="stack" style={{ gap: 10 }}>
              <b className="small">Tips</b>
              <ul className="pe-tips small muted">
                <li><b>Drag</b> anything to move it. Pink lines show when it lines up.</li>
                <li><b>Double-click</b> text to type, or a picture frame to add an image.</li>
                <li><b>Drop or paste</b> a picture (Ctrl+V) to add it.</li>
                <li><b>Delete</b> removes, <b>Ctrl+D</b> duplicates, <b>arrows</b> nudge, <b>Ctrl+Z</b> undoes.</li>
                <li>Hold <b>Alt</b> while dragging to turn snapping off.</li>
              </ul>
              {placeholders > 0 && <div className="notice info small">{placeholders} placeholder{placeholders === 1 ? "" : "s"} still to fill. Empty frames and grey hints are left out of the download.</div>}
              <button type="button" className="btn ghost sm" onClick={() => { if (confirm("Start the layout again from your paper? Your edits will be lost.")) { commit(initial); setSel(null); } }}><Icon name="reset" size={14} /> Reset layout</button>
              <button type="button" className="btn ghost sm" onClick={onRestart}>Use another paper</button>
            </div>
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              <div className="row between"><b className="small" style={{ textTransform: "capitalize" }}>{selected.type === "qr" ? "QR code" : selected.type === "shape" ? (selected.shape === "ellipse" ? "Circle" : "Box") : selected.type}</b>
                <button type="button" className="btn ghost sm" onClick={() => setSel(null)}>Done</button></div>

              {selected.type === "text" && <>
                <div className="pe-prop"><span className="small muted">Size</span>
                  <div className="row" style={{ gap: 6 }}>
                    <button type="button" className="pe-mini" onClick={() => update(selected.id, { size: Math.max(6, Math.round(((selected.size || 14) - 1) * 2) / 2) })} aria-label="Smaller"><Icon name="minus" size={14} /></button>
                    <b className="num" style={{ minWidth: 44, textAlign: "center" }}>{Math.round((selected.size || 14) * 2.38)} pt</b>
                    <button type="button" className="pe-mini" onClick={() => update(selected.id, { size: Math.round(((selected.size || 14) + 1) * 2) / 2 })} aria-label="Bigger"><Icon name="plus" size={14} /></button>
                  </div></div>
                <div className="pe-prop"><span className="small muted">Style</span><div className="row" style={{ gap: 4 }}>
                  <button type="button" className={`pe-mini${selected.bold ? " on" : ""}`} onClick={() => update(selected.id, { bold: !selected.bold })} aria-label="Bold" aria-pressed={!!selected.bold}><Icon name="bold" size={14} /></button>
                  <button type="button" className={`pe-mini${selected.italic ? " on" : ""}`} onClick={() => update(selected.id, { italic: !selected.italic })} aria-label="Italic" aria-pressed={!!selected.italic}><Icon name="italic" size={14} /></button>
                  <button type="button" className={`pe-mini${selected.bullets ? " on" : ""}`} onClick={() => update(selected.id, { bullets: !selected.bullets })} aria-label="Bullet points" aria-pressed={!!selected.bullets}><Icon name="list" size={14} /></button>
                  <span style={{ width: 8 }} />
                  {(["left", "center", "right"] as const).map((a) => <button key={a} type="button" className={`pe-mini${(selected.align || "left") === a ? " on" : ""}`} onClick={() => update(selected.id, { align: a })} aria-label={`Align ${a}`}><Icon name={a === "left" ? "alignLeft" : a === "center" ? "alignCenter" : "alignRight"} size={14} /></button>)}
                </div></div>
                {colorRow("Text colour", selected.color, (c) => update(selected.id, { color: c || "@ink" }))}
                {colorRow("Background", selected.fill, (c) => update(selected.id, { fill: c }), true)}
                <button type="button" className="btn sm" onClick={() => setEditing(selected.id)}><Icon name="pencil" size={14} /> Edit text</button>
              </>}

              {selected.type === "image" && <>
                <button type="button" className="btn sm" onClick={() => pickImage(selected.id)}><Icon name="addImage" size={15} /> {selected.src ? "Replace image" : "Add image"}</button>
                {selected.src && <div className="pe-prop"><span className="small muted">Fit</span><div className="seg sm">
                  <button type="button" aria-selected={(selected.fit || "cover") === "cover"} onClick={() => update(selected.id, { fit: "cover" })}>Fill frame</button>
                  <button type="button" aria-selected={selected.fit === "contain"} onClick={() => update(selected.id, { fit: "contain" })}>Show all</button></div></div>}
                <div className="pe-prop"><span className="small muted">Corners</span><input type="range" min={0} max={60} value={selected.radius || 0} onChange={(e) => setDoc((d) => ({ ...d, els: d.els.map((x) => x.id === selected.id ? { ...x, radius: Number(e.target.value) } : x) }))} onPointerDown={() => { past.current.push(doc); future.current = []; }} /></div>
              </>}

              {selected.type === "shape" && <>
                {colorRow("Fill", selected.fill, (c) => update(selected.id, { fill: c || "@soft" }))}
                {selected.shape !== "ellipse" && <div className="pe-prop"><span className="small muted">Corners</span><input type="range" min={0} max={80} value={selected.radius || 0} onChange={(e) => setDoc((d) => ({ ...d, els: d.els.map((x) => x.id === selected.id ? { ...x, radius: Number(e.target.value) } : x) }))} onPointerDown={() => { past.current.push(doc); future.current = []; }} /></div>}
              </>}

              <div className="pe-prop"><span className="small muted">Arrange</span><div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                <button type="button" className="pe-mini" onClick={() => reorder(selected.id, "front")} title="Bring to front" aria-label="Bring to front"><Icon name="front" size={14} /></button>
                <button type="button" className="pe-mini" onClick={() => reorder(selected.id, "back")} title="Send to back" aria-label="Send to back"><Icon name="back" size={14} /></button>
                <button type="button" className="pe-mini" onClick={() => duplicate(selected.id)} title="Duplicate (Ctrl+D)" aria-label="Duplicate"><Icon name="copy" size={14} /></button>
                <button type="button" className={`pe-mini${selected.locked ? " on" : ""}`} onClick={() => update(selected.id, { locked: !selected.locked })} title={selected.locked ? "Unlock" : "Lock in place"} aria-label={selected.locked ? "Unlock" : "Lock"}><Icon name={selected.locked ? "lock" : "unlock"} size={14} /></button>
                <button type="button" className="pe-mini danger" onClick={() => remove(selected.id)} title="Delete" aria-label="Delete"><Icon name="trash" size={14} /></button>
              </div></div>
              <p className="small muted num">Position {Math.round(selected.x * 0.841)}, {Math.round(selected.y * 0.841)} mm from the top left</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function QrImg({ text }: { text: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { let on = true; import("qrcode").then((Q) => Q.default.toDataURL(text, { margin: 1, width: 600 })).then((d) => on && setSrc(d)).catch(() => 0); return () => { on = false; }; }, [text]);
  return src ? <img src={src} alt="QR code to the full paper" draggable={false} style={{ objectFit: "contain" }} /> : null;
}
