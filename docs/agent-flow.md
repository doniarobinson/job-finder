# Job Finder Agent — sequence flow

Current end-to-end behavior (Neon + Inngest + Adzuna + Gemini).

![Agent flow diagram](./agent-flow.png)

**Source:** [agent-flow.mmd](./agent-flow.mmd)

**Regenerate PNG:**

```bash
npx @mermaid-js/mermaid-cli -i docs/agent-flow.mmd -o docs/agent-flow.png -b white
```

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant Dashboard as Next.js Dashboard
    participant Cron as Vercel Cron
    participant CronAPI as /api/cron/trigger-cycle
    participant ManualAPI as /api/agent/run-cycle
    participant Inngest as Inngest
    participant Agent as runSearchCycle
    participant Profile as lib/profile
    participant Parser as parseResume
    participant Neon as Neon Postgres
    participant Adzuna as Adzuna API
    participant Gemini as Google Gemini

    Note over User,Gemini: Production schedule (daily 7am PT via vercel.json)

    Cron->>CronAPI: GET Bearer CRON_SECRET
    alt Not production deployment
        CronAPI-->>Cron: 403 scheduler disabled
    else Production
        CronAPI->>Inngest: send event job-finder/cycle.run
        CronAPI-->>Cron: 200 triggered
        Inngest->>Agent: step run-search-cycle
    end

    Note over User,Gemini: Manual cycle (local dev / one-off — bypasses Inngest)

    User->>Dashboard: Run cycle now
    Dashboard->>Agent: triggerAgentCycle server action
    User->>ManualAPI: POST /api/agent/run-cycle
    ManualAPI->>Agent: runSearchCycle direct

    activate Agent

    Agent->>Neon: read agent_settings paused?
    alt Agent paused
        Agent-->>Dashboard: skip cycle
    else Agent active
        Agent->>Neon: ensureBootstrapProfile
        Note right of Neon: First run only reads RESUME_TEXT,<br/>parseResume seeds profile + search_params

        Agent->>Neon: load profile + search_params for current era
        Agent->>Adzuna: search titleVariants + keywords + location
        Adzuna-->>Agent: job listings

        Agent->>Neon: dedupe by url_hash within current era
        Agent->>Gemini: embed resume + job descriptions
        Note right of Gemini: gemini-embedding-001<br/>or keyword overlap fallback
        Gemini-->>Agent: similarity scores

        Agent->>Neon: insert new jobs with scores

        Agent->>Gemini: refineSearchParams on high-score JDs
        Note right of Gemini: gemini-2.5-flash adds keywords only<br/>title variants unchanged after bootstrap
        Gemini-->>Agent: keyword / negative keyword suggestions

        alt Params changed guardrails pass
            Agent->>Neon: update search_params + param_history
        end

        Agent-->>Dashboard: cycle result to system message
    end

    deactivate Agent

    Note over User,Gemini: Re-bootstrap from env (dashboard)

    User->>Dashboard: Re-bootstrap from env
    Dashboard->>Profile: rebootstrapProfileFromEnv
    Profile->>Parser: parseResume RESUME_TEXT
    alt Gemini configured
        Parser->>Gemini: gemini-2.5-flash structured extract
        Gemini-->>Parser: skills titles locations
    else No key or API failure
        Parser->>Parser: heuristic fallback
    end
    Profile->>Neon: update profile start new agent era reset search_params
    Dashboard-->>User: system message reports parse source + extracted fields

    Note over User,Neon: Dashboard read + controls

    User->>Dashboard: GET /
    Dashboard->>Neon: jobs search_params param_history paused flag for current era
    Neon-->>Dashboard: paginated data
    Dashboard-->>User: matches params system console

    User->>Dashboard: Pause / Resume
    Dashboard->>Neon: POST /api/agent/pause updates agent_settings
```

## Entry points

| Trigger | Path | Runs |
|---------|------|------|
| **Cron** (production only) | `vercel.json` → `/api/cron/trigger-cycle` | Inngest → `runSearchCycle` |
| **Dashboard** | **Run cycle now** server action | `runSearchCycle` directly (no Inngest) |
| **Manual API** | `POST /api/agent/run-cycle` | `runSearchCycle` directly |
| **Inngest dev** | Event `job-finder/cycle.run` via dev UI | Same as cron |
| **Re-bootstrap** | Dashboard **Re-bootstrap from env** | `rebootstrapProfileFromEnv` → `parseResume` → new era |

Local development does not require `npm run inngest:dev` unless you are testing the Inngest event path.

## Bootstrap and resume parsing

On first cycle, `ensureBootstrapProfile` reads `RESUME_TEXT`, calls `parseResume`, and seeds the profile plus initial `search_params` (up to 8 keywords from skills, up to 3 title variants from titles).

`parseResume` uses **Gemini 2.5 Flash** when `GOOGLE_GENERATIVE_AI_API_KEY` is set; otherwise it uses a **heuristic parser** (or falls back on API failure). Re-bootstrap from the dashboard repeats this flow, starts a **new agent era**, and resets search params. Prior jobs and param history remain archived in the database.

## Agent loop (`runSearchCycle`)

Each cycle loads the profile and current search params for the **active era**, searches Adzuna, dedupes by URL hash within that era, scores new jobs, and refines **keywords** (not title variants) from high-scoring job descriptions. Guardrails: max 5 keywords per cycle, evidence from ≥ 2 jobs.
