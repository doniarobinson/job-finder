import { createHash } from "crypto";

import { embed, embedMany } from "ai";

import { geminiEmbedding, isGeminiConfigured } from "@/lib/ai/google";
import type { NormalizedJob, ParsedProfile } from "@/lib/types";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function keywordOverlapScore(resumeText: string, job: NormalizedJob): number {
  const resumeTokens = tokenize(resumeText);
  const jobTokens = tokenize(`${job.title} ${job.description} ${job.company}`);
  if (jobTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of resumeTokens) {
    if (jobTokens.has(token)) overlap += 1;
  }

  return overlap / Math.sqrt(resumeTokens.size * jobTokens.size);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function hashJobUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 32);
}

export async function scoreJobs(
  resumeText: string,
  profile: ParsedProfile,
  jobList: NormalizedJob[]
): Promise<Array<NormalizedJob & { score: number }>> {
  if (!isGeminiConfigured()) {
    return jobList
      .map((job) => ({
        ...job,
        score: keywordOverlapScore(`${resumeText} ${profile.skills.join(" ")}`, job),
      }))
      .sort((a, b) => b.score - a.score);
  }

  const resumeSnippet = `${resumeText.slice(0, 6000)} Skills: ${profile.skills.join(", ")}`;
  const jobTexts = jobList.map((j) => `${j.title} at ${j.company}. ${j.description.slice(0, 2000)}`);

  const { embedding: resumeEmbedding } = await embed({
    model: geminiEmbedding,
    value: resumeSnippet,
    providerOptions: {
      google: {
        taskType: "SEMANTIC_SIMILARITY",
      },
    },
  });

  const { embeddings: jobEmbeddings } = await embedMany({
    model: geminiEmbedding,
    values: jobTexts,
    providerOptions: {
      google: {
        taskType: "SEMANTIC_SIMILARITY",
      },
    },
  });

  return jobList
    .map((job, index) => ({
      ...job,
      score: cosineSimilarity(resumeEmbedding, jobEmbeddings[index]!),
    }))
    .sort((a, b) => b.score - a.score);
}
