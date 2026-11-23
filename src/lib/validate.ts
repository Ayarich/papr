// Shared by the browser (to show errors as you type) and the server (to enforce them).

export type Coauthor = { name: string; email: string };
export type Declarations = { author: boolean; original: boolean; privacy: boolean; supervisor: boolean };

export type DraftData = {
  name: string;
  institution: string;
  programme: string;
  level: string;
  title: string;
  abstract: string;
  keywords: string[];
  field: string;
  type: string;
  year: string;
  coauthors: Coauthor[];
  supName: string;
  supEmail: string;
  notifySup: boolean;
  decl: Declarations;
};

export type Errors = Record<string, string>;

export const ABSTRACT_MIN = 120;
export const ABSTRACT_MAX = 400;

export function words(s: string): number {
  return (String(s || "").trim().match(/\S+/g) || []).length;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStep(step: number, d: DraftData, hasFile: boolean): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!d.name?.trim()) e.name = "Enter your full name.";
    if (!d.institution) e.institution = "Choose your institution.";
    if (!d.programme?.trim()) e.programme = "Enter your programme of study.";
  }
  if (step === 1) {
    if ((d.title || "").trim().length < 10) e.title = "Enter a title of at least 10 characters.";
    const w = words(d.abstract);
    if (w < ABSTRACT_MIN) e.abstract = `Your abstract has ${w} words. Add at least ${ABSTRACT_MIN - w} more so readers understand your work.`;
    else if (w > ABSTRACT_MAX) e.abstract = `Your abstract has ${w} words. Shorten it to ${ABSTRACT_MAX} or fewer.`;
    const k = d.keywords?.length || 0;
    if (k < 3) e.keywords = `Add ${3 - k} more keyword${3 - k === 1 ? "" : "s"} (at least 3).`;
    if (k > 6) e.keywords = "Use at most 6 keywords.";
    if (!d.field) e.field = "Choose a field.";
  }
  if (step === 2) {
    if (!d.supName?.trim()) e.supName = "Enter your supervisor's name.";
    if (!EMAIL_RE.test((d.supEmail || "").trim())) e.supEmail = "Enter a valid email address for your supervisor.";
    (d.coauthors || []).forEach((c, i) => {
      if (!c.name?.trim()) e["ca" + i] = `Enter a name for co-author ${i + 1}, or remove them.`;
      if (c.email && !EMAIL_RE.test(c.email.trim())) e["ca" + i] = `Co-author ${i + 1}'s email doesn't look right.`;
    });
  }
  if (step === 3) {
    if (!hasFile) e.file = "Upload your PDF to continue.";
  }
  if (step === 4) {
    const dd = d.decl || ({} as Declarations);
    if (!(dd.author && dd.original && dd.privacy && dd.supervisor))
      e.decl = "Tick all four boxes to continue. If one doesn't apply, sort it out before publishing.";
  }
  return e;
}

export function validateAll(d: DraftData, hasFile: boolean): Errors {
  return Object.assign({}, ...[0, 1, 2, 3, 4].map((s) => validateStep(s, d, hasFile)));
}

export function emptyDraft(): DraftData {
  return {
    name: "",
    institution: "",
    programme: "",
    level: "Level 400",
    title: "",
    abstract: "",
    keywords: [],
    field: "",
    type: "Final-year project",
    year: "2026",
    coauthors: [],
    supName: "",
    supEmail: "",
    notifySup: true,
    decl: { author: false, original: false, privacy: false, supervisor: false },
  };
}
