import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const { getParameterHistoryPageMock } = vi.hoisted(() => ({
  getParameterHistoryPageMock: vi.fn(),
}));

vi.mock("@/lib/dashboard", () => ({
  getParameterHistoryPage: getParameterHistoryPageMock,
}));

describe("GET /api/parameter-history", () => {
  beforeEach(() => {
    getParameterHistoryPageMock.mockReset();
    getParameterHistoryPageMock.mockResolvedValue({
      entries: [
        {
          id: 4,
          params: {
            keywords: ["react"],
            titleVariants: [],
            locations: [],
            remote: false,
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
          cycleAddedKeywords: [],
        },
      ],
      page: 1,
      pageSize: 5,
      totalCount: 1,
      currentEpochCount: 1,
      totalPages: 1,
    });
  });

  it("returns serialized parameter history for the requested page", async () => {
    const response = await GET(
      new Request("http://localhost/api/parameter-history?page=1&pageSize=5")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      entries: [
        expect.objectContaining({
          id: 4,
          createdAt: "2026-05-19T10:00:00.000Z",
          epochStartedAt: "2026-05-19T09:00:00.000Z",
        }),
      ],
      page: 1,
      pageSize: 5,
      totalCount: 1,
      currentEpochCount: 1,
      totalPages: 1,
    });
    expect(getParameterHistoryPageMock).toHaveBeenCalledWith(1, 5);
  });

  it("defaults page and page size when omitted", async () => {
    await GET(new Request("http://localhost/api/parameter-history"));

    expect(getParameterHistoryPageMock).toHaveBeenCalledWith(1, 5);
  });
});
