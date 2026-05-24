import { isProductionDeployment } from "@/lib/runtimeEnv";

/** Keep in sync with `vercel.json` → crons[0].schedule */
export const AGENT_CYCLE_CRON_SCHEDULE = "0 14 * * *";

export function parseDailyUtcCronSchedule(
  schedule: string
): { hour: number; minute: number } | null {
  const match = schedule.trim().match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/);
  if (!match) return null;

  const minute = Number(match[1]);
  const hour = Number(match[2]);
  if (minute > 59 || hour > 23) return null;

  return { hour, minute };
}

/** Next UTC run for a daily cron expression like `0 14 * * *`. */
export function getNextCronRunAt(
  schedule = AGENT_CYCLE_CRON_SCHEDULE,
  from = new Date()
): Date | null {
  const parts = parseDailyUtcCronSchedule(schedule);
  if (!parts) return null;

  const next = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      parts.hour,
      parts.minute,
      0,
      0
    )
  );

  if (next.getTime() <= from.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

export function isAgentCronScheduleEnabled(): boolean {
  return isProductionDeployment();
}

export function getNextScheduledCycleRun(from = new Date()): Date | null {
  if (!isAgentCronScheduleEnabled()) return null;
  return getNextCronRunAt(AGENT_CYCLE_CRON_SCHEDULE, from);
}

export function formatScheduledCycleRun(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatScheduledCycleIdleMessage(nextRun: Date): string {
  return `Next scheduled cycle: ${formatScheduledCycleRun(nextRun)}.`;
}
