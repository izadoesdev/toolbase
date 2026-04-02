"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DiffSummary } from "@/components/admin/diff-summary";
import { Button } from "@/components/ui/button";
import type { PendingProduct } from "@/lib/toolbase/registry";
import type { Product } from "@/lib/toolbase/schema";

interface ReviewDetailProps {
  approvedProduct: Product | null;
  item: PendingProduct;
}

export function ReviewDetail({ approvedProduct, item }: ReviewDetailProps) {
  const router = useRouter();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<
    Record<string, "current" | "proposed">
  >({});

  const meta = item.toolbaseMeta;
  const conflictCount = meta ? Object.keys(meta.conflicts).length : 0;
  const isConflict = conflictCount > 0;

  function handleResolutionChange(
    field: string,
    choice: "current" | "proposed"
  ) {
    setResolutions((prev) => ({ ...prev, [field]: choice }));
  }

  async function act(action: "approve" | "reject") {
    setActing(true);
    setError(null);
    try {
      const body: {
        action: string;
        resolutions?: Record<string, "current" | "proposed">;
      } = { action };
      if (action === "approve" && Object.keys(resolutions).length > 0) {
        body.resolutions = resolutions;
      }
      const res = await fetch(`/api/admin/products/${item.id}`, {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Something went wrong");
      }
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Meta strip */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground text-xs">
        {meta && (
          <>
            <span>
              {meta.vote_count} vote{meta.vote_count === 1 ? "" : "s"} ·{" "}
              {meta.submitters.length} submitter
              {meta.submitters.length === 1 ? "" : "s"}
            </span>
            <span>
              First proposed:{" "}
              {new Date(meta.first_proposed).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>
              Last updated:{" "}
              {new Date(meta.last_proposed).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </>
        )}
        {item.submittedBy && (
          <span className="font-mono">by {item.submittedBy}</span>
        )}
      </div>

      {/* Conflict warning */}
      {isConflict && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-amber-600 text-sm dark:text-amber-400">
            <span className="font-semibold">
              {conflictCount} conflicting field{conflictCount === 1 ? "" : "s"}
            </span>{" "}
            — two agents proposed different values. Select which to keep for
            each before approving.
          </p>
        </div>
      )}

      {/* Submitter notes */}
      {meta && meta.notes.length > 0 && (
        <div className="space-y-1 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <p className="font-semibold text-blue-500 text-xs uppercase tracking-wide">
            Submitter notes
          </p>
          {meta.notes.map((note, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: notes have no stable id
            <p className="text-muted-foreground text-sm" key={i}>
              {note}
            </p>
          ))}
        </div>
      )}

      {/* Diff (updates) or full data (new products) */}
      {item.isUpdate && meta && approvedProduct ? (
        <div className="space-y-2">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            Changes
          </p>
          <DiffSummary
            approvedProduct={approvedProduct}
            onResolutionChange={handleResolutionChange}
            pendingProduct={item.data}
            resolutions={resolutions}
            toolbaseMeta={meta}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            Product data
          </p>
          <pre className="overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed">
            {JSON.stringify(item.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex items-center gap-3 border-border border-t pt-4">
        <Button disabled={acting} onClick={() => act("approve")} size="sm">
          Approve
        </Button>
        <Button
          disabled={acting}
          onClick={() => act("reject")}
          size="sm"
          variant="destructive"
        >
          Reject
        </Button>
        {item.data.api.docs_url && (
          <a
            className="ml-auto text-muted-foreground text-xs transition-colors hover:text-foreground"
            href={item.data.api.docs_url}
            rel="noopener noreferrer"
            target="_blank"
          >
            Docs ↗
          </a>
        )}
      </div>
    </div>
  );
}
