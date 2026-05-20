import type { NormalizedJob, SearchParams } from "@/lib/types";

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

export async function searchAdzuna(params: SearchParams): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn("Adzuna credentials missing; returning empty job set.");
    return [];
  }

  const what = [...params.titleVariants, ...params.keywords].filter(Boolean).join(" ") || "software engineer";
  const where = params.locations[0] ?? "";
  const query = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(Math.min(params.maxResultsPerCycle, 50)),
    what,
  });

  if (where) query.set("where", where);
  if (params.remote) query.set("what", `${what} remote`);

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
