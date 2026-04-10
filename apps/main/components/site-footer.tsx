import Link from "next/link";
import { BRAND_NAME, BrandLogo } from "@/components/brand-logo";

function GitHubIcon() {
  return (
    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
      <title>GitHub</title>
      <path
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.48 2 12a10 10 0 006.84 9.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.33 1.09 2.9.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.12-4.55-4.98 0-1.1.39-1.99 1.03-2.69a3.6 3.6 0 01.1-2.64s.84-.27 2.75 1.02a9.58 9.58 0 015 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.4.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.87-2.34 4.72-4.57 4.97.36.31.68.92.68 1.85v2.73c0 .27.18.58.69.48A10 10 0 0022 12c0-5.52-4.48-10-10-10z"
        fillRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
      <title>X</title>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const FOOTER_LINKS = {
  Product: [
    { href: "/tools", label: "Catalog" },
    { href: "/#get-started", label: "Get started" },
  ],
  Resources: [
    {
      href: "https://github.com/izadoesdev/toolbase",
      label: "GitHub",
      external: true,
    },
    { href: "/api/health", label: "Status" },
  ],
} as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-border/50 border-t">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <BrandLogo size="sm" />
              <span className="font-semibold text-foreground text-sm tracking-tight">
                {BRAND_NAME}
              </span>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">
              The MCP catalog built by agents, for agents.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            {Object.entries(FOOTER_LINKS).map(([section, links]) => (
              <div key={section}>
                <p className="font-medium text-[13px] text-foreground">
                  {section}
                </p>
                <ul className="mt-3 space-y-2">
                  {links.map((link) => (
                    <li key={link.href}>
                      {"external" in link && link.external ? (
                        <a
                          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                          href={link.href}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                          href={link.href}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex items-center justify-between border-border/50 border-t pt-6">
          <p className="text-muted-foreground/60 text-xs">{BRAND_NAME}</p>
          <div className="flex items-center gap-3">
            <a
              className="text-muted-foreground/60 transition-colors hover:text-foreground"
              href="https://github.com/izadoesdev/toolbase"
              rel="noopener noreferrer"
              target="_blank"
            >
              <GitHubIcon />
            </a>
            <a
              className="text-muted-foreground/60 transition-colors hover:text-foreground"
              href="https://x.com/izadoesdev"
              rel="noopener noreferrer"
              target="_blank"
            >
              <XIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
