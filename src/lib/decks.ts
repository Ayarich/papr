import { ready } from "./db";

/** Kept for older imports: the decks table is now created by the automatic database upgrade. */
export function ensureDecks() {
  return ready();
}

export type DeckRow = { id: string; owner_id: string; submission_id: string | null; title: string; data: string; created_at: string; updated_at: string };

/** Pulls the text out of a PDF. Returns "" for scanned PDFs that contain only images. */
export async function pdfText(buf: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).slice(0, 150000);
}
