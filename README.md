# Toolbase

MCP server for a developer-tool catalog. Agents connect, search tools, and get prompts for discovery and comparison.

## Quick start

```bash
cp apps/main/.env.example apps/main/.env   # fill in DATABASE_URL, auth secrets
bun install
bun run dev                                # http://localhost:3000
```

## MCP endpoint

`POST /api/mcp` — Streamable HTTP. Tools: `toolbase_search`, `toolbase_list`, `toolbase_get`, `toolbase_create`. Prompts: `discover_tools`, `compare_for_task`, `explain_product`.

`toolbase_create` requires a Better Auth session (bearer token or cookie).

## Smoke test

```bash
bun scripts/smoke-mcp.ts
```
