import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { schema } from "@/lib/db";
import type { SearchParams } from "@/lib/types";

import {
  defaultSearchParams,
  ensureBootstrapProfile,
  parseResumeHeuristic,
  rebootstrapProfileFromEnv,
  updateProfileResume,
} from "./profile";

vi.mock("@/lib/ai/parseResume", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/parseResume")>();
  return {
    ...actual,
    parseResume: vi.fn(async (resumeText: string) => ({
      profile: actual.parseResumeHeuristic(resumeText),
      meta: { source: "heuristic", geminiConfigured: false, geminiFailed: false },
    })),
  };
});

describe("defaultSearchParams", () => {
  it("caps keywords and title variants from the profile", () => {
    const profile = parseResumeHeuristic(
      `Skills: ${Array.from({ length: 12 }, (_, i) => `skill${i}`).join(", ")}
Titles: ${Array.from({ length: 5 }, (_, i) => `Title ${i}`).join(", ")}
Locations: Austin`
    );

    const params = defaultSearchParams(profile);

    expect(params.keywords).toHaveLength(8);
    expect(params.titleVariants).toHaveLength(3);
    expect(params.locations).toEqual(["Austin"]);
    expect(params.maxResultsPerCycle).toBe(20);
  });
});

const profileDbHoisted = vi.hoisted(() => {
  const state = {
    profile: null as {
      id: number;
      resumeText: string;
      parsedJson: Record<string, unknown>;
    } | null,
    currentParams: null as SearchParams | null,
    agentSettingsInserted: false,
    nextEpochId: 1,
  };

  const insertMock = vi.fn((table: unknown) => ({
    values: vi.fn((payload: unknown) => {
      if (table === schema.profiles && payload && typeof payload === "object") {
        const row = payload as { resumeText: string; parsedJson: Record<string, unknown> };
        state.profile = { id: 1, resumeText: row.resumeText, parsedJson: row.parsedJson };
        return {
          returning: vi.fn(() => Promise.resolve([state.profile])),
        };
      }
      if (table === schema.searchParams && payload && typeof payload === "object") {
        state.currentParams = (payload as { paramsJson: SearchParams }).paramsJson;
        return Promise.resolve();
      }
      if (table === schema.agentEpochs && payload && typeof payload === "object") {
        const id = state.nextEpochId;
        state.nextEpochId += 1;
        return {
          returning: vi.fn(() => Promise.resolve([{ id }])),
        };
      }
      if (table === schema.agentSettings) {
        state.agentSettingsInserted = true;
        return { onConflictDoNothing: vi.fn(() => Promise.resolve()) };
      }
      return Promise.resolve();
    }),
  }));

  const selectChain = (table: unknown) => {
    const chain = {
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => {
        if (table === schema.profiles) {
          return Promise.resolve(state.profile ? [state.profile] : []);
        }
        if (table === schema.searchParams) {
          return Promise.resolve(
            state.currentParams ? [{ id: 1, paramsJson: state.currentParams, isCurrent: true }] : []
          );
        }
        if (table === schema.agentEpochs) {
          return Promise.resolve([
            {
              id: 1,
              profileId: 1,
              kind: "initial_bootstrap",
              note: null,
              resumeHash: null,
              startedAt: new Date("2026-01-01"),
            },
          ]);
        }
        return Promise.resolve([]);
      }),
    };
    return chain;
  };

  return {
    state,
    db: {
      select: vi.fn(() => ({ from: vi.fn((table: unknown) => selectChain(table)) })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
      insert: insertMock,
    },
  };
});

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    db: profileDbHoisted.db,
  };
});

