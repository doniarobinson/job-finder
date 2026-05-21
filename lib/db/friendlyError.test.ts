import { afterEach, describe, expect, it, vi } from "vitest";

import { formatFriendlyDbError } from "./friendlyError";

describe("formatFriendlyDbError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses local copy for connection failures", () => {
    vi.stubEnv("VERCEL", "");
    expect(formatFriendlyDbError(new Error("fetch failed"))).toContain(".env.local");
  });

  it("uses Vercel copy for connection failures", () => {
    vi.stubEnv("VERCEL", "1");
    expect(formatFriendlyDbError(new Error("fetch failed"))).toContain("Vercel");
  });

  it("uses local copy for missing tables", () => {
    vi.stubEnv("VERCEL", "");
    expect(formatFriendlyDbError(new Error("Failed query"))).toBe(
      "Database connected but tables are missing. Run npm run db:push."
    );
  });

  it("uses Vercel copy for missing tables", () => {
    vi.stubEnv("VERCEL", "1");
    expect(formatFriendlyDbError(new Error("relation does not exist"))).toContain(
      "npm run db:push locally"
    );
  });
});
