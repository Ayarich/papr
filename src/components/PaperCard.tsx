import Link from "next/link";
import { shortInst } from "@/lib/constants";
import type { Submission } from "@/lib/db";

export default function PaperCard({ p }: { p: Submission }) {
  return (
    <Link className="card paper" href={`/papers/${p.ref}`}>
      <span className="eyebrow">{p.field}</span>
      <h3>{p.title}</h3>
      <div className="meta">{p.authors_text} · {shortInst(p.institution)} · {p.year}</div>
      <p className="abs">{p.abstract}</p>
      <div className="foot num">
        <span>{p.type}</span>
        <span>{p.views.toLocaleString()} {p.views === 1 ? "view" : "views"}</span>
      </div>
    </Link>
  );
}
