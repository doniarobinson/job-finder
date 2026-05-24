import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AGENT_CYCLE_CRON_SCHEDULE,
  formatScheduledCycleIdleMessage,
  getNextCronRunAt,
  getNextScheduledCycleRun,
  isAgentCronScheduleEnabled,
  parseDailyUtcCronSchedule,
} from "./cronSchedule";

describe("parseDailyUtcCronSchedule", () => {
  it("parses a daily UTC cron expression", () => {
    expect(parseDailyUtcCronSchedule("0 14 * * *")).toEqual({ hour: 14, minute: 0 });
  });

  it("returns null for unsupported expressions", () => {
    expect(parseDailyUtcCronSchedule("0 14 * * 1")).toBeNull();
  });
});

describe("getNextCronRunAt", () => {
  it("returns later today when the run time has not passed", () => {
    const next = getNextCronRunAt("0 14 * * *", new Date("2026-05-20T10:00:00.000Z"));

    expect(next?.toISOString()).toBe("2026-05-20T14:00:00.000Z");
  });

  it("returns tomorrow when today's run time has passed", () => {
    const next = getNextCronRunAt("0 14 * * *", new Date("2026-05-20T15:00:00.000Z"));

    expect(next?.toISOString()).toBe("2026-05-21T14:00:00.000Z");
  });

  it("returns tomorrow when the current time equals the run time", () => {
    const next = getNextCronRunAt("0 14 * * *", new Date("2026-05-20T14:00:00.000Z"));

    expect(next?.toISOString()).toBe("2026-05-21T14:00:00.000Z");
  });
});

describe("getNextScheduledCycleRun", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null outside production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");

    expect(getNextScheduledCycleRun(new Date("2026-05-20T10:00:00.000Z"))).toBeNull();
    expect(isAgentCronScheduleEnabled()).toBe(false);
  });

  it("returns the next run in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");

    expect(isAgentCronScheduleEnabled()).toBe(true);
    expect(
      getNextScheduledCycleRun(new Date("2026-05-20T10:00:00.000Z"))?.toISOString()
    ).toBe("2026-05-20T14:00:00.000Z");
    expect(AGENT_CYCLE_CRON_SCHEDULE).toBe("0 14 * * *");
  });
});

describe("formatScheduledCycleIdleMessage", () => {
  it("includes a human-readable timestamp", () => {
    const message = formatScheduledCycleIdleMessage(new Date("2026-05-20T14:00:00.000Z"));

    expect(message).toMatch(/^Next scheduled cycle:/);
    expect(message.endsWith(".")).toBe(true);
  });
});
