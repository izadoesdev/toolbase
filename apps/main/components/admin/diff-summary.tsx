import type { ToolbaseMeta } from "@/lib/toolbase/registry";
import type { Product } from "@/lib/toolbase/schema";

interface DiffSummaryProps {
  approvedProduct: Product;
  onResolutionChange: (field: string, choice: "current" | "proposed") => void;
  pendingProduct: Product;
  resolutions: Record<string, "current" | "proposed">;
  toolbaseMeta: ToolbaseMeta;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function truncate(s: string, max = 120): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// Renders any value as JSX — strings, booleans, URLs, arrays, objects
function Value({ v, depth = 0 }: { depth?: number; v: unknown }) {
  if (v === null || v === undefined) {
    return <span className="text-muted-foreground/50">—</span>;
  }

  if (typeof v === "boolean") {
    return (
      <span className={v ? "text-emerald-500" : "text-muted-foreground"}>
        {String(v)}
      </span>
    );
  }

  if (typeof v === "number") {
    return <span className="text-foreground">{v}</span>;
  }

  if (typeof v === "string") {
    const isUrl = v.startsWith("http://") || v.startsWith("https://");
    if (isUrl) {
      return (
        <a
          className="break-all text-blue-500 hover:underline"
          href={v}
          rel="noopener noreferrer"
          target="_blank"
        >
          {truncate(v, 80)}
        </a>
      );
    }
    return <span className="break-words text-foreground">{truncate(v)}</span>;
  }

  if (Array.isArray(v)) {
    if (v.length === 0) {
      return <span className="text-muted-foreground/50">[]</span>;
    }
    // Array of primitives — show as pill list
    if (v.every((i) => typeof i !== "object" || i === null)) {
      return (
        <div className="mt-0.5 flex flex-wrap gap-1">
          {v.map((item) => (
            <span
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs"
              key={String(item)}
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    // Array of objects — each as a mini card
    return (
      <div className={`space-y-1 ${depth > 0 ? "mt-1" : "mt-1.5"}`}>
        {v.map((item, idx) => (
          <div
            className="rounded border border-border/60 bg-background/60 px-2 py-1.5"
            // biome-ignore lint/suspicious/noArrayIndexKey: no stable id on arbitrary objects
            key={idx}
          >
            {isPlainObject(item) ? (
              <KVPairs depth={depth + 1} obj={item} />
            ) : (
              <Value depth={depth + 1} v={item} />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(v)) {
    return <KVPairs depth={depth + 1} obj={v} />;
  }

  return <span className="text-foreground">{String(v)}</span>;
}

function KVPairs({
  obj,
  depth = 0,
}: {
  depth?: number;
  obj: Record<string, unknown>;
}) {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return <span className="text-muted-foreground/50">{"{}"}</span>;
  }
  return (
    <div className="space-y-1">
      {entries.map(([k, val]) => {
        const isComplex =
          Array.isArray(val) ||
          (isPlainObject(val) && Object.keys(val as object).length > 2);
        return (
          <div
            className={
              isComplex ? "flex flex-col gap-0.5" : "flex items-baseline gap-2"
            }
            key={k}
          >
            <span
              className={`shrink-0 font-mono text-muted-foreground ${depth === 0 ? "text-xs" : "text-[11px]"}`}
            >
              {k}:
            </span>
            <div className={isComplex ? "pl-3" : ""}>
              <Value depth={depth} v={val} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Sub-diff between two objects: only show what changed
function objectSubDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): {
  added: [string, unknown][];
  changed: [string, unknown, unknown][];
  removed: string[];
} {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const added: [string, unknown][] = [];
  const changed: [string, unknown, unknown][] = [];
  const removed: string[] = [];
  for (const k of allKeys) {
    if (!(k in oldObj)) {
      added.push([k, newObj[k]]);
    } else if (!(k in newObj)) {
      removed.push(k);
    } else if (JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k])) {
      changed.push([k, oldObj[k], newObj[k]]);
    }
  }
  return { added, changed, removed };
}

function ObjectDiff({
  oldObj,
  newObj,
}: {
  oldObj: Record<string, unknown>;
  newObj: Record<string, unknown>;
}) {
  const { added, changed, removed } = objectSubDiff(oldObj, newObj);
  if (added.length === 0 && changed.length === 0 && removed.length === 0) {
    return null;
  }
  return (
    <div className="mt-2 space-y-2 border-border border-l-2 pl-3">
      {added.map(([k, v]) => (
        <div key={`add-${k}`}>
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono font-semibold text-emerald-500 text-xs">
              +
            </span>
            <span className="shrink-0 font-mono text-emerald-600 text-xs dark:text-emerald-400">
              {k}
            </span>
          </div>
          <div className="mt-0.5 pl-4 text-xs">
            <Value v={v} />
          </div>
        </div>
      ))}
      {changed.map(([k, oldVal, newVal]) => (
        <div key={`chg-${k}`}>
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono font-semibold text-blue-500 text-xs">
              ~
            </span>
            <span className="shrink-0 font-mono text-blue-600 text-xs dark:text-blue-400">
              {k}
            </span>
          </div>
          <div className="mt-0.5 space-y-0.5 pl-4 text-xs">
            <div className="text-muted-foreground line-through">
              <Value v={oldVal} />
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>↓</span>
            </div>
            <div>
              <Value v={newVal} />
            </div>
          </div>
        </div>
      ))}
      {removed.map((k) => (
        <div className="flex items-baseline gap-2" key={`rm-${k}`}>
          <span className="shrink-0 font-mono font-semibold text-red-500 text-xs">
            -
          </span>
          <span className="shrink-0 font-mono text-red-400 text-xs line-through">
            {k}
          </span>
        </div>
      ))}
    </div>
  );
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
    <div className="overflow-hidden rounded-lg border border-border">
      {fields_added.map((field) => {
        const val = proposed[field];
        const isComplex = Array.isArray(val) || isPlainObject(val);
        return (
          <div
            className="border-border border-b bg-emerald-500/5 px-3 py-2.5 last:border-0"
            key={`add-${field}`}
          >
            <div className="mb-1 flex items-baseline gap-2">
              <span className="shrink-0 font-bold font-mono text-emerald-500 text-xs">
                +
              </span>
              <span className="font-mono font-semibold text-emerald-600 text-xs dark:text-emerald-400">
                {field}
              </span>
              {!isComplex && (
                <span className="ml-1 text-muted-foreground text-xs">
                  <Value v={val} />
                </span>
              )}
            </div>
            {isComplex && (
              <div className="pl-4 text-xs">
                <Value v={val} />
              </div>
            )}
          </div>
        );
      })}

      {fields_changed
        .filter((f) => !(f in conflicts))
        .map((field) => {
          const oldVal = orig[field];
          const newVal = proposed[field];
          const bothObjects = isPlainObject(oldVal) && isPlainObject(newVal);
          return (
            <div
              className="border-border border-b bg-blue-500/5 px-3 py-2.5 last:border-0"
              key={`change-${field}`}
            >
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-bold font-mono text-blue-500 text-xs">
                  ~
                </span>
                <span className="font-mono font-semibold text-blue-600 text-xs dark:text-blue-400">
                  {field}
                </span>
              </div>
              {bothObjects ? (
                <ObjectDiff newObj={newVal} oldObj={oldVal} />
              ) : (
                <div className="mt-1 space-y-1 pl-4 text-xs">
                  <div className="text-muted-foreground line-through">
                    <Value v={oldVal} />
                  </div>
                  <div className="text-[10px] text-muted-foreground">↓</div>
                  <div>
                    <Value v={newVal} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

      {Object.entries(conflicts).map(([field, { current, proposed: p }]) => {
        const choice = resolutions[field] ?? "proposed";
        return (
          <div
            className="space-y-3 border-border border-b bg-amber-500/5 px-3 py-2.5 last:border-0"
            key={`conflict-${field}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold font-mono text-amber-500 text-xs">
                ⚠
              </span>
              <span className="font-mono font-semibold text-amber-600 text-xs dark:text-amber-400">
                {field}
              </span>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-600 text-xs dark:text-amber-400">
                conflict — pick one
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`rounded border px-3 py-2 text-left text-xs transition-colors ${
                  choice === "current"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-border hover:border-foreground/30"
                }`}
                onClick={() => onResolutionChange(field, "current")}
                type="button"
              >
                <div
                  className={`mb-1 font-semibold ${choice === "current" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                >
                  Keep current
                </div>
                <div className="text-muted-foreground">
                  <Value v={current} />
                </div>
              </button>
              <button
                className={`rounded border px-3 py-2 text-left text-xs transition-colors ${
                  choice === "proposed"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-border hover:border-foreground/30"
                }`}
                onClick={() => onResolutionChange(field, "proposed")}
                type="button"
              >
                <div
                  className={`mb-1 font-semibold ${choice === "proposed" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}
                >
                  Use proposed
                </div>
                <div className="text-muted-foreground">
                  <Value v={p} />
                </div>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
