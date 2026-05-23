export const JOB_MATCHES_PAGE_SIZE_OPTIONS = [10, 20, "all"] as const;

export type JobMatchesPageSize = (typeof JOB_MATCHES_PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_JOB_MATCHES_PAGE_SIZE: JobMatchesPageSize = 10;

export function parseJobMatchesPage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function parseJobMatchesPageSize(value: string | undefined): JobMatchesPageSize {
  if (value === "all") return "all";
  const pageSize = Number.parseInt(value ?? "", 10);
  if (pageSize === 20) return 20;
  return DEFAULT_JOB_MATCHES_PAGE_SIZE;
}

export function jobMatchesLimit(pageSize: JobMatchesPageSize, totalCount: number): number {
  if (pageSize === "all") return totalCount;
  return pageSize;
}

export function jobMatchesTotalPages(
  pageSize: JobMatchesPageSize,
  totalCount: number
): number {
  if (pageSize === "all") return 1;
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
