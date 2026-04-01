"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PendingProduct } from "@/lib/toolbase/registry";

interface AdminClientProps {
  initialPending: PendingProduct[];
}

export function AdminClient({ initialPending }: AdminClientProps) {
  const [pending, setPending] = useState(initialPending);
  const [acting, setActing] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setActing(null);
    }
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-6 py-12 text-center">
        <p className="text-muted-foreground text-sm">Nothing to review.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {pending.map((item) => {
        const p = item.data;
        const isActing = acting === item.id;
        return (
          <div className="space-y-4 p-5" key={item.id}>
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground text-sm">
                    {p.name}
                  </span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
                    {p.id}
                  </span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                    {p.category}
                  </span>
                </div>
                <p className="line-clamp-2 text-muted-foreground text-sm leading-relaxed">
                  {p.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400">
                pending
              </span>
            </div>

            {/* Meta grid */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground text-xs">
              <span>
                <span className="text-foreground/50">pricing</span>{" "}
                {p.pricing.model}
                {p.pricing.starting_price > 0
                  ? ` · $${p.pricing.starting_price}/mo`
                  : ""}
              </span>
              <span>
                <span className="text-foreground/50">mcp</span>{" "}
                {p.mcp.supported ? "yes" : "no"}
              </span>
              <span>
                <span className="text-foreground/50">submitted</span>{" "}
                {new Date(item.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* Capabilities */}
            {p.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.capabilities.map((c) => (
                  <span
                    className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground text-xs"
                    key={c}
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                disabled={isActing}
                onClick={() => act(item.id, "approve")}
                size="sm"
              >
                Approve
              </Button>
              <Button
                disabled={isActing}
                onClick={() => act(item.id, "reject")}
                size="sm"
                variant="destructive"
              >
                Reject
              </Button>
              {p.api.docs_url && (
                <a
                  className="ml-auto text-muted-foreground text-xs transition-colors hover:text-foreground"
                  href={p.api.docs_url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Docs ↗
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
