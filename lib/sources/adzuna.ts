import type { NormalizedJob, SearchParams } from "@/lib/types";
import { DEFAULT_SEARCH_RADIUS_KM } from "@/lib/types";

type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  description: string;
  redirect_url: string;
  location?: { display_name?: string };
};

type AdzunaResponse = {
  results: AdzunaJob[];
};

const COUNTRY = process.env.ADZUNA_COUNTRY ?? "us";
const DEFAULT_TITLE = "software engineer";

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const term of terms) {
    const trimmed = term.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(trimmed);
  }

  return unique;
}

/** Builds Adzuna search query params: primary title in `what`, skills in `what_or`. */
export function buildAdzunaSearchQuery(
  params: SearchParams,
  credentials: { appId: string; appKey: string }
): URLSearchParams {
  const primaryTitle = params.titleVariants[0]?.trim() || DEFAULT_TITLE;
  const what = params.remote ? `${primaryTitle} remote` : primaryTitle;

  const orTerms = uniqueTerms([
    ...params.titleVariants.slice(1),
    ...params.keywords,
  ]);

  const query = new URLSearchParams({
    app_id: credentials.appId,
    app_key: credentials.appKey,
    results_per_page: String(Math.min(params.maxResultsPerCycle, 50)),
    what,
  });

  if (orTerms.length > 0) {
    query.set("what_or", orTerms.join(" "));
  }

  const where = params.locations[0]?.trim();
  if (where) {
    query.set("where", where);
    query.set("distance", String(params.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM));
  }

  const exclude = uniqueTerms(params.negativeKeywords).join(" ");
  if (exclude) query.set("what_exclude", exclude);

  return query;
}

export async function searchAdzuna(params: SearchParams): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn("Adzuna credentials missing; returning empty job set.");
    return [];
  }

  const query = buildAdzunaSearchQuery(params, { appId, appKey });
  const url = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1?${query.toString()}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) {
    throw new Error(`Adzuna API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as AdzunaResponse;

  return (data.results ?? []).map((job) => ({
    externalId: String(job.id),
    title: job.title,
    company: job.company.display_name,
    description: job.description,
    url: job.redirect_url,
    location: job.location?.display_name,
    source: "adzuna",
  }));
}
