"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions";
import { BrandMark } from "./Brand";
import ThemeToggle from "./ThemeToggle";

export type NavLink = { href: string; label: string; badge?: number; isNew?: boolean };

export default function NavShell({ links, menu, unread, canSubmit, user }: {
  links: NavLink[]; menu: NavLink[]; unread: number; canSubmit: boolean;
  user: { name: string; email: string; role: string } | null;
}) {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [acct, setAcct] = useState(false);
  const acctRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setOpen(false); setAcct(false); }, [path]);
  useEffect(() => {
    if (!acct) return;
    const close = (e: MouseEvent) => { if (!acctRef.current?.contains(e.target as Node)) setAcct(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAcct(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [acct]);

  const overlay = path === "/" && !scrolled && !open;
  const initials = user ? user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") : "";
  const cur = (href: string) => (path === href || path.startsWith(href + "/") ? "page" : undefined);
  const menuBadge = menu.reduce((a, m) => a + (m.badge || 0), 0);

  return (
    <header className={`top${overlay ? " overlay" : ""}${scrolled ? " scrolled" : ""}${open ? " menu-open" : ""}`}>
      <div className="wrap navrow">
        <Link className="brand" href="/" aria-label="papr home"><BrandMark /><b>papr</b></Link>
        <nav id="mainnav" className={`main${open ? " open" : ""}`} aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} className="navlink" href={l.href} aria-current={cur(l.href)}>
              {l.label}{l.badge ? <span className="count">{l.badge}</span> : null}{l.isNew ? <span className="newpill">New</span> : null}
            </Link>
          ))}
          {/* Account links appear inside the mobile menu */}
          {user && <div className="mobile-only mobile-acct">
            <span className="small muted">{user.email}</span>
            <Link className="navlink" href="/notifications">Notifications{unread ? <span className="count">{unread}</span> : null}</Link>
            {menu.map((m) => <Link key={m.href} className="navlink" href={m.href}>{m.label}{m.badge ? <span className="count">{m.badge}</span> : null}</Link>)}
            <form action={logout}><button className="navlink" type="submit">Log out</button></form>
          </div>}
          {canSubmit && <span className="navcta"><Link href="/submit" className="btn primary sm">Drop a paper</Link></span>}
          {!user && <span className="navcta mobile-only"><Link href="/login" className="btn sm">Log in</Link></span>}
        </nav>
        {user ? (
          <>
            <Link href="/notifications" className="icon-btn bell" aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8Zm4.5 12a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {unread ? <span className="dot">{unread > 9 ? "9+" : unread}</span> : null}
            </Link>
            <div className="acct desktop-only" ref={acctRef}>
              <button type="button" className="acct-btn" aria-expanded={acct} aria-haspopup="menu" onClick={() => setAcct(!acct)}>
                <span className="avatar">{initials || "?"}</span>{menuBadge ? <span className="count">{menuBadge}</span> : null}
              </button>
              {acct && (
                <div className="acct-menu" role="menu">
                  <div className="acct-who"><b>{user.name}</b><span className="small muted">{user.email}</span></div>
                  {menu.map((m) => <Link key={m.href} role="menuitem" href={m.href}>{m.label}{m.badge ? <span className="count">{m.badge}</span> : null}</Link>)}
                  <form action={logout}><button type="submit" role="menuitem">Log out</button></form>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link href="/login" className="btn sm desktop-only login-btn">Log in</Link>
        )}
        <ThemeToggle />
        <button type="button" className="menu-btn icon-btn" aria-expanded={open} aria-controls="mainnav" aria-label="Menu" onClick={() => setOpen(!open)}>
          <span className="bars"><span /><span /><span /></span>
        </button>
      </div>
    </header>
  );
}
