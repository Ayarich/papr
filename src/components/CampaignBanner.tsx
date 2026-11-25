"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

export default function CampaignBanner({ id, title, message, left }: { id: string; title: string; message: string; left: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { if (sessionStorage.getItem("papr-banner") === id) setHidden(true); } catch { /* ignore */ } }, [id]);
  if (hidden) return null;
  return (
    <div className="campaign" role="region" aria-label={title}>
      <div className="wrap">
        <span className="flame"><Icon name="flame" size={16} /></span>
        <b>{title}</b><span className="msg">{message}</span><span className="left">{left}</span>
        <Link href="/submit" className="go">Drop your paper →</Link>
        <button type="button" aria-label="Hide banner" onClick={() => { setHidden(true); try { sessionStorage.setItem("papr-banner", id); } catch { /* ignore */ } }}>×</button>
      </div>
    </div>
  );
}
