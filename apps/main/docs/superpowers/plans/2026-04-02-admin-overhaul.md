# Admin UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single flat admin review queue with a filterable queue list + per-item detail page that shows type-aware context, a visual diff summary, field-level conflict resolution pickers, and submitter metadata.

**Architecture:** New route `app/admin/[id]/page.tsx` handles per-item review. `components/admin/queue-list.tsx` replaces the old `admin-client.tsx` with filter state. `components/admin/review-detail.tsx` owns conflict resolution state and posts to the existing API route. Registry gains `getPendingProduct` and `approveProduct` accepts optional conflict resolutions.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Tailwind CSS, shadcn `Button`

**Spec:** `docs/superpowers/specs/2026-04-02-admin-overhaul-design.md`

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| Modify | `lib/toolbase/registry.ts` | Add `getPendingProduct`; extend `approveProduct` to accept resolutions |
| Modify | `app/api/admin/products/[id]/route.ts` | Pass resolutions from request body to `approveProduct` |
| Delete | `components/admin/admin-client.tsx` | Replaced by `queue-list.tsx` |
| Create | `components/admin/queue-list.tsx` | Client component — filter state, renders the filterable queue rows |
| Modify | `app/admin/page.tsx` | Use `QueueList` instead of `AdminClient`; widen max-width |
| Create | `app/admin/[id]/page.tsx` | Server component — fetch pending item + approved product, render `ReviewDetail` |
| Create | `components/admin/diff-summary.tsx` | Pure display — added/changed/conflict rows with resolution pickers |
| Create | `components/admin/review-detail.tsx` | Client component — conflict picker state + approve/reject POST |

---

## Task 1: Add `getPendingProduct` to registry

**Files:**
- Modify: `lib/toolbase/registry.ts`

- [ ] **Add the function after `listPendingProducts`**

Open `lib/toolbase/registry.ts`. After the closing `}` of `listPendingProducts` (currently around line 429), insert:

```ts
export async function getPendingProduct(
  id: string
): Promise<PendingProduct | undefined> {
  const [r] = await db
    .select()
    .from(catalogProduct)
    .where(
      and(
        eq(catalogProduct.id, id),
        inArray(catalogProduct.status, ["processing", "update_pending"])
      )
    );
  if (!r) {
    return undefined;
  }
  const rawData = r.data as Record<string, unknown>;
  const result = productSchema.safeParse(rawData);
  if (!result.success) {
    return undefined;
  }
  return {
    createdAt: r.createdAt,
    data: result.data,
    id: r.id,
    isUpdate: r.status === "update_pending",
    submittedBy: r.submittedBy,
    toolbaseMeta:
      (rawData._toolbase_meta as ToolbaseMeta | undefined) ?? null,
    updateFor: (result.data.meta?.update_for as string | undefined) ?? null,
  };
}
```

- [ ] **Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add lib/toolbase/registry.ts
git commit -m "feat(registry): add getPendingProduct"
```

---

## Task 2: Extend `approveProduct` to accept conflict resolutions

**Files:**
- Modify: `lib/toolbase/registry.ts`

Conflicts are stored as `Record<string, { current: unknown; proposed: unknown }>` where keys are top-level product fields (e.g. `pricing`, `api`). When `resolutions` is provided, override each conflicting field in the merged product data before applying it to the original.

- [ ] **Replace the `approveProduct` function**

Find the current `approveProduct` function (starts around line 431) and replace it entirely:

```ts
export async function approveProduct(
  id: string,
  resolutions?: Record<string, "current" | "proposed">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.id, id));

  if (!row) {
    return { ok: false, error: `No product with id "${id}"` };
  }

  if (row.status === "update_pending") {
    const rawData = row.data as Record<string, unknown>;
    const parsed = productSchema.safeParse(rawData);
    const originalId = parsed.success
      ? (parsed.data.meta?.update_for ?? null)
      : null;
    if (originalId && parsed.success) {
      let resolvedData = parsed.data;
      if (resolutions) {
        const meta = rawData._toolbase_meta as
          | ToolbaseMeta
          | undefined;
        const conflicts = meta?.conflicts ?? {};
        const orig = await getProduct(originalId);
        if (orig) {
          const origRecord = orig as Record<string, unknown>;
          const overrides: Record<string, unknown> = {};
          for (const [field, choice] of Object.entries(resolutions)) {
            if (choice === "current" && field in conflicts) {
              overrides[field] = origRecord[field];
            }
          }
          if (Object.keys(overrides).length > 0) {
            resolvedData = productSchema.parse({
              ...resolvedData,
              ...overrides,
            });
          }
        }
      }
      await applyUpdateToOriginal(id, resolvedData, originalId);
      return { ok: true };
    }
  }

  await db
    .update(catalogProduct)
    .set({ status: "approved" })
    .where(eq(catalogProduct.id, id));
  return { ok: true };
}
```

- [ ] **Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add lib/toolbase/registry.ts
git commit -m "feat(registry): approveProduct accepts conflict resolutions"
```

