import { AgentStatusBadge } from "@/app/components/AgentStatusBadge";
import { ConfiguredAgentShell } from "@/app/components/ConfiguredAgentShell";
import {
  DatabaseNotConfiguredBanner,
  DatabaseUnavailableBanner,
} from "@/app/components/DatabaseStatusBanners";
import { ParameterHistorySection } from "@/app/components/ParameterHistorySection";
import { SearchParamsTable } from "@/app/components/SearchParamsDisplay";
import { getDashboardData, getParameterHistoryPage } from "@/lib/dashboard";
import { searchParamsSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

function HeaderDescription() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Job Finder Agent</h1>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        The Job Finder Agent is a fully autonomous agentic AI that works on your behalf to find
        jobs worth applying to. It starts with your resume—extracting your skills, target roles,
        and location—then searches live job listings, scores each one against your background, and
        saves the best matches here. After every run, it learns from the listings that fit well and
        updates its search terms so the next cycle is smarter than the last.
      </p>
    </>
  );
}

function DashboardMain({
  data,
  parameterHistory,
}: {
  data: Awaited<ReturnType<typeof getDashboardData>>;
  parameterHistory: Awaited<ReturnType<typeof getParameterHistoryPage>>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-6 py-10">
      {data.dbError && <DatabaseUnavailableBanner message={data.dbError} />}

      {!data.configured && !data.dbError && <DatabaseNotConfiguredBanner />}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Current search parameters</h2>
        {data.currentParams ? (
          <SearchParamsTable
            params={searchParamsSchema.parse(data.currentParams)}
            detailed
            className="mt-4"
          />
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            No parameters yet. Set RESUME_TEXT and run an agent cycle.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-lg font-medium">Job matches</h2>
          {data.currentEpochLabel && (
            <p className="text-sm text-zinc-500">Current era · {data.currentEpochLabel}</p>
          )}
        </div>
        {data.archivedJobCount > 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            {data.archivedJobCount} job{data.archivedJobCount === 1 ? "" : "s"} from prior eras
            preserved in the database.
          </p>
        )}
        {data.jobs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No jobs stored yet for the current era.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {data.jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {job.title}
                  </a>
                  <p className="text-sm text-zinc-600">
                    {job.company} · {job.status}
                  </p>
                </div>
                <span className="text-sm font-mono text-zinc-500">
                  score {(job.score ?? 0).toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ParameterHistorySection history={parameterHistory} />
    </main>
  );
}

function parseHistoryPage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ historyPage?: string }>;
}) {
  const { historyPage: historyPageParam } = await searchParams;
  const historyPage = parseHistoryPage(historyPageParam);
  const [data, parameterHistory] = await Promise.all([
    getDashboardData(),
    getParameterHistoryPage(historyPage),
  ]);

  if (data.configured) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
        <ConfiguredAgentShell
          headerDescription={<HeaderDescription />}
          footer={
            <footer className="border-t border-zinc-200 bg-white">
              <div className="mx-auto flex max-w-5xl items-center justify-end px-6 py-4">
                <AgentStatusBadge paused={data.paused} />
              </div>
            </footer>
          }
        >
          <DashboardMain data={data} parameterHistory={parameterHistory} />
        </ConfiguredAgentShell>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <HeaderDescription />
        </div>
      </header>
      <DashboardMain data={data} parameterHistory={parameterHistory} />
    </div>
  );
}
