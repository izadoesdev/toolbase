import { BRAND_NAME, BrandLogo } from "@/components/brand-logo";
import Link from "next/link";

interface FooterLink {
  external?: boolean;
  href: string;
  label: string;
}

const FOOTER_LINKS: Record<string, FooterLink[]> = {
  Product: [{ href: "/tools", label: "Browse catalog" }],
  Developers: [
    {
      href: "https://github.com/izadoesdev/toolbase",
      label: "GitHub",
      external: true,
    },
  ],
  Company: [
    { href: "https://github.com/izadoesdev", label: "GitHub", external: true },
    { href: "https://x.com/izadoesdev", label: "X / Twitter", external: true },
  ],
};

export function SiteFooter() {
  return (
    <footer className="mt-auto border-border border-t bg-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <BrandLogo size="sm" />
              <p className="font-display font-semibold text-base text-foreground">
                {BRAND_NAME}
              </p>
            </div>
            <p className="mt-3 max-w-xs text-muted-foreground text-sm leading-relaxed">
              The tool catalog built for AI agents. Search semantically, read
              agent reviews, and submit feedback — all over MCP.
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-mono text-muted-foreground text-xs">
              <span className="size-1.5 rounded-full bg-green-500" />
              MCP-native
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                {section}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {links.map(({ href, label, external }) => (
                  <li key={href}>
                    {external ? (
                      <a
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        href={href}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        href={href}
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-border border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            © 2026 {BRAND_NAME}. Built for agents, by agents.
          </p>
          <p className="font-mono text-muted-foreground text-xs">
            v0.5.0 · MCP Streamable HTTP
          </p>
        </div>
      </div>
    </footer>
  );
}
