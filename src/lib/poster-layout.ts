// The poster editor's document model. A poster is a list of elements on an A0 page
// measured in "units": the page is 1000 units wide and 1414 tall (A0 is 841 × 1189 mm).
import { THEMES, type ThemeKey } from "./deck";
import type { PosterContent } from "./poster-content";

export const PW = 1000, PH = 1414;

export type ElType = "text" | "image" | "shape" | "qr";
export type PosterEl = {
  id: string; type: ElType; x: number; y: number; w: number; h: number;
  // text
  text?: string; size?: number; bold?: boolean; italic?: boolean; align?: "left" | "center" | "right"; color?: string;
  bullets?: boolean; caps?: boolean; placeholder?: boolean;
  // shapes, text backgrounds, images
  fill?: string; radius?: number; shape?: "rect" | "ellipse";
  src?: string | null; fit?: "cover" | "contain"; caption?: string;
  locked?: boolean;
};
export type PosterDoc = { theme: ThemeKey; els: PosterEl[] };

let n = 0;
export const eid = () => `e${Date.now().toString(36)}${(n++).toString(36)}`;

/** Theme colours are stored as tokens (e.g. "@accent") so changing the theme recolours the whole poster. */
export function palette(theme: ThemeKey) {
  const t = THEMES[theme];
  const light = theme === "paper" || theme === "sunrise";
  return {
    "@bg": t.bg, "@text": t.text, "@muted": t.muted, "@accent": t.accent, "@panel": t.panel,
    "@page": light ? t.bg : "#FFFFFF", "@ink": light ? t.text : "#111316",
    "@heading": light ? (theme === "paper" ? t.text : t.accent) : t.bg,
    "@soft": light ? t.panel : "#F2F3F5", "@subtle": "#6B7178", "@rule": "#D0D4D9",
  } as Record<string, string>;
}
export const resolve = (c: string | undefined, pal: Record<string, string>) => (!c ? "transparent" : c.startsWith("@") ? pal[c] || "#000" : c);
export const SWATCHES: { token: string; name: string }[] = [
  { token: "@bg", name: "Theme" }, { token: "@accent", name: "Accent" }, { token: "@text", name: "On theme" },
  { token: "@ink", name: "Body text" }, { token: "@muted", name: "Muted" }, { token: "@soft", name: "Soft panel" }, { token: "@page", name: "Page" },
];

const titleSize = (t: string) => (t.length > 110 ? 26 : t.length > 80 ? 30 : t.length > 55 ? 34 : 40);

/** Lays out a first draft of the poster from the paper. Missing sections get placeholders to fill in. */
export function layoutFromContent(p: PosterContent): PosterEl[] {
  const els: PosterEl[] = [];
  const add = (e: Omit<PosterEl, "id">) => { els.push({ id: eid(), ...e }); };
  const body = (items: string[], hint: string, x: number, y: number, w: number, h: number) =>
    add(items.length ? { type: "text", x, y, w, h, text: items.join("\n"), size: 13.5, color: "@ink", bullets: true }
      : { type: "text", x, y, w, h, text: hint, size: 13.5, color: "@ink", italic: true, placeholder: true });
  const head = (text: string, x: number, y: number) => add({ type: "text", x, y, w: 440, h: 32, text, size: 21, bold: true, color: "@heading" });

  // Title band
  add({ type: "shape", x: 0, y: 0, w: PW, h: 222, fill: "@bg" });
  add({ type: "shape", x: 45, y: 40, w: 66, h: 8, fill: "@accent", radius: 4 });
  add({ type: "text", x: 45, y: 62, w: 910, h: 112, text: p.title, size: titleSize(p.title), bold: true, color: "@text" });
  add({ type: "text", x: 45, y: 180, w: 910, h: 26, text: [p.authors, p.supervisor && `Supervisor: ${p.supervisor}`, p.institution, p.year].filter(Boolean).join("  ·  ") || "Your name · Supervisor · University · Year", size: 14, color: "@muted", placeholder: !p.authors });

  // Left column
  const L = 45, R = 515, CW = 440;
  head("Background", L, 252); body(p.background, "Click twice to explain the problem and why it matters.", L, 290, CW, 150);
  head("Objectives", L, 458); body(p.objectives, "Click twice to list your objectives.", L, 496, CW, 128);
  head("Methodology", L, 642); body(p.method, "Click twice to describe your data and methods.", L, 680, CW, 130);
  add({ type: "image", x: L, y: 828, w: CW, h: 286, src: null, fit: "cover", radius: 10, caption: "Add a study area map, photo or chart" });

  // Right column
  add({ type: "shape", x: R, y: 252, w: CW, h: 232, fill: "@bg", radius: 16 });
  add({ type: "text", x: R + 26, y: 274, w: CW - 52, h: 22, text: "Key finding", size: 11.5, bold: true, caps: true, color: "@accent" });
  add(p.headline ? { type: "text", x: R + 26, y: 302, w: CW - 52, h: 162, text: p.headline, size: 23, bold: true, color: "@text" }
    : { type: "text", x: R + 26, y: 302, w: CW - 52, h: 162, text: "Your main finding in one sentence.", size: 23, bold: true, color: "@text", placeholder: true });
  head("Results", R, 508); body(p.findings, "Click twice to add your main results, with numbers.", R, 546, CW, 206);
  head("Conclusion", R, 770); body(p.conclusion, "Click twice to sum up what your results mean.", R, 808, CW, 104);
  head("Recommendations", R, 930); body(p.recommendations, "Click twice to add practical recommendations.", R, 968, CW, 146);

  // Footer
  add({ type: "shape", x: 45, y: 1146, w: 910, h: 2, fill: "@rule" });
  add({ type: "text", x: 45, y: 1166, w: 560, h: 24, text: "References", size: 13, bold: true, color: "@ink" });
  body(p.references, "Click twice to add 3–4 key references (APA 7).", 45, 1194, 600, 170);
  const last = els[els.length - 1]; last.size = 9.5; last.bullets = false; last.color = last.placeholder ? "@ink" : "@subtle";
  if (p.link) {
    add({ type: "qr", x: 830, y: 1168, w: 125, h: 125, text: p.link });
    add({ type: "text", x: 620, y: 1205, w: 196, h: 50, text: "Scan to read the full paper", size: 11.5, bold: true, color: "@ink", align: "right" });
  }
  add({ type: "text", x: 620, y: 1366, w: 335, h: 20, text: "Made with papr", size: 9, color: "@subtle", align: "right" });
  return els;
}

