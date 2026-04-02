# Admin UI Overhaul — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Replace the single flat review queue with a two-screen admin experience: a filterable queue list and a per-item detail page. The detail page shows type-aware context (new product vs update vs conflict), a visual diff summary, field-level conflict resolution pickers, and submitter metadata.

---

## Screens

### Screen 1 — Queue List (`/admin`)

Replaces the current `AdminClient` component.

**Filter bar** — pill toggles, no form submit, client-side filtering:
- Type: All · NEW · UPDATE · CONFLICT
- Risk: All · Low · Medium · High

**Queue row** — one row per pending item:
- Type badge: `NEW` (green) · `UPDATE` (blue) · `CONFLICT` (amber)
- Product name + monospace id
- Summary line: "+N fields added · N votes" for updates; "New product submission" for new; "N conflicting fields" for conflicts
- Risk badge
- Submitted date
- "Review →" link to `/admin/[id]`

Sort: conflicts first, then high-risk, then newest.

---

### Screen 2 — Detail Page (`/admin/[id]`)

New route. Server component fetches the pending item and (for updates) the current approved product.

**Header:** back link, product name, type badge, risk badge.

**Meta strip:** vote count, submitter count, first proposed, last proposed, submitted-by user id.

**Submitter notes:** shown if `toolbaseMeta.notes` is non-empty.

**Diff summary** (updates only — not shown for new products):
- Added fields: green `+` prefix, field name, value
- Changed fields: blue `~` prefix, field name, `old → new`
- Conflicting fields: amber `⚠` prefix, field name, two buttons to pick current vs proposed value. Selection is tracked in client state and sent with the approve action.

**Full product data** (new products): rendered as a structured JSON block or field-by-field display.

**Actions:**
- Approve button — for updates with conflicts, sends selected resolutions
- Reject button
- "View full product JSON" link (opens raw data in a `<pre>` or new tab)

---

## Data Layer Changes

### Registry — new function

```ts
getPendingProduct(id: string): Promise<PendingProduct | undefined>
```

Fetches a single row from `catalogProduct` where `status IN ('pending', 'update_pending')` by id.

### Registry — extend `approveProduct`

```ts
approveProduct(id: string, resolutions?: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }>
```

If `resolutions` is provided, deep-merge them into the product data before applying, overriding conflicting fields with the admin's chosen values.

### API route — extend `POST /api/admin/products/[id]`

Accept optional `resolutions` in the request body:

```json
{ "action": "approve", "resolutions": { "pricing.starting_price": 9 } }
```

---

## Component Structure

```
app/admin/page.tsx                  — server component, fetches queue, renders QueueList
app/admin/[id]/page.tsx             — server component, fetches item + approved product, renders ReviewDetail
components/admin/queue-list.tsx     — replaces admin-client.tsx (client component, filter state)
components/admin/review-detail.tsx  — client component, conflict picker state + approve/reject
components/admin/diff-summary.tsx   — pure display, renders added/changed/conflict rows
```

`admin-client.tsx` is deleted.

---

## Constraints

- No new dependencies — use existing shadcn `Button`, standard HTML, Tailwind classes already in the project.
- Conflict resolution state lives in `review-detail.tsx` — no external state management.
- Filter state in `queue-list.tsx` is plain `useState` — no URL params needed.
- The `approveProduct` registry function must apply resolutions before calling `applyUpdateToOriginal` so the stored product reflects the admin's choices.
