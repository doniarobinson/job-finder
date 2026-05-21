import { defineConfig } from "drizzle-kit";

import { getMigrationDatabaseUrl } from "./lib/db/env";

const url = getMigrationDatabaseUrl();

if (!url) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED or DATABASE_URL (or legacy POSTGRES_URL) for drizzle-kit"
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
