"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// A thin bar at the top of the screen while the next page loads.
export default function RouteProgress() {
  const path = usePathname();
  const search = useSearchParams();
  const [width, setWidth] = useState(0);
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start when an internal link is clicked or a form is submitted
  useEffect(() => {
    const start = () => {
      if (timer.current) clearInterval(timer.current);
      setOn(true); setWidth(12);
      timer.current = setInterval(() => setWidth((w) => (w < 85 ? w + (90 - w) * 0.08 : w)), 180);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || /\/pdf$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => { const f = e.target as HTMLFormElement; if ((f.method || "get").toLowerCase() === "get" && f.action.startsWith(location.origin)) start(); };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("submit", onSubmit); };
  }, []);

  // Finish when the new page is showing
  useEffect(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setWidth(100);
    const t = setTimeout(() => { setOn(false); setTimeout(() => setWidth(0), 300); }, 250);
    return () => clearTimeout(t);
  }, [path, search]);

  return <div className={`route-bar${on ? " on" : ""}`} style={{ width: `${width}%` }} aria-hidden="true" />;
}
