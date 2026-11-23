import { sid, type Deck, type Slide } from "./deck";

// Optional: if ANTHROPIC_API_KEY is set in .env, Claude writes the slide outline.
// Without a key, papr uses its built-in outline builder (lib/deck.ts) instead.

const SYSTEM = `You turn undergraduate research papers into clear, presentation-ready slide outlines for a student's project defence or seminar.
Rules:
- 9 to 13 slides. Start with a title slide and an outline slide, end with a closing slide.
- Use the paper's real content: its numbers, place names, methods and findings. Never invent data.
- Bullets are short (under 18 words), plain English, no full stops at the end. 2 to 5 bullets per slide.
- Include one "statement" slide with the single most important finding as a short sentence.
- Speaker notes: 2 to 4 sentences the student can say aloud.
Reply with JSON only, no other text, in this shape:
{"title": string, "slides": [{"layout": "title"|"bullets"|"section"|"statement"|"end", "title": string, "subtitle": string, "bullets": string[], "notes": string}]}`;

export async function aiOutline(text: string, meta: { title?: string; authors?: string; institution?: string; year?: string; link?: string }): Promise<Deck | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": process.env.ANTHROPIC_VERSION || "2026-10-21",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: `Author: ${meta.authors || "unknown"}\nInstitution: ${meta.institution || "unknown"}\nYear: ${meta.year || ""}\nTitle: ${meta.title || "(see paper)"}\n${meta.link ? `Public link: ${meta.link}\n` : ""}\nPAPER TEXT:\n${text.slice(0, 60000)}`,
        }],
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) { console.warn("[slides] AI outline failed:", r.status, await r.text().catch(() => "")); return null; }
    const j = await r.json();
    const raw: string = (j.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const layouts = ["title", "bullets", "section", "statement", "end"];
    const slides: Slide[] = (json.slides || []).slice(0, 20).map((s: Partial<Slide>) => ({
      id: sid(),
      layout: layouts.includes(String(s.layout)) ? (s.layout as Slide["layout"]) : "bullets",
      title: String(s.title || "").slice(0, 200),
      subtitle: String(s.subtitle || "").slice(0, 200),
      bullets: Array.isArray(s.bullets) ? s.bullets.slice(0, 8).map((b) => String(b).slice(0, 220)) : [],
      notes: String(s.notes || "").slice(0, 1500),
    }));
    if (slides.length < 3) return null;
    return { title: String(json.title || meta.title || slides[0].title), theme: "charcoal", source: "ai", slides };
  } catch (e) {
    console.warn("[slides] AI outline error:", e);
    return null;
  }
}
