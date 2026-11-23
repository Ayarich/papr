import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { ensureDecks, type DeckRow } from "@/lib/decks";
import { fmtDate } from "@/lib/format";
import { THEMES, type Deck } from "@/lib/deck";
import NewDeck from "./NewDeck";
import { Scaled, SlideView } from "@/components/slides/SlideView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Slides" };

export default async function SlidesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const user = await requireUser("/slides");
  await ensureDecks();
  const decks = await all<DeckRow>("SELECT * FROM decks WHERE owner_id = ? ORDER BY updated_at DESC", [user.id]);
  const papers = await all<{ id: string; title: string; ref: string }>("SELECT id, title, ref FROM submissions WHERE owner_id = ? ORDER BY updated_at DESC", [user.id]);

  return (
    <div className="stack" style={{ gap: 36 }}>
      <div className="slides-hero">
        <span className="eyebrow">papr slides</span>
        <h1>Turn your paper into a presentation</h1>
        <p className="muted" style={{ maxWidth: "58ch", marginTop: 10 }}>Upload your PDF and papr drafts a slide deck from your introduction, method, findings and recommendations. Edit it right here, present it, or download a PowerPoint you can keep editing.</p>
      </div>
      <NewDeck papers={papers} preselect={from || ""} />
      <section className="stack">
        <h2>My decks</h2>
        {decks.length === 0 ? (
          <div className="card empty"><b>No decks yet.</b><p className="small" style={{ marginTop: 6 }}>Your first one takes about ten seconds.</p></div>
        ) : (
          <div className="grid stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {decks.map((d) => {
              const deck = JSON.parse(d.data) as Deck;
              return (
                <Link key={d.id} href={`/slides/${d.id}`} className="card deckcard">
                  <div className="deckthumb"><Scaled><SlideView slide={deck.slides[0]} theme={deck.theme} number={1} /></Scaled></div>
                  <b>{d.title}</b>
                  <span className="small muted">{deck.slides.length} slides · {THEMES[deck.theme]?.name} · edited {fmtDate(d.updated_at)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
