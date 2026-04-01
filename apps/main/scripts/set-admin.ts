/**
 * Set a user's role to admin by email.
 * Usage: bun scripts/set-admin.ts issa@databuddy.cc
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../.env") });

const email = process.argv[2];
if (!email) {
  console.error("Usage: bun scripts/set-admin.ts <email>");
  process.exit(1);
}

const { db } = await import("../lib/db/index.ts");
const { user } = await import("../lib/db/schema.ts");
const { eq } = await import("drizzle-orm");

const rows = await db
  .update(user)
  .set({ role: "admin" })
  .where(eq(user.email, email))
  .returning({ id: user.id, email: user.email, role: user.role });

if (rows.length === 0) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

console.log(`✓ ${rows[0].email} is now an admin (id: ${rows[0].id})`);
process.exit(0);
