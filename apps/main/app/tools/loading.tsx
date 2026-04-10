function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`}
    />
  );
}

export default function ToolsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-96" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton className="h-7 w-20 rounded-full" key={i} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton className="h-28 rounded-xl" key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