/** Downscales an uploaded picture so posters stay light (max 2000 px on the long side). */
export async function readImage(file: File): Promise<{ src: string; ratio: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const png = file.type === "image/png" && c.width * c.height < 1_500_000;
    return { src: c.toDataURL(png ? "image/png" : "image/jpeg", 0.88), ratio: img.naturalWidth / img.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

/** Builds the editable A0 PowerPoint from the poster elements. Placeholders and empty frames are left out. */
export async function exportPptx(doc: PosterDoc, title: string) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pres = new PptxGenJS();
  const IN = 33.11 / PW; // inches per unit
  const PT = 33.11 * 72 / PW; // points per unit
  pres.defineLayout({ name: "A0", width: 33.11, height: 46.81 });
  pres.layout = "A0"; pres.title = title; pres.company = "papr";
  const pal = palette(doc.theme);
  const hex = (c?: string) => resolve(c, pal).replace("#", "").slice(0, 6);
  const sl = pres.addSlide();
  sl.background = { color: hex("@page") };
  const QR = doc.els.some((e) => e.type === "qr") ? (await import("qrcode")).default : null;
  for (const e of doc.els) {
    const box = { x: e.x * IN, y: e.y * IN, w: e.w * IN, h: e.h * IN };
    if (e.type === "shape") {
      const kind = e.shape === "ellipse" ? "ellipse" : e.radius ? "roundRect" : "rect";
      sl.addShape(kind, { ...box, fill: { color: hex(e.fill) }, line: { color: hex(e.fill), width: 0 }, ...(kind === "roundRect" ? { rectRadius: Math.min(e.radius! * IN, 2) } : {}) });
    } else if (e.type === "image" && e.src) {
      sl.addImage({ data: e.src, ...box, sizing: { type: e.fit === "contain" ? "contain" : "cover", w: box.w, h: box.h } });
    } else if (e.type === "qr" && QR && e.text) {
      sl.addImage({ data: await QR.toDataURL(e.text, { margin: 1, width: 800 }), ...box });
    } else if (e.type === "text" && e.text && !e.placeholder) {
      const opts = { ...box, margin: 0, fontFace: "Arial", fontSize: (e.size || 14) * PT, bold: !!e.bold, italic: !!e.italic, color: hex(e.color),
        align: e.align || "left", valign: "top" as const, fit: "shrink" as const, ...(e.fill ? { fill: { color: hex(e.fill) } } : {}), ...(e.caps ? { charSpacing: 4 } : {}) };
      const text = e.caps ? e.text.toUpperCase() : e.text;
      if (e.bullets) sl.addText(text.split("\n").filter((l) => l.trim()).map((l) => ({ text: l, options: { bullet: { code: "25CF" }, breakLine: true, paraSpaceAfter: 10 } })), opts);
      else sl.addText(text, opts);
    }
  }
  await pres.writeFile({ fileName: `Poster - ${title.replace(/[^\w\s-]/g, "").slice(0, 50).trim() || "papr"}.pptx` });
}
