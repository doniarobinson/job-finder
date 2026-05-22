import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { schema } from "@/lib/db";

const epochsHoisted = vi.hoisted(() => {
  const state = {
    epochs: [] as Array<{
      id: number;
      profileId: number;
      kind: string;
      note: string | null;
      resumeHash: string | null;
      startedAt: Date;
    }>,
    nextId: 1,
  };

  return {
    state,
    db: {
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((payload: unknown) => {
          if (table === schema.agentEpochs && payload && typeof payload === "object") {
            const row = {
              id: state.nextId++,
              profileId: (payload as { profileId: number }).profileId,
              kind: (payload as { kind: string }).kind,
              note: (payload as { note?: string }).note ?? null,
              resumeHash: (payload as { resumeHash?: string }).resumeHash ?? null,
              startedAt: new Date("2026-01-01"),
            };
            state.epochs.push(row);
            return {
              returning: vi.fn(() => Promise.resolve([{ id: row.id }])),
            };
          }
          return Promise.resolve();
        }),
      })),
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => {
                if (table === schema.agentEpochs) {
                  return Promise.resolve([...state.epochs].reverse());
                }
                return Promise.resolve([]);
              }),
            })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    },
  };
});

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    db: epochsHoisted.db,
  };
});

describe("agent epochs", () => {
  beforeEach(() => {
    epochsHoisted.state.epochs = [];
    epochsHoisted.state.nextId = 1;
    epochsHoisted.db.insert.mockClear();
    epochsHoisted.db.select.mockClear();
    epochsHoisted.db.update.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("creates and returns the latest epoch", async () => {
    const { createAgentEpoch, getLatestEpoch } = await import("./epochs");

    const epochId = await createAgentEpoch(1, "initial_bootstrap", {
      note: "Initial profile bootstrap",
      resumeText: "Skills: Go",
    });
    const latest = await getLatestEpoch(1);

    expect(epochId).toBe(1);
    expect(latest?.kind).toBe("initial_bootstrap");
    expect(latest?.note).toBe("Initial profile bootstrap");
  });

  it("backfills legacy rows when ensuring the current epoch", async () => {
    const { createAgentEpoch, ensureCurrentEpoch } = await import("./epochs");

    await createAgentEpoch(1, "initial_bootstrap");
    const epoch = await ensureCurrentEpoch(1);

    expect(epoch.id).toBe(1);
    expect(epochsHoisted.db.update).toHaveBeenCalled();
  });
});
