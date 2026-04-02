"use client";

import { Debouncer } from "@tanstack/pacer";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { searchToolbase } from "@/app/actions/toolbase";
import { cn } from "@/lib/utils";

interface Hit {
  category: string;
  description: string;
  docs_url: string;
  id: string;
  mcp_supported: boolean;
  name: string;
  pricing_model: string;
}

interface PreviewProduct {
  category: string;
  description: string;
  id: string;
  mcp: { supported: boolean };
  name: string;
}

const CATEGORIES = [
  "all",
  "ai",
  "analytics",
  "auth",
  "billing",
  "database",
  "devtools",
  "email",
  "observability",
  "payments",
];

const PRICING_COLORS: Record<string, string> = {
  free: "text-emerald-600 dark:text-emerald-400",
  freemium: "text-blue-600 dark:text-blue-400",
  paid: "text-orange-600 dark:text-orange-400",
  enterprise: "text-purple-600 dark:text-purple-400",
};

function HitCard({ hit }: { hit: Hit }) {
  return (
    <li className="group flex items-start gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:border-border/80 hover:bg-muted/30">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground text-sm leading-snug">
            {hit.name}
          </span>
          {hit.mcp_supported && (
            <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-px font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
              MCP
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
          {hit.description}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          {hit.category}
        </span>
        <span
          className={cn(
            "font-medium text-[10px]",
            PRICING_COLORS[hit.pricing_model] ?? "text-muted-foreground"
          )}
        >
          {hit.pricing_model}
        </span>
        {hit.docs_url && (
          <a
            className="font-mono text-[10px] text-muted-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
            href={hit.docs_url}
            onClick={(e) => e.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            docs ↗
          </a>
        )}
      </div>
    </li>
  );
}

function PreviewGrid({ products }: { products: PreviewProduct[] }) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
        What agents are using
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {products.map((p) => (
          <li
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            key={p.id}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium text-foreground text-sm">
                {p.name}
              </span>
              <span className="truncate text-muted-foreground text-xs">
                {p.description}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {p.mcp.supported && (
                <span className="rounded border border-border bg-muted px-1.5 py-px font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                  MCP
                </span>
              )}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {p.category}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ToolbaseSearch({ preview }: { preview: PreviewProduct[] }) {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  // Stable results ref — never goes blank during a refetch
  const lastDataRef = useRef<Hit[]>([]);

  const { current: debouncer } = useRef<Debouncer<(q: string) => void>>(
    new Debouncer((q: string) => setQuery(q), { wait: 300 })
  );

  const { data, isFetching } = useQuery({
    queryKey: ["toolbase-search", query, category],
    queryFn: () =>
      searchToolbase(query, category).then((r) => r.results as Hit[]),
    enabled: query.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  // Keep the last resolved data so results stay visible while the next fetch runs.
  if (data !== undefined) {
    lastDataRef.current = data;
  } else if (!inputValue.trim()) {
    // Clear stale results when the input is truly empty so the next search starts fresh.
    lastDataRef.current = [];
  }

  const results = data ?? lastDataRef.current;

  // Drive the results panel off inputValue (immediate), not the debounced query,
  // so the panel switches to/from preview without any 300 ms lag.
  const showResults = inputValue.trim().length > 0;

  const onQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    if (v.trim()) {
      debouncer.maybeExecute(v);
    } else {
      debouncer.cancel();
      setQuery("");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Search input */}
      <div className="relative">
        <input
          aria-label="Search tools"
          autoComplete="off"
          className={cn(
            "h-12 w-full rounded-2xl border border-border bg-background px-4 text-foreground text-sm placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-2 focus:ring-foreground/10",
            "transition-shadow"
          )}
          onChange={onQueryChange}
          placeholder="describe what you're trying to build…"
          value={inputValue}
        />
        {isFetching && (
          <div className="absolute top-1/2 right-4 -translate-y-1/2">
            <div className="size-4 animate-spin rounded-full border-2 border-border border-t-foreground/40" />
          </div>
        )}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
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
            {cat}
          </button>
        ))}
      </div>

      {/* Results / preview — no opacity transition; spinner in the input is enough */}
      <div>
        {!showResults && <PreviewGrid products={preview} />}
        {showResults && results.length === 0 && !isFetching && (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No results. Try different words or clear the category filter.
          </p>
        )}
        {showResults && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((hit) => (
              <HitCard hit={hit} key={hit.id} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
