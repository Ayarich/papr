"use client";
const sent = new Set<string>();
/** Records one use of a browser-only tool (once per page visit). Never throws. */
export function track(tool: string) {
  if (sent.has(tool)) return;
  sent.add(tool);
  fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool }), keepalive: true }).catch(() => 0);
}
