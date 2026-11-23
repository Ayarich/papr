"use client";
import { useState } from "react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState<"" | "ok" | "fail">("");
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone("ok"); } catch { setDone("fail"); }
        setTimeout(() => setDone(""), 2500);
      }}
    >
      {done === "ok" ? "✓ Copied" : done === "fail" ? "Select the text to copy" : label}
    </button>
  );
}
