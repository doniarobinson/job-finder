import { describe, expect, it } from "vitest";

import { dashboardSearchHref } from "./dashboardSearchParams";
import {
  DEFAULT_JOB_MATCHES_PAGE_SIZE,
  jobMatchesLimit,
  jobMatchesTotalPages,
  parseJobMatchesPageSize,
} from "./jobMatchesPagination";

describe("jobMatchesPagination", () => {
  it("defaults page size to 10", () => {
    expect(parseJobMatchesPageSize(undefined)).toBe(10);
    expect(DEFAULT_JOB_MATCHES_PAGE_SIZE).toBe(10);
  });

  it("accepts 20 and all page sizes", () => {
    expect(parseJobMatchesPageSize("20")).toBe(20);
    expect(parseJobMatchesPageSize("all")).toBe("all");
  });

  it("computes limits and total pages", () => {
    expect(jobMatchesLimit("all", 37)).toBe(37);
    expect(jobMatchesLimit(10, 37)).toBe(10);
    expect(jobMatchesTotalPages("all", 37)).toBe(1);
    expect(jobMatchesTotalPages(10, 37)).toBe(4);
  });
});

describe("dashboardSearchHref", () => {
  const defaults = {
    historyPage: 1,
    historyPageSize: 5 as const,
    jobsPage: 1,
    jobsPageSize: 10 as const,
  };

  it("preserves both list pagination params", () => {
    expect(
      dashboardSearchHref(defaults, { historyPage: 2, jobsPage: 3, jobsPageSize: "all" })
    ).toBe("/?historyPage=2&jobsPage=3&jobsPageSize=all");
  });
});
