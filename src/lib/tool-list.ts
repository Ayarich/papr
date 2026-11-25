import type { IconName } from "@/components/Icon";

export const TOOL_LIST: { href: string; icon: IconName; name: string; desc: string; tag: string }[] = [
  { href: "/slides", icon: "slides", name: "Slides", desc: "Turn your paper into an editable PowerPoint deck in seconds.", tag: "Defence" },
  { href: "/tools/precheck", icon: "precheck", name: "Pre-check", desc: "Similarity check plus an abstract polisher, before your supervisor sees it.", tag: "Before you submit" },
  { href: "/tools/references", icon: "references", name: "Reference checker", desc: "Find missing citations and format your list to APA 7.", tag: "Before you submit" },
  { href: "/tools/poster", icon: "poster", name: "Poster maker", desc: "An editable A0 poster for project fairs, with a QR code to your paper.", tag: "Project fair" },
  { href: "/tools/defence", icon: "defence", name: "Defence practice", desc: "Likely panel questions from your own paper, with a 2-minute timer.", tag: "Defence" },
];
