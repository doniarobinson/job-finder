import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const { adminAuthFailureMock, updateProfileResumeMock, dbRef } = vi.hoisted(() => ({
  adminAuthFailureMock: vi.fn(),
  updateProfileResumeMock: vi.fn(),
  dbRef: { current: {} as object | null },
}));

vi.mock("@/lib/api/adminAuth", () => ({
  adminAuthFailure: adminAuthFailureMock,
}));

vi.mock("@/lib/profile", () => ({
  updateProfileResume: updateProfileResumeMock,
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbRef.current;
  },
}));

function postJson(body: unknown, init?: RequestInit) {
  return new Request("http://localhost/api/agent/update-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(body),
    ...init,
  });
}

describe("POST /api/agent/update-resume", () => {
  beforeEach(() => {
    adminAuthFailureMock.mockReset();
    updateProfileResumeMock.mockReset();
    adminAuthFailureMock.mockReturnValue(null);
    dbRef.current = {};
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when admin auth fails", async () => {
    adminAuthFailureMock.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await POST(postJson({ resumeText: "Skills: TypeScript" }));

    expect(response.status).toBe(401);
    expect(updateProfileResumeMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/agent/update-resume", {
        method: "POST",
        body: "not-json",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 when resumeText is missing", async () => {
    const response = await POST(postJson({ resumeText: "   " }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "resumeText is required" });
  });

  it("returns 503 when the database is not configured", async () => {
    dbRef.current = null;

    const response = await POST(postJson({ resumeText: "Skills: React" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Database not configured" });
    expect(updateProfileResumeMock).not.toHaveBeenCalled();
  });

  it("returns 500 when updateProfileResume throws", async () => {
    updateProfileResumeMock.mockRejectedValue(new Error("Resume text is required"));

    const response = await POST(postJson({ resumeText: "Skills: Go" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Resume text is required" });
  });

  it("returns 200 with update result on success", async () => {
    const updateResult = {
      profileId: 1,
      parsed: { skills: ["typescript"], titles: ["Engineer"], locations: [] },
      searchParams: {
        keywords: ["typescript"],
        titleVariants: ["Engineer"],
        locations: [],
        remote: false,
        negativeKeywords: [],
        maxResultsPerCycle: 20,
      },
      created: false,
      searchParamsReset: false,
    };
    updateProfileResumeMock.mockResolvedValue(updateResult);

    const response = await POST(
      postJson({ resumeText: "Skills: TypeScript", resetSearchParams: true })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(updateResult);
    expect(updateProfileResumeMock).toHaveBeenCalledWith("Skills: TypeScript", {
      resetSearchParams: true,
    });
  });
});
