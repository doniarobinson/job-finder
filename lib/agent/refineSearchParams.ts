import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlash, isGeminiConfigured } from "@/lib/ai/google";
import {
  searchParamsSchema,
  type NormalizedJob,
  type SearchParams,
} from "@/lib/types";

/** Keywords actually applied to search params each cycle. */
export const MAX_KEYWORDS_PER_CYCLE = 5;

/** Negative keywords applied each cycle. */
export const MAX_NEGATIVE_KEYWORDS_PER_CYCLE = 3;

/**
 * Loose Zod cap on Gemini's structured output. Models often overshoot "up to N"
 * in the prompt; we accept a larger array here and enforce MAX_* in app code.
 */
export const MAX_GEMINI_SUGGESTIONS = 20;

const MIN_SCORE_TO_LEARN = 0.35;
const MIN_EVIDENCE_JOBS = 2;

const refinementSchema = z.object({
  addKeywords: z.array(z.string()).max(MAX_GEMINI_SUGGESTIONS),
  addNegativeKeywords: z.array(z.string()).max(MAX_GEMINI_SUGGESTIONS),
  triggerPhrases: z.array(z.string()),
});

function extractFrequentTerms(jobs: Array<NormalizedJob & { score: number }>): string[] {
  const counts = new Map<string, number>();

  for (const job of jobs) {
    const words = `${job.title} ${job.description}`
      .toLowerCase()
      .match(/\b[a-z][a-z0-9+.#-]{2,}\b/g) ?? [];

    for (const word of new Set(words)) {
      if (word.length < 4) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= MIN_EVIDENCE_JOBS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORDS_PER_CYCLE)
    .map(([word]) => word);
}

function applyKeywordSuggestions(
  current: SearchParams,
  rawAddKeywords: string[],
  rawAddNegativeKeywords: string[]
): { addKeywords: string[]; addNegativeKeywords: string[] } {
  const addKeywords = rawAddKeywords
    .filter((k) => !current.keywords.includes(k))
    .slice(0, MAX_KEYWORDS_PER_CYCLE);

  const addNegativeKeywords = rawAddNegativeKeywords
    .filter((k) => !current.negativeKeywords.includes(k))
    .slice(0, MAX_NEGATIVE_KEYWORDS_PER_CYCLE);

  return { addKeywords, addNegativeKeywords };
}

export async function refineSearchParams(
  current: SearchParams,
  highScoreJobs: Array<NormalizedJob & { score: number }>
): Promise<{ next: SearchParams; triggerPhrases: string[]; changed: boolean }> {
  const learnable = highScoreJobs.filter((j) => (j.score ?? 0) >= MIN_SCORE_TO_LEARN);

  if (learnable.length < MIN_EVIDENCE_JOBS) {
    return { next: current, triggerPhrases: [], changed: false };
  }

  const heuristicTerms = extractFrequentTerms(learnable);

  let addKeywords = heuristicTerms.filter((t) => !current.keywords.includes(t));
  let addNegativeKeywords: string[] = [];
  let triggerPhrases = heuristicTerms;

  if (isGeminiConfigured()) {
    const sample = learnable
      .slice(0, 5)
      .map((j) => `- ${j.title} @ ${j.company}: ${j.description.slice(0, 400)}`)
      .join("\n");

    try {
      const { object } = await generateObject({
        model: geminiFlash,
        schema: refinementSchema,
        prompt: `You refine job search parameters. Current keywords: ${current.keywords.join(", ")}.
High-match job descriptions:
${sample}

Suggest up to ${MAX_KEYWORDS_PER_CYCLE} NEW keywords/phrases seen in these JDs (not already listed).
Suggest negative keywords only for clearly irrelevant patterns.
Never remove location or visa constraints.`,
      });

      const applied = applyKeywordSuggestions(
        current,
        object.addKeywords,
        object.addNegativeKeywords
      );
      addKeywords = applied.addKeywords;
      addNegativeKeywords = applied.addNegativeKeywords;
      triggerPhrases = object.triggerPhrases;
    } catch (error) {
      console.warn(
        "Gemini refinement failed; falling back to frequency heuristics.",
        error
      );
      addKeywords = heuristicTerms.filter((t) => !current.keywords.includes(t));
      addNegativeKeywords = [];
      triggerPhrases = heuristicTerms;
    }
  }

  const next = searchParamsSchema.parse({
    ...current,
    keywords: [...current.keywords, ...addKeywords].slice(0, 30),
    negativeKeywords: [...current.negativeKeywords, ...addNegativeKeywords].slice(0, 20),
  });

  const changed =
    addKeywords.length > 0 ||
    addNegativeKeywords.length > 0 ||
    JSON.stringify(next) !== JSON.stringify(current);

  return { next, triggerPhrases, changed };
}
