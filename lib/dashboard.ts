import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { searchParamsSchema } from "@/lib/types";

export type DashboardData = {
  configured: boolean;
  paused: boolean;
  jobs: Array<{
    id: number;
    title: string;
    company: string;
    score: number | null;
    status: string;
    url: string;
    createdAt: Date;
  }>;
  currentParams: Record<string, unknown> | null;
  paramHistory: Array<{
    id: number;
    triggerPhrases: unknown;
    createdAt: Date;
  }>;
};

export async function getDashboardData(): Promise<DashboardData> {
  if (!db) {
    return {
      configured: false,
      paused: false,
      jobs: [],
      currentParams: null,
      paramHistory: [],
    };
  }

  const [settings] = await db
    .select()
    .from(schema.agentSettings)
    .where(eq(schema.agentSettings.id, 1))
    .limit(1);

  const jobRows = await db
    .select()
    .from(schema.jobs)
    .orderBy(desc(schema.jobs.score), desc(schema.jobs.createdAt))
    .limit(50);

  const [currentParamsRow] = await db
    .select()
    .from(schema.searchParams)
    .where(eq(schema.searchParams.isCurrent, true))
    .orderBy(desc(schema.searchParams.id))
    .limit(1);

  const historyRows = await db
    .select()
    .from(schema.paramHistory)
    .orderBy(desc(schema.paramHistory.createdAt))
    .limit(10);

  return {
    configured: true,
    paused: settings?.paused ?? false,
    jobs: jobRows.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      score: j.score,
      status: j.status,
      url: j.url,
      createdAt: j.createdAt,
    })),
    currentParams: currentParamsRow
      ? searchParamsSchema.parse(currentParamsRow.paramsJson)
      : null,
    paramHistory: historyRows.map((h) => ({
      id: h.id,
      triggerPhrases: h.triggerPhrases,
      createdAt: h.createdAt,
    })),
  };
}
