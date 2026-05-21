import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { adminAuthFailure } from "@/lib/api/adminAuth";

describe("adminAuthFailure", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows the request when ADMIN_SECRET is not set", () => {
    expect(adminAuthFailure(new Request("http://localhost"))).toBeNull();
  });

  it("returns 401 when ADMIN_SECRET is set and the header is missing", async () => {
    vi.stubEnv("ADMIN_SECRET", "test-secret");

    const response = adminAuthFailure(new Request("http://localhost"));
    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when the header does not match", async () => {
    vi.stubEnv("ADMIN_SECRET", "test-secret");

    const response = adminAuthFailure(
      new Request("http://localhost", { headers: { "x-admin-secret": "wrong" } })
    );
    expect(response?.status).toBe(401);
  });

  it("allows the request when x-admin-secret matches", () => {
    vi.stubEnv("ADMIN_SECRET", "test-secret");

    const response = adminAuthFailure(
      new Request("http://localhost", { headers: { "x-admin-secret": "test-secret" } })
    );
    expect(response).toBeNull();
  });
});
