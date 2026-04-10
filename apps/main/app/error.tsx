"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: globalThis.Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 w-fit rounded-xl border border-border bg-card px-6 py-4 font-mono text-xs">
          <p className="text-destructive">error</p>
          <p className="mt-1 text-muted-foreground">
            {error.message || "Something went wrong"}
          </p>
          {error.digest && (
            <p className="mt-1 text-muted-foreground/50">
              digest: {error.digest}
            </p>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Something broke. This has been logged.
        </p>
        <button
          className="mt-6 rounded-lg border border-border bg-card px-4 py-2 font-mono text-foreground text-xs transition-colors hover:bg-muted"
          onClick={reset}
          type="button"
        >
          try again
        </button>
      </div>
    </div>
  );
}
