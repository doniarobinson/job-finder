import { AgentStatusBadge } from "@/app/components/AgentStatusBadge";
import { ConfiguredAgentShell } from "@/app/components/ConfiguredAgentShell";
import {
  DatabaseNotConfiguredBanner,
  DatabaseUnavailableBanner,
} from "@/app/components/DatabaseStatusBanners";
import { getDashboardData } from "@/lib/dashboard";

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
}: {
  data: Awaited<ReturnType<typeof getDashboardData>>;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-6 py-10">
      {data.dbError && <DatabaseUnavailableBanner message={data.dbError} />}

      {!data.configured && !data.dbError && <DatabaseNotConfiguredBanner />}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Current search parameters</h2>
        {data.currentParams ? (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-100 p-4 text-xs">
            {JSON.stringify(data.currentParams, null, 2)}
          </pre>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            No parameters yet. Set RESUME_TEXT and run an agent cycle.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Job matches</h2>
        {data.jobs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No jobs stored yet.</p>
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

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Parameter history</h2>
        {data.paramHistory.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No refinements recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.paramHistory.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-zinc-100 p-3 text-sm">
                <span className="text-zinc-500">{entry.createdAt.toLocaleString()}</span>
                <pre className="mt-2 overflow-x-auto text-xs text-zinc-700">
                  {JSON.stringify(entry.triggerPhrases, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default async function Home() {
  const data = await getDashboardData();

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
          <DashboardMain data={data} />
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
      <DashboardMain data={data} />
    </div>
  );
}
