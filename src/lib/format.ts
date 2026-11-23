import { shortInst } from "./constants";

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtSize(bytes: number): string {
  return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

export const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** APA 7 style citation */
export function apa(p: { authors_text: string; year: string; title: string; type: string; institution: string; doi: string | null }) {
  const fmt = (n: string) => {
    const parts = n.trim().split(/\s+/);
    const last = parts.pop() || "";
    return `${last}, ${parts.map((x) => x[0].toUpperCase() + ".").join(" ")}`.trim();
  };
  const a = splitList(p.authors_text).map(fmt);
  const names = a.length === 1 ? a[0] : a.length === 2 ? `${a[0]}, & ${a[1]}` : a.slice(0, -1).join(", ") + ", & " + a[a.length - 1];
  return `${names} (${p.year}). ${p.title} [${p.type}, ${shortInst(p.institution)}]. papr Student Research Repository.${p.doi ? ` https://doi.org/${p.doi}` : ""}`;
}

/** Shortens text at a word boundary and adds "…" if it was cut. */
export function clip(s: string, n = 60): string {
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}
