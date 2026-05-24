import {
  dashboardSearchHref,
  parseDashboardSearchParams,
  type DashboardSearchParams,
} from "@/lib/dashboardSearchParams";

export function readDashboardSearchParams(search: string): DashboardSearchParams {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);

  return parseDashboardSearchParams({
    historyPage: params.get("historyPage") ?? undefined,
    historyPageSize: params.get("historyPageSize") ?? undefined,
    jobsPage: params.get("jobsPage") ?? undefined,
    jobsPageSize: params.get("jobsPageSize") ?? undefined,
  });
}

export function replaceDashboardSearchParams(updates: Partial<DashboardSearchParams>): string {
  if (typeof window === "undefined") {
    return dashboardSearchHref(
      {
        historyPage: 1,
        historyPageSize: 5,
        jobsPage: 1,
        jobsPageSize: 10,
        ...updates,
      },
      {}
    );
  }

  const current = readDashboardSearchParams(window.location.search);
  const href = dashboardSearchHref({ ...current, ...updates });
  window.history.replaceState(null, "", href);
  return href;
}

export function buildPaginatedApiUrl(
  endpoint: string,
  page: number,
  pageSize: number | string
): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return `${endpoint}?${params.toString()}`;
}
