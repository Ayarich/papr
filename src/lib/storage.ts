import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { MAX_PDF_BYTES } from "./constants";

// Where PDFs live:
// - On your computer: the "uploads" folder next to package.json.
// - On Vercel: a private Vercel Blob store (switched on automatically when BLOB_READ_WRITE_TOKEN is set).
//   Browsers upload big PDFs straight to the store (see /api/upload), because Vercel limits request bodies to 4.5 MB.
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const LOCAL_NAME = /^[a-z0-9]+\.pdf$/i;
const BLOB_NAME = /^(papers|tmp)\/[A-Za-z0-9._-]{1,200}\.pdf$/;

export const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;
export const isBlobPath = (p: string) => BLOB_NAME.test(p);

export class UploadError extends Error {}

/** A PDF that arrived with a request: either the file itself, or a reference to a file the browser put in Blob storage. */
export type IncomingPdf = { bytes: Uint8Array; name: string; size: number; blobPath?: string };

function checkBytes(bytes: Uint8Array, name: string) {
  if (bytes.length === 0) throw new UploadError("The file is empty.");
  if (bytes.length > MAX_PDF_BYTES) throw new UploadError("The file is larger than 20 MB. Try compressing the images in your report.");
  if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== "%PDF-")
    throw new UploadError(`"${name}" isn't a PDF. Save your report as PDF (in Word: File > Save As > PDF) and try again.`);
}

async function blobBytes(pathname: string): Promise<Uint8Array | null> {
  const { get } = await import("@vercel/blob");
  const r = await get(pathname, { access: "private" });
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  return new Uint8Array(await new Response(r.stream).arrayBuffer());
}

/**
 * Reads the PDF sent in a form field. `prefix` says which Blob folder is allowed:
 * "papers" for files that will be kept, "tmp" for files a tool reads once.
 * Returns null when nothing was sent.
 */
export async function receivePdf(value: FormDataEntryValue | null, prefix: "papers" | "tmp"): Promise<IncomingPdf | null> {
  if (value instanceof File) {
    if (value.size === 0) return null;
    if (value.size > MAX_PDF_BYTES) throw new UploadError("The file is larger than 20 MB. Try compressing the images in your report.");
    const bytes = new Uint8Array(await value.arrayBuffer());
    checkBytes(bytes, value.name);
    return { bytes, name: value.name.slice(0, 200), size: bytes.length };
  }
  if (typeof value !== "string" || !value.startsWith("{")) return null;
  let ref: { blob?: string; name?: string };
  try { ref = JSON.parse(value); } catch { return null; }
  const p = String(ref.blob || "");
  if (!blobEnabled() || !isBlobPath(p) || !p.startsWith(prefix + "/")) throw new UploadError("That upload couldn't be found. Choose the file again.");
  const bytes = await blobBytes(p);
  if (!bytes) throw new UploadError("That upload couldn't be found. Choose the file again.");
  const name = String(ref.name || p.split("/").pop()).slice(0, 200);
  try { checkBytes(bytes, name); } catch (e) { await discardPdf({ bytes, name, size: 0, blobPath: p }); throw e; }
  return { bytes, name, size: bytes.length, blobPath: p };
}

/** Keeps a received PDF for good and returns the details saved with the paper version. */
export async function storePdf(pdf: IncomingPdf): Promise<{ pdfPath: string; pdfName: string; pdfSize: number }> {
  if (pdf.blobPath) return { pdfPath: pdf.blobPath, pdfName: pdf.name, pdfSize: pdf.size };
  const key = crypto.randomBytes(16).toString("hex") + ".pdf";
  if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    const b = await put(`papers/${key}`, Buffer.from(pdf.bytes), { access: "private", contentType: "application/pdf" });
    return { pdfPath: b.pathname, pdfName: pdf.name, pdfSize: pdf.size };
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, key), pdf.bytes);
  return { pdfPath: key, pdfName: pdf.name, pdfSize: pdf.size };
}

/** Deletes a one-off upload (tools and slides read a PDF once and don't keep it). */
export async function discardPdf(pdf: IncomingPdf | null) {
  if (!pdf?.blobPath || !pdf.blobPath.startsWith("tmp/")) return;
  try { const { del } = await import("@vercel/blob"); await del(pdf.blobPath); } catch { /* the daily clean-up removes it */ }
}

/** Removes leftover one-off uploads older than a day (run by the daily cron). */
export async function cleanTmp() {
  if (!blobEnabled()) return 0;
  const { list, del } = await import("@vercel/blob");
  const cutoff = Date.now() - 86400000;
  let cursor: string | undefined, n = 0;
  do {
    const r = await list({ prefix: "tmp/", cursor, limit: 500 });
    const old = r.blobs.filter((b) => new Date(b.uploadedAt).getTime() < cutoff).map((b) => b.pathname);
    if (old.length) { await del(old); n += old.length; }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return n;
}

export async function readPdf(pdfPath: string): Promise<Buffer | null> {
  try {
    if (isBlobPath(pdfPath)) {
      if (!blobEnabled()) return null;
      const b = await blobBytes(pdfPath);
      return b ? Buffer.from(b) : null;
    }
    if (!LOCAL_NAME.test(pdfPath)) return null; // never allow paths like ../../
    return await fs.readFile(path.join(UPLOAD_DIR, pdfPath));
  } catch {
    return null;
  }
}
