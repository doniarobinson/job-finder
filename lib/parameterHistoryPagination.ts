import { dashboardSearchHref } from "@/lib/dashboardSearchParams";
import { DEFAULT_JOB_MATCHES_PAGE_SIZE } from "@/lib/jobMatchesPagination";

export const PARAMETER_HISTORY_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export type ParameterHistoryPageSize = (typeof PARAMETER_HISTORY_PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PARAMETER_HISTORY_PAGE_SIZE: ParameterHistoryPageSize = 5;

export function parseParameterHistoryPage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function parseParameterHistoryPageSize(value: string | undefined): ParameterHistoryPageSize {
  const pageSize = Number.parseInt(value ?? "", 10);
  if (pageSize === 10 || pageSize === 20) return pageSize;
  return DEFAULT_PARAMETER_HISTORY_PAGE_SIZE;
}

export function parameterHistorySearchHref(
  page: number,
  pageSize: ParameterHistoryPageSize
): string {
  return dashboardSearchHref({
    historyPage: page,
    historyPageSize: pageSize,
    jobsPage: 1,
    jobsPageSize: DEFAULT_JOB_MATCHES_PAGE_SIZE,
  });
}
