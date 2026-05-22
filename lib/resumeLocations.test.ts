import { describe, expect, it } from "vitest";

import { extractCityStateLocations, inferResumeLocations } from "./resumeLocations";

describe("extractCityStateLocations", () => {
  it("extracts City, ST pairs and normalizes casing", () => {
    expect(extractCityStateLocations("Jane Doe · brooklyn, ny · jane@example.com")).toEqual([
      "Brooklyn, NY",
    ]);
  });

  it("ignores invalid state codes", () => {
    expect(extractCityStateLocations("Skills: React, Node")).toEqual([]);
  });
});

describe("inferResumeLocations", () => {
  it("prefers an explicit Locations line when present", () => {
    const resume = "Jane Doe\nBrooklyn, NY\nLocations: Austin, Remote";

    expect(inferResumeLocations(resume, ["Austin", "Remote"])).toEqual(["Austin", "Remote"]);
  });

  it("infers City, ST from the resume header", () => {
    const resume = `Jane Doe
Brooklyn, NY
jane@example.com · (555) 555-5555

Experience
Acme Corp — 2020–Present`;

    expect(inferResumeLocations(resume)).toEqual(["Brooklyn, NY"]);
  });

  it("infers a major city name from the header when no state is listed", () => {
    const resume = `Jane Doe
Seattle · jane@example.com

Summary
Platform engineer with 8 years experience.`;

    expect(inferResumeLocations(resume)).toEqual(["Seattle"]);
  });

  it("falls back to the experience section when the header has no location", () => {
    const resume = `Jane Doe
jane@example.com

Experience
Senior Engineer, Acme Corp — Austin, TX
Jan 2022 – Present
Built platform tooling.`;

    expect(inferResumeLocations(resume)).toEqual(["Austin, TX"]);
  });

  it("prefers header location over experience when both are present", () => {
    const resume = `Jane Doe
Denver, CO
jane@example.com

Experience
Engineer, Beta Inc — San Francisco, CA
2020 – 2022`;

    expect(inferResumeLocations(resume)).toEqual(["Denver, CO"]);
  });
});
