import { getUser, isModerator } from "@/lib/auth";
import { one } from "@/lib/db";
import { unreadCount } from "@/lib/notify";
import { activeCampaign, timeLeft } from "@/lib/campaigns";
import NavShell, { type NavLink } from "./NavShell";
import CampaignBanner from "./CampaignBanner";

// Works out what the navbar shows for whoever is logged in.
export default async function Header() {
  const user = await getUser();
  const links: NavLink[] = [
    { href: "/library", label: "Library" },
    { href: "/topics", label: "Topics" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/tools", label: "Tools", isNew: true },
  ];
  const menu: NavLink[] = [];
  let unread = 0;
  if (user) {
    unread = await unreadCount(user.id);
    if (user.role === "student" || user.role === "lecturer") {
      const r = await one<{ n: number }>("SELECT COUNT(*) AS n FROM submissions WHERE owner_id = ? AND status = 'changes'", [user.id]);
      menu.push({ href: "/my", label: "My submissions", badge: r?.n || 0 });
    }
    menu.push({ href: "/profile", label: "My profile" }, { href: "/following", label: "Following" }, { href: "/slides", label: "My slides" });
    if (["lecturer", "moderator", "admin"].includes(user.role)) menu.push({ href: "/collections", label: "My collections" });
    if (isModerator(user)) {
      const r = await one<{ n: number }>("SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'");
      menu.push({ href: "/moderate", label: "Review queue", badge: r?.n || 0 }, { href: "/admin", label: "Admin" });
    }
    menu.push({ href: "/talent", label: "Find talent" });
  }
  const camp = await activeCampaign();
  return (
    <>
      {camp && <CampaignBanner id={camp.id} title={camp.title} message={camp.message} left={timeLeft(camp.ends_at)} />}
      <NavShell
        links={links}
        menu={menu}
        unread={unread}
        canSubmit={!user || user.role === "student" || user.role === "lecturer"}
        user={user ? { name: user.name || user.email, email: user.email, role: user.role } : null}
      />
    </>
  );
}
