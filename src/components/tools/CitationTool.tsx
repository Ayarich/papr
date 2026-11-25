"use client";
import { useEffect, useMemo, useState } from "react";
import { formatApa, html, inText, missing, parsePerson, plain, TYPE_LABEL, type Source, type SourceType } from "@/lib/apa";
import Icon from "@/components/Icon";
import { track } from "@/lib/track";

type Saved = { id: string; source: Source };
const KEY = "papr-citations";
const blank = (type: SourceType = "journal"): Source => ({ type, authors: [], title: "" });

export default function CitationTool() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [src, setSrc] = useState<Source | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [list, setList] = useState<Saved[]>([]);
  const [copied, setCopied] = useState("");

  useEffect(() => { try { const r = localStorage.getItem(KEY); if (r) setList(JSON.parse(r)); } catch {} }, []);
  const save = (l: Saved[]) => { setList(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} };
  const sorted = useMemo(() => [...list].sort((a, b) => plain(formatApa(a.source)).localeCompare(plain(formatApa(b.source)))), [list]);

  const look = async () => {
    if (!q.trim()) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/cite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Couldn't look that up."); return; }
      setSrc(j.source); setEditId(null);
    } catch { setError("Couldn't reach the server. Check your connection."); }
    finally { setBusy(false); }
  };
  const add = () => {
    if (!src) return;
    save(editId ? list.map((x) => (x.id === editId ? { ...x, source: src } : x)) : [...list, { id: Math.random().toString(36).slice(2), source: src }]);
    setSrc(null); setEditId(null); setQ("");
  };
  const copy = async (what: "all" | string, items: Saved[]) => {
    const parts = items.map((x) => formatApa(x.source));
    const text = parts.map(plain).join("\n\n");
    const rich = parts.map((p) => `<p style="margin:0 0 12pt 0.5in;text-indent:-0.5in">${html(p)}</p>`).join("");
    try {
      if ("ClipboardItem" in window) await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }), "text/html": new Blob([rich], { type: "text/html" }) })]);
      else await navigator.clipboard.writeText(text);
      setCopied(what); setTimeout(() => setCopied(""), 1800);
    } catch { setError("Your browser blocked copying. Select the text and copy it instead."); }
  };
  const downloadDocx = async () => {
    track("cite-docx");
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
    const doc = new Document({
      styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } },
      sections: [{ children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "References", bold: true, font: "Times New Roman", size: 26 })], alignment: "center", spacing: { after: 240 } }),
        ...sorted.map((x) => new Paragraph({ indent: { left: 720, hanging: 720 }, spacing: { line: 480 }, children: formatApa(x.source).map((p) => new TextRun({ text: p.t, italics: !!p.i })) })),
      ] }],
    });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "References (APA 7).docx"; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="card pad-lg stack" style={{ gap: 14 }}>
        <label className="lbl" htmlFor="cite-q">Paste a DOI or a link</label>
        <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
          <input id="cite-q" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && look()} placeholder="10.1016/j.landusepol.2021.105678  or  https://…" style={{ flex: 1 }} />
          <button type="button" className="btn primary" onClick={look} disabled={busy || !q.trim()}>{busy ? "Looking up…" : "Get reference"}</button>
        </div>
        {error && <div className="notice bad small">{error}</div>}
        <p className="small muted">Works with journal DOIs, publisher pages, Google Scholar links and most web pages. For books, reports and theses without a DOI, <button type="button" className="linkbtn" onClick={() => { setSrc(blank("book")); setEditId(null); }}>type the details in</button>.</p>
      </div>

      {src && <Editor src={src} setSrc={setSrc} onAdd={add} onCancel={() => { setSrc(null); setEditId(null); }} editing={!!editId} />}

      <section className="card pad-lg stack" style={{ gap: 14 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <h3>My reference list <span className="muted num">({list.length})</span></h3>
          {list.length > 0 && <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn sm" onClick={() => copy("all", sorted)}><Icon name={copied === "all" ? "check" : "copy"} size={14} /> {copied === "all" ? "Copied" : "Copy all"}</button>
            <button type="button" className="btn sm" onClick={downloadDocx}><Icon name="download" size={14} /> Word file</button>
          </div>}
        </div>
        {!list.length ? <p className="small muted">References you add appear here, sorted A–Z as APA 7 requires. They stay in this browser.</p> : (
          <ol className="cite-list">{sorted.map((x) => {
            const parts = formatApa(x.source); const it = inText(x.source); const miss = missing(x.source);
            return (
              <li key={x.id}>
                <p className="cite-ref">{parts.map((p, k) => (p.i ? <i key={k}>{p.t}</i> : <span key={k}>{p.t}</span>))}</p>
                <div className="row small muted" style={{ gap: 12, flexWrap: "wrap" }}>
                  <span>In text: <b className="ink">{it.parenthetical}</b> or <b className="ink">{it.narrative}</b></span>
                  {miss.length > 0 && <span className="lv-warn ih"><Icon name="warn" size={13} /> Missing: {miss.join(", ")}</span>}
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button type="button" className="pe-mini" title="Copy" aria-label="Copy" onClick={() => copy(x.id, [x])}><Icon name={copied === x.id ? "check" : "copy"} size={14} /></button>
                  <button type="button" className="pe-mini" title="Edit" aria-label="Edit" onClick={() => { setSrc(x.source); setEditId(x.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Icon name="pencil" size={14} /></button>
                  <button type="button" className="pe-mini danger" title="Remove" aria-label="Remove" onClick={() => save(list.filter((y) => y.id !== x.id))}><Icon name="trash" size={14} /></button>
                </div>
              </li>
            );
          })}</ol>
        )}
        <p className="hint">Copy all keeps the italics when you paste into Word or Google Docs. Always check a generated reference against the source.</p>
      </section>
    </div>
  );
}

function Editor({ src, setSrc, onAdd, onCancel, editing }: { src: Source; setSrc: (s: Source) => void; onAdd: () => void; onCancel: () => void; editing: boolean }) {
  const set = (p: Partial<Source>) => setSrc({ ...src, ...p });
  const parts = formatApa(src);
  const it = inText(src);
  const miss = missing(src);
  const f = (k: keyof Source, label: string, ph = "", w = "") => (
    <div className={`field ${w}`}><label className="lbl small" htmlFor={`c-${k}`}>{label}</label>
      <input id={`c-${k}`} value={(src[k] as string) || ""} placeholder={ph} onChange={(e) => set({ [k]: e.target.value } as Partial<Source>)} /></div>
  );
  const peopleText = src.authors.map((a) => (a.given ? `${a.family}, ${a.given}` : a.family)).join("\n");
  return (
    <section className="card pad-lg stack" style={{ gap: 16 }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
        <h3>Check the details</h3>
        <select value={src.type} onChange={(e) => set({ type: e.target.value as SourceType })} aria-label="Type of source" style={{ maxWidth: 220 }}>
          {(Object.keys(TYPE_LABEL) as SourceType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </div>
      <div className="cite-preview">
        <span className="eyebrow">APA 7</span>
        <p className="cite-ref">{parts.map((p, k) => (p.i ? <i key={k}>{p.t}</i> : <span key={k}>{p.t}</span>))}</p>
        <p className="small muted">In text: <b className="ink">{it.parenthetical}</b> or <b className="ink">{it.narrative}</b></p>
        {miss.length > 0 && <p className="small lv-warn ih"><Icon name="warn" size={13} /> Still missing: {miss.join(", ")}</p>}
      </div>
      <div className="cite-grid">
        <div className="field span2"><label className="lbl small" htmlFor="c-authors">Authors, one per line (Surname, First names)</label>
          <textarea id="c-authors" rows={Math.max(2, Math.min(6, src.authors.length + 1))} defaultValue={peopleText} key={peopleText.length + src.type}
            onBlur={(e) => set({ authors: e.target.value.split("\n").map(parsePerson).filter((p): p is NonNullable<typeof p> => !!p) })} placeholder={"Mensah, Kofi Asare\nBoateng, Efua"} /></div>
        {f("org", "Or organisation as author", "e.g. Ghana Statistical Service", "span2")}
        {f("title", src.type === "chapter" ? "Chapter title" : "Title", "", "span2")}
        {f("year", "Year", "2024")}
        {src.type === "website" ? <>{f("month", "Month (1–12)", "")}{f("day", "Day", "")}</> : null}
        {src.type === "journal" && <>{f("container", "Journal", "", "span2")}{f("volume", "Volume")}{f("issue", "Issue")}{f("pages", "Pages", "45–60")}</>}
        {src.type === "chapter" && <>{f("container", "Book title", "", "span2")}{f("pages", "Pages", "45–60")}{f("edition", "Edition", "2")}</>}
        {src.type === "book" && f("edition", "Edition (if not the first)", "2")}
        {(src.type === "book" || src.type === "chapter" || src.type === "report") && f("publisher", "Publisher")}
        {src.type === "report" && f("reportNo", "Report number")}
        {src.type === "website" && f("container", "Website name", "e.g. Ghana News Agency")}
        {src.type === "thesis" && <>{f("degree", "Type", "Undergraduate project / Master's thesis")}{f("university", "University")}</>}
        {f("doi", "DOI", "10.xxxx/xxxxx")}
        {f("url", "Link (if no DOI)", "https://", "span2")}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn primary" onClick={onAdd} disabled={!src.title}><Icon name={editing ? "check" : "plus"} size={15} /> {editing ? "Save changes" : "Add to my list"}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}
