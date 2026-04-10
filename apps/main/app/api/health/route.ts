import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";

// biome-ignore lint/suspicious/useAwait: Next.js route handlers must be async
export async function GET() {
  await connection();
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return Response.json(
      { status: "error", message: "Database connection failed" },
      { status: 503 }
    );
  }
}
