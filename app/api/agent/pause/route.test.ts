import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const { adminAuthFailureMock, insertMock, valuesMock, onConflictDoUpdateMock, dbRef } =
  vi.hoisted(() => {
    const onConflictDoUpdateMock = vi.fn().mockResolvedValue(undefined);
    const valuesMock = vi.fn().mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateMock });
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

    return {
      adminAuthFailureMock: vi.fn(),
      insertMock,
      valuesMock,
      onConflictDoUpdateMock,
      dbRef: { current: { insert: insertMock } as { insert: typeof insertMock } | null },
    };
  });

vi.mock("@/lib/api/adminAuth", () => ({
  adminAuthFailure: adminAuthFailureMock,
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbRef.current;
  },
  schema: {
    agentSettings: {
      id: "id",
    },
  },
}));

function postJson(body: unknown) {
  return new Request("http://localhost/api/agent/pause", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agent/pause", () => {
  beforeEach(() => {
    adminAuthFailureMock.mockReset();
    insertMock.mockClear();
    valuesMock.mockClear();
    onConflictDoUpdateMock.mockClear();
    adminAuthFailureMock.mockReturnValue(null);
    dbRef.current = { insert: insertMock };
  });

  it("returns 401 when admin auth fails", async () => {
    adminAuthFailureMock.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await POST(postJson({ paused: true }));

    expect(response.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the database is not configured", async () => {
    dbRef.current = null;

    const response = await POST(postJson({ paused: true }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Database not configured" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("persists paused state and returns JSON", async () => {
    const response = await POST(postJson({ paused: true }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ paused: true });
    expect(insertMock).toHaveBeenCalledOnce();
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, paused: true, updatedAt: expect.any(Date) })
    );
    expect(onConflictDoUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ paused: true, updatedAt: expect.any(Date) }),
      })
    );
  });

  it("coerces paused to boolean false when omitted", async () => {
    const response = await POST(postJson({}));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ paused: false });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, paused: false })
    );
  });
});
