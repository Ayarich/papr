// Builds a real, fully editable PowerPoint (.pptx) file from a deck, in the browser.
// Every title and bullet is a normal PowerPoint text box, so students can keep editing
// in PowerPoint, Google Slides or Keynote. Positions mirror the on-screen 1280x720 design.
import { THEMES, type Deck } from "./deck";

const IN = (px: number) => px / 96;          // 1280px = 13.333in (PowerPoint widescreen)
const PT = (px: number) => Math.round(px * 0.75); // screen px -> font points
const hex = (c: string) => c.replace("#", "");
const FONT = "Arial";

export function deckFileName(title: string) {
  const clean = (title || "papr slides").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, " ");
  const short = clean.length > 60 ? clean.slice(0, 60).replace(/\s+\S*$/, "") : clean;
  return short + ".pptx";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildPptx(deck: Deck): Promise<any> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.title = deck.title;
  pres.company = "papr";
  pres.author = "Made with papr";
  const t = THEMES[deck.theme] || THEMES.charcoal;
  const base = { fontFace: FONT, color: hex(t.text), margin: 0, fit: "shrink" as const };

  deck.slides.forEach((s, i) => {
    const sl = pres.addSlide();
    sl.background = { color: hex(t.bg) };
    const muted = { ...base, color: hex(t.muted) };

    if (s.layout === "title") {
      sl.addShape("rect", { x: IN(96), y: IN(210), w: IN(72), h: IN(8), fill: { color: hex(t.accent) }, line: { color: hex(t.accent) } });
      sl.addText(s.title, { ...base, x: IN(96), y: IN(240), w: IN(1088), h: IN(250), fontSize: PT(68), bold: true, valign: "top" });
      sl.addText(s.subtitle, { ...muted, x: IN(96), y: IN(510), w: IN(1088), h: IN(60), fontSize: PT(28), valign: "top" });
    } else if (s.layout === "bullets") {
      const many = s.bullets.length > 5 || s.bullets.join(" ").length > 420;
      sl.addText(s.title, { ...base, x: IN(96), y: IN(64), w: IN(1088), h: IN(80), fontSize: PT(48), bold: true, valign: "middle" });
      sl.addShape("rect", { x: IN(96), y: IN(158), w: IN(56), h: IN(6), fill: { color: hex(t.accent) }, line: { color: hex(t.accent) } });
      sl.addText(
        s.bullets.map((b) => ({ text: b, options: { bullet: { code: "25CF" }, paraSpaceAfter: many ? 8 : 14, breakLine: true } })),
        { ...base, x: IN(96), y: IN(200), w: IN(1088), h: IN(440), fontSize: PT(many ? 26 : 31), valign: "top", lineSpacingMultiple: 1.1 }
      );
    } else if (s.layout === "section") {
      sl.addText(String(i + 1).padStart(2, "0"), { ...base, color: hex(t.accent), x: IN(96), y: IN(210), w: IN(300), h: IN(60), fontSize: PT(32), bold: true });
      sl.addText(s.title, { ...base, x: IN(96), y: IN(280), w: IN(1088), h: IN(180), fontSize: PT(76), bold: true, valign: "top" });
      sl.addText(s.subtitle, { ...muted, x: IN(96), y: IN(470), w: IN(1088), h: IN(60), fontSize: PT(28) });
    } else if (s.layout === "statement") {
      sl.addText("“", { ...base, color: hex(t.accent), x: IN(96), y: IN(90), w: IN(160), h: IN(140), fontSize: PT(160), bold: true });
      sl.addText(s.title, { ...base, x: IN(96), y: IN(220), w: IN(1088), h: IN(300), fontSize: PT(52), bold: true, valign: "top" });
      sl.addText(s.subtitle.toUpperCase(), { ...muted, x: IN(96), y: IN(540), w: IN(1088), h: IN(40), fontSize: PT(20), bold: true, charSpacing: 2 });
    } else {
      sl.addText(s.title, { ...base, x: IN(96), y: IN(240), w: IN(1088), h: IN(150), fontSize: PT(96), bold: true, align: "center", valign: "middle" });
      sl.addText(s.subtitle, { ...muted, x: IN(96), y: IN(410), w: IN(1088), h: IN(60), fontSize: PT(28), align: "center" });
    }
    // Small footer with the papr name and slide number (students can delete it like any text box)
    sl.addText("papr", { ...muted, x: IN(96), y: IN(662), w: IN(200), h: IN(28), fontSize: PT(16), bold: true });
    sl.addText(String(i + 1), { ...muted, x: IN(984), y: IN(662), w: IN(200), h: IN(28), fontSize: PT(16), align: "right" });
    if (s.notes) sl.addNotes(s.notes);
  });
  return pres;
}

export async function downloadPptx(deck: Deck) {
  const pres = await buildPptx(deck);
  await pres.writeFile({ fileName: deckFileName(deck.title) });
}
