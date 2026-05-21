import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import {
  parsedProfileSchema,
  searchParamsSchema,
  type ParsedProfile,
  type SearchParams,
  type UpdateResumeResult,
} from "@/lib/types";

function extractList(text: string, pattern: RegExp): string[] {
  const match = text.match(pattern);
  if (!match?.[1]) return [];
  return match[1]
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function parseResume(resumeText: string): ParsedProfile {
  const lower = resumeText.toLowerCase();
  const skills = extractList(resumeText, /skills?:\s*([^\n]+)/i);
  const titles = extractList(resumeText, /(?:titles?|roles?):\s*([^\n]+)/i);
  const locations = extractList(resumeText, /locations?:\s*([^\n]+)/i);

  const yearsMatch = resumeText.match(/(\d+)\+?\s*years?/i);
  const yearsExperience = yearsMatch ? Number(yearsMatch[1]) : undefined;

  const inferredSkills =
    skills.length > 0
      ? skills
      : ["typescript", "react", "node", "python", "sql"].filter((s) => lower.includes(s));

  const inferredTitles =
    titles.length > 0
      ? titles
      : ["software engineer", "developer", "engineer"].filter((t) =>
          lower.includes(t.split(" ")[0] ?? "")
        );

  return parsedProfileSchema.parse({
    skills: inferredSkills,
    titles: inferredTitles.length ? inferredTitles : ["Software Engineer"],
    yearsExperience,
    locations,
    summary: resumeText.slice(0, 500),
  });
}

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

async function setCurrentSearchParams(profileId: number, params: SearchParams): Promise<void> {
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
  options?: { resetSearchParams?: boolean }
): Promise<UpdateResumeResult> {
  if (!db) throw new Error("Database not configured (DATABASE_URL missing)");

  const trimmed = resumeText.trim();
  if (!trimmed) throw new Error("Resume text is required");

  const parsed = parseResume(trimmed);
  const resetSearchParams = options?.resetSearchParams ?? false;
  const existing = await getLatestProfile();

  if (!existing) {
    const [profile] = await db
      .insert(schema.profiles)
      .values({ resumeText: trimmed, parsedJson: parsed })
      .returning();

    const searchParams = defaultSearchParams(parsed);
    await setCurrentSearchParams(profile.id, searchParams);
    await ensureAgentSettings();

    return {
      profileId: profile.id,
      parsed,
      searchParams,
      created: true,
      searchParamsReset: true,
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
    await setCurrentSearchParams(existing.id, searchParams);
    searchParamsReset = true;
    return {
      profileId: existing.id,
      parsed,
      searchParams,
      created: false,
      searchParamsReset,
    };
  }

  return {
    profileId: existing.id,
    parsed,
    searchParams: searchParamsSchema.parse(currentParamsRow.paramsJson),
    created: false,
    searchParamsReset: false,
  };
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
    await setCurrentSearchParams(existing.id, searchParams);
    await ensureAgentSettings();

    return { profileId: existing.id, searchParams };
  }

  const resumeText = process.env.RESUME_TEXT?.trim();
  if (!resumeText) {
    throw new Error("RESUME_TEXT env var is required for first-time bootstrap");
  }

  const result = await updateProfileResume(resumeText);
  return { profileId: result.profileId, searchParams: result.searchParams };
}
