import { describe, expect, it } from "vitest";

import {
  isPlaceholderDatabaseUrl,
  isValidNeonConnectionString,
  normalizeNeonConnectionString,
} from "./env";

describe("isValidNeonConnectionString", () => {
  it("rejects placeholder and template URLs", () => {
    expect(isValidNeonConnectionString("postgresql://user:password@host:5432/db")).toBe(
      false
    );
    expect(
      isValidNeonConnectionString(
        "postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
      )
    ).toBe(false);
  });

  it("accepts a real-looking Neon URL", () => {
    expect(
      isValidNeonConnectionString(
        "postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
      )
    ).toBe(true);
  });

  it("normalizes postgres:// to postgresql://", () => {
    expect(normalizeNeonConnectionString("postgres://u:p@ep-real.neon.tech/db")).toBe(
      "postgresql://u:p@ep-real.neon.tech/db"
    );
  });
});

describe("isPlaceholderDatabaseUrl", () => {
  it("detects example markers", () => {
    expect(isPlaceholderDatabaseUrl("postgresql://user:password@host:5432/db")).toBe(true);
  });
});
