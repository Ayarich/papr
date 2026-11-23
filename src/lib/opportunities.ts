export const OPP_TYPES = [
  { key: "internship", label: "Internship", emoji: "💼" },
  { key: "national-service", label: "National service", emoji: "🇬🇭" },
  { key: "masters", label: "Master's", emoji: "🎓" },
  { key: "phd", label: "PhD", emoji: "🔬" },
  { key: "scholarship", label: "Scholarship", emoji: "💰" },
  { key: "grad-school", label: "Grad school", emoji: "🏛️" },
  { key: "conference", label: "Conference", emoji: "🎤" },
  { key: "job", label: "Job", emoji: "🧑‍💻" },
  { key: "grant", label: "Grant / competition", emoji: "🏆" },
];
export const oppType = (k: string) => OPP_TYPES.find((t) => t.key === k) || { key: k, label: k, emoji: "📌" };
