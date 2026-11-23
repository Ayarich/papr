import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModerator } from "@/lib/auth";
import { reportForSubmission } from "@/lib/sim-check";
import PlagiarismView from "@/components/tools/PlagiarismView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Similarity report" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModerator();
  const { id } = await params;
  const r = await reportForSubmission(id);
  if (!r) notFound();
  return (
    <div className="stack" style={{ gap: 22 }}>
      <div><Link href={`/moderate?id=${id}`} className="small muted">← Back to the review</Link>
        <h1 style={{ marginTop: 8, fontSize: "clamp(1.5rem,3vw,2.1rem)" }}>Similarity report</h1>
        <p className="muted" style={{ marginTop: 6 }}>{r.sub.ref} · {r.sub.title} · {r.sub.authors_text}</p></div>
      <div className="card pad-lg"><PlagiarismView report={{ ...r.report, text: r.report.text.slice(0, 60000), spans: r.report.spans.filter((s) => s.end <= 60000) }} /></div>
    </div>
  );
}
