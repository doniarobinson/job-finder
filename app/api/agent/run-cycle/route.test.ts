import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const { adminAuthFailureMock, runSearchCycleMock } = vi.hoisted(() => ({
  adminAuthFailureMock: vi.fn(),
  runSearchCycleMock: vi.fn(),
}));

vi.mock("@/lib/api/adminAuth", () => ({
  adminAuthFailure: adminAuthFailureMock,
}));

vi.mock("@/lib/agent/runSearchCycle", () => ({
  runSearchCycle: runSearchCycleMock,
}));

describe("POST /api/agent/run-cycle", () => {
  beforeEach(() => {
    adminAuthFailureMock.mockReset();
    runSearchCycleMock.mockReset();
    adminAuthFailureMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when admin auth fails", async () => {
    const unauthorized = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
    adminAuthFailureMock.mockReturnValue(unauthorized);

    const response = await POST(new Request("http://localhost/api/agent/run-cycle", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(runSearchCycleMock).not.toHaveBeenCalled();
  });

  it("returns cycle result JSON on success", async () => {
    const cycleResult = {
      searched: 10,
      newJobs: 3,
      scored: 3,
      paramsUpdated: false,
    };
    runSearchCycleMock.mockResolvedValue(cycleResult);

    const response = await POST(new Request("http://localhost/api/agent/run-cycle", { method: "POST" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(cycleResult);
    expect(runSearchCycleMock).toHaveBeenCalledOnce();
  });

  it("returns 500 with error message when the cycle throws", async () => {
    runSearchCycleMock.mockRejectedValue(new Error("Database not configured"));

    const response = await POST(new Request("http://localhost/api/agent/run-cycle", { method: "POST" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Database not configured",
    });
  });
});
