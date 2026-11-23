import Link from "next/link";

const TABS = [
  ["overview", "/admin", "Overview"], ["queue", "/moderate", "Review queue"], ["import", "/admin/import", "Import & claims"],
  ["people", "/admin/people", "People"], ["opportunities", "/admin/opportunities", "Opportunities"], ["campaigns", "/admin/campaigns", "Campaigns"],
  ["awards", "/admin/awards", "Paper of the Month"], ["digest", "/admin/digest", "Weekly digest"],
] as const;

export default function AdminNav({ active }: { active: string }) {
  return (
    <nav className="subnav" aria-label="Admin">
      {TABS.map(([k, href, label]) => <Link key={k} href={href} aria-current={active === k ? "page" : undefined}>{label}</Link>)}
    </nav>
  );
}
