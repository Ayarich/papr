import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getUser } from "@/lib/auth";
import { MAX_PDF_BYTES } from "@/lib/constants";
import { blobEnabled, isBlobPath } from "@/lib/storage";

// Tells the browser whether to upload PDFs straight to Blob storage (on Vercel) or inside the form (on your computer).
export async function GET() {
  return NextResponse.json({ blob: blobEnabled() });
}

// Hands a logged-in user a short-lived token to upload one PDF (max 20 MB) directly to the private Blob store.
export async function POST(request: Request) {
  if (!blobEnabled()) return NextResponse.json({ error: "Blob storage isn't set up." }, { status: 501 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getUser();
        if (!user) throw new Error("Log in to upload files.");
        if (!isBlobPath(pathname)) throw new Error("Only PDF files can be uploaded.");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_PDF_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
