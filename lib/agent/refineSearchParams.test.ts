import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedJob, SearchParams } from "@/lib/types";

import { refineSearchParams } from "./refineSearchParams";

vi.mock("@/lib/ai/google", () => ({
  isGeminiConfigured: vi.fn(() => false),
  geminiFlash: {},
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

const baseParams: SearchParams = {
  keywords: ["typescript"],
  titleVariants: ["Software Engineer"],
  locations: [],
  remote: false,
  negativeKeywords: [],
  maxResultsPerCycle: 20,
};

function job(
  description: string,
  score: number,
  overrides?: Partial<NormalizedJob>
): NormalizedJob & { score: number } {
  return {
    externalId: "1",
    title: "Backend Engineer",
    company: "Acme",
    description,
    url: "https://example.com/jobs/1",
    source: "adzuna",
    ...overrides,
    score,
  };
}

describe("refineSearchParams", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not change keywords when fewer than two learnable jobs", async () => {
    const result = await refineSearchParams(baseParams, [
      job("kubernetes platform typescript stack", 0.5),
    ]);

    expect(result.changed).toBe(false);
    expect(result.next.keywords).toEqual(["typescript"]);
    expect(result.triggerPhrases).toEqual([]);
  });

  it("does not change keywords when scores are below the learn threshold", async () => {
    const result = await refineSearchParams(baseParams, [
      job("kubernetes platform typescript", 0.2, { url: "https://example.com/a" }),
      job("kubernetes platform typescript", 0.2, { url: "https://example.com/b" }),
    ]);

    expect(result.changed).toBe(false);
    expect(result.next.keywords).toEqual(["typescript"]);
  });

  it("appends terms that appear in at least two high-score jobs", async () => {
    const result = await refineSearchParams(baseParams, [
      job("kubernetes platform typescript role", 0.5, { url: "https://example.com/a" }),
      job("kubernetes platform typescript role", 0.6, { url: "https://example.com/b" }),
    ]);

    expect(result.changed).toBe(true);
    expect(result.next.keywords).toContain("typescript");
    expect(result.next.keywords).toContain("kubernetes");
    expect(result.next.keywords).toContain("platform");
    expect(result.triggerPhrases.length).toBeGreaterThan(0);
  });

  it("does not duplicate keywords already in the list", async () => {
    const current: SearchParams = {
      ...baseParams,
      keywords: ["typescript", "kubernetes", "platform", "engineer"],
    };

    const result = await refineSearchParams(current, [
      job("kubernetes platform typescript", 0.5, {
        url: "https://example.com/a",
        title: "Engineer",
      }),
      job("kubernetes platform typescript", 0.5, {
        url: "https://example.com/b",
        title: "Engineer",
      }),
    ]);

    expect(result.changed).toBe(false);
    expect(result.next.keywords).toEqual(current.keywords);
  });
});

describe("refineSearchParams with Gemini", () => {
  beforeEach(async () => {
    const google = await import("@/lib/ai/google");
    vi.mocked(google.isGeminiConfigured).mockReturnValue(true);
  });

  it("merges Gemini suggestions into keywords", async () => {
    const { generateObject } = await import("ai");
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        addKeywords: ["graphql"],
        addNegativeKeywords: ["intern"],
        triggerPhrases: ["graphql", "kubernetes"],
      },
    } as never);

    const result = await refineSearchParams(baseParams, [
      job("kubernetes graphql typescript", 0.5, { url: "https://example.com/a" }),
      job("kubernetes graphql typescript", 0.5, { url: "https://example.com/b" }),
    ]);

    expect(result.changed).toBe(true);
    expect(result.next.keywords).toContain("graphql");
    expect(result.next.negativeKeywords).toContain("intern");
    expect(generateObject).toHaveBeenCalledOnce();
  });
});
