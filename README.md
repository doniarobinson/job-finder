# Job Finder Agent

The Job Finder Agent is a fully autonomous agentic AI that works on your behalf to find jobs worth applying to. It starts with your resume—extracting your skills, target roles, and location—then searches live job listings, scores each one against your background, and saves the best matches here. After every run, it learns from the listings that fit well and updates its search terms so the next cycle is smarter than the last.

Built for **Vercel/Neon** with **Inngest** orchestration and **Postgres** state.

## Tech used

- React 19
- Next.js 16 - dashboard and API routes
- Adzuna Jobs API - live job listings
- Vercel - hosting and deployment
- Neon Postgres - database
- Google Gemini 2.5 Flash - resume parsing, search parameter refinement
- Google Gemini Embedding 001 - resume-to-job similarity scoring

## Additional tech used

- Tailwind CSS v4
- Drizzle ORM - schema and queries
- Inngest - background workflow orchestration
- Vercel Cron - scheduled daily agent cycles (production only)
- Vercel AI SDK - LLM and embedding calls
- Vitest - unit tests
- Zod - runtime validation

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

   Add `"resetSearchParams": true` to regenerate keywords and title variants from the new resume (default keeps refined params).

   Or send an Inngest event:

   ```bash
   # via Inngest dev UI at http://localhost:8288
   # event: job-finder/cycle.run
   ```

7. Open [http://localhost:3000](http://localhost:3000) for the dashboard. When the database is configured, the **Agent System Information and Overrides** panel provides **Run cycle now**, **Re-bootstrap from env**, and a live **System message** feed.

## Deploy (Vercel)

1. Import the repo and add environment variables from `.env.example` (except the database — see step 2).
2. Add **Neon** from [Vercel Marketplace](https://vercel.com/marketplace/neon) → Storage → Connect Project. This injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED` ([docs](https://neon.com/docs/guides/vercel-managed-integration)). Do not use deprecated Vercel Postgres.
3. Install [Inngest Vercel integration](https://www.inngest.com/docs/deploy/vercel).
4. Set `CRON_SECRET`; Vercel Cron hits `/api/cron/trigger-cycle` daily at **7:00 AM Pacific** (`0 14 * * *` UTC — aligned with PDT; during PST standard time it runs at 8:00 AM Pacific unless you change to `0 15 * * *` in `vercel.json`). Cron runs on **production only**; local and preview use the dashboard **Run cycle now** button (or `POST /api/agent/run-cycle`).

## Dashboard

When `DATABASE_URL` is set, the dashboard includes:

- **System console** — agent status, manual controls, and system messages after each action
- **Run cycle now** — runs the full search/score/refine loop immediately
- **Re-bootstrap from env** — re-reads `RESUME_TEXT`, re-parses the resume, resets search params, and starts a new agent era (prior jobs and param history remain archived in the database)
- **Current search parameters** — keywords, title variants, locations, and guardrails
- **Job matches** and **parameter history** — paginated views of scored listings and how search terms evolved

## Resume parsing

On first bootstrap and on re-bootstrap, the agent parses `RESUME_TEXT` into skills, titles, locations, and experience:

- **With Gemini** (`GOOGLE_GENERATIVE_AI_API_KEY` set): Gemini 2.5 Flash extracts structured fields. Titles favor the most recent role and appropriate seniority; management titles are included when the resume shows people leadership.
- **Without Gemini or on API failure**: a heuristic parser runs instead. It reads explicit `Skills:` / `Languages:` / `Titles:` lines when present, infers the most recent job title from the experience section, and detects management roles from leadership signals.

The system message panel reports which path ran (Gemini, heuristic fallback, or no API key) and summarizes extracted skills and title variants.

Initial search params are seeded from the parsed profile: up to **8 keywords** from skills and up to **3 title variants** from titles. Title variants are set at bootstrap/re-bootstrap only; subsequent cycles refine **keywords** (and negative keywords), not titles.

## Agent loop

Each cycle (cron, dashboard button, or `POST /api/agent/run-cycle`):

1. Load profile + current `search_params` for the active agent era
2. Search Adzuna (`titleVariants` + `keywords` + location)
3. Dedupe by URL hash within the current era
4. Score new jobs (Gemini embeddings or keyword overlap fallback)
5. Refine params from high-score job descriptions (guardrails: max 5 keywords/cycle, evidence ≥ 2 jobs)
6. Persist jobs, params, and `param_history`

Pause or resume the agent via `POST /api/agent/pause` with `{ "paused": true }`.

Resume updates: `POST /api/agent/update-resume` with `{ "resumeText": "..." }` or call `updateProfileResume()` from `lib/profile.ts`. Re-bootstrap from the environment via the dashboard or `rebootstrapProfileFromEnv()` in `lib/profile.ts`.

## License

Licensed under the [Apache License 2.0](LICENSE).
