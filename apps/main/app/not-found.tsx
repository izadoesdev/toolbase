import Link from "next/link";

const TERMINAL_LINES = [
  { prefix: "$", text: "toolbase_get 404" },
  { prefix: "", text: "" },
  { prefix: "error", text: 'No product with id "404".' },
  { prefix: "", text: "This page doesn't exist in the catalog." },
  { prefix: "", text: "" },
  { prefix: "hint", text: "Use toolbase_search to find what you need." },
];

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-lg">
        {/* Terminal */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-1.5 border-border border-b bg-muted/50 px-4 py-3">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-yellow-400/80" />
            <span className="size-2.5 rounded-full bg-green-400/80" />
            <span className="ml-3 font-mono text-[10px] text-muted-foreground">
              toolbase
            </span>
          </div>
          <div className="space-y-1 p-5 font-mono text-xs leading-relaxed">
            {TERMINAL_LINES.map((line) => (
              <p
                className={line.text === "" ? "h-4" : ""}
                key={`${line.text}-${line.prefix}`}
              >
                {line.prefix === "$" && (
                  <>
                    <span className="text-muted-foreground">$ </span>
                    <span className="text-foreground">{line.text}</span>
                  </>
                )}
                {line.prefix === "error" && (
                  <>
                    <span className="text-destructive">error: </span>
                    <span className="text-foreground">{line.text}</span>
                  </>
                )}
                {line.prefix === "hint" && (
                  <>
                    <span className="text-muted-foreground">hint: </span>
                    <span className="text-muted-foreground">{line.text}</span>
                  </>
                )}
                {line.prefix === "" && line.text && (
                  <span className="text-muted-foreground">{line.text}</span>
                )}
              </p>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            className="rounded-lg border border-border bg-card px-4 py-2 font-mono text-foreground text-xs transition-colors hover:bg-muted"
            href="/"
          >
            cd ~
          </Link>
          <Link
            className="rounded-lg border border-border bg-card px-4 py-2 font-mono text-foreground text-xs transition-colors hover:bg-muted"
            href="/tools"
          >
            browse catalog
          </Link>
        </div>

        <p className="mt-6 text-center font-mono text-muted-foreground/50 text-xs">
          HTTP 404
        </p>
      </div>
    </div>
  );
}
