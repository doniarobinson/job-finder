import { createHash } from "crypto";

import { and, desc, eq, isNull } from "drizzle-orm";

import type { AgentEpochKind } from "@/lib/agent/epochLabels";
import { db, schema } from "@/lib/db";

export type { AgentEpochKind } from "@/lib/agent/epochLabels";
export { epochKindLabel } from "@/lib/agent/epochLabels";

export function hashResume(resumeText: string): string {
  return createHash("sha256").update(resumeText).digest("hex").slice(0, 16);
}

export async function createAgentEpoch(
  profileId: number,
  kind: AgentEpochKind,
  options?: { note?: string; resumeText?: string }
): Promise<number> {
  if (!db) throw new Error("Database not configured (DATABASE_URL missing)");

  const [row] = await db
    .insert(schema.agentEpochs)
    .values({
      profileId,
      kind,
      note: options?.note,
      resumeHash: options?.resumeText ? hashResume(options.resumeText) : undefined,
    })
    .returning({ id: schema.agentEpochs.id });

  if (!row) throw new Error("Failed to create agent epoch");
  return row.id;
}

export async function getLatestEpoch(profileId: number) {
  if (!db) return null;

  const [row] = await db
    .select()
    .from(schema.agentEpochs)
    .where(eq(schema.agentEpochs.profileId, profileId))
    .orderBy(desc(schema.agentEpochs.id))
    .limit(1);

  return row ?? null;
}

async function backfillEpochIds(profileId: number, epochId: number): Promise<void> {
  if (!db) return;

  await db
    .update(schema.searchParams)
    .set({ epochId })
    .where(
      and(eq(schema.searchParams.profileId, profileId), isNull(schema.searchParams.epochId))
    );

  await db
    .update(schema.jobs)
    .set({ epochId })
    .where(isNull(schema.jobs.epochId));

  await db
    .update(schema.paramHistory)
    .set({ epochId })
    .where(isNull(schema.paramHistory.epochId));
}

/** Returns the active epoch for a profile, backfilling legacy rows when needed. */
export async function ensureCurrentEpoch(profileId: number): Promise<{
  id: number;
  kind: AgentEpochKind;
  startedAt: Date;
  note: string | null;
}> {
  const existing = await getLatestEpoch(profileId);
  if (existing) {
    await backfillEpochIds(profileId, existing.id);
    return {
      id: existing.id,
      kind: existing.kind as AgentEpochKind,
      startedAt: existing.startedAt,
      note: existing.note,
    };
  }

  const epochId = await createAgentEpoch(profileId, "initial_bootstrap", {
    note: "Backfilled for existing data",
  });
  await backfillEpochIds(profileId, epochId);

  const created = await getLatestEpoch(profileId);
  if (!created) throw new Error("Failed to ensure agent epoch");

  return {
    id: created.id,
    kind: created.kind as AgentEpochKind,
    startedAt: created.startedAt,
    note: created.note,
  };
}

export async function listEpochsForProfile(profileId: number) {
  if (!db) return [];

  return db
    .select()
    .from(schema.agentEpochs)
    .where(eq(schema.agentEpochs.profileId, profileId))
    .orderBy(desc(schema.agentEpochs.id));
}

