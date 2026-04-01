# Toolbase — Agent Tool Discovery via MCP

**Status:** MVP  
**Stack:** Next.js (App Router) · MCP Streamable HTTP · Better Auth · Drizzle + Postgres · Bun

---

## 1. Overview

### Problem

Agents and developers lack a structured way to discover tools programmatically, understand what they do, and choose between comparable options. Existing platforms are human-first and not built for agents.

### Solution

A minimal product registry exposed as an MCP server. Agents connect over Streamable HTTP and use tools + prompts to search, compare, and understand developer tools.

### Product goal

> Make it trivial for an agent to answer: **"What tools can I use for X?"**

---

## 2. Scope

### In scope

| Area | Description |
|------|-------------|
| Product registry | JSON seed + DB-persisted user-created products |
| Schema | Single product shape (id, category, capabilities, tags, pricing, API URLs, MCP flags) |
| MCP server | Streamable HTTP at `/api/mcp` with 4 tools and 3 prompts |
| Search | Weighted keyword match with prefix matching, category/mcp_only filters |
| Auth for writes | `toolbase_create` requires a signed-in Better Auth user |

### Out of scope

- Embeddings / semantic search
- Performance metrics, leaderboards, or ranking
- Validating or proxying MCP endpoints
- Auto-switching between tools

---

## 3. Users

| User | Needs |
|------|--------|
| **AI agents (primary)** | Predictable schema, fast responses, machine-callable MCP tools |
| **Developers (secondary)** | Same data via web UI search |

---

## 4. Product schema

Defined in `apps/main/lib/toolbase/schema.ts` and seeded from `data/products.json`:

- `id`, `name`, `description`, `category`
- `capabilities[]`, `tags[]`
- `pricing`: `model` (`free` | `freemium` | `paid` | `enterprise`), `starting_price`
- `api`: `base_url`, `docs_url`
- `mcp`: `supported`, `endpoint` (nullable)

---

## 5. MCP Server

### Transport

- **Streamable HTTP** at `/api/mcp` (stateless — one server + transport per request)
- CORS enabled for cross-origin MCP clients
- `runtime: nodejs` for filesystem and DB access

### Tools

| Tool | Input | Output | Annotations |
|------|-------|--------|-------------|
| `toolbase_search` | `query`, optional `category`, `mcp_only`, `limit` | Ranked hits with category, capabilities, pricing_model, docs_url, score | readOnly, idempotent |
| `toolbase_list` | — | All products | readOnly, idempotent |
| `toolbase_get` | `id` | Full product record or error | readOnly, idempotent |
| `toolbase_create` | Full `Product` | `{ ok, id }` or error | requires auth |

### Search

- Weighted keyword scoring: name (+5) > category (+4) > capability (+3) > tag (+2) > description (+1)
- Prefix matching for terms >= 3 chars (`auth` matches `authentication`)
- Optional filters: `category`, `mcp_only`, `limit` (default 10)
- Results include enough data (category, capabilities, pricing, docs URL) that agents rarely need `toolbase_get`

### Prompts

| Prompt | Purpose |
|--------|---------|
| `discover_tools` | Search and summarize matches for a need |
| `compare_for_task` | Find and compare options for a use case |
| `explain_product` | Fetch and explain a single product by id |

### Persistence

- Seed data: `data/products.json` (loaded on first access)
- User-created products: `catalog_product` table in Postgres (jsonb column)
- Reads merge both sources; DB products override seed products with the same id

---

## 6. Architecture

```
apps/main/
  app/api/mcp/route.ts          # MCP HTTP endpoint
  app/api/auth/[...all]/route.ts # Better Auth
  app/api/route.ts               # Service metadata
  data/products.json             # Seed registry
  lib/mcp/                       # MCP server + HTTP handler
  lib/toolbase/                  # schema, match, registry
  lib/auth.ts                    # Better Auth (bearer + nextCookies)
  lib/db/                        # Drizzle + Postgres
  scripts/smoke-mcp.ts           # MCP smoke test
```

---

## 7. Constraints

1. No ranking "product" in MVP
2. No analytics product surface
3. No unnecessary infra
4. Don't market "AI-powered discovery" until real semantic search exists

---

## 8. After validation (only if used)

1. Semantic / hybrid search (embeddings)
2. MCP Resources for catalog browsing
3. Usage- or community-based signals
4. Deeper MCP execution or verification
