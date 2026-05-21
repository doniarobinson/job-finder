import { isVercelDeployment } from "@/lib/runtimeEnv";

export function formatFriendlyDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Database unavailable";
  const onVercel = isVercelDeployment();

  if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
    return onVercel
      ? "Could not connect to the database. Check DATABASE_URL in Vercel (Storage → Neon) and redeploy."
      : "Could not connect to the database. Check DATABASE_URL in .env.local.";
  }

  if (message.includes("does not exist") || message.includes("Failed query")) {
    return onVercel
      ? "Database connected but tables are missing. Run npm run db:push locally using your Vercel Neon URLs."
      : "Database connected but tables are missing. Run npm run db:push.";
  }

  return message;
}
