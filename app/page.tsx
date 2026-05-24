import { ConfiguredAgentShell } from "@/app/components/ConfiguredAgentShell";
import {
  DatabaseNotConfiguredBanner,
  DatabaseUnavailableBanner,
} from "@/app/components/DatabaseStatusBanners";
import { JobMatchesSection } from "@/app/components/JobMatchesSection";
import { ParameterHistorySection } from "@/app/components/ParameterHistorySection";
import { SearchParamsTable } from "@/app/components/SearchParamsDisplay";
import { TechStackList } from "@/app/components/TechStackList";
import { getNextScheduledCycleRun } from "@/lib/agent/cronSchedule";
import { getDashboardData, getJobMatchesPage, getParameterHistoryPage } from "@/lib/dashboard";
import {
  serializeJobMatchesPage,
  serializeParameterHistoryPage,
} from "@/lib/dashboardPaginationApi";
import { parseDashboardSearchParams } from "@/lib/dashboardSearchParams";
import { searchParamsSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

function HeaderDescription() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Job Finder Agent</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        The Job Finder Agent is a fully autonomous agentic AI that works on your behalf to find
        jobs worth applying to. It starts with your resume - extracting your skills, target roles,
        and location - then searches live job listings, scores each one against your background, and
        saves the best matches here. After every run, it learns from the listings that fit well and
        updates its search terms so the next cycle is smarter than the last.
      </p>
      <TechStackList />
    </>
  );
}

function DashboardMain({
  data,
  jobMatches,
  parameterHistory,
}: {
  data: Awaited<ReturnType<typeof getDashboardData>>;
  jobMatches: ReturnType<typeof serializeJobMatchesPage>;
  parameterHistory: ReturnType<typeof serializeParameterHistoryPage>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-6 py-10">
      {data.dbError && <DatabaseUnavailableBanner message={data.dbError} />}

      {!data.configured && !data.dbError && <DatabaseNotConfiguredBanner />}

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-medium">Current search parameters</h2>
        <p className="mt-0.5 text-xs text-muted">
          (Initially set by RESUME_TEXT in env file, then iterated on with each API call)
        </p>
        {data.currentParams ? (
          <SearchParamsTable
            params={searchParamsSchema.parse(data.currentParams)}
            detailed
            className="mt-4"
          />
        ) : (
          <p className="mt-2 text-sm text-muted">
            No parameters yet. Set RESUME_TEXT and run an agent cycle.
          </p>
        )}
      </section>

      <JobMatchesSection initialData={jobMatches} />

      <ParameterHistorySection initialData={parameterHistory} />
    </main>
  );
}

export default async function Home({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{
    historyPage?: string;
    historyPageSize?: string;
    jobsPage?: string;
    jobsPageSize?: string;
  }>;
}) {
  const rawSearchParams = await searchParamsPromise;
  const searchParams = parseDashboardSearchParams(rawSearchParams);
  const [data, jobMatches, parameterHistory] = await Promise.all([
    getDashboardData(),
    getJobMatchesPage(searchParams.jobsPage, searchParams.jobsPageSize),
    getParameterHistoryPage(searchParams.historyPage, searchParams.historyPageSize),
  ]);

  const serializedJobMatches = serializeJobMatchesPage(jobMatches);
  const serializedParameterHistory = serializeParameterHistoryPage(parameterHistory);
  const nextScheduledRunAt = getNextScheduledCycleRun()?.toISOString() ?? null;

  if (data.configured) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <ConfiguredAgentShell
          headerDescription={<HeaderDescription />}
          paused={data.paused}
          nextScheduledRunAt={nextScheduledRunAt}
        >
          <DashboardMain
            data={data}
            jobMatches={serializedJobMatches}
            parameterHistory={serializedParameterHistory}
          />
        </ConfiguredAgentShell>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <HeaderDescription />
        </div>
      </header>
      <DashboardMain
        data={data}
        jobMatches={serializedJobMatches}
        parameterHistory={serializedParameterHistory}
      />
    </div>
  );
}
