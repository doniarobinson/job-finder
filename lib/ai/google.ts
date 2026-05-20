import { google } from "@ai-sdk/google";

/** Language model for param refinement and structured outputs */
export const GEMINI_MODEL = "gemini-2.5-flash";

/** Embedding model for resume ↔ job similarity scoring */
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export const geminiFlash = google(GEMINI_MODEL);

export const geminiEmbedding = google.embedding(GEMINI_EMBEDDING_MODEL);
