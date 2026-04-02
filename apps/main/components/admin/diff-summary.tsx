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

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) {
    return "—";
  }
  if (typeof v === "string") {
    return v.length > 100 ? `${v.slice(0, 100)}…` : v;
  }
  if (Array.isArray(v)) {
    const strs = v.map((i) => (typeof i === "string" ? i : JSON.stringify(i)));
    const joined = strs.join(", ");
    return joined.length > 100
      ? `[${v.length} items] ${strs.slice(0, 3).join(", ")}…`
      : joined;
  }
  return String(v);
}

// Render key-value pairs for a newly added object field
function ObjectEntries({
  value,
  color,
}: {
  value: Record<string, unknown>;
  color: "emerald" | "blue";
}) {
  const textClass =
    color === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-blue-600 dark:text-blue-400";
  return (
    <div className="mt-1 space-y-0.5 pl-4">
      {Object.entries(value).map(([k, v]) => (
        <div className="flex gap-2 text-xs" key={k}>
          <span className={`shrink-0 font-mono ${textClass} opacity-70`}>
            {k}:
          </span>
          {isPlainObject(v) ? (
            <ObjectEntries color={color} value={v} />
          ) : (
            <span className="min-w-0 break-all text-muted-foreground">
              {formatScalar(v)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Compute sub-diff between two objects: returns added, changed, removed entries
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
    <div className="mt-1 space-y-0.5 pl-4">
      {added.map(([k, v]) => (
        <div className="flex gap-2 text-xs" key={`add-${k}`}>
          <span className="shrink-0 font-mono font-semibold text-emerald-500">
            +
          </span>
          <span className="shrink-0 font-mono text-emerald-600 dark:text-emerald-400">
            {k}:
          </span>
          {isPlainObject(v) ? (
            <ObjectEntries color="emerald" value={v} />
          ) : (
            <span className="min-w-0 break-all text-muted-foreground">
              {formatScalar(v)}
            </span>
          )}
        </div>
      ))}
      {changed.map(([k, oldVal, newVal]) => (
        <div
          className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs"
          key={`chg-${k}`}
        >
          <span className="shrink-0 font-mono font-semibold text-blue-500">
            ~
          </span>
          <span className="shrink-0 font-mono text-blue-600 dark:text-blue-400">
            {k}:
          </span>
          <span className="text-muted-foreground line-through">
            {formatScalar(oldVal)}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="text-foreground">{formatScalar(newVal)}</span>
        </div>
      ))}
      {removed.map((k) => (
        <div className="flex gap-2 text-xs" key={`rm-${k}`}>
          <span className="shrink-0 font-mono font-semibold text-red-500">
            -
          </span>
          <span className="shrink-0 font-mono text-red-400 line-through">
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
    <div className="overflow-hidden rounded-lg border border-border text-sm">
      {fields_added.map((field) => {
        const val = proposed[field];
        return (
          <div
            className="border-border border-b bg-emerald-500/5 px-3 py-2 last:border-0"
            key={`add-${field}`}
          >
            <div className="flex items-baseline gap-3">
              <span className="shrink-0 font-mono font-semibold text-emerald-500 text-xs">
                +
              </span>
              <span className="shrink-0 font-mono text-emerald-600 text-xs dark:text-emerald-400">
                {field}
              </span>
              {!isPlainObject(val) && (
                <span className="min-w-0 truncate text-muted-foreground text-xs">
                  {formatScalar(val)}
                </span>
              )}
            </div>
            {isPlainObject(val) && (
              <ObjectEntries color="emerald" value={val} />
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
              className="border-border border-b bg-blue-500/5 px-3 py-2 last:border-0"
              key={`change-${field}`}
            >
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 font-mono font-semibold text-blue-500 text-xs">
                  ~
                </span>
                <span className="shrink-0 font-mono text-blue-600 text-xs dark:text-blue-400">
                  {field}
                </span>
                {!bothObjects && (
                  <>
                    <span className="min-w-0 truncate text-muted-foreground text-xs line-through">
                      {formatScalar(oldVal)}
                    </span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="min-w-0 truncate text-foreground text-xs">
                      {formatScalar(newVal)}
                    </span>
                  </>
                )}
              </div>
              {bothObjects && <ObjectDiff newObj={newVal} oldObj={oldVal} />}
            </div>
          );
        })}

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
                <span className="block font-medium">Keep current</span>
                <span className="block opacity-70">
                  {formatScalar(current)}
                </span>
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
                <span className="block font-medium">Use proposed</span>
                <span className="block opacity-70">{formatScalar(p)}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
