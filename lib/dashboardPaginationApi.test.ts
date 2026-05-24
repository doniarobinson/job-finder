import { describe, expect, it } from "vitest";

import {
  deserializeJobMatchesPage,
  deserializeParameterHistoryPage,
  jobMatchesUrlUpdates,
  parameterHistoryUrlUpdates,
  serializeJobMatchesPage,
  serializeParameterHistoryPage,
} from "@/lib/dashboardPaginationApi";
import type { JobMatchesPage, ParameterHistoryPage } from "@/lib/dashboard";

const sampleJobMatchesPage: JobMatchesPage = {
  jobs: [
    {
      id: 1,
      title: "Engineer",
      company: "Acme",
      score: 0.8,
      status: "new",
      url: "https://example.com/job",
      createdAt: new Date("2026-05-20T12:00:00.000Z"),
    },
  ],
  page: 2,
  pageSize: 10,
  totalCount: 12,
  totalPages: 2,
};

const sampleParameterHistoryPage: ParameterHistoryPage = {
  entries: [
    {
      id: 9,
      params: {
        keywords: ["typescript"],
        titleVariants: [],
        locations: [],
        remote: true,
        negativeKeywords: [],
        maxResultsPerCycle: 20,
      },
      isCurrent: true,
      createdAt: new Date("2026-05-19T10:00:00.000Z"),
      epochId: 1,
      epochKind: "initial_bootstrap",
      epochLabel: "Initial bootstrap",
      epochStartedAt: new Date("2026-05-19T09:00:00.000Z"),
      showEpochDividerAfter: false,
      cycleAddedKeywords: ["kubernetes"],
    },
  ],
  page: 1,
  pageSize: 5,
  totalCount: 1,
  currentEpochCount: 1,
  totalPages: 1,
};

describe("dashboardPaginationApi", () => {
  it("serializes and deserializes job matches pages", () => {
    const serialized = serializeJobMatchesPage(sampleJobMatchesPage);
    expect(serialized.jobs[0]?.createdAt).toBe("2026-05-20T12:00:00.000Z");

    const roundTrip = deserializeJobMatchesPage(serialized);
    expect(roundTrip.jobs[0]?.createdAt.toISOString()).toBe("2026-05-20T12:00:00.000Z");
    expect(roundTrip.page).toBe(2);
    expect(roundTrip.totalPages).toBe(2);
  });

  it("serializes and deserializes parameter history pages", () => {
    const serialized = serializeParameterHistoryPage(sampleParameterHistoryPage);
    expect(serialized.entries[0]?.epochStartedAt).toBe("2026-05-19T09:00:00.000Z");

    const roundTrip = deserializeParameterHistoryPage(serialized);
    expect(roundTrip.entries[0]?.createdAt.toISOString()).toBe("2026-05-19T10:00:00.000Z");
    expect(roundTrip.entries[0]?.epochStartedAt?.toISOString()).toBe("2026-05-19T09:00:00.000Z");
    expect(roundTrip.entries[0]?.cycleAddedKeywords).toEqual(["kubernetes"]);
  });

  it("builds dashboard URL update payloads", () => {
    expect(jobMatchesUrlUpdates(3, 20)).toEqual({ jobsPage: 3, jobsPageSize: 20 });
    expect(parameterHistoryUrlUpdates(2, 10)).toEqual({
      historyPage: 2,
      historyPageSize: 10,
    });
  });
});
