import { NextResponse } from "next/server";
import { cronAllowed } from "@/lib/cron";
import { noteCron } from "@/lib/activity";
import { sendDigests } from "@/lib/follows";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Weekly (Monday morning): emails each user what's new from people and fields they follow. Scheduled in vercel.json.
export async function GET(req: Request) {
  if (!cronAllowed(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const sent = await sendDigests();
  await noteCron("digest", `${sent} digests sent`);
  return NextResponse.json({ ok: true, sent });
}
