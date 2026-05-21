import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

function createDb() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.warn(
      "DATABASE_URL is missing or invalid; database operations will fail at runtime."
    );
    return null;
  }

  try {
    const sql = neon(connectionString);
    return drizzle(sql, { schema });
  } catch (error) {
    console.warn(
      "DATABASE_URL could not initialize Neon client; database operations will fail at runtime.",
      error
    );
    return null;
  }
}

export const db = createDb();

export { schema };
