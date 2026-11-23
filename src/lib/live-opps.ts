// Live Master's & PhD opportunities.
//
// papr reads public RSS/Atom feeds from scholarship and research-job websites every few hours,
// keeps only postgraduate items (Master's, PhD, scholarships, fellowships), tags them, and shows
// the title, a short summary and a link back to the original page. Admins can add or switch off
// sources under Admin → Opportunities. Only use feeds whose sites allow syndication.

import { XMLParser } from "fast-xml-parser";
import { all, one, run, newId, nowIso } from "./db";
import { FIELDS } from "./constants";

export const DEFAULT_SOURCES = [
  { name: "Opportunities for Africans", url: "https://www.opportunitiesforafricans.com/feed/" },
  { name: "Scholars4Dev", url: "https://www.scholars4dev.com/feed/" },
];
const REFRESH_EVERY_HOURS = 3;
const KEEP_UNDATED_DAYS = 60;

export type FeedItem = { title: string; link: string; summary: string; published: string | null };
export type Classified = { level: "phd" | "masters" | null; type: string; funded: boolean; deadline: string | null; fields: string[]; country: string | null; org: string | null };

// ---------- reading feeds ----------
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };
const decode = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
/** Gets the text of an XML node whether it's a plain string or an object with attributes. */
const nodeText = (x: unknown): string => (x && typeof x === "object" ? String((x as Record<string, unknown>)["#text"] ?? "") : String(x ?? ""));
export function cleanText(s: unknown): string {
  return decode(nodeText(s))
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[​-‍﻿]/g, "")   // invisible zero-width characters some feeds include
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses RSS 2.0 or Atom XML into simple items. */
export function parseFeed(xml: string): FeedItem[] {
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", cdataPropName: false, processEntities: false, trimValues: true });
  const doc = p.parse(xml);
  const arr = <T,>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
  type Node = Record<string, unknown>;
  const rss = doc?.rss?.channel || doc?.["rdf:RDF"];
  if (rss) {
    return arr<Node>((rss.item ?? doc?.["rdf:RDF"]?.item) as Node | Node[]).map((it) => ({
      title: cleanText(it.title),
      link: cleanText(it.link),
      summary: cleanText(it.description ?? it["content:encoded"]).slice(0, 2000),
      published: toIso(cleanText(it.pubDate ?? it["dc:date"])),
    })).filter((i) => i.title && /^https?:\/\//.test(i.link));
  }
  const feed = doc?.feed;
  if (feed) {
    return arr<Node>(feed.entry as Node | Node[]).map((e) => {
      const links = arr<Node>(e.link as Node | Node[]);
      const href = (links.find((l) => !l["@rel"] || l["@rel"] === "alternate") || links[0])?.["@href"];
      return { title: cleanText(e.title), link: cleanText(href), summary: cleanText(e.summary ?? e.content).slice(0, 2000), published: toIso(cleanText(e.published ?? e.updated)) };
    }).filter((i) => i.title && /^https?:\/\//.test(i.link));
  }
  return [];
}

function toIso(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------- understanding items ----------
const RELEVANT = /\b(ph\.?\s?d|doctoral|doctorate|master'?s|masters|msc|m\.sc|mphil|m\.phil|mba|mpa|mph|llm|postgraduate|post-graduate|graduate (study|studies|school|program|programme|scholarship)|scholarships?|fellowships?|studentships?)\b/i;
const FIELD_WORDS: [string, RegExp][] = [
  ["Earth & Environmental Sciences", /\b(geolog|geoscien|geospatial|gis\b|remote sensing|earth science|environment|climate|water resources|hydrolog|mining|geomatic|ecolog|forest|ocean)/i],
  ["Engineering & Technology", /\b(engineer|energy|renewable|mechanical|electrical|civil|chemical eng|materials|robotics|aerospace)/i],
  ["Health Sciences", /\b(health|medic|nursing|pharma|public health|epidemiolog|clinical|biomedical|nutrition)/i],
  ["Agriculture & Food", /\b(agricultur|agronom|food (security|science)|crop|livestock|veterinar|fisher)/i],
  ["Business & Economics", /\b(business|econom|finance|mba\b|management|accounting|entrepreneur|marketing)/i],
  ["Computing & IT", /\b(computer|comput|data science|artificial intelligence|\bai\b|machine learning|software|cyber|information technology|informatics)/i],
  ["Education", /\b(education|teaching|pedagog)/i],
  ["Natural Sciences", /\b(physics|chemistry|biology|mathemat|statistic|life science|molecular)/i],
  ["Social Sciences & Humanities", /\b(social science|sociolog|law\b|legal|policy|political|international relations|development studies|history|humanities|journalism|gender)/i],
];
const COUNTRIES = ["Ghana", "Nigeria", "Kenya", "South Africa", "Rwanda", "Egypt", "Morocco", "USA", "United States", "Canada", "UK", "United Kingdom", "Ireland", "Germany", "France", "Netherlands", "Belgium", "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Austria", "Italy", "Spain", "Portugal", "Poland", "Czech", "Hungary", "Turkey", "China", "Japan", "Korea", "Taiwan", "Singapore", "Malaysia", "India", "Australia", "New Zealand", "Saudi Arabia", "Qatar", "UAE", "Israel", "Brazil", "Mexico", "Chile", "Europe"];
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

export function findDeadline(text: string): string | null {
  const re = new RegExp(`(deadline|closing date|apply by|applications? (?:close|closes|closing|due)|due date)[^0-9a-z]{0,25}(?:is|on|:)?\\s*(?:[a-z]+day,?\\s*)?((\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})\\.?,?\\s+(20\\d\\d)|(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d))`, "i");
  const m = text.match(re);
  if (!m) return null;
  const s = m[3] ? `${m[3]} ${m[4]} ${m[5]}` : `${m[7]} ${m[6]} ${m[8]}`;
  const d = new Date(s + " 12:00 UTC");
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function classify(item: FeedItem): Classified | null {
  const t = `${item.title} ${item.summary}`;
  if (!RELEVANT.test(t)) return null;
  const phd = /\b(ph\.?\s?d|doctoral|doctorate)\b/i.test(item.title) || (/\b(ph\.?\s?d|doctoral)\b/i.test(t) && !/\bmaster/i.test(item.title));
  const masters = /\b(master'?s|masters|msc|m\.sc|mphil|mba|mpa|mph|llm)\b/i.test(item.title) || (!phd && /\b(master'?s|masters|msc|mba)\b/i.test(t));
  const level = phd ? "phd" : masters ? "masters" : null;
  const type = level || (/\bfellowships?\b/i.test(item.title) ? "scholarship" : /\bscholarships?\b/i.test(t) ? "scholarship" : "grad-school");
  const funded = /\b(fully[- ]funded|full scholarship|full funding|full tuition|tuition (fee )?waiver|monthly stipend|stipend|living allowance|all expenses paid)\b/i.test(t);
  const fields = FIELD_WORDS.filter(([, re]) => re.test(t)).map(([f]) => f).filter((f) => FIELDS.includes(f));
  const country = COUNTRIES.find((c) => new RegExp(`\\b${c}\\b`).test(item.title)) || COUNTRIES.find((c) => new RegExp(`\\b${c}\\b`).test(item.summary.slice(0, 400))) || null;
  // Host institution: "X University of Y", "University of X", "X University", "X Institute of Technology", or an acronym like DAAD
  const W = "(?!(?:Fully|Funded|Fully-Funded|PhD|Ph\\.D|Masters?|Master’s|Master's|Scholarships?|Fellowships?|Studentships?|Programs?|Programmes?|Positions?|Research)\\b)[A-Z][a-z'’]+(?:-[A-Z][a-z'’]+)?";
  const orgRe = new RegExp(`\\b((?:${W} )*(?:University|Institute|College|School) of (?:${W})(?: (?:and )?${W}){0,2}|University of ${W}(?: (?:and )?${W}){0,2}|(?:${W} ){1,3}University|[A-Z]{3,6})\\b`);
  const org = (item.title.match(orgRe) || [])[1] || null;
  return { level, type, funded, deadline: findDeadline(t), fields: fields.length > 4 ? [] : fields, country, org };
}

// ---------- sources & refresh ----------
export async function ensureSources() {
  const n = await one<{ n: number }>("SELECT COUNT(*) AS n FROM feed_sources");
  if (n?.n) return;
  for (const s of DEFAULT_SOURCES) await run("INSERT OR IGNORE INTO feed_sources (id, name, url, enabled, created_at) VALUES (?,?,?,1,?)", [newId(), s.name, s.url, nowIso()]);
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": "papr-opportunities/1.0 (+student research repository)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`The site answered ${r.status}`);
  return r.text();
}

/** Reads one source and saves new items. Returns how many relevant items it found. */
export async function refreshSource(src: { id: string; name: string; url: string }): Promise<number> {
  try {
    const items = parseFeed(await fetchText(src.url));
    let kept = 0;
    for (const it of items) {
      const c = classify(it);
      if (!c) continue;
      kept++;
      const existing = await one<{ id: string }>("SELECT id FROM opportunities WHERE url = ? AND live = 1", [it.link]);
      const summary = it.summary.length > 280 ? it.summary.slice(0, 280).replace(/\s+\S*$/, "") + "…" : it.summary;
      if (existing) {
        await run("UPDATE opportunities SET title = ?, description = ?, deadline = COALESCE(?, deadline) WHERE id = ?", [it.title.slice(0, 200), summary, c.deadline, existing.id]);
      } else {
        await run(
          `INSERT INTO opportunities (id, title, org, type, fields, location, deadline, url, description, sample, created_at, source, level, country, funded, live, published_at)
           VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,1,?)`,
          [newId(), it.title.slice(0, 200), c.org || src.name, c.type, c.fields.join(","), c.country || "", c.deadline, it.link, summary, nowIso(), src.name, c.level, c.country, c.funded ? 1 : 0, it.published || nowIso()]);
      }
    }
    await run("UPDATE feed_sources SET last_fetched_at = ?, last_ok = 1, last_count = ?, last_error = NULL WHERE id = ?", [nowIso(), kept, src.id]);
    return kept;
  } catch (e) {
    const msg = e instanceof Error
      ? e.name === "TimeoutError" ? "The site took too long to answer"
        : /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN/i.test(e.message + String((e as { cause?: unknown }).cause)) ? "Couldn't connect to the site (check the address or your internet connection)"
        : e.message
      : String(e);
    await run("UPDATE feed_sources SET last_fetched_at = ?, last_ok = 0, last_error = ? WHERE id = ?", [nowIso(), msg.slice(0, 300), src.id]);
    return 0;
  }
}

const g = globalThis as unknown as { __oppRefresh?: Promise<number> };

/** Refreshes all enabled sources (at most every few hours unless forced). Only one refresh runs at a time. */
export async function refreshLive(force = false): Promise<number> {
  if (g.__oppRefresh) return g.__oppRefresh;
  await ensureSources();
  const last = await one<{ value: string }>("SELECT value FROM app_state WHERE key = 'opps_refreshed_at'");
  if (!force && last && Date.now() - new Date(last.value).getTime() < REFRESH_EVERY_HOURS * 3600000) return 0;
  g.__oppRefresh = (async () => {
    await run("INSERT INTO app_state (key, value) VALUES ('opps_refreshed_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [nowIso()]);
    const sources = await all<{ id: string; name: string; url: string }>("SELECT id, name, url FROM feed_sources WHERE enabled = 1");
    const counts = await Promise.all(sources.map(refreshSource));
    return counts.reduce((a, b) => a + b, 0);
  })().finally(() => { g.__oppRefresh = undefined; });
  return g.__oppRefresh;
}

export async function lastRefresh(): Promise<string | null> {
  return (await one<{ value: string }>("SELECT value FROM app_state WHERE key = 'opps_refreshed_at'"))?.value || null;
}

/** Live items without a deadline are shown for this long after they were posted. */
export function freshCutoff() {
  return new Date(Date.now() - KEEP_UNDATED_DAYS * 86400000).toISOString();
}
