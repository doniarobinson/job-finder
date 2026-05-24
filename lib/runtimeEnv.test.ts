import { afterEach, describe, expect, it, vi } from "vitest";

import { isProductionDeployment, isVercelDeployment } from "./runtimeEnv";

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

describe("isProductionDeployment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false locally", () => {
    vi.stubEnv("VERCEL_ENV", "");
    expect(isProductionDeployment()).toBe(false);
  });

  it("returns false on Vercel preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isProductionDeployment()).toBe(false);
  });

  it("returns true on Vercel production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isProductionDeployment()).toBe(true);
  });
});
