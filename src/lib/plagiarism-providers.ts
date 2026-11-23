// Plug-in point for a commercial plagiarism service (web pages, journals, other universities).
//
// papr's own engine (plagiarism.ts) compares against every paper in papr. Turnitin-level coverage
// needs a provider with a large database. Good options:
//   - Crossref Similarity Check (powered by iThenticate, made by Turnitin): available to Crossref members,
//     which papr will be once it registers DOIs.
//   - Copyleaks or similar services with a scanning API.
//
// To connect one: set PLAGIARISM_PROVIDER and its key in .env, then implement `submit` below with
// that service's API (send the text or PDF, wait for the result, return sources with percentages).
// The pre-check and moderation pages show provider results next to papr's own results.

export type ProviderSource = { title: string; url: string; percent: number };
export type ProviderResult = { provider: string; percent: number; sources: ProviderSource[] };

export function providerName(): string | null {
  return process.env.PLAGIARISM_PROVIDER || null;
}

export async function externalCheck(_text: string): Promise<ProviderResult | null> {
  const provider = providerName();
  if (!provider) return null;
  // Example shape once implemented:
  //   const r = await fetch(PROVIDER_URL, { method: "POST", headers: { Authorization: `Bearer ${process.env.PLAGIARISM_API_KEY}` }, body: ... });
  //   return { provider, percent: ..., sources: [...] };
  console.warn(`[plagiarism] Provider "${provider}" is set but not implemented yet. See src/lib/plagiarism-providers.ts`);
  return null;
}
