"use client";

import { useMemo } from "react";

import { ListPaginationFooter } from "@/app/components/ListPaginationFooter";
import { ParameterHistoryPageSizeSelect } from "@/app/components/ParameterHistoryPageSizeSelect";
import { SearchParamsTable } from "@/app/components/SearchParamsDisplay";
import { useDashboardPagination } from "@/app/hooks/useDashboardPagination";
import { epochKindLabel } from "@/lib/agent/epochLabels";
import {
  deserializeParameterHistoryPage,
  parameterHistoryUrlUpdates,
  type SerializedParameterHistoryPage,
} from "@/lib/dashboardPaginationApi";
import type { ParameterHistoryPage } from "@/lib/dashboard";

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
      className="flex items-center gap-3 py-2.5 text-base font-semibold uppercase tracking-wide text-muted"
    >
      <span className="h-px flex-1 bg-border-subtle" />
      <span>
        {label} · {startedAt.toLocaleString()}
      </span>
      <span className="h-px flex-1 bg-border-subtle" />
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
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{heading}</h3>
        <time
          className="mt-0.5 block text-xs text-muted"
          dateTime={entry.createdAt.toISOString()}
        >
          {entry.createdAt.toLocaleString()}
        </time>
      </>
    );
  }

  return (
    <time className="text-xs text-muted" dateTime={entry.createdAt.toISOString()}>
      {entry.createdAt.toLocaleString()}
    </time>
  );
}

export function ParameterHistorySection({
  initialData,
}: {
  initialData: SerializedParameterHistoryPage;
}) {
  const seed = useMemo(() => deserializeParameterHistoryPage(initialData), [initialData]);
  const { data, loading, error, setPage, setPageSize } = useDashboardPagination({
    endpoint: "/api/parameter-history",
    initialData: seed,
    deserialize: (json) => deserializeParameterHistoryPage(json as SerializedParameterHistoryPage),
    buildUrlUpdates: parameterHistoryUrlUpdates,
  });

  const { entries, page, pageSize, currentEpochCount, totalPages, totalCount } = data;

  return (
    <section
      aria-busy={loading}
      className={`rounded-xl border border-border bg-surface p-6 shadow-sm${loading ? " opacity-70" : ""}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">Parameter history</h2>
          <p className="mt-0.5 text-xs text-muted">(Newest to oldest)</p>
        </div>
        {currentEpochCount > 0 && (
          <p className="text-sm text-muted sm:pt-0.5">
            {currentEpochCount} saved version{currentEpochCount === 1 ? "" : "s"} for current
            epoch/era
          </p>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No parameter versions saved yet.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-6">
            {entries.map((entry) => (
              <li key={entry.id}>
                <div className="rounded-lg border border-border-subtle px-4 py-3">
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
              onPrevious={() => setPage(page - 1)}
              onNext={() => setPage(page + 1)}
              pageSizeSelect={
                <ParameterHistoryPageSizeSelect
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
