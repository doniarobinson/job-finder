import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPaginatedApiUrl,
  readDashboardSearchParams,
  replaceDashboardSearchParams,
} from "@/lib/dashboardPaginationUrl";

describe("dashboardPaginationUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads dashboard search params from a query string", () => {
    expect(readDashboardSearchParams("?jobsPage=2&historyPage=3&historyPageSize=10")).toEqual({
      jobsPage: 2,
      jobsPageSize: 10,
      historyPage: 3,
      historyPageSize: 10,
    });
  });

  it("builds paginated API URLs", () => {
    expect(buildPaginatedApiUrl("/api/job-matches", 2, 20)).toBe(
      "/api/job-matches?page=2&pageSize=20"
    );
    expect(buildPaginatedApiUrl("/api/parameter-history", 1, "all")).toBe(
      "/api/parameter-history?page=1&pageSize=all"
    );
  });

  it("replaces dashboard search params without a full navigation", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { search: "?jobsPage=1&historyPage=2" },
      history: { replaceState },
    });

    const href = replaceDashboardSearchParams({ jobsPage: 2 });

    expect(new URL(href, "http://localhost").searchParams.get("jobsPage")).toBe("2");
    expect(new URL(href, "http://localhost").searchParams.get("historyPage")).toBe("2");
    expect(replaceState).toHaveBeenCalledWith(null, "", href);
  });
});
