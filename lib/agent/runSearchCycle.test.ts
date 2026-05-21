import { beforeEach, describe, expect, it, vi } from "vitest";

import { schema } from "@/lib/db";
import type { NormalizedJob, SearchParams } from "@/lib/types";

const adzunaJobs: NormalizedJob[] = [
  {
    externalId: "1",
    title: "Platform Engineer",
    company: "Acme",
    description: "kubernetes platform typescript production systems",
    url: "https://example.com/jobs/1",
    source: "adzuna",
  },
  {
    externalId: "2",
    title: "Cloud Engineer",
    company: "Beta",
    description: "kubernetes platform typescript distributed systems",
    url: "https://example.com/jobs/2",
    source: "adzuna",
  },
];

const hoisted = vi.hoisted(() => {
  const initialParams: SearchParams = {
    keywords: ["typescript"],
    titleVariants: ["Software Engineer"],
    locations: ["New York"],
    remote: false,
    negativeKeywords: [],
    maxResultsPerCycle: 20,
  };

  const state = {
    currentParams: structuredClone(initialParams) as SearchParams,
    paramHistory: [] as Array<Record<string, unknown>>,
    insertedJobs: [] as unknown[],
    paused: false,
    existingJobRows: [] as Array<{ urlHash: string }>,
  };

  const insertMock = vi.fn((table: unknown) => ({
    values: vi.fn((payload: unknown) => {
      if (
        table === schema.searchParams &&
        payload &&
        typeof payload === "object" &&
        "paramsJson" in payload
      ) {
        state.currentParams = (payload as { paramsJson: SearchParams }).paramsJson;
      }
      if (table === schema.paramHistory && payload && typeof payload === "object") {
        state.paramHistory.push(payload as Record<string, unknown>);
      }
      if (table === schema.jobs && Array.isArray(payload)) {
        state.insertedJobs = payload;
      }
      return Promise.resolve();
    }),
  }));

  const selectChain = (table: unknown) => {
    const chain = {
      where: vi.fn(() => {
        if (table === schema.jobs) {
          return Promise.resolve(state.existingJobRows);
        }
        return chain;
      }),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => {
        if (table === schema.agentSettings) {
          return Promise.resolve([{ id: 1, paused: state.paused }]);
        }
        if (table === schema.profiles) {
          return Promise.resolve([
            {
              id: 1,
              resumeText: "Skills: typescript",
              parsedJson: {
                skills: ["typescript"],
                titles: ["Software Engineer"],
                locations: ["New York"],
              },
            },
          ]);
        }
        if (table === schema.searchParams) {
          return Promise.resolve([{ id: 1, paramsJson: state.currentParams, isCurrent: true }]);
        }
        if (table === schema.jobs) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      }),
    };
    return chain;
  };

  const db = {
    select: vi.fn(() => ({ from: vi.fn((table: unknown) => selectChain(table)) })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    insert: insertMock,
  };

  return {
    initialParams,
    state,
    db,
    searchAdzunaMock: vi.fn(),
    scoreJobsMock: vi.fn(),
    ensureBootstrapProfileMock: vi.fn(),
    refineSearchParamsMock: vi.fn(),
  };
});

vi.mock("@/lib/sources/adzuna", () => ({
  searchAdzuna: hoisted.searchAdzunaMock,
}));

vi.mock("@/lib/agent/scoreJob", () => ({
  hashJobUrl: (url: string) => `hash-${url}`,
  scoreJobs: hoisted.scoreJobsMock,
}));

vi.mock("@/lib/profile", () => ({
  ensureBootstrapProfile: hoisted.ensureBootstrapProfileMock,
}));

vi.mock("@/lib/agent/refineSearchParams", () => ({
  refineSearchParams: hoisted.refineSearchParamsMock,
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    db: hoisted.db,
  };
});

vi.mock("@/lib/ai/google", () => ({
  isGeminiConfigured: vi.fn(() => false),
  geminiFlash: {},
}));

