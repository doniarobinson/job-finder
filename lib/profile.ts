import { and, desc, eq } from "drizzle-orm";

import {
  createAgentEpoch,
  ensureCurrentEpoch,
  type AgentEpochKind,
} from "@/lib/agent/epochs";
import { parseResume } from "@/lib/ai/parseResume";
import { db, schema } from "@/lib/db";
import {
  parsedProfileSchema,
  searchParamsSchema,
  type ParsedProfile,
  type SearchParams,
  type UpdateResumeResult,
} from "@/lib/types";

export { parseResumeHeuristic } from "@/lib/ai/parseResume";

export function defaultSearchParams(profile: ParsedProfile): SearchParams {
  return searchParamsSchema.parse({
    keywords: profile.skills.slice(0, 8),
    titleVariants: profile.titles.slice(0, 3),
    locations: profile.locations,
    remote: false,
    negativeKeywords: [],
    maxResultsPerCycle: 20,
  });
}

async function getLatestProfile() {
  if (!db) throw new Error("Database not configured (DATABASE_URL missing)");

  const [row] = await db
    .select()
    .from(schema.profiles)
    .orderBy(desc(schema.profiles.id))
    .limit(1);

  return row ?? null;
}

async function getCurrentSearchParamsRow(profileId: number) {
  if (!db) throw new Error("Database not configured (DATABASE_URL missing)");

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

  return row ?? null;
}

async function ensureAgentSettings(): Promise<void> {
  if (!db) return;

  await db
    .insert(schema.agentSettings)
    .values({ id: 1, paused: false })
    .onConflictDoNothing();
}

async function setCurrentSearchParams(
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

/**
 * Parse and persist resume text. Use this when updating the profile outside an agent cycle.
 * Does not search jobs or refine parameters unless `resetSearchParams` is true.
 */
export async function updateProfileResume(
  resumeText: string,
  options?: {
    resetSearchParams?: boolean;
    startNewEpoch?: boolean;
    epochKind?: AgentEpochKind;
    epochNote?: string;
  }
): Promise<UpdateResumeResult> {
  if (!db) throw new Error("Database not configured (DATABASE_URL missing)");

  const trimmed = resumeText.trim();
  if (!trimmed) throw new Error("Resume text is required");

  const { profile: parsed, meta: resumeParseMeta } = await parseResume(trimmed);
  const resetSearchParams = options?.resetSearchParams ?? false;
  const existing = await getLatestProfile();

  if (!existing) {
    const [profile] = await db
      .insert(schema.profiles)
      .values({ resumeText: trimmed, parsedJson: parsed })
      .returning();

    const epochId = await createAgentEpoch(profile.id, "initial_bootstrap", {
      note: "Initial profile bootstrap",
      resumeText: trimmed,
    });
    const searchParams = defaultSearchParams(parsed);
    await setCurrentSearchParams(profile.id, searchParams, epochId);
    await ensureAgentSettings();

    return {
      profileId: profile.id,
      parsed,
      searchParams,
      created: true,
      searchParamsReset: true,
      epochId,
      epochStarted: true,
      resumeParseMeta,
    };
  }

  await db
    .update(schema.profiles)
    .set({ resumeText: trimmed, parsedJson: parsed })
    .where(eq(schema.profiles.id, existing.id));

  const currentParamsRow = await getCurrentSearchParamsRow(existing.id);
  let searchParamsReset = false;

  if (resetSearchParams || !currentParamsRow) {
    const searchParams = defaultSearchParams(parsed);
    let epochId: number;
    let epochStarted = false;

    if (options?.startNewEpoch) {
      epochId = await createAgentEpoch(existing.id, options.epochKind ?? "rebootstrap", {
        note: options.epochNote,
        resumeText: trimmed,
      });
      epochStarted = true;
    } else {
      const epoch = await ensureCurrentEpoch(existing.id);
      epochId = epoch.id;
    }

    await setCurrentSearchParams(existing.id, searchParams, epochId);
    searchParamsReset = true;
    return {
      profileId: existing.id,
      parsed,
      searchParams,
      created: false,
      searchParamsReset,
      epochId,
      epochStarted,
      resumeParseMeta,
    };
  }

  return {
    profileId: existing.id,
    parsed,
    searchParams: searchParamsSchema.parse(currentParamsRow.paramsJson),
    created: false,
    searchParamsReset: false,
    resumeParseMeta,
  };
}

/** Re-read RESUME_TEXT from the environment and reset search params (testing / dev). */
export async function rebootstrapProfileFromEnv(): Promise<UpdateResumeResult> {
  const resumeText = process.env.RESUME_TEXT?.trim();
  if (!resumeText) {
    throw new Error("RESUME_TEXT environment variable is required to re-bootstrap");
  }

  return updateProfileResume(resumeText, {
    resetSearchParams: true,
    startNewEpoch: true,
    epochKind: "rebootstrap",
    epochNote: "Re-bootstrap from RESUME_TEXT",
  });
}

/** Ensures a profile and current search params exist; does not overwrite an existing resume. */
export async function ensureBootstrapProfile(): Promise<{
  profileId: number;
  searchParams: SearchParams;
}> {
  if (!db) throw new Error("Database not configured (DATABASE_URL missing)");

  const existing = await getLatestProfile();

  if (existing) {
    const currentParams = await getCurrentSearchParamsRow(existing.id);

    if (currentParams) {
      return {
        profileId: existing.id,
        searchParams: searchParamsSchema.parse(currentParams.paramsJson),
      };
    }

    const parsed = parsedProfileSchema.parse(existing.parsedJson);
    const searchParams = defaultSearchParams(parsed);
    const epoch = await ensureCurrentEpoch(existing.id);
    await setCurrentSearchParams(existing.id, searchParams, epoch.id);
    await ensureAgentSettings();

    return { profileId: existing.id, searchParams };
  }

  const resumeText = process.env.RESUME_TEXT?.trim();
  if (!resumeText) {
    throw new Error("RESUME_TEXT environment variable is required for first-time bootstrap");
  }

  const result = await updateProfileResume(resumeText);
  return { profileId: result.profileId, searchParams: result.searchParams };
}
