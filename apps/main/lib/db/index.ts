import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
/** biome-ignore lint/performance/noNamespaceImport: Drizzle schema is a namespace barrel  DO NOT REMOVE THIS*/
import * as schema from "@/lib/db/schema";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

const pool = new Pool({ connectionString: getConnectionString() });

export const db = drizzle(pool, { schema });
