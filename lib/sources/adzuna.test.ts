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

function stubAdzunaCredentials() {
  vi.stubEnv("ADZUNA_APP_ID", "app-id");
  vi.stubEnv("ADZUNA_APP_KEY", "app-key");
}

function mockFetchJson(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  };
}

describe("searchAdzuna", () => {
  const fetchMock = vi.fn();

  function requestUrl(): URL {
    const [url] = fetchMock.mock.calls[0] as [string];
    return new URL(url);
  }

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

  it("returns an empty array when only one credential is set", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("ADZUNA_APP_ID", "app-id");

    const jobs = await searchAdzuna(baseParams);

    expect(jobs).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("maps Adzuna JSON to NormalizedJob shape", async () => {
    stubAdzunaCredentials();
    fetchMock.mockResolvedValue(mockFetchJson(adzunaApiResponse));

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

  it("returns an empty array when results are missing from the response", async () => {
    stubAdzunaCredentials();
    fetchMock.mockResolvedValue(mockFetchJson({}));

    await expect(searchAdzuna(baseParams)).resolves.toEqual([]);
  });

  it("returns an empty array when results is null", async () => {
    stubAdzunaCredentials();
    fetchMock.mockResolvedValue(mockFetchJson({ results: null }));

    await expect(searchAdzuna(baseParams)).resolves.toEqual([]);
  });

  it("omits location when the API job has no location field", async () => {
    stubAdzunaCredentials();
    fetchMock.mockResolvedValue(
      mockFetchJson({
        results: [
          {
            id: "99",
            title: "Engineer",
            company: { display_name: "Acme" },
            description: "Work",
            redirect_url: "https://example.com/jobs/99",
          },
        ],
      })
    );

    const jobs = await searchAdzuna(baseParams);

    expect(jobs).toEqual([
      {
        externalId: "99",
        title: "Engineer",
        company: "Acme",
        description: "Work",
        url: "https://example.com/jobs/99",
        location: undefined,
        source: "adzuna",
      },
    ]);
  });

  it("throws when the API response is not ok", async () => {
    stubAdzunaCredentials();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });

    await expect(searchAdzuna(baseParams)).rejects.toThrow(
      "Adzuna API error: 503 Service Unavailable"
    );
  });

  it("defaults what to software engineer when keywords and titles are empty", async () => {
    stubAdzunaCredentials();
    fetchMock.mockResolvedValue(mockFetchJson({ results: [] }));

    await searchAdzuna({
      ...baseParams,
      keywords: [],
      titleVariants: [],
    });

    expect(requestUrl().searchParams.get("what")).toBe("software engineer");
  });

  it("caps results_per_page at 50", async () => {
    stubAdzunaCredentials();
    fetchMock.mockResolvedValue(mockFetchJson({ results: [] }));

    await searchAdzuna({ ...baseParams, maxResultsPerCycle: 100 });

    expect(requestUrl().searchParams.get("results_per_page")).toBe("50");
  });

  it("omits where when locations are empty", async () => {
    stubAdzunaCredentials();
    fetchMock.mockResolvedValue(mockFetchJson({ results: [] }));

    await searchAdzuna({ ...baseParams, locations: [] });

    expect(requestUrl().searchParams.has("where")).toBe(false);
  });

  it("builds query params from keywords, titles, and location", async () => {
    stubAdzunaCredentials();
    vi.stubEnv("ADZUNA_COUNTRY", "us");
    fetchMock.mockResolvedValue(mockFetchJson({ results: [] }));

    await searchAdzuna(baseParams);

    expect(fetchMock).toHaveBeenCalledOnce();
    const parsed = requestUrl();

    expect(parsed.pathname).toBe("/v1/api/jobs/us/search/1");
    expect(parsed.searchParams.get("app_id")).toBe("app-id");
    expect(parsed.searchParams.get("app_key")).toBe("app-key");
    expect(parsed.searchParams.get("what")).toBe("Software Engineer typescript");
    expect(parsed.searchParams.get("where")).toBe("New York");
    expect(parsed.searchParams.get("results_per_page")).toBe("20");
  });

  it("appends remote to the what parameter when remote is true", async () => {
    stubAdzunaCredentials();
    fetchMock.mockResolvedValue(mockFetchJson({ results: [] }));

    await searchAdzuna({ ...baseParams, remote: true });

    expect(requestUrl().searchParams.get("what")).toBe("Software Engineer typescript remote");
  });
});
