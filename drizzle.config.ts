import { defineConfig } from "drizzle-kit";

import { getMigrationDatabaseUrl } from "./lib/db/env";

const url = getMigrationDatabaseUrl();

if (!url) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED or DATABASE_URL in .env.local (real Neon URLs, not placeholders). Run: npm run db:push"
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