describe("updateProfileResume", () => {
  beforeEach(() => {
    profileDbHoisted.state.profile = null;
    profileDbHoisted.state.currentParams = null;
    profileDbHoisted.state.agentSettingsInserted = false;
    profileDbHoisted.state.nextEpochId = 1;
    profileDbHoisted.db.insert.mockClear();
    profileDbHoisted.db.update.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when resume text is empty", async () => {
    await expect(updateProfileResume("   ")).rejects.toThrow("Resume text is required");
  });

  it("creates a profile and default search params when none exist", async () => {
    const result = await updateProfileResume("Skills: Go, Kubernetes");

    expect(result.created).toBe(true);
    expect(result.searchParamsReset).toBe(true);
    expect(result.searchParams.keywords).toContain("Go");
    expect(profileDbHoisted.state.agentSettingsInserted).toBe(true);
  });

  it("updates resume without resetting search params by default", async () => {
    profileDbHoisted.state.profile = {
      id: 1,
      resumeText: "old",
      parsedJson: { skills: ["typescript"], titles: ["Engineer"], locations: [] },
    };
    profileDbHoisted.state.currentParams = {
      keywords: ["typescript", "legacy"],
      titleVariants: ["Engineer"],
      locations: [],
      remote: false,
      negativeKeywords: [],
      maxResultsPerCycle: 20,
    };

    const result = await updateProfileResume("Skills: Rust", { resetSearchParams: false });

    expect(result.created).toBe(false);
    expect(result.searchParamsReset).toBe(false);
    expect(result.searchParams.keywords).toEqual(["typescript", "legacy"]);
    expect(profileDbHoisted.db.update).toHaveBeenCalled();
  });

  it("resets search params when resetSearchParams is true", async () => {
    profileDbHoisted.state.profile = {
      id: 1,
      resumeText: "old",
      parsedJson: { skills: ["typescript"], titles: ["Engineer"], locations: [] },
    };
    profileDbHoisted.state.currentParams = {
      keywords: ["legacy"],
      titleVariants: ["Engineer"],
      locations: [],
      remote: false,
      negativeKeywords: [],
      maxResultsPerCycle: 20,
    };

    const result = await updateProfileResume("Skills: Python, Django", {
      resetSearchParams: true,
    });

    expect(result.searchParamsReset).toBe(true);
    expect(result.searchParams.keywords).toContain("Python");
    expect(result.searchParams.keywords).not.toContain("legacy");
  });
});

describe("ensureBootstrapProfile", () => {
  beforeEach(() => {
    profileDbHoisted.state.profile = null;
    profileDbHoisted.state.currentParams = null;
    profileDbHoisted.state.nextEpochId = 1;
    profileDbHoisted.db.insert.mockClear();
    profileDbHoisted.db.update.mockClear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns existing profile and params without overwriting resume", async () => {
    profileDbHoisted.state.profile = {
      id: 1,
      resumeText: "stored resume",
      parsedJson: { skills: ["typescript"], titles: ["Engineer"], locations: [] },
    };
    profileDbHoisted.state.currentParams = {
      keywords: ["typescript"],
      titleVariants: ["Engineer"],
      locations: [],
      remote: false,
      negativeKeywords: [],
      maxResultsPerCycle: 20,
    };

    const result = await ensureBootstrapProfile();

    expect(result.profileId).toBe(1);
    expect(result.searchParams.keywords).toEqual(["typescript"]);
    expect(profileDbHoisted.db.update).not.toHaveBeenCalled();
  });

  it("bootstraps from RESUME_TEXT when no profile exists", async () => {
    vi.stubEnv("RESUME_TEXT", "Skills: Elixir\nTitles: Backend Engineer");

    const result = await ensureBootstrapProfile();

    expect(result.profileId).toBe(1);
    expect(result.searchParams.keywords.length).toBeGreaterThan(0);
    expect(profileDbHoisted.state.profile?.resumeText).toContain("Elixir");
  });
});

describe("rebootstrapProfileFromEnv", () => {
  beforeEach(() => {
    profileDbHoisted.state.profile = {
      id: 1,
      resumeText: "old",
      parsedJson: { skills: ["legacy"], titles: ["Engineer"], locations: [] },
    };
    profileDbHoisted.state.currentParams = {
      keywords: ["legacy", "stale"],
      titleVariants: ["Engineer"],
      locations: [],
      remote: false,
      negativeKeywords: [],
      maxResultsPerCycle: 20,
    };
    profileDbHoisted.state.nextEpochId = 2;
    profileDbHoisted.db.insert.mockClear();
    profileDbHoisted.db.update.mockClear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when RESUME_TEXT is missing", async () => {
    await expect(rebootstrapProfileFromEnv()).rejects.toThrow(
      "RESUME_TEXT environment variable is required"
    );
  });

  it("re-parses RESUME_TEXT and resets search params", async () => {
    vi.stubEnv("RESUME_TEXT", "Skills: Rust, Wasm\nTitles: Systems Engineer");

    const result = await rebootstrapProfileFromEnv();

    expect(result.searchParamsReset).toBe(true);
    expect(result.searchParams.keywords).toContain("Rust");
    expect(result.searchParams.keywords).not.toContain("legacy");
    expect(result.parsed.skills).toContain("Rust");
    expect(result.epochStarted).toBe(true);
    expect(result.epochId).toBe(2);
  });
});