---

## Task 3: Pass resolutions through the API route

**Files:**
- Modify: `app/api/admin/products/[id]/route.ts`

- [ ] **Replace the route handler**

Overwrite `app/api/admin/products/[id]/route.ts` with:

```ts
import { headers } from "next/headers";
import { isAdmin } from "@/lib/toolbase/permissions";
import { approveProduct, rejectProduct } from "@/lib/toolbase/registry";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const h = await headers();
  if (!(await isAdmin(h))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: { action?: unknown; resolutions?: unknown };
  try {
    body = (await request.json()) as {
      action?: unknown;
      resolutions?: unknown;
    };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, resolutions } = body as {
    action: "approve" | "reject";
    resolutions?: Record<string, "current" | "proposed">;
  };

  if (action === "approve") {
    const result = await approveProduct(id, resolutions);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 404 });
    }
    return Response.json({ ok: true, id, status: "approved" });
  }

  if (action === "reject") {
    const result = await rejectProduct(id);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 404 });
    }
    return Response.json({ ok: true, id, status: "rejected" });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
```

- [ ] **Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add app/api/admin/products/[id]/route.ts
git commit -m "feat(api): pass conflict resolutions to approveProduct"
```

---

## Task 4: Create `QueueList` component

**Files:**
- Create: `components/admin/queue-list.tsx`

This replaces `admin-client.tsx`. It renders a filter bar and the list of pending items, each linking to `/admin/[id]`.

- [ ] **Create the file**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import type { PendingProduct } from "@/lib/toolbase/registry";

type TypeFilter = "all" | "conflict" | "new" | "update";
type RiskFilter = "all" | "high" | "low" | "medium";

function itemType(item: PendingProduct): "conflict" | "new" | "update" {
  if (item.toolbaseMeta && Object.keys(item.toolbaseMeta.conflicts).length > 0) {
    return "conflict";
  }
  if (item.isUpdate) {
    return "update";
  }
  return "new";
}

function itemRisk(item: PendingProduct): "high" | "low" | "medium" | null {
  return item.toolbaseMeta?.risk ?? null;
}

function sortItems(items: PendingProduct[]): PendingProduct[] {
  const order = { conflict: 0, high: 1, medium: 2, update: 3, new: 4, low: 5 };
  return [...items].sort((a, b) => {
    const typeA = itemType(a);
    const typeB = itemType(b);
    if (typeA !== typeB) {
      return (order[typeA] ?? 9) - (order[typeB] ?? 9);
    }
    const riskA = itemRisk(a) ?? "low";
    const riskB = itemRisk(b) ?? "low";
    if (riskA !== riskB) {
      return (order[riskA] ?? 9) - (order[riskB] ?? 9);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const TYPE_BADGE: Record<
  "conflict" | "new" | "update",
  { label: string; className: string }
> = {
  conflict: {
    label: "CONFLICT",
    className: "bg-red-500/10 text-red-500",
  },
  new: {
    label: "NEW",
    className: "bg-emerald-500/10 text-emerald-500",
  },
  update: {
    label: "UPDATE",
    className: "bg-blue-500/10 text-blue-500",
  },
};

const RISK_BADGE: Record<
  "high" | "low" | "medium",
  { className: string }
> = {
  high: { className: "bg-red-500/10 text-red-500" },
  low: { className: "bg-muted text-muted-foreground" },
  medium: { className: "bg-amber-500/10 text-amber-500" },
};

function itemSummary(item: PendingProduct): string {
  const meta = item.toolbaseMeta;
  if (!meta) {
    return "New product submission";
  }
  const conflictCount = Object.keys(meta.conflicts).length;
  if (conflictCount > 0) {
    return `${conflictCount} conflicting field${conflictCount > 1 ? "s" : ""} · ${meta.vote_count} vote${meta.vote_count !== 1 ? "s" : ""}`;
  }
  const parts: string[] = [];
  if (meta.fields_added.length > 0) {
    parts.push(`+${meta.fields_added.length} added`);
  }
  if (meta.fields_changed.length > 0) {
    parts.push(`~${meta.fields_changed.length} changed`);
  }
  parts.push(`${meta.vote_count} vote${meta.vote_count !== 1 ? "s" : ""}`);
  return parts.join(" · ");
}

interface QueueListProps {
  initialPending: PendingProduct[];
}

export function QueueList({ initialPending }: QueueListProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");

  if (initialPending.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-6 py-12 text-center">
        <p className="text-muted-foreground text-sm">Nothing to review.</p>
      </div>
    );
  }

  const sorted = sortItems(initialPending);
  const filtered = sorted.filter((item) => {
    if (typeFilter !== "all" && itemType(item) !== typeFilter) {
      return false;
    }
    if (riskFilter !== "all" && itemRisk(item) !== riskFilter) {
      return false;
    }
    return true;
  });

  function filterPill(
    label: string,
    active: boolean,
    onClick: () => void
  ) {
    return (
      <button
        className={`rounded-full px-3 py-1 text-xs transition-colors ${
          active
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
        onClick={onClick}
        type="button"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">Type</span>
        {filterPill("All", typeFilter === "all", () => setTypeFilter("all"))}
        {filterPill("New", typeFilter === "new", () => setTypeFilter("new"))}
        {filterPill("Update", typeFilter === "update", () => setTypeFilter("update"))}
        {filterPill("Conflict", typeFilter === "conflict", () => setTypeFilter("conflict"))}
        <div className="mx-1 h-4 w-px bg-border" />
        <span className="text-muted-foreground text-xs">Risk</span>
        {filterPill("Low", riskFilter === "low", () => setRiskFilter("low"))}
        {filterPill("Medium", riskFilter === "medium", () => setRiskFilter("medium"))}
        {filterPill("High", riskFilter === "high", () => setRiskFilter("high"))}
        {riskFilter !== "all" && filterPill("Clear", false, () => setRiskFilter("all"))}
      </div>

      {/* Queue rows */}
      <div className="divide-y divide-border rounded-xl border border-border">
        {filtered.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground text-sm">
            No items match the current filters.
          </div>
        ) : (
          filtered.map((item) => {
            const type = itemType(item);
            const risk = itemRisk(item);
            const badge = TYPE_BADGE[type];
            return (
              <div
                className="flex items-center gap-3 px-4 py-3"
                key={item.id}
              >
                <span
                  className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-foreground text-sm">
                      {item.data.name}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs">
                      {item.data.id}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {itemSummary(item)}
                  </p>
                </div>
                {risk && (
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs ${RISK_BADGE[risk].className}`}
                  >
                    {risk}
                  </span>
                )}
                <span className="shrink-0 text-muted-foreground text-xs">
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <Link
                  className="shrink-0 text-blue-500 text-xs hover:underline"
                  href={`/admin/${item.id}`}
                >
                  Review →
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add components/admin/queue-list.tsx
git commit -m "feat(admin): QueueList component with type+risk filters"
```

---

## Task 5: Update queue page to use `QueueList`

**Files:**
- Modify: `app/admin/page.tsx`
- Delete: `components/admin/admin-client.tsx`

- [ ] **Overwrite `app/admin/page.tsx`**

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { QueueList } from "@/components/admin/queue-list";
import { auth } from "@/lib/auth";
import { listPendingProducts } from "@/lib/toolbase/registry";

export const metadata: Metadata = { title: "Admin · Review Queue" };

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const pending = await listPendingProducts();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="font-display font-semibold text-2xl text-foreground tracking-tight">
          Review queue
        </h1>
        {pending.length > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-muted-foreground text-xs">
            {pending.length}
          </span>
        )}
      </div>
      <QueueList initialPending={pending} />
    </main>
  );
}
```

- [ ] **Delete the old client component**

```bash
rm components/admin/admin-client.tsx
```

- [ ] **Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add app/admin/page.tsx
git add -u components/admin/admin-client.tsx
git commit -m "feat(admin): replace AdminClient with QueueList"
```

---

## Task 6: Create `DiffSummary` component

**Files:**
- Create: `components/admin/diff-summary.tsx`

Pure display component. Renders added fields (green), changed fields (blue), conflicting fields (amber) with resolution pickers. Receives `onResolutionChange` callback so the parent can track which choices the admin made.

- [ ] **Create the file**

```tsx
import type { ToolbaseMeta } from "@/lib/toolbase/registry";
import type { Product } from "@/lib/toolbase/schema";

interface DiffSummaryProps {
  approvedProduct: Product;
  onResolutionChange: (
    field: string,
    choice: "current" | "proposed"
  ) => void;
  pendingProduct: Product;
  resolutions: Record<string, "current" | "proposed">;
  toolbaseMeta: ToolbaseMeta;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) {
    return "—";
  }
  if (typeof v === "string") {
    return v.length > 80 ? `${v.slice(0, 80)}…` : v;
  }
  if (Array.isArray(v)) {
    return `[${v.length} items]`;
  }
  if (typeof v === "object") {
    return "{…}";
  }
  return String(v);
}

export function DiffSummary({
  approvedProduct,
  onResolutionChange,
  pendingProduct,
  resolutions,
  toolbaseMeta,
}: DiffSummaryProps) {
  const { conflicts, fields_added, fields_changed } = toolbaseMeta;
  const orig = approvedProduct as Record<string, unknown>;
  const proposed = pendingProduct as Record<string, unknown>;
  const hasChanges =
    fields_added.length > 0 ||
    fields_changed.length > 0 ||
    Object.keys(conflicts).length > 0;

  if (!hasChanges) {
    return (
      <p className="text-muted-foreground text-sm">No field changes recorded.</p>
    );
  }

  return (
    <div className="space-y-1 rounded-lg border border-border overflow-hidden text-sm">
      {fields_added.map((field) => (
        <div
          className="flex items-baseline gap-3 bg-emerald-500/5 px-3 py-2"
          key={`add-${field}`}
        >
          <span className="shrink-0 font-mono text-emerald-500 text-xs font-semibold">
            +
          </span>
          <span className="shrink-0 font-mono text-xs text-emerald-600 dark:text-emerald-400">
            {field}
          </span>
          <span className="min-w-0 truncate text-muted-foreground text-xs">
            {formatValue(proposed[field])}
          </span>
        </div>
      ))}

      {fields_changed
        .filter((f) => !(f in conflicts))
        .map((field) => (
          <div
            className="flex items-baseline gap-3 bg-blue-500/5 px-3 py-2"
            key={`change-${field}`}
          >
            <span className="shrink-0 font-mono text-blue-500 text-xs font-semibold">
              ~
            </span>
            <span className="shrink-0 font-mono text-xs text-blue-600 dark:text-blue-400">
              {field}
            </span>
            <span className="min-w-0 truncate text-muted-foreground text-xs line-through">
              {formatValue(orig[field])}
            </span>
            <span className="text-muted-foreground text-xs">→</span>
            <span className="min-w-0 truncate text-xs text-foreground">
              {formatValue(proposed[field])}
            </span>
          </div>
        ))}

      {Object.entries(conflicts).map(([field, { current, proposed: p }]) => {
        const choice = resolutions[field] ?? "proposed";
        return (
          <div
            className="bg-amber-500/5 px-3 py-2 space-y-2"
            key={`conflict-${field}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-500 text-xs font-semibold">
                ⚠
              </span>
              <span className="font-mono text-xs text-amber-600 dark:text-amber-400">
                {field}
              </span>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-600 text-xs dark:text-amber-400">
                conflict
              </span>
            </div>
            <div className="flex gap-2">
              <button
                className={`flex-1 rounded border px-3 py-1.5 text-xs transition-colors ${
                  choice === "current"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
                onClick={() => onResolutionChange(field, "current")}
                type="button"
              >
                Keep current: {formatValue(current)}
              </button>
              <button
                className={`flex-1 rounded border px-3 py-1.5 text-xs transition-colors ${
                  choice === "proposed"
                    ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
                onClick={() => onResolutionChange(field, "proposed")}
                type="button"
              >
                Use proposed: {formatValue(p)}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add components/admin/diff-summary.tsx
git commit -m "feat(admin): DiffSummary component"
```

---

## Task 7: Create `ReviewDetail` component

**Files:**
- Create: `components/admin/review-detail.tsx`

Client component. Owns resolution state for conflicting fields. Renders meta strip, notes, diff (for updates) or full product JSON (for new products), and the approve/reject actions. On approve, sends resolutions to the API.

- [ ] **Create the file**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DiffSummary } from "@/components/admin/diff-summary";
import { Button } from "@/components/ui/button";
import type { PendingProduct } from "@/lib/toolbase/registry";
import type { Product } from "@/lib/toolbase/schema";

interface ReviewDetailProps {
  approvedProduct: Product | null;
  item: PendingProduct;
}

export function ReviewDetail({ approvedProduct, item }: ReviewDetailProps) {
  const router = useRouter();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<
    Record<string, "current" | "proposed">
  >({});

  const meta = item.toolbaseMeta;
  const conflictCount = meta ? Object.keys(meta.conflicts).length : 0;
  const isConflict = conflictCount > 0;

  function handleResolutionChange(
    field: string,
    choice: "current" | "proposed"
  ) {
    setResolutions((prev) => ({ ...prev, [field]: choice }));
  }

  async function act(action: "approve" | "reject") {
    setActing(true);
    setError(null);
    try {
      const body: {
        action: string;
        resolutions?: Record<string, "current" | "proposed">;
      } = { action };
      if (action === "approve" && Object.keys(resolutions).length > 0) {
        body.resolutions = resolutions;
      }
      const res = await fetch(`/api/admin/products/${item.id}`, {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Something went wrong");
      }
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Meta strip */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground text-xs">
        {meta && (
          <>
            <span>
              {meta.vote_count} vote{meta.vote_count !== 1 ? "s" : ""} ·{" "}
              {meta.submitters.length} submitter
              {meta.submitters.length !== 1 ? "s" : ""}
            </span>
            <span>
              First proposed:{" "}
              {new Date(meta.first_proposed).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>
              Last updated:{" "}
              {new Date(meta.last_proposed).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </>
        )}
        {item.submittedBy && (
          <span className="font-mono">by {item.submittedBy}</span>
        )}
      </div>

      {/* Submitter notes */}
      {meta && meta.notes.length > 0 && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-1">
          <p className="text-blue-500 text-xs font-semibold uppercase tracking-wide">
            Submitter notes
          </p>
          {meta.notes.map((note, i) => (
            <p className="text-muted-foreground text-sm" key={i}>
              {note}
            </p>
          ))}
        </div>
      )}

      {/* Diff (updates) or full data (new) */}
      {item.isUpdate && meta && approvedProduct ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Changes
          </p>
          <DiffSummary
            approvedProduct={approvedProduct}
            onResolutionChange={handleResolutionChange}
            pendingProduct={item.data}
            resolutions={resolutions}
            toolbaseMeta={meta}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Product data
          </p>
          <pre className="overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed">
            {JSON.stringify(item.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}
      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button disabled={acting} onClick={() => act("approve")} size="sm">
          Approve
        </Button>
        <Button
          disabled={acting}
          onClick={() => act("reject")}
          size="sm"
          variant="destructive"
        >
          Reject
        </Button>
        {item.data.api.docs_url && (
          <a
            className="ml-auto text-muted-foreground text-xs hover:text-foreground transition-colors"
            href={item.data.api.docs_url}
            rel="noopener noreferrer"
            target="_blank"
          >
            Docs ↗
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add components/admin/review-detail.tsx
git commit -m "feat(admin): ReviewDetail component with conflict resolution"
```

---

## Task 8: Create detail page route

**Files:**
- Create: `app/admin/[id]/page.tsx`

Server component. Fetches the pending item by id, and for updates also fetches the currently-approved product. Redirects if the item is not found or the user is not admin.

- [ ] **Create the directory and file**

```bash
mkdir -p app/admin/\[id\]
```

Then create `app/admin/[id]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ReviewDetail } from "@/components/admin/review-detail";
import { auth } from "@/lib/auth";
import {
  getPendingProduct,
  getProduct,
} from "@/lib/toolbase/registry";

export const metadata: Metadata = { title: "Admin · Review" };

const TYPE_LABEL = {
  conflict: "CONFLICT",
  new: "NEW",
  update: "UPDATE",
} as const;

const TYPE_CLASS = {
  conflict: "bg-red-500/10 text-red-500",
  new: "bg-emerald-500/10 text-emerald-500",
  update: "bg-blue-500/10 text-blue-500",
} as const;

const RISK_CLASS = {
  high: "bg-red-500/10 text-red-500",
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/10 text-amber-500",
} as const;

export default async function AdminReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  const item = await getPendingProduct(id);
  if (!item) {
    notFound();
  }

  const approvedProduct =
    item.isUpdate && item.updateFor
      ? await getProduct(item.updateFor)
      : null;

  const conflictCount = item.toolbaseMeta
    ? Object.keys(item.toolbaseMeta.conflicts).length
    : 0;
  const type: "conflict" | "new" | "update" =
    conflictCount > 0 ? "conflict" : item.isUpdate ? "update" : "new";
  const risk = item.toolbaseMeta?.risk ?? null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Back + header */}
      <div className="mb-8 space-y-3">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground transition-colors"
          href="/admin"
        >
          ← Back to queue
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display font-semibold text-2xl text-foreground tracking-tight">
            {item.data.name}
          </h1>
          <span className="font-mono text-muted-foreground text-sm">
            {item.data.id}
          </span>
          <span
            className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${TYPE_CLASS[type]}`}
          >
            {TYPE_LABEL[type]}
          </span>
          {risk && (
            <span
              className={`rounded px-2 py-0.5 text-xs ${RISK_CLASS[risk]}`}
            >
              {risk} risk
            </span>
          )}
        </div>
        {item.data.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {item.data.description}
          </p>
        )}
      </div>

      <ReviewDetail
        approvedProduct={approvedProduct ?? null}
        item={item}
      />
    </main>
  );
}
```

- [ ] **Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add app/admin/\[id\]/page.tsx
git commit -m "feat(admin): per-item review detail page"
```

---

## Task 9: Final check

- [ ] **Run full type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Run linter**

```bash
npx biome check app/admin app/api/admin components/admin lib/toolbase/registry.ts
```

If there are fixable issues: `npx biome check --write app/admin app/api/admin components/admin lib/toolbase/registry.ts`

- [ ] **Verify the queue page renders**

Start dev server (`npm run dev`) and open `/admin`. Confirm:
- Filter bar visible with Type and Risk pills
- Each item shows the correct type badge (NEW / UPDATE / CONFLICT)
- "Review →" links to `/admin/[id]`

- [ ] **Verify the detail page renders**

Navigate to a NEW item. Confirm:
- Back link, product name, id, type badge shown
- Product JSON shown in `<pre>`
- Approve and Reject buttons present

Navigate to an UPDATE item. Confirm:
- Diff summary shows green added rows, blue changed rows
- If conflicts exist, amber rows with two picker buttons

- [ ] **Verify conflict resolution is sent**

On an UPDATE with conflicts, select resolutions and click Approve. Check network tab: request body should contain `{ "action": "approve", "resolutions": { "fieldName": "current" | "proposed" } }`.
