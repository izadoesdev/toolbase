import type { ToolbaseMeta } from "@/lib/toolbase/registry";
import type { Product } from "@/lib/toolbase/schema";

interface DiffSummaryProps {
  approvedProduct: Product;
  onResolutionChange: (field: string, choice: "current" | "proposed") => void;
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
      <p className="text-muted-foreground text-sm">
        No field changes recorded.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border text-sm">
      {fields_added.map((field) => (
        <div
          className="flex items-baseline gap-3 border-border border-b bg-emerald-500/5 px-3 py-2 last:border-0"
          key={`add-${field}`}
        >
          <span className="shrink-0 font-mono font-semibold text-emerald-500 text-xs">
            +
          </span>
          <span className="shrink-0 font-mono text-emerald-600 text-xs dark:text-emerald-400">
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
            className="flex items-baseline gap-3 border-border border-b bg-blue-500/5 px-3 py-2 last:border-0"
            key={`change-${field}`}
          >
            <span className="shrink-0 font-mono font-semibold text-blue-500 text-xs">
              ~
            </span>
            <span className="shrink-0 font-mono text-blue-600 text-xs dark:text-blue-400">
              {field}
            </span>
            <span className="min-w-0 truncate text-muted-foreground text-xs line-through">
              {formatValue(orig[field])}
            </span>
            <span className="text-muted-foreground text-xs">→</span>
            <span className="min-w-0 truncate text-foreground text-xs">
              {formatValue(proposed[field])}
            </span>
          </div>
        ))}

      {Object.entries(conflicts).map(([field, { current, proposed: p }]) => {
        const choice = resolutions[field] ?? "proposed";
        return (
          <div
            className="space-y-2 border-border border-b bg-amber-500/5 px-3 py-2 last:border-0"
            key={`conflict-${field}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-amber-500 text-xs">
                ⚠
              </span>
              <span className="font-mono text-amber-600 text-xs dark:text-amber-400">
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
