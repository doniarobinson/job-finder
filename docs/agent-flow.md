# Job Finder Agent — sequence flow

Current end-to-end behavior (Neon + Inngest + Adzuna + Gemini).

**PDF:** [agent-flow.pdf](./agent-flow.pdf) (regenerate: `npx @mermaid-js/mermaid-cli -i docs/agent-flow.mmd -o docs/agent-flow.pdf -b white`)

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
    participant Neon as Neon Postgres
    participant Adzuna as Adzuna API
    participant Gemini as Google Gemini

    Note over User,Gemini: Scheduled agent cycle (daily 7am PT via vercel.json)

    Cron->>CronAPI: GET (Bearer CRON_SECRET)
    CronAPI->>Inngest: send event job-finder/cycle.run
    CronAPI-->>Cron: 200 triggered

    Inngest->>Agent: step run-search-cycle
    activate Agent

    Agent->>Neon: read agent_settings (paused?)
    alt Agent paused
        Agent-->>Inngest: skip cycle
    else Agent active
        Agent->>Neon: ensureBootstrapProfile
        Note right of Neon: First run reads RESUME_TEXT env,<br/>inserts profile + search_params

        Agent->>Neon: load profile + current search_params
        Agent->>Adzuna: search jobs (keywords, location)
        Adzuna-->>Agent: job listings

        Agent->>Neon: dedupe by url_hash (skip seen)
        Agent->>Gemini: embed resume + job descriptions
        Note right of Gemini: gemini-embedding-001<br/>or keyword fallback if no API key
        Gemini-->>Agent: similarity scores

        Agent->>Neon: insert new jobs with scores

        Agent->>Gemini: refineSearchParams (high-score JDs)
        Note right of Gemini: gemini-2.5-flash structured output<br/>or heuristic term extraction
        Gemini-->>Agent: keyword / negative keyword suggestions

        alt Params changed (guardrails pass)
            Agent->>Neon: update search_params + param_history
        end

        Agent-->>Inngest: cycle result
    end
    deactivate Agent

    Note over User,Gemini: Manual cycle (dev / one-off)

    User->>ManualAPI: POST /api/agent/run-cycle
    ManualAPI->>Agent: runSearchCycle (direct)
    Agent->>Neon: same loop as above
    ManualAPI-->>User: JSON result

    Note over User,Neon: Dashboard (read-only UI)

    User->>Dashboard: GET /
    Dashboard->>Neon: jobs, search_params, param_history, paused flag
    Neon-->>Dashboard: data
    Dashboard-->>User: matches, params, pause/resume

    User->>Dashboard: Pause / Resume
    Dashboard->>Neon: POST /api/agent/pause updates agent_settings
```

## Entry points

| Trigger | Path | Runs |
|---------|------|------|
| **Cron** | `vercel.json` → `/api/cron/trigger-cycle` | Inngest → `runSearchCycle` |
| **Manual** | `POST /api/agent/run-cycle` | `runSearchCycle` directly |
| **Inngest dev** | Event `job-finder/cycle.run` | Same as cron |

## Bootstrap (first cycle only)

If no profile exists in Neon, `ensureBootstrapProfile` reads `RESUME_TEXT` from the environment, parses skills/titles, and seeds `search_params` v0.
