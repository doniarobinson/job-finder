import { z } from "zod";

/** Default Adzuna search radius: 25 miles expressed in km. */
export const DEFAULT_SEARCH_RADIUS_KM = Math.round(25 * 1.609344);

export const searchParamsSchema = z.object({
  keywords: z.array(z.string()).default([]),
  titleVariants: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  remote: z.boolean().default(false),
  seniority: z.string().optional(),
  negativeKeywords: z.array(z.string()).default([]),
  maxResultsPerCycle: z.number().int().min(1).max(50).default(20),
  searchRadiusKm: z.number().int().min(1).max(200).default(DEFAULT_SEARCH_RADIUS_KM),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export const parsedProfileSchema = z.object({
  skills: z.array(z.string()).default([]),
  titles: z.array(z.string()).default([]),
  yearsExperience: z.number().optional(),
  locations: z.array(z.string()).default([]),
  summary: z.string().optional(),
});

export type ParsedProfile = z.infer<typeof parsedProfileSchema>;

export type NormalizedJob = {
  externalId: string;
  title: string;
  company: string;
  description: string;
  url: string;
  location?: string;
  source: string;
};

export type AgentCycleResult = {
  searched: number;
  newJobs: number;
  scored: number;
  paramsUpdated: boolean;
  skippedReason?: string;
};

export type UpdateResumeResult = {
  profileId: number;
  parsed: ParsedProfile;
  searchParams: SearchParams;
  created: boolean;
  searchParamsReset: boolean;
  epochId?: number;
  epochStarted?: boolean;
};
