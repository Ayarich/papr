"use client";
// Adds a PDF to a form before it is sent. On Vercel the file goes straight to Blob storage first
// (requests to the app are limited to 4.5 MB), and only a small reference is sent with the form.
let mode: Promise<boolean> | null = null;
const blobOn = () => (mode ??= fetch("/api/upload").then((r) => r.json()).then((j) => !!j.blob).catch(() => false));

export async function attachPdf(fd: FormData, field: string, file: File, kind: "papers" | "tmp") {
  if (!(await blobOn())) { fd.append(field, file); return; }
  const { upload } = await import("@vercel/blob/client");
  const base = file.name.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 80) || "paper";
  try {
    const b = await upload(`${kind}/${base}.pdf`, file, { access: "private", handleUploadUrl: "/api/upload", contentType: "application/pdf" });
    fd.append(field, JSON.stringify({ blob: b.pathname, name: file.name }));
  } catch (e) {
    const msg = (e as Error).message || "";
    throw new Error(/content type|size|large/i.test(msg) ? `"${file.name}" must be a PDF under 20 MB.` : /log in/i.test(msg) ? "Your login has expired. Log in again." : "Couldn't upload the PDF. Check your connection and try again.");
  }
}