describe("runSearchCycle", () => {
  beforeEach(() => {
    hoisted.state.currentParams = structuredClone(hoisted.initialParams);
    hoisted.state.paramHistory = [];
    hoisted.state.insertedJobs = [];
    hoisted.state.paused = false;
    hoisted.state.existingJobRows = [];
    hoisted.searchAdzunaMock.mockReset();
    hoisted.scoreJobsMock.mockReset();
    hoisted.ensureBootstrapProfileMock.mockReset();
    hoisted.refineSearchParamsMock.mockReset();
    hoisted.db.select.mockClear();
    hoisted.db.insert.mockClear();

    hoisted.ensureBootstrapProfileMock.mockResolvedValue({
      profileId: 1,
      searchParams: hoisted.initialParams,
    });
    hoisted.searchAdzunaMock.mockResolvedValue(adzunaJobs);
    hoisted.scoreJobsMock.mockImplementation(async (_resume, _profile, jobs) =>
      jobs.map((job) => ({ ...job, score: 0.5 }))
    );
  });

  it("calls Adzuna with current keywords then persists refined params", async () => {
    const refinedParams: SearchParams = {
      ...hoisted.initialParams,
      keywords: [...hoisted.initialParams.keywords, "kubernetes", "platform"],
    };
    hoisted.refineSearchParamsMock.mockResolvedValue({
      next: refinedParams,
      triggerPhrases: ["kubernetes", "platform"],
      changed: true,
    });

    const { runSearchCycle } = await import("./runSearchCycle");
    const result = await runSearchCycle();

    expect(hoisted.searchAdzunaMock).toHaveBeenCalledWith(hoisted.initialParams);
    expect(hoisted.refineSearchParamsMock).toHaveBeenCalledWith(
      hoisted.initialParams,
      expect.arrayContaining([
        expect.objectContaining({ score: 0.5 }),
        expect.objectContaining({ score: 0.5 }),
      ])
    );
    expect(result.paramsUpdated).toBe(true);
    expect(result.searched).toBe(2);
    expect(hoisted.state.currentParams.keywords).toEqual(refinedParams.keywords);
    expect(hoisted.state.paramHistory).toHaveLength(1);
  });

  it("does not persist params when refinement makes no changes", async () => {
    hoisted.refineSearchParamsMock.mockResolvedValue({
      next: hoisted.initialParams,
      triggerPhrases: [],
      changed: false,
    });

    const { runSearchCycle } = await import("./runSearchCycle");
    const result = await runSearchCycle();

    expect(hoisted.searchAdzunaMock).toHaveBeenCalledOnce();
    expect(result.paramsUpdated).toBe(false);
    expect(hoisted.state.currentParams.keywords).toEqual(["typescript"]);
    expect(hoisted.state.paramHistory).toHaveLength(0);
  });

  it("searches with keywords then updates them via real refinement", async () => {
    const { refineSearchParams: realRefine } =
      await vi.importActual<typeof import("./refineSearchParams")>(
        "./refineSearchParams"
      );
    hoisted.refineSearchParamsMock.mockImplementation(realRefine);

    const { runSearchCycle } = await import("./runSearchCycle");
    const result = await runSearchCycle();

    expect(hoisted.searchAdzunaMock).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: ["typescript"] })
    );
    expect(result.paramsUpdated).toBe(true);
    expect(hoisted.state.currentParams.keywords).toContain("typescript");
    expect(hoisted.state.currentParams.keywords).toContain("kubernetes");
    expect(hoisted.state.paramHistory).toHaveLength(1);
  });

  it("skips the cycle when the agent is paused", async () => {
    hoisted.state.paused = true;
    const { runSearchCycle } = await import("./runSearchCycle");

    const result = await runSearchCycle();

    expect(result).toEqual({
      searched: 0,
      newJobs: 0,
      scored: 0,
      paramsUpdated: false,
      skippedReason: "paused",
    });
    expect(hoisted.searchAdzunaMock).not.toHaveBeenCalled();
  });

  it("propagates when Adzuna search fails", async () => {
    hoisted.searchAdzunaMock.mockRejectedValue(new Error("Adzuna API error: 429 Too Many Requests"));
    const { runSearchCycle } = await import("./runSearchCycle");

    await expect(runSearchCycle()).rejects.toThrow("Adzuna API error: 429");
  });

  it("dedupes jobs already stored by url hash", async () => {
    hoisted.state.existingJobRows = [{ urlHash: "hash-https://example.com/jobs/1" }];
    hoisted.refineSearchParamsMock.mockResolvedValue({
      next: hoisted.initialParams,
      triggerPhrases: [],
      changed: false,
    });

    const { runSearchCycle } = await import("./runSearchCycle");
    const result = await runSearchCycle();

    expect(result.searched).toBe(2);
    expect(hoisted.scoreJobsMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      [expect.objectContaining({ url: "https://example.com/jobs/2" })]
    );
    expect(hoisted.state.insertedJobs).toHaveLength(1);
  });
});
