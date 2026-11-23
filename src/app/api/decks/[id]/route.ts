import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { one, run, nowIso } from "@/lib/db";
import { ensureDecks, type DeckRow } from "@/lib/decks";

async function owned(id: string) {
  const user = await getUser();
  if (!user) return null;
  await ensureDecks();
  return one<DeckRow>("SELECT * FROM decks WHERE id = ? AND owner_id = ?", [id, user.id]);
}

// Saves edits from the slide editor (autosave).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = await owned(id);
  if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.slides)) return NextResponse.json({ error: "Bad deck" }, { status: 400 });
  const data = JSON.stringify(body);
  if (data.length > 500000) return NextResponse.json({ error: "This deck is too large." }, { status: 413 });
  await run("UPDATE decks SET title = ?, data = ?, updated_at = ? WHERE id = ?", [String(body.title || "Untitled").slice(0, 200), data, nowIso(), id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = await owned(id);
  if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await run("DELETE FROM decks WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
