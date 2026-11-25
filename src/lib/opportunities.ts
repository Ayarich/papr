import type { IconName } from "@/components/Icon";

export const OPP_TYPES: { key: string; label: string; icon: IconName }[] = [
  { key: "internship", label: "Internship", icon: "briefcase" },
  { key: "national-service", label: "National service", icon: "flag" },
  { key: "masters", label: "Master's", icon: "graduate" },
  { key: "phd", label: "PhD", icon: "lab" },
  { key: "scholarship", label: "Scholarship", icon: "money" },
  { key: "grad-school", label: "Grad school", icon: "building" },
  { key: "conference", label: "Conference", icon: "mic" },
  { key: "job", label: "Job", icon: "code" },
  { key: "grant", label: "Grant / competition", icon: "trophy" },
];
export const oppType = (k: string): { key: string; label: string; icon: IconName } => OPP_TYPES.find((t) => t.key === k) || { key: k, label: k, icon: "pin" };
