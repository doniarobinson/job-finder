import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { parsedProfileSchema, searchParamsSchema, type ParsedProfile, type SearchParams } from "@/lib/types";

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

export async function ensureBootstrapProfile(): Promise<{
  profileId: number;
  searchParams: SearchParams;
}> {
  if (!db) throw new Error("Database not configured (DATABASE_URL missing)");

  const [existing] = await db
    .select()
    .from(schema.profiles)
    .orderBy(desc(schema.profiles.id))
    .limit(1);

  if (existing) {
    const [currentParams] = await db
      .select()
      .from(schema.searchParams)
      .where(eq(schema.searchParams.profileId, existing.id))
      .orderBy(desc(schema.searchParams.id))
      .limit(1);

    if (currentParams) {
      return {
        profileId: existing.id,
        searchParams: searchParamsSchema.parse(currentParams.paramsJson),
      };
    }
  }

  const resumeText = process.env.RESUME_TEXT?.trim();
  if (!resumeText) {
    throw new Error("RESUME_TEXT env var is required for first-time bootstrap");
  }

  const parsed = parseResume(resumeText);
  const params = defaultSearchParams(parsed);

  const [profile] = await db
    .insert(schema.profiles)
    .values({ resumeText, parsedJson: parsed })
    .returning();

  await db.insert(schema.searchParams).values({
    profileId: profile.id,
    paramsJson: params,
    isCurrent: true,
  });

  await db
    .insert(schema.agentSettings)
    .values({ id: 1, paused: false })
    .onConflictDoNothing();

  return { profileId: profile.id, searchParams: params };
}
