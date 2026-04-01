/**
 * Creates a temporary session for the admin user, mints an API key, then uses
 * the MCP server to add Databuddy to the catalog.
 *
 * Usage: bun scripts/add-databuddy.ts
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../.env") });

const port = process.env.MCP_SMOKE_PORT ?? "3000";

const { db } = await import("../lib/db/index.ts");
const { user, session: sessionTable } = await import("../lib/db/schema.ts");
const { eq } = await import("drizzle-orm");

// ── 1. Get admin user ───────────────────────────────────────────────────────

const [admin] = await db
  .select({ id: user.id })
  .from(user)
  .where(eq(user.email, "issa@databuddy.cc"));

if (!admin) {
  console.error("Admin user not found");
  process.exit(1);
}

// ── 2. Create a short-lived session so we can mint an API key ───────────────

const sessionToken = `script_${crypto.randomUUID().replace(/-/g, "")}`;
const now = new Date();
const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 min

await db.insert(sessionTable).values({
  id: crypto.randomUUID(),
  token: sessionToken,
  userId: admin.id,
  expiresAt,
  createdAt: now,
  updatedAt: now,
  ipAddress: "127.0.0.1",
  userAgent: "add-databuddy-script",
});

// ── 3. Mint an API key using that session ───────────────────────────────────

const { auth } = await import("../lib/auth.ts");

const keyRes = await auth.api.createApiKey({
  body: { name: "add-databuddy-script" },
  headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
});
const apiKey = (keyRes as { key: string }).key;
console.log(`API key created: ${apiKey.slice(0, 12)}...`);

// Clean up the temporary session
await db.delete(sessionTable).where(eq(sessionTable.token, sessionToken));

// ── 4. Connect to MCP and call toolbase_create ─────────────────────────────

const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = await import(
  "@modelcontextprotocol/sdk/client/streamableHttp.js"
);

const url = new URL(`http://127.0.0.1:${port}/api/mcp`);
const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { "x-api-key": apiKey } },
});
const client = new Client({ name: "add-databuddy", version: "0.0.1" });
await client.connect(transport);

const result = await client.callTool({
  name: "toolbase_create",
  arguments: {
    id: "databuddy",
    name: "Databuddy",
    description:
      "Open-source, privacy-first analytics platform for developers — tracks web vitals, custom events, errors, and LLM observability with a sub-30KB script and no cookies.",
    category: "observability",
    capabilities: [
      "web_analytics",
      "custom_events",
      "web_vitals",
      "error_tracking",
      "llm_observability",
      "feature_flags",
    ],
    tags: ["analytics", "observability", "open-source", "privacy", "nextjs"],
    pricing: { model: "freemium", starting_price: 0 },
    api: {
      base_url: "https://api.databuddy.cc",
      docs_url: "https://databuddy.cc/docs",
    },
    mcp: { supported: false, endpoint: null },
  },
});

const content = (result.content as Array<{ text: string }>)[0].text;
const data = JSON.parse(content);

if (result.isError) {
  console.error("toolbase_create failed:", content);
  await client.close();
  process.exit(1);
}

console.log("✓ Databuddy submitted via MCP:", data);
await client.close();
process.exit(0);
