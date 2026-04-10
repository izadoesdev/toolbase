import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as authSchema from "@/lib/db/auth-schema";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5000,
});

const fullSchema = { ...schema, ...authSchema };

export const db = drizzle(pool, { schema: fullSchema });
