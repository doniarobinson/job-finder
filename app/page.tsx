import { AgentControls } from "@/app/components/AgentControls";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Job Finder Agent</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Autonomous search → match → refine loop (hybrid on Vercel + Inngest)
            </p>
          </div>
          {data.configured && <AgentControls initialPaused={data.paused} />}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        {data.dbError && (
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-6">
            <h2 className="font-medium text-rose-900">Database unavailable</h2>
            <p className="mt-2 text-sm text-rose-800">{data.dbError}</p>
            <p className="mt-2 text-sm text-rose-700">
              The dashboard still loads so you can preview the UI. Fix the connection or run{" "}
              <code className="rounded bg-rose-100 px-1">npm run db:push</code> when Neon is ready.
            </p>
          </section>
        )}

        {!data.configured && !data.dbError && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-medium text-amber-900">Database not configured</h2>
            <p className="mt-2 text-sm text-amber-800">
              Set <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> (Neon) in{" "}
              <code className="rounded bg-amber-100 px-1">.env.local</code>, then run{" "}
              <code className="rounded bg-amber-100 px-1">npm run db:push</code>. Placeholder
              values from <code className="rounded bg-amber-100 px-1">.env.example</code> are
              ignored for local UI preview.
            </p>
          </section>
        )}

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
                <li key={job.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
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
                  <span className="text-zinc-500">
                    {entry.createdAt.toLocaleString()}
                  </span>
                  <pre className="mt-2 overflow-x-auto text-xs text-zinc-700">
                    {JSON.stringify(entry.triggerPhrases, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
