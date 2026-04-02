"use client";

import Link from "next/link";
import { useState } from "react";
import type { PendingProduct } from "@/lib/toolbase/registry";

type TypeFilter = "all" | "conflict" | "new" | "update";
type RiskFilter = "all" | "high" | "low" | "medium";

function itemType(item: PendingProduct): "conflict" | "new" | "update" {
  if (
    item.toolbaseMeta &&
    Object.keys(item.toolbaseMeta.conflicts).length > 0
  ) {
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
  const typeOrder = { conflict: 0, update: 1, new: 2 };
  const riskOrder = { high: 0, medium: 1, low: 2 };
  return [...items].sort((a, b) => {
    const typeA = itemType(a);
    const typeB = itemType(b);
    if (typeA !== typeB) {
      return (typeOrder[typeA] ?? 9) - (typeOrder[typeB] ?? 9);
    }
    const riskA = itemRisk(a) ?? "low";
    const riskB = itemRisk(b) ?? "low";
    if (riskA !== riskB) {
      return (riskOrder[riskA] ?? 9) - (riskOrder[riskB] ?? 9);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const TYPE_BADGE: Record<
  "conflict" | "new" | "update",
  { className: string; label: string }
> = {
  conflict: { className: "bg-red-500/10 text-red-500", label: "CONFLICT" },
  new: { className: "bg-emerald-500/10 text-emerald-500", label: "NEW" },
  update: { className: "bg-blue-500/10 text-blue-500", label: "UPDATE" },
};

const RISK_BADGE: Record<"high" | "low" | "medium", { className: string }> = {
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
    return `${conflictCount} conflicting field${conflictCount > 1 ? "s" : ""} · ${meta.vote_count} vote${meta.vote_count === 1 ? "" : "s"}`;
  }
  const parts: string[] = [];
  if (meta.fields_added.length > 0) {
    parts.push(`+${meta.fields_added.length} added`);
  }
  if (meta.fields_changed.length > 0) {
    parts.push(`~${meta.fields_changed.length} changed`);
  }
  parts.push(`${meta.vote_count} vote${meta.vote_count === 1 ? "" : "s"}`);
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

  function filterPill(label: string, active: boolean, onClick: () => void) {
    return (
      <button
        className={`rounded-full px-3 py-1 text-xs transition-colors ${
          active
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
        key={label}
        onClick={onClick}
        type="button"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">Type</span>
        {filterPill("All", typeFilter === "all", () => setTypeFilter("all"))}
        {filterPill("New", typeFilter === "new", () => setTypeFilter("new"))}
        {filterPill("Update", typeFilter === "update", () =>
          setTypeFilter("update")
        )}
        {filterPill("Conflict", typeFilter === "conflict", () =>
          setTypeFilter("conflict")
        )}
        <div className="mx-1 h-4 w-px bg-border" />
        <span className="text-muted-foreground text-xs">Risk</span>
        {filterPill("Low", riskFilter === "low", () => setRiskFilter("low"))}
        {filterPill("Medium", riskFilter === "medium", () =>
          setRiskFilter("medium")
        )}
        {filterPill("High", riskFilter === "high", () => setRiskFilter("high"))}
        {riskFilter !== "all" &&
          filterPill("Clear", false, () => setRiskFilter("all"))}
      </div>

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
              <div className="flex items-center gap-3 px-4 py-3" key={item.id}>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 font-mono font-semibold text-xs ${badge.className}`}
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
