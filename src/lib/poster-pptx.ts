// Builds an editable A0 portrait poster (.pptx) for project fairs. Every block is a normal PowerPoint text box.
import { THEMES, type ThemeKey } from "./deck";
import type { PosterContent } from "./poster-content";

const W = 33.11, H = 46.81; // A0 in inches
const hex = (c: string) => c.replace("#", "");

export async function downloadPoster(p: PosterContent, theme: ThemeKey) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pres = new PptxGenJS();
  pres.defineLayout({ name: "A0", width: W, height: H });
  pres.layout = "A0";
  pres.title = p.title;
  pres.company = "papr";
  const t = THEMES[theme];
  const light = theme === "paper" || theme === "sunrise";
  const bodyBg = light ? t.bg : "FFFFFF";
  const ink = light ? hex(t.text) : "111316";
  const sl = pres.addSlide();
  sl.background = { color: hex(bodyBg) };
  const F = { fontFace: "Arial", margin: 0.1, fit: "shrink" as const };

  // Title band
  sl.addShape("rect", { x: 0, y: 0, w: W, h: 7.2, fill: { color: hex(t.bg) }, line: { color: hex(t.bg) } });
  sl.addShape("rect", { x: 1.5, y: 1.4, w: 2.2, h: 0.25, fill: { color: hex(t.accent) }, line: { color: hex(t.accent) } });
  sl.addText(p.title, { ...F, x: 1.5, y: 1.8, w: W - 3, h: 3.2, fontSize: 88, bold: true, color: hex(t.text), valign: "top" });
  sl.addText([p.authors, p.supervisor ? `Supervisor: ${p.supervisor}` : "", p.institution, p.year].filter(Boolean).join("   ·   "),
    { ...F, x: 1.5, y: 5.3, w: W - 3, h: 1.2, fontSize: 36, color: hex(t.muted) });

  const col = (W - 4.5) / 2;
  const block = (x: number, y: number, h: number, head: string, items: string[]) => {
    if (!items.length) return;
    sl.addText(head, { ...F, x, y, w: col, h: 1.1, fontSize: 48, bold: true, color: light ? hex(theme === "paper" ? t.text : t.accent) : hex(t.bg) });
    sl.addText(items.map((b) => ({ text: b, options: { bullet: { code: "25CF" }, breakLine: true, paraSpaceAfter: 14 } })),
      { ...F, x, y: y + 1.3, w: col, h: h - 1.3, fontSize: 32, color: ink, valign: "top" });
  };
  const L = 1.5, R = 1.5 + col + 1.5;
  block(L, 8.4, 8.2, "Background", p.background);
  block(L, 17.2, 7.4, "Objectives", p.objectives);
  block(L, 25.2, 10.2, "Methodology", p.method);
  // Headline finding panel
  sl.addShape("roundRect", { x: R, y: 8.4, w: col, h: 7.4, fill: { color: hex(t.bg) }, line: { color: hex(t.bg) }, rectRadius: 0.4 });
  sl.addText("KEY FINDING", { ...F, x: R + 0.8, y: 9.0, w: col - 1.6, h: 0.9, fontSize: 28, bold: true, color: hex(t.accent), charSpacing: 4 });
  sl.addText(p.headline, { ...F, x: R + 0.8, y: 10.0, w: col - 1.6, h: 5.2, fontSize: 54, bold: true, color: hex(t.text), valign: "top" });
  block(R, 16.6, 9.4, "Results", p.findings);
  block(R, 26.6, 4.6, "Conclusion", p.conclusion);
  block(R, 31.6, 6.0, "Recommendations", p.recommendations);
  // Footer: references + QR code to the full paper
  sl.addShape("line", { x: 1.5, y: 38.4, w: W - 3, h: 0, line: { color: "D0D4D9", width: 2 } });
  if (p.references.length) {
    sl.addText("References", { ...F, x: 1.5, y: 38.9, w: 20, h: 0.9, fontSize: 30, bold: true, color: ink });
    sl.addText(p.references.join("\n"), { ...F, x: 1.5, y: 39.9, w: 21.5, h: 5.2, fontSize: 20, color: "6B7178", valign: "top" });
  }
  if (p.link) {
    const QR = (await import("qrcode")).default;
    const data = await QR.toDataURL(p.link, { margin: 1, width: 600 });
    sl.addImage({ data, x: W - 8.0, y: 38.9, w: 6.0, h: 6.0 });
    sl.addText("Scan to read the full paper", { ...F, x: W - 15.2, y: 41.3, w: 7.0, h: 1.4, fontSize: 24, bold: true, color: ink, align: "right" });
  }
  sl.addText("Made with papr", { ...F, x: W - 15.2, y: 44.6, w: 13.2, h: 0.9, fontSize: 22, color: "8A9098", align: "right" });
  await pres.writeFile({ fileName: `Poster - ${p.title.replace(/[^\w\s-]/g, "").slice(0, 50).trim()}.pptx` });
}
