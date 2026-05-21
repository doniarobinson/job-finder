import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { schema } from "@/lib/db";

const dashboardHoisted = vi.hoisted(() => {
  let dbInstance: ReturnType<typeof createMockDb> | null = createMockDb({ mode: "success" });

  function createMockDb(options: { mode: "success" | "error" | "empty" }) {
    const data = {
      settings: [{ id: 1, paused: false }],
      jobs: [
        {
          id: 10,
          title: "Engineer",
          company: "Acme",
          score: 0.8,
          status: "new",
          url: "https://example.com/jobs/10",
          createdAt: new Date("2026-01-01"),
        },
      ],
      searchParams: {
        id: 1,
        paramsJson: {
          keywords: ["typescript"],
          titleVariants: ["Engineer"],
          locations: [],
          remote: false,
          negativeKeywords: [],
          maxResultsPerCycle: 20,
        },
        isCurrent: true,
      },
      history: [
        {
          id: 5,
          triggerPhrases: ["kubernetes"],
          createdAt: new Date("2026-01-02"),
        },
      ],
    };

    const selectChain = (table: unknown) => {
      const chain = {
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => {
          if (options.mode === "error") {
            return Promise.reject(new Error("fetch failed"));
          }
          if (table === schema.agentSettings) {
            return Promise.resolve(data.settings);
          }
          if (table === schema.jobs) {
            return Promise.resolve(data.jobs);
          }
          if (table === schema.searchParams) {
            return Promise.resolve([data.searchParams]);
          }
          if (table === schema.paramHistory) {
            return Promise.resolve(data.history);
          }
          return Promise.resolve([]);
        }),
      };
      return chain;
    };

    return {
      select: vi.fn(() => ({ from: vi.fn((table: unknown) => selectChain(table)) })),
    };
  }

  return {
    get db() {
      return dbInstance;
    },
    setDb(next: ReturnType<typeof createMockDb> | null) {
      dbInstance = next;
    },
    createMockDb,
  };
});

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    get db() {
      return dashboardHoisted.db;
    },
  };
});

describe("getDashboardData", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL", "");
    dashboardHoisted.setDb(dashboardHoisted.createMockDb({ mode: "success" }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns unconfigured data when db is null", async () => {
    dashboardHoisted.setDb(null);
    const { getDashboardData } = await import("./dashboard");

    const data = await getDashboardData();

    expect(data.configured).toBe(false);
    expect(data.dbError).toBeUndefined();
    expect(data.jobs).toEqual([]);
  });

  it("returns dbError when queries fail", async () => {
    dashboardHoisted.setDb(dashboardHoisted.createMockDb({ mode: "error" }));
    const { getDashboardData } = await import("./dashboard");

    const data = await getDashboardData();

    expect(data.configured).toBe(false);
    expect(data.dbError).toContain(".env.local");
    expect(data.jobs).toEqual([]);
  });

  it("returns dashboard data when the database is available", async () => {
    const { getDashboardData } = await import("./dashboard");

    const data = await getDashboardData();

    expect(data.configured).toBe(true);
    expect(data.dbError).toBeUndefined();
    expect(data.jobs).toHaveLength(1);
    expect(data.jobs[0]?.title).toBe("Engineer");
    expect(data.currentParams).toMatchObject({ keywords: ["typescript"] });
    expect(data.paramHistory).toHaveLength(1);
  });
});
