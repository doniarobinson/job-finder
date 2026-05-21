/**
 * Neon via Vercel Marketplace sets DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED.
 * POSTGRES_URL is kept as a legacy fallback for older templates.
 * @see https://neon.com/docs/guides/vercel-managed-integration
 */

const PLACEHOLDER_MARKERS = ["ep-xxx", "@host:5432", "user:password@host"];

export function isPlaceholderDatabaseUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

function resolveDatabaseUrl(
  primary: string | undefined,
  fallback?: string | undefined
): string | undefined {
  const url = (primary ?? fallback)?.trim();
  if (!url || isPlaceholderDatabaseUrl(url)) return undefined;
  return url;
}

export function getDatabaseUrl(): string | undefined {
  return resolveDatabaseUrl(process.env.DATABASE_URL, process.env.POSTGRES_URL);
}

/** Prefer unpooled connection for drizzle-kit migrations. */
export function getMigrationDatabaseUrl(): string | undefined {
  return (
    resolveDatabaseUrl(process.env.DATABASE_URL_UNPOOLED) ??
    resolveDatabaseUrl(process.env.POSTGRES_URL_NON_POOLING) ??
    getDatabaseUrl()
  );
}
