"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "./page";

const PRICING_COLORS: Record<string, string> = {
  free: "text-emerald-600 dark:text-emerald-400",
  freemium: "text-blue-600 dark:text-blue-400",
  open_source: "text-emerald-600 dark:text-emerald-400",
  paid: "text-orange-600 dark:text-orange-400",
  usage_based: "text-orange-600 dark:text-orange-400",
  enterprise: "text-purple-600 dark:text-purple-400",
};

type SortKey = "name" | "rating" | "reviews";

function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <Link
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80 hover:bg-muted/30"
      href={`/tools/${product.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">
              {product.name}
            </span>
            {product.mcp_supported && (
              <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-px font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                MCP
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
            {product.tagline ?? product.description}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground uppercase tracking-wider">
          {product.category}
        </span>
        <span
          className={cn(
            "font-medium",
            PRICING_COLORS[product.pricing_model] ?? "text-muted-foreground"
          )}
        >
          {product.pricing_model}
        </span>
        {product.rating !== null && (
          <span className="text-muted-foreground">
            ★ {product.rating.toFixed(1)} ({product.review_count})
          </span>
        )}
      </div>
    </Link>
  );
}

export function CatalogClient({
  categories,
  products,
}: {
  categories: string[];
  products: CatalogProduct[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [mcpOnly, setMcpOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("name");

  let filtered = products;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tagline?.toLowerCase().includes(q) ?? false)
    );
  }

  if (category !== "all") {
    filtered = filtered.filter((p) => p.category === category);
  }

  if (mcpOnly) {
    filtered = filtered.filter((p) => p.mcp_supported);
  }

  if (freeOnly) {
    filtered = filtered.filter((p) => p.has_free_tier);
  }

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "rating") {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    if (sortBy === "reviews") {
      return b.review_count - a.review_count;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          aria-label="Filter tools"
          className="h-10 w-full max-w-xs rounded-xl border border-border bg-background px-3 text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name..."
          value={search}
        />

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <input
              checked={mcpOnly}
              className="accent-foreground"
              onChange={(e) => setMcpOnly(e.target.checked)}
              type="checkbox"
            />
            MCP only
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <input
              checked={freeOnly}
              className="accent-foreground"
              onChange={(e) => setFreeOnly(e.target.checked)}
              type="checkbox"
            />
            Free tier
          </label>
          <select
            className="rounded-lg border border-border bg-background px-2 py-1 text-muted-foreground text-xs"
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            value={sortBy}
          >
            <option value="name">Sort: Name</option>
            <option value="rating">Sort: Rating</option>
            <option value="reviews">Sort: Reviews</option>
          </select>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          className={cn(
            "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
            category === "all"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          )}
          onClick={() => setCategory("all")}
          type="button"
        >
          all ({products.length})
        </button>
        {categories.map((cat) => {
          const count = products.filter((p) => p.category === cat).length;
          return (
            <button
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                cat === category
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
              key={cat}
              onClick={() => setCategory(cat)}
              type="button"
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div>
        <p className="mb-4 text-muted-foreground text-xs">
          {filtered.length} tool{filtered.length === 1 ? "" : "s"}
        </p>
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              No tools match your filters.
            </p>
            <button
              className="mt-3 font-mono text-foreground text-xs underline-offset-2 hover:underline"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setMcpOnly(false);
                setFreeOnly(false);
              }}
              type="button"
            >
              clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
