export const FIELDS = [
  "Engineering & Technology",
  "Earth & Environmental Sciences",
  "Health Sciences",
  "Agriculture & Food",
  "Business & Economics",
  "Computing & IT",
  "Education",
  "Natural Sciences",
  "Social Sciences & Humanities",
];

export const INSTITUTIONS = [
  "University of Mines and Technology (UMaT)",
  "Kwame Nkrumah University of Science and Technology (KNUST)",
  "University of Ghana (UG)",
  "University of Cape Coast (UCC)",
  "University for Development Studies (UDS)",
  "University of Education, Winneba (UEW)",
  "University of Energy and Natural Resources (UENR)",
  "University of Health and Allied Sciences (UHAS)",
  "Ashesi University",
  "Ghana Communication Technology University (GCTU)",
  "Accra Technical University",
  "Kumasi Technical University",
  "Takoradi Technical University",
  "Other institution",
];

export const TYPES = [
  "Final-year project",
  "Undergraduate thesis",
  "Seminar / term paper",
  "Conference paper",
  "Research article",
];

export const LEVELS = ["Level 300", "Level 400", "Level 500", "Recent graduate (within 2 years)"];

export const YEARS = ["2026", "2025", "2024", "2023", "2022"];

export const STATUS_LABEL: Record<string, string> = {
  pending: "In review",
  changes: "Changes requested",
  published: "Published",
  rejected: "Not accepted",
  withdrawn: "Withdrawn",
};

export const CHECKS: { key: string; title: string; help: string }[] = [
  { key: "research", title: "It's genuine research", help: "Has a clear problem, method, results and references. Not just a class essay." },
  { key: "meta", title: "Details are complete and accurate", help: "Title, abstract, keywords and field match the PDF." },
  { key: "sim", title: "Similarity check is acceptable", help: "Under 25%, or the overlap is properly quoted and cited." },
  { key: "privacy", title: "No personal or confidential data", help: "No participant names, phone numbers, photos or confidential company data." },
  { key: "pdf", title: "The PDF opens and is readable", help: "The final version, not a draft with tracked changes." },
];

export const MAX_PDF_BYTES = 20 * 1024 * 1024;

/** "University of Mines and Technology (UMaT)" -> "UMaT" */
export function shortInst(name: string): string {
  const m = name.match(/\(([^)]+)\)/);
  return m ? m[1] : name;
}
