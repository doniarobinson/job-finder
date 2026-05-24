import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlash, isGeminiConfigured } from "@/lib/ai/google";
import { inferResumeLocations } from "@/lib/resumeLocations";
import { parsedProfileSchema, type ParsedProfile, type ResumeParseMeta } from "@/lib/types";

const MAX_RESUME_CHARS = 12_000;

export type ParseResumeResult = {
  profile: ParsedProfile;
  meta: ResumeParseMeta;
};

const resumeParseObjectSchema = z.object({
  skills: z
    .array(z.string())
    .max(30)
    .describe("Skills, programming languages, frameworks, and tools for job search keywords"),
  titles: z
    .array(z.string())
    .max(10)
    .describe(
      "Target job titles reflecting the most recent role, seniority, and management scope when applicable"
    ),
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

const SECTION_HEADER =
  /^(?:professional )?(?:experience|work history|employment|education|skills|projects|certifications|summary|languages?|technical skills|core competencies)$/i;

function looksLikeJobTitle(line: string): boolean {
  if (SECTION_HEADER.test(line.trim())) return false;

  return /\b(engineer|developer|manager|director|lead|architect|designer|analyst|consultant|specialist|administrator|coordinator|vp|president|head|principal|staff|senior|junior|intern)\b/i.test(
    line
  );
}

function extractMostRecentJobTitle(resumeText: string): string | null {
  const experienceSection = resumeText.match(
    /(?:^|\n)(?:professional )?experience[^\n]*\n([\s\S]*?)(?=\n(?:education|skills|projects|certifications|summary|languages?)\b|$)/i
  );
  const lines = (experienceSection?.[1] ?? resumeText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (SECTION_HEADER.test(line)) continue;
    if (/^\d{4}|present|current/i.test(line)) continue;

    const pairedMatch = line.match(
      /^[-•*]?\s*(.{3,70}?)(?:\s*[,@|]\s*|\s+at\s+|\s*[–—-]\s*)(?:[A-Z0-9])/
    );
    if (pairedMatch?.[1]) {
      const title = pairedMatch[1].trim();
      if (looksLikeJobTitle(title)) return title;
    }

    if (looksLikeJobTitle(line)) {
      return line.replace(/^[-•*]\s*/, "");
    }
  }

  return null;
}

function inferTitlesHeuristic(resumeText: string): string[] {
  const explicit = extractList(resumeText, /(?:titles?|roles?):\s*([^\n]+)/i);
  if (explicit.length > 0) return explicit;

  const titles: string[] = [];
  const recentTitle = extractMostRecentJobTitle(resumeText);
  if (recentTitle) titles.push(recentTitle);

  const lower = resumeText.toLowerCase();
  const rolePhrases: Array<[string, string]> = [
    ["software engineering manager", "Software Engineering Manager"],
    ["engineering manager", "Engineering Manager"],
    ["director of engineering", "Director of Engineering"],
    ["vp of engineering", "VP of Engineering"],
    ["vice president of engineering", "VP of Engineering"],
    ["head of engineering", "Head of Engineering"],
    ["technical lead", "Technical Lead"],
    ["tech lead", "Tech Lead"],
    ["staff engineer", "Staff Engineer"],
    ["principal engineer", "Principal Engineer"],
    ["senior software engineer", "Senior Software Engineer"],
    ["software engineer", "Software Engineer"],
    ["software developer", "Software Developer"],
  ];

  for (const [needle, label] of rolePhrases) {
    if (lower.includes(needle) && !titles.some((title) => title.toLowerCase() === label.toLowerCase())) {
      titles.push(label);
    }
  }

  const showsPeopleLeadership =
    /\b(managed|mentor(ed|ing)?|people management|direct reports?|led a team|team of \d+|leadership)\b/i.test(
      resumeText
    );

  if (
    showsPeopleLeadership &&
    !titles.some((title) => /manager|director|head|vp|lead/i.test(title))
  ) {
    titles.unshift("Engineering Manager");
  }

  return [...new Set(titles)].slice(0, 5);
}

function defaultTitles(resumeText: string): string[] {
  const inferred = inferTitlesHeuristic(resumeText);
  return inferred.length > 0 ? inferred : ["Software Engineer"];
}

/** Regex/heuristic resume parser used when Gemini is unavailable or fails. */
export function parseResumeHeuristic(resumeText: string): ParsedProfile {
  const lower = resumeText.toLowerCase();
  const skills = extractList(resumeText, /skills?:\s*([^\n]+)/i);
  const languages = extractList(resumeText, /languages?:\s*([^\n]+)/i);
  const explicitLocations = extractList(resumeText, /locations?:\s*([^\n]+)/i);
  const locations = inferResumeLocations(resumeText, explicitLocations);

  const yearsMatch = resumeText.match(/(\d+)\+?\s*years?/i);
  const yearsExperience = yearsMatch ? Number(yearsMatch[1]) : undefined;

  const mergedSkills = [...new Set([...skills, ...languages])];
  const inferredSkills =
    mergedSkills.length > 0
      ? mergedSkills
      : ["typescript", "react", "node", "python", "sql"].filter((s) => lower.includes(s));

  return parsedProfileSchema.parse({
    skills: inferredSkills,
    titles: defaultTitles(resumeText),
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
    titles: titles.length > 0 ? titles : defaultTitles(resumeText),
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
- For "titles", use the most recent job title and appropriate seniority.
- Include management titles when the resume shows people leadership, direct reports, or org management.
- Do not down-level a manager/director resume to generic IC titles unless the resume is clearly IC-focused.
- Prefer 1-3 titles that match how the candidate would search for jobs.
- "locations" should include cities/states or Remote if mentioned or clearly implied.
- Do not invent credentials or employers not supported by the resume.
- Deduplicate list items.

Resume:
${trimmed}`,
  });

  return normalizeParsedProfile(trimmed, object);
}

function summarizeExtractedProfile(profile: ParsedProfile): string {
  const keywords = profile.skills.slice(0, 8).join(", ") || "none";
  const titles = profile.titles.slice(0, 3).join(", ") || "none";
  return `${profile.skills.length} skill${profile.skills.length === 1 ? "" : "s"} (${keywords}); title variants: ${titles}`;
}

/** User-facing note for the system message panel after resume parsing. */
export function formatResumeParseMessage(meta: ResumeParseMeta, profile: ParsedProfile): string {
  const summary = summarizeExtractedProfile(profile);

  if (meta.source === "gemini") {
    return `Gemini parsed the resume: ${summary}.`;
  }

  if (meta.geminiConfigured && meta.geminiFailed) {
    return `Gemini resume parse failed; used heuristic fallback: ${summary}.`;
  }

  return `Gemini API key not configured; used heuristic resume parser: ${summary}.`;
}

/** Parse resume text with Gemini when configured; otherwise use heuristics. */
export async function parseResume(resumeText: string): Promise<ParseResumeResult> {
  const trimmed = resumeText.trim();
  if (!trimmed) {
    throw new Error("Resume text is required");
  }

  const geminiConfigured = isGeminiConfigured();

  if (geminiConfigured) {
    try {
      const profile = await parseResumeWithGemini(trimmed);
      return {
        profile,
        meta: { source: "gemini", geminiConfigured: true, geminiFailed: false },
      };
    } catch (error) {
      console.warn("Gemini resume parse failed; using heuristic fallback.", error);
      return {
        profile: parseResumeHeuristic(trimmed),
        meta: { source: "heuristic", geminiConfigured: true, geminiFailed: true },
      };
    }
  }

  return {
    profile: parseResumeHeuristic(trimmed),
    meta: { source: "heuristic", geminiConfigured: false, geminiFailed: false },
  };
}
