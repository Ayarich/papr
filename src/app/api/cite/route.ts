import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { lookup, LookupError } from "@/lib/cite-lookup";
import { logActivity } from "@/lib/activity";

export const maxDuration = 30;

// Turns a DOI or link into reference details for the citation generator.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Log in to use the tools. It's free." }, { status: 401 });
  const { q } = (await req.json().catch(() => ({}))) as { q?: string };
  if (!q || q.length > 2000) return NextResponse.json({ error: "Paste a DOI or a link." }, { status: 400 });
  try {
    const source = await lookup(q);
    await logActivity("tool", "cite", user.id);
    return NextResponse.json({ source });
  } catch (e) {
    if (e instanceof LookupError) return NextResponse.json({ error: e.message }, { status: 422 });
    return NextResponse.json({ error: "Couldn't look that up. Check your connection, or fill in the details yourself." }, { status: 502 });
  }
}
