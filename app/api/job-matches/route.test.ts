import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const { getJobMatchesPageMock } = vi.hoisted(() => ({
  getJobMatchesPageMock: vi.fn(),
}));

vi.mock("@/lib/dashboard", () => ({
  getJobMatchesPage: getJobMatchesPageMock,
}));

describe("GET /api/job-matches", () => {
  beforeEach(() => {
    getJobMatchesPageMock.mockReset();
    getJobMatchesPageMock.mockResolvedValue({
      jobs: [
        {
          id: 1,
          title: "Engineer",
          company: "Acme",
          score: 0.75,
          status: "new",
          url: "https://example.com/job",
          createdAt: new Date("2026-05-20T12:00:00.000Z"),
        },
      ],
      page: 2,
      pageSize: 20,
      totalCount: 25,
      totalPages: 2,
    });
  });

  it("returns serialized job matches for the requested page", async () => {
    const response = await GET(new Request("http://localhost/api/job-matches?page=2&pageSize=20"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      jobs: [
        expect.objectContaining({
          id: 1,
          title: "Engineer",
          createdAt: "2026-05-20T12:00:00.000Z",
        }),
      ],
      page: 2,
      pageSize: 20,
      totalCount: 25,
      totalPages: 2,
    });
    expect(getJobMatchesPageMock).toHaveBeenCalledWith(2, 20);
  });

  it("defaults page and page size when omitted", async () => {
    await GET(new Request("http://localhost/api/job-matches"));

    expect(getJobMatchesPageMock).toHaveBeenCalledWith(1, 10);
  });
});
