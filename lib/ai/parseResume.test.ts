import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatResumeParseMessage,
  parseResume,
  parseResumeHeuristic,
} from "./parseResume";

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

  it("parses Languages line into skills", () => {
    const parsed = parseResumeHeuristic("Languages: Python, Go, Java");

    expect(parsed.skills).toEqual(["Python", "Go", "Java"]);
  });

  it("infers management titles from a manager resume", () => {
    const parsed = parseResumeHeuristic(
      `Experience
Software Engineering Manager, Acme Corp
2021 - Present
Led a team of 8 engineers.`
    );

    expect(parsed.titles[0]).toMatch(/Software Engineering Manager/i);
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

describe("formatResumeParseMessage", () => {
  it("describes Gemini parsing", () => {
    const message = formatResumeParseMessage(
      { source: "gemini", geminiConfigured: true, geminiFailed: false },
      {
        skills: ["Python", "Go"],
        titles: ["Engineering Manager"],
        locations: [],
      }
    );

    expect(message).toContain("Gemini parsed the resume");
    expect(message).toContain("Engineering Manager");
  });

  it("describes heuristic fallback after Gemini failure", () => {
    const message = formatResumeParseMessage(
      { source: "heuristic", geminiConfigured: true, geminiFailed: true },
      { skills: ["Rust"], titles: ["Staff Engineer"], locations: [] }
    );

    expect(message).toContain("Gemini resume parse failed");
    expect(message).toContain("heuristic fallback");
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
    const result = await parseResume("Skills: Go, Kubernetes");

    expect(result.profile.skills).toEqual(["Go", "Kubernetes"]);
    expect(result.meta).toEqual({
      source: "heuristic",
      geminiConfigured: false,
      geminiFailed: false,
    });
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("uses Gemini when configured", async () => {
    isGeminiConfiguredMock.mockReturnValue(true);
    generateObjectMock.mockResolvedValue({
      object: {
        skills: ["Python", "Go", "Java"],
        titles: ["Software Engineering Manager"],
        yearsExperience: 6,
        locations: ["Remote"],
        summary: "Engineering manager with polyglot experience.",
      },
    });

    const result = await parseResume(
      "Languages: Python, Go, Java\nSoftware Engineering Manager with 6 years experience."
    );

    expect(result.profile.skills).toEqual(["Python", "Go", "Java"]);
    expect(result.profile.titles).toEqual(["Software Engineering Manager"]);
    expect(result.meta.source).toBe("gemini");
    expect(generateObjectMock).toHaveBeenCalledOnce();
  });

  it("falls back to heuristics when Gemini fails", async () => {
    isGeminiConfiguredMock.mockReturnValue(true);
    generateObjectMock.mockRejectedValue(new Error("API unavailable"));

    const result = await parseResume("Skills: Rust, Wasm");

    expect(result.profile.skills).toEqual(["Rust", "Wasm"]);
    expect(result.meta).toEqual({
      source: "heuristic",
      geminiConfigured: true,
      geminiFailed: true,
    });
  });
});
