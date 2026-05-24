import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseResume, parseResumeHeuristic } from "./parseResume";

const { isGeminiConfiguredMock, generateObjectMock } = vi.hoisted(() => ({
  isGeminiConfiguredMock: vi.fn(() => false),
  generateObjectMock: vi.fn(),
}));

vi.mock("@/lib/ai/google", () => ({
  isGeminiConfigured: isGeminiConfiguredMock,
  geminiFlash: {},
}));

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

describe("parseResumeHeuristic", () => {
  it("parses explicit skills, titles, and locations lines", () => {
    const parsed = parseResumeHeuristic(
      "Skills: TypeScript, React\nTitles: Staff Engineer, Tech Lead\nLocations: NYC, Remote\n8 years experience"
    );

    expect(parsed.skills).toEqual(["TypeScript", "React"]);
    expect(parsed.titles).toEqual(["Staff Engineer", "Tech Lead"]);
    expect(parsed.locations).toEqual(["NYC", "Remote"]);
    expect(parsed.yearsExperience).toBe(8);
  });

  it("infers skills and titles from resume body when lines are missing", () => {
    const parsed = parseResumeHeuristic(
      "Experienced typescript and react developer. Former software engineer at Acme."
    );

    expect(parsed.skills).toContain("typescript");
    expect(parsed.skills).toContain("react");
    expect(parsed.titles.length).toBeGreaterThan(0);
  });

  it("uses a default title when none can be inferred", () => {
    const parsed = parseResumeHeuristic("Short bio with no role or skill keywords.");

    expect(parsed.titles).toEqual(["Software Engineer"]);
  });

  it("infers City, ST from the resume header when Locations line is missing", () => {
    const parsed = parseResumeHeuristic(
      `Jane Doe
Brooklyn, NY
jane@example.com

Experience
Engineer at Acme`
    );

    expect(parsed.locations).toEqual(["Brooklyn, NY"]);
  });
});

describe("parseResume", () => {
  beforeEach(() => {
    isGeminiConfiguredMock.mockReset();
    generateObjectMock.mockReset();
    isGeminiConfiguredMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when resume text is empty", async () => {
    await expect(parseResume("   ")).rejects.toThrow("Resume text is required");
  });

  it("uses heuristics when Gemini is not configured", async () => {
    const parsed = await parseResume("Skills: Go, Kubernetes");

    expect(parsed.skills).toEqual(["Go", "Kubernetes"]);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("uses Gemini when configured", async () => {
    isGeminiConfiguredMock.mockReturnValue(true);
    generateObjectMock.mockResolvedValue({
      object: {
        skills: ["Python", "Go", "Java"],
        titles: ["Backend Engineer"],
        yearsExperience: 6,
        locations: ["Remote"],
        summary: "Backend engineer with polyglot experience.",
      },
    });

    const parsed = await parseResume("Languages: Python, Go, Java\nBackend engineer with 6 years experience.");

    expect(parsed.skills).toEqual(["Python", "Go", "Java"]);
    expect(parsed.titles).toEqual(["Backend Engineer"]);
    expect(parsed.yearsExperience).toBe(6);
    expect(parsed.locations).toContain("Remote");
    expect(generateObjectMock).toHaveBeenCalledOnce();
  });

  it("falls back to heuristics when Gemini fails", async () => {
    isGeminiConfiguredMock.mockReturnValue(true);
    generateObjectMock.mockRejectedValue(new Error("API unavailable"));

    const parsed = await parseResume("Skills: Rust, Wasm");

    expect(parsed.skills).toEqual(["Rust", "Wasm"]);
  });
});
