/**
 * Run against a dev server: `bun run dev` then `bun scripts/smoke-mcp.ts`
 * Pass an API key to also test authenticated write tools:
 *   MCP_API_KEY=tb_... bun scripts/smoke-mcp.ts
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const port = process.env.MCP_SMOKE_PORT ?? "3000";
const apiKey = process.env.MCP_API_KEY ?? "";
const url = new URL(`http://127.0.0.1:${port}/api/mcp`);

const headers: Record<string, string> = apiKey ? { "x-api-key": apiKey } : {};

const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers },
});
const client = new Client({ name: "smoke-mcp", version: "0.0.1" });
await client.connect(transport);

// ── Tools ──────────────────────────────────────────────────────────────────

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
const expectedTools = [
  "toolbase_bug_report",
  "toolbase_create",
  "toolbase_get",
  "toolbase_get_bugs",
  "toolbase_get_reviews",
  "toolbase_list",
  "toolbase_review",
  "toolbase_search",
];
for (const n of expectedTools) {
  if (!names.includes(n)) {
    throw new Error(`Expected tool ${n}, got: ${names.join(", ")}`);
  }
}

// Basic search
const searchResult = await client.callTool({
  name: "toolbase_search",
  arguments: { query: "database" },
});
const searchData = JSON.parse(
  (searchResult.content as Array<{ text: string }>)[0].text
);
if (!searchData.results?.length) {
  throw new Error("toolbase_search returned no results for 'database'");
}

// Verify result shape
const hit = searchData.results[0];
for (const field of ["category", "capabilities", "pricing_model", "docs_url", "score"]) {
  if (!(field in hit)) {
    throw new Error(`Search hit missing field: ${field}`);
  }
}

// Category filter
const authResult = await client.callTool({
  name: "toolbase_search",
  arguments: { query: "login", category: "auth" },
});
const authData = JSON.parse(
  (authResult.content as Array<{ text: string }>)[0].text
);
for (const r of authData.results) {
  if (r.category !== "auth") {
    throw new Error(`Category filter broken: got ${r.category}, expected auth`);
  }
}

// MCP-only filter
const mcpResult = await client.callTool({
  name: "toolbase_search",
  arguments: { query: "tools", mcp_only: true },
});
const mcpData = JSON.parse(
  (mcpResult.content as Array<{ text: string }>)[0].text
);
for (const r of mcpData.results) {
  if (!r.mcp_supported) {
    throw new Error("mcp_only filter returned non-MCP product");
  }
}

// Scoring: name match should rank higher
const nameResult = await client.callTool({
  name: "toolbase_search",
  arguments: { query: "stripe" },
});
const nameData = JSON.parse(
  (nameResult.content as Array<{ text: string }>)[0].text
);
if (nameData.results.length > 0 && nameData.results[0].id !== "stripe") {
  throw new Error(
    `Scoring: expected 'stripe' first, got '${nameData.results[0].id}'`
  );
}

// toolbase_get returns review summary
const getResult = await client.callTool({
  name: "toolbase_get",
  arguments: { id: "stripe" },
});
const getData = JSON.parse(
  (getResult.content as Array<{ text: string }>)[0].text
);
if (!(getData.product && "reviews" in getData)) {
  throw new Error("toolbase_get missing product or reviews field");
}

// toolbase_get_reviews returns array
const reviewsResult = await client.callTool({
  name: "toolbase_get_reviews",
  arguments: { product_id: "stripe" },
});
const reviewsData = JSON.parse(
  (reviewsResult.content as Array<{ text: string }>)[0].text
);
if (!("reviews" in reviewsData && Array.isArray(reviewsData.reviews))) {
  throw new Error("toolbase_get_reviews missing reviews array");
}

// toolbase_get_bugs returns array
const bugsResult = await client.callTool({
  name: "toolbase_get_bugs",
  arguments: { product_id: "stripe" },
});
const bugsData = JSON.parse(
  (bugsResult.content as Array<{ text: string }>)[0].text
);
if (!("bugs" in bugsData && Array.isArray(bugsData.bugs))) {
  throw new Error("toolbase_get_bugs missing bugs array");
}

// ── Auth guard ─────────────────────────────────────────────────────────────

if (apiKey) {
  // With API key: write tools must succeed
  const reviewResult = await client.callTool({
    name: "toolbase_review",
    arguments: {
      product_id: "stripe",
      agent_model: "smoke-test",
      task_context: "testing",
      stack: ["bun"],
      rating: 5,
      body: "smoke test review — delete me",
      worked_well: [],
      friction_points: [],
    },
  });
  if (reviewResult.isError) {
    throw new Error(
      `toolbase_review should succeed with API key, got error: ${JSON.stringify(reviewResult.content)}`
    );
  }
  console.log("smoke-mcp OK: write tools succeed with API key");
} else {
  // Without API key: write tools must be rejected
  const reviewReject = await client.callTool({
    name: "toolbase_review",
    arguments: {
      product_id: "stripe",
      agent_model: "smoke-test",
      task_context: "testing",
      stack: ["bun"],
      rating: 5,
      body: "smoke test review",
      worked_well: [],
      friction_points: [],
    },
  });
  if (!reviewReject.isError) {
    throw new Error("toolbase_review should reject when unauthenticated");
  }
  console.log("smoke-mcp OK: write tools correctly rejected without API key");
}

// ── Prompts ────────────────────────────────────────────────────────────────

const { prompts } = await client.listPrompts();
const promptNames = prompts.map((p) => p.name).sort();
const expectedPrompts = [
  "compare_for_task",
  "discover_tools",
  "explain_product",
  "review_after_build",
];
for (const n of expectedPrompts) {
  if (!promptNames.includes(n)) {
    throw new Error(`Expected prompt ${n}, got: ${promptNames.join(", ")}`);
  }
}

const got = await client.getPrompt({
  name: "discover_tools",
  arguments: { query: "database" },
});
if (!got.messages?.length) {
  throw new Error("getPrompt discover_tools returned no messages");
}

await client.close();
console.log("smoke-mcp OK tools:", names.join(", "));
console.log("smoke-mcp OK prompts:", promptNames.join(", "));
