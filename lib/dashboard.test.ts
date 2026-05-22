import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { schema } from "@/lib/db";

const epochStartedAt = new Date("2026-01-01");

vi.mock("@/lib/agent/epochs", () => ({
  ensureCurrentEpoch: vi.fn(() =>
    Promise.resolve({
      id: 1,
      kind: "initial_bootstrap",
      startedAt: epochStartedAt,
      note: null,
    })
  ),
  listEpochsForProfile: vi.fn(() =>
    Promise.resolve([
      {
        id: 1,
        profileId: 1,
        kind: "initial_bootstrap",
        startedAt: epochStartedAt,
        note: null,
        resumeHash: null,
      },
    ])
  ),
  epochKindLabel: (kind: string) =>
    kind === "rebootstrap" ? "Re-bootstrap" : "Initial bootstrap",
}));

const dashboardHoisted = vi.hoisted(() => {
  let dbInstance: ReturnType<typeof createMockDb> | null = createMockDb({ mode: "success" });

  function createMockDb(options: { mode: "success" | "error" | "empty" }) {
    const data = {
      settings: [{ id: 1, paused: false }],
      profiles: [{ id: 1 }],
      jobs: [
        {
          id: 10,
          title: "Engineer",
          company: "Acme",
          score: 0.8,
          status: "new",
          url: "https://example.com/jobs/10",
          createdAt: new Date("2026-01-01"),
          epochId: 1,
        },
      ],
      searchParams: [
        {
          id: 2,
          profileId: 1,
          epochId: 1,
          paramsJson: {
            keywords: ["typescript", "kubernetes"],
            titleVariants: ["Engineer"],
            locations: ["NYC"],
            remote: false,
            negativeKeywords: [],
            maxResultsPerCycle: 20,
          },
          isCurrent: true,
          createdAt: new Date("2026-01-02"),
        },
        {
          id: 1,
          profileId: 1,
          epochId: 1,
          paramsJson: {
            keywords: ["typescript"],
            titleVariants: ["Engineer"],
            locations: [],
            remote: false,
            negativeKeywords: [],
            maxResultsPerCycle: 20,
          },
          isCurrent: false,
          createdAt: new Date("2026-01-01"),
        },
      ],
    };

    const selectChain = (table: unknown) => {
      const chain = {
        whereCalled: false,
        where: vi.fn(() => {
          chain.whereCalled = true;
          return chain;
        }),
        orderBy: vi.fn(() => chain),
        limit: vi.fn((limitN: number) => {
          if (options.mode === "error") {
            return Promise.reject(new Error("fetch failed"));
          }
          if (table === schema.profiles) {
            return Promise.resolve(data.profiles);
          }
          if (table === schema.agentSettings) {
            return Promise.resolve(data.settings);
          }
          if (table === schema.jobs) {
            if (chain.whereCalled) {
              return Promise.resolve(data.jobs.filter((job) => job.epochId === 1));
            }
            return Promise.resolve(data.jobs);
          }
          if (table === schema.searchParams) {
            if (chain.whereCalled) {
              if (limitN === 1) {
                return Promise.resolve([data.searchParams[0]]);
              }
              return {
                offset: vi.fn((offsetN: number) =>
                  Promise.resolve(data.searchParams.slice(offsetN, offsetN + limitN))
                ),
              };
            }
            return {
              offset: vi.fn((offsetN: number) =>
                Promise.resolve(data.searchParams.slice(offsetN, offsetN + limitN))
              ),
            };
          }
          return Promise.resolve([]);
        }),
      };
      return chain;
    };

    return {
      select: vi.fn((fields?: unknown) => {
        if (fields && typeof fields === "object" && fields !== null && "value" in fields) {
          return {
            from: vi.fn((table: unknown) => {
              if (options.mode === "error") {
                return Promise.reject(new Error("fetch failed"));
              }
              if (table === schema.searchParams) {
                return {
                  where: vi.fn(() => Promise.resolve([{ value: data.searchParams.length }])),
                };
              }
              if (table === schema.jobs) {
                return {
                  where: vi.fn(() => Promise.resolve([{ value: 0 }])),
                };
              }
              return Promise.resolve([{ value: 0 }]);
            }),
          };
        }

        return { from: vi.fn((table: unknown) => selectChain(table)) };
      }),
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
    expect(data.currentParams).toMatchObject({ keywords: ["typescript", "kubernetes"] });
    expect(data.currentEpochLabel).toBe("Initial bootstrap");
    expect(data.archivedJobCount).toBe(0);
  });
});

describe("getParameterHistoryPage", () => {
  beforeEach(() => {
    dashboardHoisted.setDb(dashboardHoisted.createMockDb({ mode: "success" }));
  });

  it("returns paginated search parameter versions newest first", async () => {
    const { getParameterHistoryPage, PARAMETER_HISTORY_PAGE_SIZE } = await import("./dashboard");

    const history = await getParameterHistoryPage(1);

    expect(history.page).toBe(1);
    expect(history.pageSize).toBe(PARAMETER_HISTORY_PAGE_SIZE);
    expect(history.totalCount).toBe(2);
    expect(history.totalPages).toBe(1);
    expect(history.entries).toHaveLength(2);
    expect(history.entries[0]?.isCurrent).toBe(true);
    expect(history.entries[0]?.params.keywords).toContain("kubernetes");
    expect(history.entries[0]?.epochLabel).toBe("Initial bootstrap");
  });

  it("returns an empty page when db is null", async () => {
    dashboardHoisted.setDb(null);
    const { getParameterHistoryPage } = await import("./dashboard");

    const history = await getParameterHistoryPage(1);

    expect(history.entries).toEqual([]);
    expect(history.totalCount).toBe(0);
  });
});
