import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchParams } from "@/lib/types";

import { searchAdzuna } from "./adzuna";

const baseParams: SearchParams = {
  keywords: ["typescript"],
  titleVariants: ["Software Engineer"],
  locations: ["New York"],
  remote: false,
  negativeKeywords: [],
  maxResultsPerCycle: 20,
};

const adzunaApiResponse = {
  results: [
    {
      id: "12345",
      title: "Backend Engineer",
      company: { display_name: "Acme Corp" },
      description: "Build APIs with TypeScript.",
      redirect_url: "https://example.com/jobs/12345",
      location: { display_name: "New York, NY" },
    },
  ],
};

describe("searchAdzuna", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns an empty array when credentials are missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const jobs = await searchAdzuna(baseParams);

    expect(jobs).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Adzuna credentials missing; returning empty job set."
    );

    warnSpy.mockRestore();
  });

  it("maps Adzuna JSON to NormalizedJob shape", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "app-id");
    vi.stubEnv("ADZUNA_APP_KEY", "app-key");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => adzunaApiResponse,
    });

    const jobs = await searchAdzuna(baseParams);

    expect(jobs).toEqual([
      {
        externalId: "12345",
        title: "Backend Engineer",
        company: "Acme Corp",
        description: "Build APIs with TypeScript.",
        url: "https://example.com/jobs/12345",
        location: "New York, NY",
        source: "adzuna",
      },
    ]);
  });

  it("throws when the API response is not ok", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "app-id");
    vi.stubEnv("ADZUNA_APP_KEY", "app-key");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });

    await expect(searchAdzuna(baseParams)).rejects.toThrow(
      "Adzuna API error: 503 Service Unavailable"
    );
  });

  it("builds query params from keywords, titles, and location", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "app-id");
    vi.stubEnv("ADZUNA_APP_KEY", "app-key");
    vi.stubEnv("ADZUNA_COUNTRY", "us");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await searchAdzuna(baseParams);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit?];
    const parsed = new URL(url);

    expect(parsed.pathname).toBe("/v1/api/jobs/us/search/1");
    expect(parsed.searchParams.get("app_id")).toBe("app-id");
    expect(parsed.searchParams.get("app_key")).toBe("app-key");
    expect(parsed.searchParams.get("what")).toBe("Software Engineer typescript");
    expect(parsed.searchParams.get("where")).toBe("New York");
    expect(parsed.searchParams.get("results_per_page")).toBe("20");
  });

  it("appends remote to the what parameter when remote is true", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "app-id");
    vi.stubEnv("ADZUNA_APP_KEY", "app-key");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await searchAdzuna({ ...baseParams, remote: true });

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url);
    expect(parsed.searchParams.get("what")).toBe("Software Engineer typescript remote");
  });
});
