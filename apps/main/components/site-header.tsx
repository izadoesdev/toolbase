import Link from "next/link";
import { SessionControls } from "@/components/auth/session-controls";
import { BRAND_NAME, BrandLogo } from "@/components/brand-logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-border/50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-8 px-4 sm:px-6">
        <Link
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
          href="/"
        >
          <BrandLogo size="sm" />
          <span className="font-semibold text-foreground text-sm tracking-tight">
            {BRAND_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            href="/tools"
          >
            Catalog
          </Link>
          <Link
            className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            href="/leaderboard"
          >
            Leaderboard
          </Link>
          <a
            className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            href="https://github.com/izadoesdev/toolbase"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </nav>

        <div className="ml-auto">
          <SessionControls />
        </div>
      </div>
    </header>
  );
}
