import type { IconName } from "@/components/Icon";

export type Stage = "Plan" | "Write" | "Check" | "Present" | "Apply";
export const STAGES: { key: Stage; title: string; desc: string }[] = [
  { key: "Plan", title: "Plan your project", desc: "Pick a sharp title, plan your time and build your questionnaire." },
  { key: "Write", title: "Write it up", desc: "Get references right as you write." },
  { key: "Check", title: "Check before you submit", desc: "Catch problems before your supervisor does." },
  { key: "Present", title: "Defend and present", desc: "Slides, a poster and practice for the panel." },
  { key: "Apply", title: "Use it for what's next", desc: "Turn your project into something for applications." },
];

export const TOOL_LIST: { href: string; icon: IconName; name: string; desc: string; tag: string; stage: Stage; isNew?: boolean; popular?: boolean }[] = [
  { href: "/tools/title", icon: "heading", name: "Title helper", desc: "Score your project title and get sharper versions with place, period and method.", tag: "Getting started", stage: "Plan", isNew: true },
  { href: "/tools/planner", icon: "calendar", name: "Project planner", desc: "A chapter-by-chapter timeline to your deadline, with reminders in your phone's calendar.", tag: "Getting started", stage: "Plan", isNew: true, popular: true },
  { href: "/tools/questionnaire", icon: "questionnaire", name: "Questionnaire builder", desc: "Likert scales and background questions, as a printable Word file plus a codebook.", tag: "Data collection", stage: "Plan", isNew: true },
  { href: "/tools/cite", icon: "quote", name: "Citation generator", desc: "Paste a DOI or link and get a correct APA 7 reference and in-text citation.", tag: "Writing", stage: "Write", isNew: true, popular: true },
  { href: "/tools/references", icon: "references", name: "Reference checker", desc: "Find missing citations and format your list to APA 7.", tag: "Before you submit", stage: "Check", popular: true },
  { href: "/tools/structure", icon: "structure", name: "Structure check", desc: "Chapters, word counts per chapter, and table and figure numbering.", tag: "Before you submit", stage: "Check", isNew: true },
  { href: "/tools/precheck", icon: "precheck", name: "Pre-check", desc: "Similarity check plus an abstract polisher, before your supervisor sees it.", tag: "Before you submit", stage: "Check", popular: true },
  { href: "/slides", icon: "slides", name: "Slides", desc: "Turn your paper into an editable PowerPoint deck in seconds.", tag: "Defence", stage: "Present", popular: true },
  { href: "/tools/defence", icon: "defence", name: "Defence practice", desc: "A panel voice asks likely questions from your own paper, with a 2-minute timer.", tag: "Defence", stage: "Present", popular: true },
  { href: "/tools/poster", icon: "poster", name: "Poster maker", desc: "Design an A0 poster for project fairs, with your images and a QR code to your paper.", tag: "Project fair", stage: "Present" },
  { href: "/tools/summary", icon: "summary", name: "Research summary", desc: "A one-page summary of your project for Master's, PhD and job applications.", tag: "Applications", stage: "Apply", isNew: true },
];
