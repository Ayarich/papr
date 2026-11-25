// Next.js calls this for every unhandled server error, so they show up on the admin dashboard.
export function register() {}

export async function onRequestError(err: unknown, request: { path: string; method: string }) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { logActivity } = await import("./lib/activity");
      const e = err as { message?: string; digest?: string };
      await logActivity("error", `${request.method} ${request.path}: ${e?.message || String(err)}${e?.digest ? ` (digest ${e.digest})` : ""}`);
    } catch { /* ignore */ }
  }
}
