import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const { inngestSendMock } = vi.hoisted(() => ({
  inngestSendMock: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: inngestSendMock,
  },
}));

describe("GET /api/cron/trigger-cycle", () => {
  beforeEach(() => {
    inngestSendMock.mockReset();
    inngestSendMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 403 outside production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");

    const response = await GET(
      new Request("http://localhost/api/cron/trigger-cycle", { method: "GET" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Scheduler is disabled outside production",
    });
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET is set and auth fails", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CRON_SECRET", "secret");

    const response = await GET(
      new Request("http://localhost/api/cron/trigger-cycle", { method: "GET" }),
    );

    expect(response.status).toBe(401);
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  it("triggers Inngest on production with valid auth", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CRON_SECRET", "secret");

    const response = await GET(
      new Request("http://localhost/api/cron/trigger-cycle", {
        method: "GET",
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, triggered: true });
    expect(inngestSendMock).toHaveBeenCalledWith({
      name: "job-finder/cycle.run",
      data: { source: "vercel-cron" },
    });
  });
});
