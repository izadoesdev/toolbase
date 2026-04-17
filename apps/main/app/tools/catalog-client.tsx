"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { configForTools } from "@/lib/toolbase/mcp-config";
import type { AgentAuthMode } from "@/lib/toolbase/leaderboard";
import type { CatalogProduct } from "./page";

const PRICING_COLORS: Record<string, string> = {
  free: "text-emerald-500",
  freemium: "text-sky-400",
  open_source: "text-emerald-500",
  paid: "text-amber-400",
  usage_based: "text-amber-400",
  enterprise: "text-fuchsia-400",
};

type AuthFilter = AgentAuthMode | "any";

const AUTH_META: Record<
  AgentAuthMode,
  { label: string; badge: string; dot: string; description: string }
> = {
  none: {
    label: "No auth",
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
    description: "Agent can call it. No keys, no consent.",
  },
  agent_key: {
    label: "API key",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    dot: "bg-sky-400",
    description: "Agent passes a key. No human step.",
  },
  human_login: {
    label: "Human OAuth",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
    description: "Human must click through a consent screen.",
  },
  unknown: {
    label: "Unverified",
    badge: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    description: "Auth posture not confirmed.",
  },
};

type SortKey = "ease" | "name" | "rating" | "reviews";

function AuthBadge({ mode }: { mode: AgentAuthMode }) {
  const meta = AUTH_META[mode];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
        meta.badge
      )}
      title={meta.description}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function ProductCard({
  product,
  selected,
  onToggleSelect,
}: {
  product: CatalogProduct;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors",
        selected
          ? "border-emerald-500/50 bg-emerald-500/[0.03]"
          : "border-border hover:border-border/80 hover:bg-muted/30"
      )}
    >
      <button
        aria-label={selected ? "Deselect for batch copy" : "Select for batch copy"}
        aria-pressed={selected}
        className={cn(
          "absolute top-3 right-3 flex size-6 items-center justify-center rounded border font-mono text-[11px] transition-colors",
          selected
            ? "border-emerald-500 bg-emerald-500 text-background"
            : "border-border bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:border-emerald-500/60 hover:text-foreground"
        )}
        onClick={(e) => {
          e.preventDefault();
          onToggleSelect(product.id);
        }}
        type="button"
      >
        {selected ? "✓" : "+"}
      </button>

      <Link
        className="flex min-w-0 flex-col gap-2 pr-8"
        href={`/tools/${product.id}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <AuthBadge mode={product.agent_auth} />
          {product.mcp_supported && (
            <span className="rounded border border-border bg-muted px-1.5 py-px font-mono text-[9px] text-muted-foreground uppercase tracking-[0.08em]">
              MCP
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-foreground text-sm tracking-tight">
            {product.name}
          </span>
          <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
            {product.tagline ?? product.description}
          </p>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground uppercase tracking-[0.08em]">
          {product.category}
        </span>
        <span
          className={cn(
            "font-medium font-mono tracking-[0.02em]",
            PRICING_COLORS[product.pricing_model] ?? "text-muted-foreground"
          )}
        >
          {product.pricing_model}
        </span>
        <span className="font-mono text-muted-foreground tabular-nums">
          ease {product.ease_score}
        </span>
        {product.rating !== null && (
          <span className="font-mono text-muted-foreground tabular-nums">
            ★ {product.rating.toFixed(1)} ({product.review_count})
          </span>
        )}
      </div>
    </div>
  );
}

const AUTH_FILTER_OPTIONS: {
  id: AuthFilter;
  label: string;
  sublabel: string;
}[] = [
  { id: "any", label: "Any", sublabel: "" },
  { id: "none", label: "No auth", sublabel: "agent-ready" },
  { id: "agent_key", label: "API key", sublabel: "agent-ready" },
  { id: "human_login", label: "Human OAuth", sublabel: "needs a human" },
];

export function CatalogClient({
  categories,
  products,
}: {
  categories: string[];
  products: CatalogProduct[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [authFilter, setAuthFilter] = useState<AuthFilter>("any");
  const [mcpOnly, setMcpOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("ease");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    let result = products;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.tagline?.toLowerCase().includes(q) ?? false)
      );
    }

    if (category !== "all") {
      result = result.filter((p) => p.category === category);
    }

    if (authFilter !== "any") {
      result = result.filter((p) => p.agent_auth === authFilter);
    }

    if (mcpOnly) {
      result = result.filter((p) => p.mcp_supported);
    }

    if (freeOnly) {
      result = result.filter((p) => p.has_free_tier);
    }

    return [...result].sort((a, b) => {
      if (sortBy === "ease") {
        return b.ease_score - a.ease_score;
      }
      if (sortBy === "rating") {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sortBy === "reviews") {
        return b.review_count - a.review_count;
      }
      return a.name.localeCompare(b.name);
    });
  }, [products, search, category, authFilter, mcpOnly, freeOnly, sortBy]);

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copySelectedConfig = async () => {
    if (selectedProducts.length === 0) {
      return;
    }
    const config = configForTools(
      selectedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        endpoint: p.mcp_endpoint,
        envVar: p.auth_env_var,
      }))
    );
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setAuthFilter("any");
    setMcpOnly(false);
    setFreeOnly(false);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Auth-first segmented control */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
            How should your agent authenticate?
          </p>
          <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums tracking-[0.04em]">
            {filtered.length} / {products.length}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {AUTH_FILTER_OPTIONS.map((opt) => {
            const active = authFilter === opt.id;
            return (
              <button
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
                key={opt.id}
                onClick={() => setAuthFilter(opt.id)}
                type="button"
              >
                <span className="font-medium">{opt.label}</span>
                {opt.sublabel && (
                  <span
                    className={cn(
                      "font-mono text-[9px] uppercase tracking-[0.1em]",
                      active ? "text-emerald-400/80" : "text-muted-foreground/60"
                    )}
                  >
                    · {opt.sublabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          aria-label="Filter tools"
          className="h-10 w-full max-w-xs rounded-xl border border-border bg-background px-3 text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name..."
          value={search}
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <input
              checked={mcpOnly}
              className="accent-emerald-500"
              onChange={(e) => setMcpOnly(e.target.checked)}
              type="checkbox"
            />
            MCP only
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <input
              checked={freeOnly}
              className="accent-emerald-500"
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
            <option value="ease">Sort: Ease</option>
            <option value="reviews">Sort: Most reviewed</option>
            <option value="rating">Sort: Rating</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          className={cn(
            "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
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
                "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
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
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              No tools match your filters.
            </p>
            <button
              className="mt-3 font-mono text-foreground text-xs underline-offset-2 hover:underline"
              onClick={clearFilters}
              type="button"
            >
              clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                onToggleSelect={toggleSelect}
                product={p}
                selected={selectedIds.has(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating batch-copy action */}
      {selectedProducts.length > 0 && (
        <div className="-translate-x-1/2 fixed bottom-6 left-1/2 z-50 flex items-center gap-3 rounded-full border border-emerald-500/40 bg-card px-4 py-2 shadow-lg shadow-black/40 backdrop-blur-sm">
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
            {selectedProducts.length} selected
          </span>
          <button
            className="rounded-full px-3 py-1 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.08em] hover:text-foreground"
            onClick={() => setSelectedIds(new Set())}
            type="button"
          >
            clear
          </button>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-xs transition-colors",
              copied
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-emerald-500 text-background hover:bg-emerald-400"
            )}
            onClick={copySelectedConfig}
            type="button"
          >
            {copied ? "✓ copied" : `Copy ${selectedProducts.length} configs`}
          </button>
        </div>
      )}
    </div>
  );
}
