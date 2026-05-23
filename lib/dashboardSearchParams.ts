import {
  DEFAULT_JOB_MATCHES_PAGE_SIZE,
  parseJobMatchesPage,
  parseJobMatchesPageSize,
  type JobMatchesPageSize,
} from "@/lib/jobMatchesPagination";
import {
  DEFAULT_PARAMETER_HISTORY_PAGE_SIZE,
  parseParameterHistoryPage,
  parseParameterHistoryPageSize,
  type ParameterHistoryPageSize,
} from "@/lib/parameterHistoryPagination";

export type DashboardSearchParams = {
  historyPage: number;
  historyPageSize: ParameterHistoryPageSize;
  jobsPage: number;
  jobsPageSize: JobMatchesPageSize;
};

export function parseDashboardSearchParams(raw: {
  historyPage?: string;
  historyPageSize?: string;
  jobsPage?: string;
  jobsPageSize?: string;
}): DashboardSearchParams {
  return {
    historyPage: parseParameterHistoryPage(raw.historyPage),
    historyPageSize: parseParameterHistoryPageSize(raw.historyPageSize),
    jobsPage: parseJobMatchesPage(raw.jobsPage),
    jobsPageSize: parseJobMatchesPageSize(raw.jobsPageSize),
  };
}

export function dashboardSearchHref(
  current: DashboardSearchParams,
  updates: Partial<DashboardSearchParams> = {}
): string {
  const next = { ...current, ...updates };
  const params = new URLSearchParams();

  if (next.historyPage > 1) params.set("historyPage", String(next.historyPage));
  if (next.historyPageSize !== DEFAULT_PARAMETER_HISTORY_PAGE_SIZE) {
    params.set("historyPageSize", String(next.historyPageSize));
  }
  if (next.jobsPage > 1) params.set("jobsPage", String(next.jobsPage));
  if (next.jobsPageSize !== DEFAULT_JOB_MATCHES_PAGE_SIZE) {
    params.set(
      "jobsPageSize",
      next.jobsPageSize === "all" ? "all" : String(next.jobsPageSize)
    );
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}
