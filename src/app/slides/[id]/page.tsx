import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { ensureDecks, type DeckRow } from "@/lib/decks";
import type { Deck } from "@/lib/deck";
import DeckEditor from "@/components/slides/DeckEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Slide editor" };

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/slides/${id}`);
  await ensureDecks();
  const row = await one<DeckRow>("SELECT * FROM decks WHERE id = ? AND owner_id = ?", [id, user.id]);
  if (!row) notFound();
  return <DeckEditor id={row.id} initial={JSON.parse(row.data) as Deck} />;
}
