import { NextResponse } from "next/server";
import { cronAllowed } from "@/lib/cron";
import { noteCron } from "@/lib/activity";
import { refreshLive } from "@/lib/live-opps";
import { cleanTmp } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Daily: refresh the live Master's & PhD feeds and delete leftover one-off uploads. Scheduled in vercel.json.
export async function GET(req: Request) {
  if (!cronAllowed(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const added = await refreshLive(true).catch(() => 0);
  const cleaned = await cleanTmp().catch(() => 0);
  await noteCron("feeds", `${added} new, ${cleaned} temp files removed`);
  return NextResponse.json({ ok: true, added, cleaned });
}
