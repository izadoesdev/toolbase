import { isPlainObject, Value } from "@/components/admin/diff-summary";
import type { Product } from "@/lib/toolbase/schema";

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) {
    return true;
  }
  if (typeof v === "string") {
    return v === "";
  }
  if (Array.isArray(v)) {
    return v.length === 0;
  }
  if (isPlainObject(v)) {
    return Object.keys(v).length === 0;
  }
  return false;
}

export function ProductData({ data }: { data: Product }) {
  const entries = Object.entries(data as Record<string, unknown>).filter(
    ([, v]) => !isEmpty(v)
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {entries.map(([field, val]) => {
        const isComplex =
          Array.isArray(val) ||
          (isPlainObject(val) && Object.keys(val as object).length > 0);
        return (
          <div
            className="border-border border-b px-3 py-2.5 last:border-0"
            key={field}
          >
            {isComplex ? (
              <div className="flex flex-col gap-1">
                <span className="font-mono text-muted-foreground text-xs">
                  {field}
                </span>
                <div className="pl-3 text-xs">
                  <Value v={val} />
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-mono text-muted-foreground text-xs">
                  {field}
                </span>
                <span className="text-xs">
                  <Value v={val} />
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
