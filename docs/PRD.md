# Peer — Agent Product Discovery Layer (Lean PRD)

**Status:** MVP in progress  
**Stack:** Next.js (App Router) · Elysia (route handler) · oRPC · Bun  

---

## 1. Overview

### Problem

Agents and developers lack a **clean, structured** way to:

- discover tools programmatically  
- understand what they do  
- choose between comparable options  

Existing platforms (Product Hunt, G2, etc.) are **human-first**, **unstructured**, and **not built for agents**.

### Solution

A **minimal product registry** with:

- **Structured products** (fixed schema)  
- **Queryable by agents** via **oRPC** (typed RPC over HTTP)  
- **MCP fields** on each product (metadata only in MVP — no MCP hosting)  

No analytics, no ranking engine, no semantic/embedding search in v1.

### Product goal

> Make it trivial for an agent to answer: **“What tools can I use for X?”**

---

## 2. Scope

### In scope (MVP)

| Area | Description |
|------|-------------|
| Product registry | JSON-backed seed + in-memory updates |
| Schema | Single product shape (id, category, capabilities, tags, pricing, API URLs, MCP flags) |
| Query API | Keyword match over name, description, category, capabilities, tags |
| RPC surface | oRPC router mounted at `/api/rpc` (inside Elysia on Next.js) |
| Optional auth | `peer.create` guarded by `PEER_ADMIN_TOKEN` when set |

### Out of scope (explicit)

- Performance metrics, leaderboards, or ranking  
- Telemetry / product analytics  
- Databuddy or other analytics integrations  
- Auto-switching between tools  
- Embeddings / “AI-powered” search (optional later)  
- Validating or proxying MCP endpoints  

**Rule:** If it blocks shipping in 1–2 weeks, it waits.

---

## 3. Users

| User | Needs |
|------|--------|
| **AI agents (primary)** | Predictable schema, fast responses, machine-callable API |
| **Developers (secondary)** | Same RPC from scripts, CLIs, or UI |

---

## 4. Product schema

The registry is defined by this shape (see `apps/main/lib/peer/schema.ts` and `data/products.json`):

- `id`, `name`, `description`, `category`  
- `capabilities[]`, `tags[]`  
- `pricing`: `model` (`free` \| `freemium` \| `paid` \| `enterprise`), `starting_price`  
- `api`: `base_url`, `docs_url`  
- `mcp`: `supported`, `endpoint` (nullable — metadata only in MVP)  

---

## 5. API (implementation)

### Transport

- **Next.js** `app/api/[[...slugs]]/route.ts`: Elysia app with `prefix: /api`  
- **oRPC** `RPCHandler` on `/api/rpc*` with `parse: 'none'` on that route  
- **`runtime: nodejs`** for filesystem access to seed data  

### Procedures (`appRouter`)

| Procedure | Input | Output |
|-----------|--------|--------|
| `peer.query` | `{ query: string }` | `{ results: QueryHit[] }` — each hit includes `match_reason` |
| `peer.list` | — | `{ products: Product[] }` |
| `peer.get` | `{ id: string }` | `{ product }` or `NOT_FOUND` |
| `peer.create` | full `Product` | `{ ok: true }` or `CONFLICT` / `UNAUTHORIZED` |

`peer.create`: if `PEER_ADMIN_TOKEN` is set, require `Authorization: Bearer <token>`.

### Matching (v1)

- Lowercase keyword match across name, description, category, capabilities, tags  
- Results sorted by simple score (term hits)  
- No embeddings required  

### Client

- Typed client: `createPeerClient(baseUrl)` in `lib/orpc/client.ts` → points at `{baseUrl}/api/rpc`  

---

## 6. Architecture (as built)

```
apps/main/
  app/api/[[...slugs]]/route.ts   # Elysia + oRPC mount
  data/products.json              # Seed registry
  lib/peer/                       # schema, match, registry
  lib/orpc/                       # router, handler, client helper
```

---

## 7. MVP timeline (reference)

| Phase | Focus |
|-------|--------|
| Days 1–2 | Schema + seed (20–50 products over time) |
| Days 3–4 | RPC + registry + query |
| Days 5 | Consumers (CLI or UI calling same API) optional |
| Days 6–7 | Polish + deploy |

---

## 8. Go-to-market (matters more than features)

- **Developers:** “API for discovering dev tools” / “stop ad-hoc Googling”  
- **Agents:** “Structured tool data your automation can actually call”  
- **Content:** curated lists from your own data (“auth for SaaS”, “email APIs”, …)  

---

## 9. Constraints (do not break)

1. No ranking “product” in MVP  
2. No analytics product surface  
3. No unnecessary infra  
4. Don’t market “AI-powered discovery” until you ship real semantic search  

---

## 10. After validation (only if used)

1. Semantic / hybrid search  
2. Usage- or community-based signals  
3. Deeper MCP execution or verification  
4. Integrations (e.g. analytics) once core loop is proven  

---

## Blunt check

This version is meant to be **boring and shippable**, not viral. Ship the registry and RPC; iterate from real usage.
