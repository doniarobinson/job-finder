export function TechStackList() {
  return (
    <div className="mt-4 space-y-4">
      <details open className="text-sm text-muted">
        <summary className="cursor-pointer select-none text-sm text-muted">
          Tech used:
        </summary>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm leading-relaxed text-muted">
          <li>React 19</li>
          <li>Next.js 16 - dashboard and API routes</li>
          <li>Adzuna Jobs API - live job listings</li>
          <li>Vercel - hosting and deployment</li>
          <li>Neon Postgres - database</li>
          <li>Google Gemini 2.5 Flash - search parameter refinement</li>
          <li>
            Google Gemini Embedding 001 - resume-to-job similarity scoring
          </li>
        </ul>
      </details>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer select-none text-sm text-muted">
          Additional tech used:
        </summary>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm leading-relaxed text-muted">
          <li>Tailwind CSS v4</li>
          <li>Drizzle ORM - schema and queries</li>
          <li>Inngest - background workflow orchestration</li>
          <li>Vercel Cron - scheduled daily agent cycles</li>
          <li>Vercel AI SDK - LLM and embedding calls</li>
          <li>Vitest - unit tests</li>
          <li>Zod - runtime validation</li>
        </ul>
      </details>
    </div>
  );
}
