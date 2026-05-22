# Job Finder Agent

The Job Finder Agent is a fully autonomous agentic AI that works on your behalf to find jobs worth applying to. It starts with your resume—extracting your skills, target roles, and location—then searches live job listings, scores each one against your background, and saves the best matches here. After every run, it learns from the listings that fit well and updates its search terms so the next cycle is smarter than the last.

Built for **Vercel/Neon** with **Inngest** orchestration and **Postgres** state.

**TODO**

1. ~~Job listings API search needs to be hooked up~~ (Adzuna integrated)
2. ~~Run search and update search params via the dashboard button before enabling a cron job~~ (manual run in UI)
3. Implement a cron job to run every 24 hours

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

5. Run tests:

   ```bash
   npm run test:run
   ```

6. Trigger a cycle manually:

   ```bash
   curl -X POST http://localhost:3000/api/agent/run-cycle
   ```

   Update resume separately (optional; does not run search):

   ```bash
   curl -X POST http://localhost:3000/api/agent/update-resume \
     -H "Content-Type: application/json" \
     -d '{"resumeText":"Skills: TypeScript, React | Titles: Software Engineer"}'
   ```

   Add `"resetSearchParams": true` to regenerate keywords from the new resume (default keeps refined params).

   Or send an Inngest event:

   ```bash
   # via Inngest dev UI at http://localhost:8288
   # event: job-finder/cycle.run
   ```

7. Open [http://localhost:3000](http://localhost:3000) for the dashboard.

## Deploy (Vercel)

1. Import the repo and add environment variables from `.env.example` (except the database — see step 2).
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

Pause or resume the agent via `POST /api/agent/pause` with `{ "paused": true }`.

Resume updates: `POST /api/agent/update-resume` with `{ "resumeText": "..." }` or call `updateProfileResume()` from `lib/profile.ts`.

## License

Licensed under the [Apache License 2.0](LICENSE).
