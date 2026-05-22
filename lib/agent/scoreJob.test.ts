import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedJob, ParsedProfile } from "@/lib/types";

import { hashJobUrl, jobDedupeKey, scoreJobs } from "./scoreJob";

vi.mock("@/lib/ai/google", () => ({
  isGeminiConfigured: vi.fn(() => false),
  geminiEmbedding: {},
}));

vi.mock("ai", () => ({
  embed: vi.fn(),
  embedMany: vi.fn(),
}));

const profile: ParsedProfile = {
  skills: ["typescript", "react"],
  titles: ["Engineer"],
  locations: [],
};

const job = (overrides: Partial<NormalizedJob>): NormalizedJob => ({
  externalId: "1",
  title: "Engineer",
  company: "Acme",
  description: "typescript react node",
  url: "https://example.com/jobs/1",
  source: "adzuna",
  ...overrides,
});

describe("hashJobUrl", () => {
  it("returns a stable hash for the same url", () => {
    expect(hashJobUrl("https://example.com/a")).toBe(hashJobUrl("https://example.com/a"));
  });

  it("returns different hashes for different urls", () => {
    expect(hashJobUrl("https://example.com/a")).not.toBe(hashJobUrl("https://example.com/b"));
  });

  it("ignores Adzuna tracking query params", () => {
    const a =
      "https://www.adzuna.com/land/ad/5736199475?se=aaa&utm_medium=api&v=111";
    const b =
      "https://www.adzuna.com/land/ad/5736199475?se=bbb&utm_medium=api&v=222";
    expect(hashJobUrl(a)).toBe(hashJobUrl(b));
  });
});

describe("jobDedupeKey", () => {
  it("keys Adzuna listings by source and external id", () => {
    const a = jobDedupeKey({
      externalId: "5736199475",
      url: "https://www.adzuna.com/land/ad/5736199475?se=aaa&v=1",
      source: "adzuna",
    });
    const b = jobDedupeKey({
      externalId: "5736199475",
      url: "https://www.adzuna.com/land/ad/5736199475?se=bbb&v=2",
      source: "adzuna",
    });
    expect(a).toBe(b);
  });
});

describe("scoreJobs without Gemini", () => {
  beforeEach(async () => {
    const google = await import("@/lib/ai/google");
    vi.mocked(google.isGeminiConfigured).mockReturnValue(false);
  });

  it("returns an empty array for no jobs", async () => {
    await expect(scoreJobs("typescript developer", profile, [])).resolves.toEqual([]);
  });

  it("scores higher when job text overlaps the resume", async () => {
    const scored = await scoreJobs("typescript react developer", profile, [
      job({ description: "typescript react graphql", url: "https://example.com/high" }),
      job({ description: "java cobol mainframe", url: "https://example.com/low" }),
    ]);

    expect(scored[0]!.url).toBe("https://example.com/high");
    expect(scored[0]!.score).toBeGreaterThan(scored[1]!.score ?? 0);
  });

  it("assigns zero score when there is no token overlap", async () => {
    const scored = await scoreJobs("typescript", profile, [
      job({ description: "java cobol mainframe", title: "Analyst" }),
    ]);

    expect(scored[0]!.score).toBe(0);
  });
});
