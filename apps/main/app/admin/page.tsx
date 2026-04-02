import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { QueueList } from "@/components/admin/queue-list";
import { auth } from "@/lib/auth";
import { listPendingProducts } from "@/lib/toolbase/registry";

export const metadata: Metadata = { title: "Admin · Review Queue" };

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const pending = await listPendingProducts();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="font-display font-semibold text-2xl text-foreground tracking-tight">
          Review queue
        </h1>
        {pending.length > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-muted-foreground text-xs">
            {pending.length}
          </span>
        )}
      </div>
      <QueueList initialPending={pending} />
    </main>
  );
}
