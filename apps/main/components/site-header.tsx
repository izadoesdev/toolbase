import Link from "next/link";
import { SessionControls } from "@/components/auth/session-controls";
import { BRAND_NAME, BrandLogo } from "@/components/brand-logo";

const NAV_LINKS = [
  { href: "/tools", label: "Browse" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-border border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-90"
          href="/"
        >
          <BrandLogo size="sm" />
          <span className="font-display font-semibold text-base text-foreground tracking-tight">
            {BRAND_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>

        <SessionControls />
      </div>
    </header>
  );
}
