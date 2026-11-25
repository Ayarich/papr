import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const ALLOWED = new Set(["planner", "title", "questionnaire", "cite-docx", "summary-docx", "poster-png", "poster-pptx"]);

// Counts uses of tools that run entirely in the browser, for the admin dashboard.
export async function POST(req: Request) {
  const { tool } = (await req.json().catch(() => ({}))) as { tool?: string };
  if (!tool || !ALLOWED.has(tool)) return NextResponse.json({ ok: false }, { status: 400 });
  const user = await getUser();
  await logActivity("tool", tool, user?.id);
  return NextResponse.json({ ok: true });
}
