import Link from "next/link";

// The header shared by every tool page.
export default function ToolPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div><Link href="/tools" className="small muted">← All tools</Link><h1 style={{ marginTop: 8 }}>{title}</h1><p className="muted" style={{ marginTop: 8, maxWidth: "62ch" }}>{intro}</p></div>
      {children}
    </div>
  );
}
