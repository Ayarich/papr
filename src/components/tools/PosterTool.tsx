"use client";
import { useMemo, useState } from "react";
import type { PosterContent } from "@/lib/poster-content";
import { layoutFromContent, type PosterDoc } from "@/lib/poster-layout";
import SourcePicker, { PublishCTA } from "./SourcePicker";
import PosterEditor from "./PosterEditor";

export default function PosterTool({ papers }: { papers: { id: string; title: string; ref: string }[] }) {
  const [res, setRes] = useState<{ poster: PosterContent; fromPaper: boolean } | null>(null);
  const initial = useMemo<PosterDoc | null>(() => (res ? { theme: "forest", els: layoutFromContent(res.poster) } : null), [res]);
  if (!res || !initial) return <SourcePicker tool="poster" papers={papers} cta="Make my poster" steps={["Reading your paper…", "Picking your key findings…", "Laying out your poster…"]} onResult={(r) => setRes(r as never)} />;
  const key = "papr-poster:" + res.poster.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
  return (
    <div className="stack" style={{ gap: 18 }}>
      <PosterEditor initial={initial} storageKey={key} title={res.poster.title} link={res.poster.link} onRestart={() => setRes(null)} />
      <PublishCTA show={!res.fromPaper} />
    </div>
  );
}
