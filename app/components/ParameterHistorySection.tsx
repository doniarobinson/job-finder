import { ListPaginationFooter } from "@/app/components/ListPaginationFooter";
import { ParameterHistoryPageSizeSelect } from "@/app/components/ParameterHistoryPageSizeSelect";
import { SearchParamsTable } from "@/app/components/SearchParamsDisplay";
import { epochKindLabel } from "@/lib/agent/epochs";
import type { ParameterHistoryPage } from "@/lib/dashboard";
import {
  dashboardSearchHref,
  type DashboardSearchParams,
} from "@/lib/dashboardSearchParams";

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
      className="flex items-center gap-3 py-2.5 text-base font-semibold uppercase tracking-wide text-zinc-600"
    >
      <span className="h-px flex-1 bg-zinc-200" />
      <span>
        {label} · {startedAt.toLocaleString()}
      </span>
      <span className="h-px flex-1 bg-zinc-200" />
    </div>
  );
}

function entryHeading(entry: ParameterHistoryPage["entries"][number]): string | null {
  if (entry.epochLabel) return entry.epochLabel;
  if (entry.isCurrent) return "Current Parameters";
  return null;
}

function EntryHeader({ entry }: { entry: ParameterHistoryPage["entries"][number] }) {
  const heading = entryHeading(entry);

  if (heading) {
    return (
      <>
        <h3 className="text-sm font-semibold tracking-tight text-zinc-900">{heading}</h3>
        <time
          className="mt-0.5 block text-xs text-zinc-500"
          dateTime={entry.createdAt.toISOString()}
        >
          {entry.createdAt.toLocaleString()}
        </time>
      </>
    );
  }

  return (
    <time className="text-xs text-zinc-500" dateTime={entry.createdAt.toISOString()}>
      {entry.createdAt.toLocaleString()}
    </time>
  );
}

export function ParameterHistorySection({
  history,
  searchParams,
}: {
  history: ParameterHistoryPage;
  searchParams: DashboardSearchParams;
}) {
  const { entries, page, pageSize, currentEpochCount, totalPages, totalCount } = history;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">Parameter history</h2>
          <p className="mt-0.5 text-xs text-zinc-500">(Newest to oldest)</p>
        </div>
        {currentEpochCount > 0 && (
          <p className="text-sm text-zinc-500 sm:pt-0.5">
            {currentEpochCount} saved version{currentEpochCount === 1 ? "" : "s"} for current
            epoch/era
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
                  <div className="mb-2">
                    <EntryHeader entry={entry} />
                  </div>
                  <SearchParamsTable
                    params={entry.params}
                    highlightKeywords={
                      entry.cycleAddedKeywords.length > 0
                        ? new Set(entry.cycleAddedKeywords)
                        : undefined
                    }
                  />
                </div>
                {entry.showEpochDividerAfter && entry.epochStartedAt && (
                  <div className="mt-6">
                    <EpochDivider
                      label={
                        entry.epochKind ? epochKindLabel(entry.epochKind) : "Prior era"
                      }
                      startedAt={entry.epochStartedAt}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {totalCount > 0 && (
            <ListPaginationFooter
              ariaLabel="Parameter history pagination"
              page={page}
              totalPages={totalPages}
              previousHref={
                page > 1
                  ? dashboardSearchHref(searchParams, { historyPage: page - 1 })
                  : undefined
              }
              nextHref={
                page < totalPages
                  ? dashboardSearchHref(searchParams, { historyPage: page + 1 })
                  : undefined
              }
              pageSizeSelect={
                <ParameterHistoryPageSizeSelect
                  searchParams={searchParams}
                  pageSize={pageSize}
                />
              }
            />
          )}
        </>
      )}
    </section>
  );
}
