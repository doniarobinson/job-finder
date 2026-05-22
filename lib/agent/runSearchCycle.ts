import { and, desc, eq, inArray } from "drizzle-orm";

import { ensureCurrentEpoch } from "@/lib/agent/epochs";
import { refineSearchParams } from "@/lib/agent/refineSearchParams";
import { hashJobUrl, scoreJobs } from "@/lib/agent/scoreJob";
import { db, schema } from "@/lib/db";
import { ensureBootstrapProfile } from "@/lib/profile";
import { searchAdzuna } from "@/lib/sources/adzuna";
import {
  parsedProfileSchema,
  searchParamsSchema,
  type AgentCycleResult,
  type SearchParams,
} from "@/lib/types";

async function getCurrentSearchParams(profileId: number): Promise<SearchParams> {
  if (!db) throw new Error("Database not configured");

  const [row] = await db
    .select()
    .from(schema.searchParams)
    .where(
      and(
        eq(schema.searchParams.profileId, profileId),
        eq(schema.searchParams.isCurrent, true)
      )
    )
    .orderBy(desc(schema.searchParams.id))
    .limit(1);

  if (!row) throw new Error("No current search params for profile");
  return searchParamsSchema.parse(row.paramsJson);
}

async function persistSearchParams(
  profileId: number,
  params: SearchParams,
  epochId: number
): Promise<void> {
  if (!db) return;

  await db
    .update(schema.searchParams)
    .set({ isCurrent: false })
    .where(
      and(
        eq(schema.searchParams.profileId, profileId),
        eq(schema.searchParams.isCurrent, true)
      )
    );

  await db.insert(schema.searchParams).values({
    profileId,
    epochId,
    paramsJson: params,
    isCurrent: true,
  });
}

export async function runSearchCycle(): Promise<AgentCycleResult> {
  if (!db) throw new Error("Database not configured (DATABASE_URL missing)");

  const [settings] = await db
    .select()
    .from(schema.agentSettings)
    .where(eq(schema.agentSettings.id, 1))
    .limit(1);

  if (settings?.paused) {
    return { searched: 0, newJobs: 0, scored: 0, paramsUpdated: false, skippedReason: "paused" };
  }

  const { profileId } = await ensureBootstrapProfile();

  const [profileRow] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);

  if (!profileRow) throw new Error("Profile not found");

  const profile = parsedProfileSchema.parse(profileRow.parsedJson);
  const params = await getCurrentSearchParams(profileId);
  const epoch = await ensureCurrentEpoch(profileId);

  const rawJobs = await searchAdzuna(params);
  const urlHashes = rawJobs.map((j) => hashJobUrl(j.url));

  const existing =
    urlHashes.length > 0
      ? await db
          .select()
          .from(schema.jobs)
          .where(
            and(
              eq(schema.jobs.epochId, epoch.id),
              inArray(schema.jobs.urlHash, urlHashes)
            )
          )
      : [];

  const existingHashes = new Set(existing.map((j) => j.urlHash));
  const newJobs = rawJobs.filter((j) => !existingHashes.has(hashJobUrl(j.url)));

  const scored = await scoreJobs(profileRow.resumeText, profile, newJobs);

  if (scored.length > 0) {
    await db.insert(schema.jobs).values(
      scored.map((job) => ({
        epochId: epoch.id,
        urlHash: hashJobUrl(job.url),
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        description: job.description,
        url: job.url,
        location: job.location,
        source: job.source,
        score: job.score,
        status: "new",
      }))
    );
  }

  const highScore = scored.filter((j) => (j.score ?? 0) >= 0.35);
  const beforeParams = params;
  const { next, triggerPhrases, changed } = await refineSearchParams(beforeParams, highScore);

  if (changed) {
    await persistSearchParams(profileId, next, epoch.id);
    await db.insert(schema.paramHistory).values({
      epochId: epoch.id,
      beforeJson: beforeParams,
      afterJson: next,
      triggerPhrases,
    });
  }

  return {
    searched: rawJobs.length,
    newJobs: scored.length,
    scored: scored.length,
    paramsUpdated: changed,
  };
}
