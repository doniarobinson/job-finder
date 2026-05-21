# Job Finder Agent

Autonomous job-search agent: searches Adzuna, scores listings against your resume, and refines search parameters from high-match job descriptions. Built for **Vercel** with **Inngest** orchestration and **Postgres** state.

## Stack

- Next.js App Router
- Drizzle ORM + [Neon Postgres](https://neon.com/docs/guides/vercel-managed-integration) (`DATABASE_URL` from Vercel Storage)
- Inngest (`job-finder/cycle.run` workflow)
- Adzuna Jobs API
- Google Gemini (`gemini-2.5-flash` + `gemini-embedding-001`) via Vercel AI SDK (optional; keyword fallback without key)

## Quick start

1. Copy env template:

   ```bash
   cp .env.example .env.local
   ```

2. Set `DATABASE_URL` (from [Neon on Vercel](https://vercel.com/marketplace/neon) or [Neon Console](https://console.neon.tech)), `RESUME_TEXT`, Adzuna keys, and `GOOGLE_GENERATIVE_AI_API_KEY`.

3. Push schema:

   ```bash
   npm run db:push
   ```

4. Run dev + Inngest dev server (two terminals):

   ```bash
   npm run dev
   npm run inngest:dev
   ```

5. Trigger a cycle manually:

   ```bash
   curl -X POST http://localhost:3000/api/agent/run-cycle
   ```

   Or send an Inngest event:

   ```bash
   # via Inngest dev UI at http://localhost:8288
   # event: job-finder/cycle.run
   ```

6. Open [http://localhost:3000](http://localhost:3000) for the dashboard.

## Deploy (Vercel)

1. Import repo, add env vars from `.env.example` (except database — see step 2).
2. Add **Neon** from [Vercel Marketplace](https://vercel.com/marketplace/neon) → Storage → Connect Project. This injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED` ([docs](https://neon.com/docs/guides/vercel-managed-integration)). Do not use deprecated Vercel Postgres.
3. Install [Inngest Vercel integration](https://www.inngest.com/docs/deploy/vercel).
4. Set `CRON_SECRET`; Vercel Cron hits `/api/cron/trigger-cycle` daily at **7:00 AM Pacific** (`0 14 * * *` UTC — aligned with PDT; during PST standard time it runs at 8:00 AM Pacific unless you change to `0 15 * * *` in `vercel.json`).

## Agent loop

1. Load profile + current `search_params`
2. Search Adzuna
3. Dedupe by URL hash
4. Score (embeddings or keyword overlap)
5. Refine params from high-score JDs (guardrails: max 5 keywords/cycle, evidence ≥ 2 jobs)
6. Persist jobs, params, `param_history`

Pause/resume via dashboard or `POST /api/agent/pause` with `{ "paused": true }`.

## License

Licensed under the [Apache License 2.0](LICENSE).
