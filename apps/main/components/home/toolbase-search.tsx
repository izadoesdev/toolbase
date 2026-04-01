"use client";

import { useCallback, useState, useTransition } from "react";
import { searchToolbase } from "@/app/actions/toolbase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Product } from "@/lib/toolbase/schema";
import { cn } from "@/lib/utils";

interface Hit {
  category: string;
  description: string;
  docs_url: string;
  id: string;
  mcp_supported: boolean;
  name: string;
}

const SUGGESTIONS = [
  "auth with SSO for B2B",
  "serverless postgres",
  "send transactional email",
  "LLM observability",
];

function SearchResults({
  results,
  preview,
}: {
  results: Hit[] | null;
  preview: Product[];
}) {
  if (results === null) {
    return (
      <section className="space-y-3">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          What agents are using
        </p>
        <ul className="grid gap-2">
          {preview.map((p) => (
            <li
              className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm"
              key={p.id}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {p.mcp.supported ? (
                    <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
                      MCP
                    </span>
                  ) : null}
                  <span className="text-muted-foreground text-xs">
                    {p.category}
                  </span>
                </span>
              </div>
              {p.description ? (
                <p className="line-clamp-1 text-muted-foreground text-xs leading-relaxed">
                  {p.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (results.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nothing matched that yet. Try different words or one of the suggestions
        above.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {results.map((hit) => (
        <li key={hit.id}>
          <Card className="border-border bg-card" size="sm">
            <CardHeader className="gap-1 pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="font-semibold text-base leading-snug">
                  {hit.name}
                </CardTitle>
                <span className="flex shrink-0 items-center gap-1.5">
                  {hit.mcp_supported ? (
                    <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
                      MCP
                    </span>
                  ) : null}
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                    {hit.category}
                  </span>
                  {hit.docs_url ? (
                    <a
                      className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wide transition-colors hover:text-foreground"
                      href={hit.docs_url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Docs ↗
                    </a>
                  ) : null}
                </span>
              </div>
              <CardDescription className="text-sm leading-relaxed">
                {hit.description}
              </CardDescription>
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function ToolbaseSearch({ preview }: { preview: Product[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[] | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = useCallback((q: string) => {
    startTransition(() => {
      searchToolbase(q).then(({ results: next }) => {
        setResults(next);
      });
    });
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      {/* Search form */}
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={onSubmit}
      >
        <Input
          aria-label="Search tools"
          autoComplete="off"
          className="h-11 flex-1 rounded-2xl border-border bg-background text-base"
          name="q"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="describe the problem you're trying to solve…"
          value={query}
        />
        <Button
          className="h-11 w-28 shrink-0 rounded-2xl"
          disabled={pending}
          type="submit"
        >
          {pending ? <Spinner className="size-4" /> : "Search"}
        </Button>
      </form>

      {/* Suggestions + back — always rendered to prevent layout shift */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-hidden={results === null}
          className={cn(
            "mr-1 text-muted-foreground text-xs underline decoration-muted-foreground/40 underline-offset-2 transition-opacity hover:text-foreground",
            results === null
              ? "pointer-events-none opacity-0"
              : "pointer-events-auto opacity-100"
          )}
          onClick={() => setResults(null)}
          tabIndex={results === null ? -1 : 0}
          type="button"
        >
          ← Back
        </button>
        <span className="font-medium text-muted-foreground text-xs">Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            className="rounded-full border border-border bg-background px-3 py-1 text-foreground text-xs transition-colors hover:bg-muted/70"
            key={s}
            onClick={() => {
              setQuery(s);
              runSearch(s);
            }}
            type="button"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Results */}
      <div
        className={cn(
          "transition-opacity duration-150",
          pending && "opacity-50"
        )}
      >
        <SearchResults preview={preview} results={results} />
      </div>
    </div>
  );
}
