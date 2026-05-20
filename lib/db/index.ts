import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.warn("POSTGRES_URL is not set; database operations will fail at runtime.");
}

const client = connectionString
  ? postgres(connectionString, { max: 1, prepare: false })
  : null;

export const db = client ? drizzle(client, { schema }) : null;

export { schema };
