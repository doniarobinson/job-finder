import { JobMatchesPageSizeSelect } from "@/app/components/JobMatchesPageSizeSelect";
import { ListPaginationFooter } from "@/app/components/ListPaginationFooter";
import {
  dashboardSearchHref,
  type DashboardSearchParams,
} from "@/lib/dashboardSearchParams";
import type { JobMatchesPage } from "@/lib/dashboard";

export function JobMatchesSection({
  jobMatches,
  searchParams,
}: {
  jobMatches: JobMatchesPage;
  searchParams: DashboardSearchParams;
}) {
  const { jobs, page, pageSize, totalCount, totalPages } = jobMatches;

  return (
    <section className="rounded-xl border border-border bg-surface px-6 py-4 shadow-sm">
      <h2 className="text-lg font-medium">Job matches</h2>
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
              previousHref={
                page > 1
                  ? dashboardSearchHref(searchParams, { jobsPage: page - 1 })
                  : undefined
              }
              nextHref={
                page < totalPages
                  ? dashboardSearchHref(searchParams, { jobsPage: page + 1 })
                  : undefined
              }
              pageSizeSelect={
                <JobMatchesPageSizeSelect searchParams={searchParams} pageSize={pageSize} />
              }
            />
          )}
        </>
      )}
    </section>
  );
}
