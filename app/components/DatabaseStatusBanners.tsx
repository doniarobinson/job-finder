import { isVercelDeployment } from "@/lib/runtimeEnv";

export function DatabaseNotConfiguredBanner() {
  const onVercel = isVercelDeployment();

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="font-medium text-amber-900">Database not configured</h2>
      {onVercel ? (
        <p className="mt-2 text-sm text-amber-800">
          Connect <strong>Neon</strong> in the Vercel dashboard: Project →{" "}
          <strong>Storage</strong> → add or link Neon. That injects{" "}
          <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> and{" "}
          <code className="rounded bg-amber-100 px-1">DATABASE_URL_UNPOOLED</code> into
          this deployment. Then redeploy. If the database is new, run{" "}
          <code className="rounded bg-amber-100 px-1">npm run db:push</code> locally using
          those URLs to create tables.
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-800">
          Set <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> (Neon) in{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code>, then run{" "}
          <code className="rounded bg-amber-100 px-1">npm run db:push</code>. Placeholder
          values from <code className="rounded bg-amber-100 px-1">.env.example</code> are
          ignored for local UI preview.
        </p>
      )}
    </section>
  );
}

export function DatabaseUnavailableBanner({ message }: { message: string }) {
  const onVercel = isVercelDeployment();

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50 p-6">
      <h2 className="font-medium text-rose-900">Database unavailable</h2>
      <p className="mt-2 text-sm text-rose-800">{message}</p>
      <p className="mt-2 text-sm text-rose-700">
        The dashboard still loads so you can preview the UI.{" "}
        {onVercel ? (
          <>
            Check that Neon is linked under Vercel Storage, environment variables are set for this
            deployment, and the schema exists (run{" "}
            <code className="rounded bg-rose-100 px-1">npm run db:push</code> locally with
            production URLs if needed).
          </>
        ) : (
          <>
            Fix <code className="rounded bg-rose-100 px-1">DATABASE_URL</code> in{" "}
            <code className="rounded bg-rose-100 px-1">.env.local</code> or run{" "}
            <code className="rounded bg-rose-100 px-1">npm run db:push</code> when Neon is
            ready.
          </>
        )}
      </p>
    </section>
  );
}
