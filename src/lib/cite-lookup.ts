// Looks up a DOI (Crossref) or a web page (its citation / Open Graph tags) and turns it into a Source.
import dns from "dns/promises";
import net from "net";
import type { Person, Source, SourceType } from "./apa";

const UA = "papr/1.0 (student research repository; mailto:hello@papr.app)";
export class LookupError extends Error {}

export function findDoi(q: string): string | null {
  const m = q.match(/10\.\d{4,9}\/[^\s"<>]+/i);
  return m ? m[0].replace(/[.,;)\]]+$/, "") : null;
}

// ---- Crossref ----
type CrPerson = { given?: string; family?: string; name?: string };
type CrWork = {
  type?: string; title?: string[]; "container-title"?: string[]; author?: CrPerson[]; editor?: CrPerson[];
  issued?: { "date-parts"?: number[][] }; published?: { "date-parts"?: number[][] }; volume?: string; issue?: string; page?: string;
  publisher?: string; DOI?: string; URL?: string; edition?: string; institution?: { name?: string }[];
};
const people = (a?: CrPerson[]) => (a || []).filter((p) => p.family || p.name).map((p) => ({ family: (p.family || p.name || "").trim(), given: p.given?.trim() }) as Person);
const CR_TYPE: Record<string, SourceType> = {
  "journal-article": "journal", "proceedings-article": "journal", "posted-content": "journal", book: "book", monograph: "book", "edited-book": "book",
  "book-chapter": "chapter", "book-section": "chapter", report: "report", "report-component": "report", dissertation: "thesis", dataset: "report",
};

export async function crossref(doi: string): Promise<Source> {
  const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) });
  if (r.status === 404) throw new LookupError("That DOI wasn't found. Check it's typed correctly.");
  if (!r.ok) throw new LookupError("The DOI service didn't answer. Try again in a minute, or fill in the details yourself.");
  const w = ((await r.json()) as { message: CrWork }).message;
  const dp = (w.issued?.["date-parts"] || w.published?.["date-parts"] || [[]])[0] || [];
  const type = CR_TYPE[w.type || ""] || "journal";
  return {
    type, authors: people(w.author), editors: people(w.editor),
    org: !w.author?.length && type === "report" ? w.publisher : undefined,
    year: dp[0] ? String(dp[0]) : undefined,
    title: (w.title?.[0] || "").replace(/<[^>]+>/g, ""),
    container: w["container-title"]?.[0], volume: w.volume, issue: w.issue, pages: w.page, edition: w.edition,
    publisher: w.publisher, university: type === "thesis" ? w.institution?.[0]?.name : undefined,
    doi: w.DOI || doi,
  };
}

// ---- Web pages (with protection against fetching private / internal addresses) ----
function privateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || (v.startsWith("::ffff:") && privateIp(v.slice(7)));
}
async function safeUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new LookupError("That doesn't look like a web link."); }
  if (!/^https?:$/.test(u.protocol)) throw new LookupError("Only http and https links can be looked up.");
  if (u.port && !["80", "443"].includes(u.port)) throw new LookupError("That link can't be looked up.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (!ips.length) throw new LookupError("That website couldn't be found.");
  if (ips.some(privateIp)) throw new LookupError("That link can't be looked up.");
  return u;
}

export async function fetchPage(raw: string): Promise<{ html: string; url: string }> {
  let url = (await safeUrl(raw)).toString();
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(9000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { url = (await safeUrl(new URL(r.headers.get("location")!, url).toString())).toString(); continue; }
    if (!r.ok) throw new LookupError(`The website answered with an error (${r.status}). Fill in the details yourself.`);
    if (!/html/i.test(r.headers.get("content-type") || "")) throw new LookupError("That link isn't a web page (it may be a PDF). Use its DOI, or fill in the details yourself.");
    const reader = r.body!.getReader(); let size = 0; const chunks: Uint8Array[] = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; chunks.push(value); if (size > 1_500_000) { await reader.cancel(); break; } }
    return { html: new TextDecoder().decode(Buffer.concat(chunks)), url };
  }
  throw new LookupError("That link redirects too many times.");
}

const decode = (t: string) => t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();

export function parseMeta(html: string, url: string): Source {
  const metas: { k: string; v: string }[] = [];
  for (const m of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = m[0];
    const k = (tag.match(/(?:name|property|itemprop)\s*=\s*["']([^"']+)["']/i) || [])[1]?.toLowerCase();
    const v = (tag.match(/content\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (k && v) metas.push({ k, v: decode(v) });
  }
  const get = (...keys: string[]) => { for (const k of keys) { const f = metas.find((m) => m.k === k); if (f?.v) return f.v; } return undefined; };
  const all = (k: string) => metas.filter((m) => m.k === k).map((m) => m.v);
  const titleTag = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const site = get("og:site_name", "citation_publisher", "dc.publisher") || new URL(url).hostname.replace(/^www\./, "");
  const authorsRaw = all("citation_author").length ? all("citation_author") : all("dc.creator").length ? all("dc.creator") : (get("author", "article:author") ? [get("author", "article:author")!] : []);
  const authors = authorsRaw.filter((a) => !/^https?:/.test(a)).map((a) => {
    if (a.includes(",")) { const [family, given] = a.split(",").map((x) => x.trim()); return { family, given }; }
    const p = a.split(" "); return p.length > 1 ? { family: p.pop()!, given: p.join(" ") } : { family: a };
  }).slice(0, 25);
  const date = get("citation_publication_date", "citation_date", "dc.date", "article:published_time", "datepublished", "date") || "";
  const dm = date.match(/((?:19|20)\d{2})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
  const journal = get("citation_journal_title");
  const title = get("citation_title", "dc.title", "og:title", "twitter:title") || titleTag.replace(new RegExp(`\\s*[|–-]\\s*${site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*$`, "i"), "");
  const fp = get("citation_firstpage"), lp = get("citation_lastpage");
  return {
    type: journal ? "journal" : "website",
    authors: authors.length > 1 || (authors[0] && authors[0].family.toLowerCase() !== site.toLowerCase()) ? authors : [],
    org: authors.length ? undefined : site,
    year: dm?.[1], month: dm?.[2], day: dm?.[3],
    title: title || site,
    container: journal || site,
    volume: get("citation_volume"), issue: get("citation_issue"), pages: fp ? (lp ? `${fp}–${lp}` : fp) : undefined,
    doi: get("citation_doi", "dc.identifier")?.match(/10\.\d{4,9}\/\S+/)?.[0],
    url,
  };
}

export async function lookup(q: string): Promise<Source> {
  const query = q.trim();
  const doi = findDoi(query);
  if (doi) return crossref(doi);
  if (!/^https?:\/\//i.test(query) && !/^[\w-]+(\.[\w-]+)+(\/|$)/.test(query)) throw new LookupError("Paste a DOI (like 10.1016/j.cities.2020.102345) or a web link.");
  const { html, url } = await fetchPage(/^https?:/i.test(query) ? query : `https://${query}`);
  const s = parseMeta(html, url);
  if (s.doi) { try { return { ...(await crossref(s.doi)), url: undefined }; } catch { /* use the page details */ } }
  return s;
}
