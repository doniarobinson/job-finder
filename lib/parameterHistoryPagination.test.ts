import { describe, expect, it } from "vitest";

import {
  DEFAULT_PARAMETER_HISTORY_PAGE_SIZE,
  parameterHistorySearchHref,
  parseParameterHistoryPage,
  parseParameterHistoryPageSize,
} from "./parameterHistoryPagination";

describe("parameterHistoryPagination", () => {
  it("defaults page size to 5", () => {
    expect(parseParameterHistoryPageSize(undefined)).toBe(5);
    expect(DEFAULT_PARAMETER_HISTORY_PAGE_SIZE).toBe(5);
  });

  it("accepts 10 and 20 page sizes", () => {
    expect(parseParameterHistoryPageSize("10")).toBe(10);
    expect(parseParameterHistoryPageSize("20")).toBe(20);
  });

  it("falls back for invalid page size", () => {
    expect(parseParameterHistoryPageSize("99")).toBe(5);
  });

  it("builds search hrefs with optional query params", () => {
    expect(parameterHistorySearchHref(1, 5)).toBe("/");
    expect(parameterHistorySearchHref(2, 5)).toBe("/?historyPage=2");
    expect(parameterHistorySearchHref(1, 10)).toBe("/?historyPageSize=10");
    expect(parameterHistorySearchHref(3, 20)).toBe("/?historyPage=3&historyPageSize=20");
  });

  it("parses page numbers", () => {
    expect(parseParameterHistoryPage(undefined)).toBe(1);
    expect(parseParameterHistoryPage("2")).toBe(2);
    expect(parseParameterHistoryPage("-1")).toBe(1);
  });
});
