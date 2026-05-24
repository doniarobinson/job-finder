import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlash, isGeminiConfigured } from "@/lib/ai/google";
import { inferResumeLocations } from "@/lib/resumeLocations";
import { parsedProfileSchema, type ParsedProfile } from "@/lib/types";

const MAX_RESUME_CHARS = 12_000;

const resumeParseObjectSchema = z.object({
  skills: z
    .array(z.string())
    .max(30)
    .describe("Skills, programming languages, frameworks, and tools for job search keywords"),
  titles: z.array(z.string()).max(10).describe("Target job titles or roles"),
  yearsExperience: z.number().optional().describe("Total years of professional experience"),
  locations: z
    .array(z.string())
    .max(10)
    .describe('Preferred work locations such as "San Francisco, CA" or "Remote"'),
  summary: z.string().max(500).optional().describe("Brief professional summary"),
});

function extractList(text: string, pattern: RegExp): string[] {
  const match = text.match(pattern);
  if (!match?.[1]) return [];
  return match[1]
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/** Regex/heuristic resume parser used when Gemini is unavailable or fails. */
export function parseResumeHeuristic(resumeText: string): ParsedProfile {
  const lower = resumeText.toLowerCase();
  const skills = extractList(resumeText, /skills?:\s*([^\n]+)/i);
  const titles = extractList(resumeText, /(?:titles?|roles?):\s*([^\n]+)/i);
  const explicitLocations = extractList(resumeText, /locations?:\s*([^\n]+)/i);
  const locations = inferResumeLocations(resumeText, explicitLocations);

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

function normalizeParsedProfile(
  resumeText: string,
  raw: z.infer<typeof resumeParseObjectSchema>
): ParsedProfile {
  const skills = [...new Set(raw.skills.map((s) => s.trim()).filter(Boolean))];
  const titles = [...new Set(raw.titles.map((t) => t.trim()).filter(Boolean))];

  return parsedProfileSchema.parse({
    skills,
    titles: titles.length > 0 ? titles : ["Software Engineer"],
    yearsExperience: raw.yearsExperience,
    locations: inferResumeLocations(resumeText, raw.locations),
    summary: raw.summary?.trim() || resumeText.slice(0, 500),
  });
}

async function parseResumeWithGemini(resumeText: string): Promise<ParsedProfile> {
  const trimmed = resumeText.trim().slice(0, MAX_RESUME_CHARS);

  const { object } = await generateObject({
    model: geminiFlash,
    schema: resumeParseObjectSchema,
    prompt: `Extract structured job-search fields from this resume text.

Rules:
- Put programming languages (Python, Go, Java, etc.), frameworks, tools, and domain skills in "skills".
- Recognize section headers like Skills, Languages, Technical Skills, Core Competencies, etc.
- Use concise, search-friendly skill names (e.g. "Python", "React", "AWS").
- "titles" should be realistic target roles based on experience (1-3 items).
- "locations" should include cities/states or Remote if mentioned or clearly implied.
- Do not invent credentials or employers not supported by the resume.
- Deduplicate list items.

Resume:
${trimmed}`,
  });

  return normalizeParsedProfile(trimmed, object);
}

/** Parse resume text with Gemini when configured; otherwise use heuristics. */
export async function parseResume(resumeText: string): Promise<ParsedProfile> {
  const trimmed = resumeText.trim();
  if (!trimmed) {
    throw new Error("Resume text is required");
  }

  if (isGeminiConfigured()) {
    try {
      return await parseResumeWithGemini(trimmed);
    } catch (error) {
      console.warn("Gemini resume parse failed; using heuristic fallback.", error);
    }
  }

  return parseResumeHeuristic(trimmed);
}
