import Link from "next/link";

import { SearchParamsTable } from "@/app/components/SearchParamsDisplay";
import type { ParameterHistoryPage } from "@/lib/dashboard";

function historyPageHref(page: number): string {
  return page <= 1 ? "/" : `/?historyPage=${page}`;
}

function EpochDivider({
  label,
  startedAt,
}: {
  label: string;
  startedAt: Date;
}) {
  return (
    <div
      aria-label={`${label} epoch boundary`}
      className="flex items-center gap-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500"
    >
      <span className="h-px flex-1 bg-zinc-200" />
      <span>
        {label} · {startedAt.toLocaleString()}
      </span>
      <span className="h-px flex-1 bg-zinc-200" />
    </div>
  );
}

export function ParameterHistorySection({ history }: { history: ParameterHistoryPage }) {
  const { entries, page, totalCount, totalPages } = history;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-lg font-medium">Parameter history</h2>
        {totalCount > 0 && (
          <p className="text-sm text-zinc-500">
            {totalCount} saved version{totalCount === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No parameter versions saved yet.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-6">
            {entries.map((entry) => (
              <li key={entry.id}>
                <div className="rounded-lg border border-zinc-100 px-4 py-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <time className="text-sm text-zinc-500" dateTime={entry.createdAt.toISOString()}>
                      {entry.createdAt.toLocaleString()}
                    </time>
                    {entry.epochLabel && (
                      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                        {entry.epochLabel}
                      </span>
                    )}
                    {entry.isCurrent && (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
                        Current
                      </span>
                    )}
                  </div>
                  <SearchParamsTable params={entry.params} />
                </div>
                {entry.showEpochDividerAfter && entry.epochStartedAt && (
                  <div className="mt-6">
                    <EpochDivider
                      label={entry.epochLabel ?? "Prior era"}
                      startedAt={entry.epochStartedAt}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav
              aria-label="Parameter history pagination"
              className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4"
            >
              {page > 1 ? (
                <Link
                  href={historyPageHref(page - 1)}
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="text-sm text-zinc-400">← Previous</span>
              )}

              <span className="text-sm text-zinc-600">
                Page {page} of {totalPages}
              </span>

              {page < totalPages ? (
                <Link
                  href={historyPageHref(page + 1)}
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  Next →
                </Link>
              ) : (
                <span className="text-sm text-zinc-400">Next →</span>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
