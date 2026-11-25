"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Reloads the dashboard data every minute while switched on (no full page reload).
export default function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [at, setAt] = useState(() => new Date());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => { router.refresh(); setAt(new Date()); }, seconds * 1000);
    return () => clearInterval(t);
  }, [on, seconds, router]);
  return (
    <div className="row small muted" style={{ gap: 10 }}>
      <span>Updated {at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      <button type="button" className="btn ghost sm" onClick={() => { router.refresh(); setAt(new Date()); }}>↻ Refresh</button>
      <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Auto every {seconds}s</label>
    </div>
  );
}
