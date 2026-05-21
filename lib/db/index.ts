import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

const connectionString = getDatabaseUrl();

if (!connectionString) {
  console.warn(
    "DATABASE_URL is not set; database operations will fail at runtime."
  );
}

const sql = connectionString ? neon(connectionString) : null;

export const db = sql ? drizzle(sql, { schema }) : null;

export { schema };
