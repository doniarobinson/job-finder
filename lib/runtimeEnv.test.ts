import { afterEach, describe, expect, it, vi } from "vitest";

import { isVercelDeployment } from "./runtimeEnv";

describe("isVercelDeployment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false locally", () => {
    vi.stubEnv("VERCEL", "");
    expect(isVercelDeployment()).toBe(false);
  });

  it("returns true on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(isVercelDeployment()).toBe(true);
  });
});
