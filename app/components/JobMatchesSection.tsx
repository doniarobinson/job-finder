"use client";

import { useMemo } from "react";

import { JobMatchesPageSizeSelect } from "@/app/components/JobMatchesPageSizeSelect";
import { ListPaginationFooter } from "@/app/components/ListPaginationFooter";
import { useDashboardPagination } from "@/app/hooks/useDashboardPagination";
import {
  deserializeJobMatchesPage,
  jobMatchesUrlUpdates,
  type SerializedJobMatchesPage,
} from "@/lib/dashboardPaginationApi";

export function JobMatchesSection({
  initialData,
}: {
  initialData: SerializedJobMatchesPage;
}) {
  const seed = useMemo(() => deserializeJobMatchesPage(initialData), [initialData]);
  const { data, loading, error, setPage, setPageSize } = useDashboardPagination({
    endpoint: "/api/job-matches",
    initialData: seed,
    deserialize: (json) => deserializeJobMatchesPage(json as SerializedJobMatchesPage),
    buildUrlUpdates: jobMatchesUrlUpdates,
  });

  const { jobs, page, pageSize, totalCount, totalPages } = data;

  return (
    <section
      aria-busy={loading}
      className={`rounded-xl border border-border bg-surface px-6 py-4 shadow-sm${loading ? " opacity-70" : ""}`}
    >
      <h2 className="text-lg font-medium">Job matches</h2>
      {error && (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
      {jobs.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No jobs stored yet for the current era.</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border-subtle">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-link hover:underline"
                  >
                    {job.title}
                  </a>
                  <p className="text-sm text-muted">
                    {job.company} · {job.status}
                  </p>
                </div>
                <span className="text-sm font-mono text-muted">
                  score {(job.score ?? 0).toFixed(3)}
                </span>
              </li>
            ))}
          </ul>

          {totalCount > 0 && (
            <ListPaginationFooter
              ariaLabel="Job matches pagination"
              className="mt-4 space-y-2 border-t border-border-subtle pt-3"
              page={page}
              totalPages={totalPages}
              onPrevious={() => setPage(page - 1)}
              onNext={() => setPage(page + 1)}
              pageSizeSelect={
                <JobMatchesPageSizeSelect
                  pageSize={pageSize}
                  disabled={loading}
                  onPageSizeChange={setPageSize}
                />
              }
            />
          )}
        </>
      )}
    </section>
  );
}
