/**
 * Neon via Vercel Marketplace sets DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED.
 * POSTGRES_URL is kept as a legacy fallback for older templates.
 * @see https://neon.com/docs/guides/vercel-managed-integration
 */
export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

/** Prefer unpooled connection for drizzle-kit migrations. */
export function getMigrationDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    getDatabaseUrl()
  );
}
