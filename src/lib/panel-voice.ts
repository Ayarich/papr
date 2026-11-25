"use client";
// The "panel voice" for defence practice. Uses the browser's own speech features, so it is free and needs no API key:
// - speechSynthesis reads questions aloud (works in Chrome, Edge, Brave, Safari, Firefox)
// - SpeechRecognition writes down the student's spoken answer (Chrome and Edge; not Brave or Firefox)

const FEMALE = /female|woman|zira|aria|jenny|sonia|libby|maisie|natasha|clara|emma|ava|michelle|samantha|karen|moira|tessa|fiona|victoria|serena|susan|hazel|heera|linda|catherine|allison|nicky|ana\b|google uk english female|google us english/i;
const MALE = /\bmale\b|david|mark|guy|ryan|george|daniel|\balex\b|fred|thomas|james|william|christopher|eric|roger|steffan|brian|tony|liam|oliver|google uk english male/i;

/** English voices that sound female, best first. Falls back to any English voice if none are labelled. */
export function femaleVoices(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const en = all.filter((v) => /^en[-_]/i.test(v.lang) || v.lang === "en");
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/en[-_](GB|NG|ZA|KE|GH)/i.test(v.lang) ? 2 : 0) + (v.localService ? 0 : 1);
  const fem = en.filter((v) => FEMALE.test(v.name) && !MALE.test(v.name)).sort((a, b) => score(b) - score(a));
  return fem.length ? fem : en.filter((v) => !MALE.test(v.name));
}

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

type Rec = { start(): void; stop(): void; abort(): void; continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };

export function makeRecognizer(): Rec | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const C = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!C) return null;
  // Brave exposes the API but blocks the speech service, so treat it as unsupported.
  if ((navigator as unknown as { brave?: unknown }).brave) return null;
  const r = new C();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-GB";
  return r;
}

const FILLERS = ["um", "umm", "uh", "erm", "er", "like", "you know", "basically", "actually", "kind of", "sort of", "i mean"];
const STOP = new Set("about above after again also among because before being below between both could does doing during each explain from have having into more most other over same should such than that their them then there these they this those through under until very what when where which while with would your yours show tell give panel wants hear answer question study paper research cover practise practice smooth until mention state point offer quote focus pick specific concrete honest being shows maturity suggest might affect like better suited carry first follow-up exactly real care matters mean name talk would".split(" "));

/** Simple feedback on a spoken answer: pace, filler words and which key ideas from the tip were mentioned. */
export function answerFeedback(transcript: string, seconds: number, tip: string) {
  const text = transcript.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wpm = seconds > 5 ? Math.round((words.length / seconds) * 60) : 0;
  const fillers: Record<string, number> = {};
  for (const f of FILLERS) {
    const n = (text.match(new RegExp(`\\b${f}\\b`, "g")) || []).length;
    if (n) fillers[f] = n;
  }
  const keys = Array.from(new Set(tip.toLowerCase().match(/[a-z][a-z-]{4,}/g) || [])).filter((k) => !STOP.has(k)).slice(0, 8);
  const stem = (w: string) => w.replace(/(ings?|ed|es|s)$/, "").slice(0, 6);
  const said = new Set(words.map((w) => stem(w.replace(/[^a-z-]/g, ""))));
  const hit = keys.filter((k) => said.has(stem(k)));
  const miss = keys.filter((k) => !said.has(stem(k)));
  const pace = !wpm ? "" : wpm < 100 ? "a bit slow" : wpm > 170 ? "fast. Slow down a little" : "a good pace";
  return { words: words.length, wpm, pace, fillers, hit, miss };
}

const LEADS = ["", "Thank you. ", "Alright. ", "Okay, let's move on. ", "Good. Next question. ", "Thank you for that. "];
export const lead = (i: number) => (i === 0 ? "Good morning. Thank you for coming. Let's begin. " : LEADS[(i * 7) % LEADS.length]);
