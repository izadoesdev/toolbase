"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { configForTool } from "@/lib/toolbase/mcp-config";

export function ToolInstallCard({
  id,
  name,
  endpoint,
  envVar,
}: {
  id: string;
  name: string;
  endpoint: string | null;
  envVar?: string | null;
}) {
  const [copiedBlock, setCopiedBlock] = useState<"json" | "endpoint" | null>(
    null
  );

  const config = configForTool({ id, name, endpoint, envVar });

  const copy = async (text: string, kind: "json" | "endpoint") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlock(kind);
      setTimeout(() => setCopiedBlock((c) => (c === kind ? null : c)), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-card">
      <div className="relative border-emerald-500/20 border-b bg-emerald-500/[0.04] px-5 py-4">
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        <p className="font-mono text-[10px] text-emerald-400 uppercase tracking-[0.18em]">
          Hand this to your agent
        </p>
        <p className="mt-1 text-foreground text-sm">
          Paste the config into your MCP client. Your agent picks it up on the
          next run.
        </p>
      </div>

      {endpoint && (
        <div className="flex items-center justify-between gap-3 border-border border-b px-5 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
              Endpoint
            </p>
            <p className="truncate font-mono text-foreground text-xs">
              {endpoint}
            </p>
          </div>
          <button
            className={cn(
              "shrink-0 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
              copiedBlock === "endpoint"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-border bg-muted text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
            onClick={() => copy(endpoint, "endpoint")}
            type="button"
          >
            {copiedBlock === "endpoint" ? "✓ copied" : "copy url"}
          </button>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between border-border border-b bg-muted/30 px-5 py-2">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
            mcp.json
          </span>
          <button
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
              copiedBlock === "json"
                ? "border-emerald-500 bg-emerald-500 text-background"
                : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            )}
            onClick={() => copy(config, "json")}
            type="button"
          >
            {copiedBlock === "json" ? "✓ copied" : "copy config"}
          </button>
        </div>
        <pre className="overflow-auto px-5 py-4 font-mono text-[12px] text-foreground leading-[1.6]">
          {config}
        </pre>
      </div>

      {envVar && (
        <div className="border-border border-t bg-muted/20 px-5 py-3">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
            Required env var
          </p>
          <code className="mt-1 inline-block font-mono text-amber-400 text-xs">
            {envVar}
          </code>
        </div>
      )}
    </div>
  );
}
