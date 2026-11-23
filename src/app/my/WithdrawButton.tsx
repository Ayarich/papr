"use client";
import { useState } from "react";
import { withdraw } from "./actions";

export default function WithdrawButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <button type="button" className="btn danger sm" onClick={() => setConfirm(true)}>Withdraw</button>;
  return (
    <form action={withdraw} className="notice bad stack" style={{ gap: 10, width: "100%" }}>
      <input type="hidden" name="id" value={id} />
      <p className="small"><b>Withdraw this paper?</b> The PDF will be removed, but the page and DOI stay with a &ldquo;Withdrawn&rdquo; notice so existing citations still work. This can&apos;t be undone.</p>
      <div className="row"><button type="submit" className="btn danger sm">Yes, withdraw</button><button type="button" className="btn sm" onClick={() => setConfirm(false)}>Keep it published</button></div>
    </form>
  );
}
