import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReviewDetail } from "@/components/admin/review-detail";
import { auth } from "@/lib/auth";
import { getPendingProduct, getProduct } from "@/lib/toolbase/registry";

export const metadata: Metadata = { title: "Admin · Review" };

const TYPE_LABEL = {
  conflict: "CONFLICT",
  new: "NEW",
  update: "UPDATE",
} as const;

const TYPE_CLASS = {
  conflict: "bg-red-500/10 text-red-500",
  new: "bg-emerald-500/10 text-emerald-500",
  update: "bg-blue-500/10 text-blue-500",
} as const;

const RISK_CLASS = {
  high: "bg-red-500/10 text-red-500",
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/10 text-amber-500",
} as const;

export default async function AdminReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  const item = await getPendingProduct(id);
  if (!item) {
    notFound();
  }

  const approvedProduct =
    item.isUpdate && item.updateFor ? await getProduct(item.updateFor) : null;

  const conflictCount = item.toolbaseMeta
    ? Object.keys(item.toolbaseMeta.conflicts).length
    : 0;
  let type: "conflict" | "new" | "update" = "new";
  if (conflictCount > 0) {
    type = "conflict";
  } else if (item.isUpdate) {
    type = "update";
  }
  const risk = item.toolbaseMeta?.risk ?? null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-3">
        <Link
          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          href="/admin"
        >
          ← Back to queue
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display font-semibold text-2xl text-foreground tracking-tight">
            {item.data.name}
          </h1>
          <span className="font-mono text-muted-foreground text-sm">
            {item.data.id}
          </span>
          <span
            className={`rounded px-2 py-0.5 font-mono font-semibold text-xs ${TYPE_CLASS[type]}`}
          >
            {TYPE_LABEL[type]}
          </span>
          {risk && (
            <span className={`rounded px-2 py-0.5 text-xs ${RISK_CLASS[risk]}`}>
              {risk} risk
            </span>
          )}
        </div>
        {item.data.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {item.data.description}
          </p>
        )}
      </div>

      <ReviewDetail approvedProduct={approvedProduct ?? null} item={item} />
    </main>
  );
}
