import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlash, isGeminiConfigured } from "@/lib/ai/google";
import {
  searchParamsSchema,
  type NormalizedJob,
  type SearchParams,
} from "@/lib/types";

const MAX_KEYWORDS_PER_CYCLE = 5;
const MIN_SCORE_TO_LEARN = 0.35;
const MIN_EVIDENCE_JOBS = 2;

const refinementSchema = z.object({
  addKeywords: z.array(z.string()).max(MAX_KEYWORDS_PER_CYCLE),
  addNegativeKeywords: z.array(z.string()).max(3),
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

    addKeywords = object.addKeywords.filter((k) => !current.keywords.includes(k)).slice(0, MAX_KEYWORDS_PER_CYCLE);
    addNegativeKeywords = object.addNegativeKeywords.filter(
      (k) => !current.negativeKeywords.includes(k)
    );
    triggerPhrases = object.triggerPhrases;
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
