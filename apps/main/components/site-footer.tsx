import Link from "next/link";
import { BRAND_NAME } from "@/components/brand-logo";

const MCP_ENDPOINT = "https://toolbase.sh/api/mcp";

const COLUMNS: {
  label: string;
  links: { href: string; label: string; external?: boolean }[];
}[] = [
  {
    label: "Directory",
    links: [
      { href: "/tools", label: "Catalog" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/tools?agent=true", label: "Agent-runnable" },
      { href: "/tools?mcp=true", label: "MCP-native" },
    ],
  },
  {
    label: "For agents",
    links: [
      { href: MCP_ENDPOINT, label: "MCP endpoint", external: true },
      { href: "/api/schema", label: "Schema" },
      { href: "/#install", label: "Install" },
    ],
  },
  {
    label: "For humans",
    links: [
      { href: "/#install", label: "Get started" },
      {
        href: "https://github.com/izadoesdev/toolbase",
        label: "GitHub",
        external: true,
      },
      { href: "/api/health", label: "Status" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-[#262626] border-t bg-[#0a0a0a]">
      {/* ── Big endpoint block ── */}
      <div className="relative border-[#262626] border-b">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent_0%,#595959_50%,transparent_100%)]" />
        <div className="mx-auto flex w-full max-w-[1232px] flex-col gap-6 px-6 py-14 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[#9c9ca6] text-[11px] uppercase tracking-[0.25em]">
              MCP endpoint
            </span>
            <a
              className="flex items-center gap-3 font-mono text-[20px] text-white transition-colors hover:text-[#9ece6a] sm:text-[24px]"
              href={MCP_ENDPOINT}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span
                aria-hidden
                className="inline-block size-2 animate-pulse rounded-full bg-[#9ece6a]"
              />
              <span>{MCP_ENDPOINT}</span>
            </a>
          </div>
          <p className="max-w-sm text-[#9c9ca6] text-[14px] leading-[22px]">
            Tools agents run. No human required. Point your MCP client here and
            your agent can search, read, and review the directory on the first
            call.
          </p>
        </div>
      </div>

      {/* ── Columns ── */}
      <div className="mx-auto grid w-full max-w-[1232px] gap-12 px-6 py-14 sm:grid-cols-[1fr_2fr] md:grid-cols-[1fr_3fr]">
        <Brand />
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <Column col={col} key={col.label} />
          ))}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-[#262626] border-t">
        <div className="mx-auto flex w-full max-w-[1232px] flex-col-reverse items-start justify-between gap-4 px-6 py-6 sm:flex-row sm:items-center">
          <p className="font-mono text-[#595959] text-[11px] uppercase tracking-[0.25em]">
            © 2026 {BRAND_NAME} · agent-runnable
          </p>
          <div className="flex items-center gap-1">
            <Social
              href="https://github.com/izadoesdev/toolbase"
              label="GitHub"
            >
              <GitHubIcon />
            </Social>
            <Social href="https://x.com/izadoesdev" label="X">
              <XIcon />
            </Social>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Brand() {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-semibold text-[18px] text-white tracking-tight">
        {BRAND_NAME}
      </span>
      <p className="max-w-[240px] text-[#9c9ca6] text-[13px] leading-[20px]">
        A directory of developer APIs your agent can ship — end-to-end, no OAuth
        detours.
      </p>
    </div>
  );
}

function Column({
  col,
}: {
  col: {
    label: string;
    links: { href: string; label: string; external?: boolean }[];
  };
}) {
  return (
    <div className="flex flex-col gap-4">
      <span className="font-mono text-[#9c9ca6] text-[11px] uppercase tracking-[0.25em]">
        {col.label}
      </span>
      <ul className="flex flex-col gap-3">
        {col.links.map((l) =>
          l.external ? (
            <li key={l.label}>
              <a
                className="text-[13px] text-white transition-colors hover:text-[#9ece6a]"
                href={l.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {l.label}
              </a>
            </li>
          ) : (
            <li key={l.label}>
              <Link
                className="text-[13px] text-white transition-colors hover:text-[#9ece6a]"
                href={l.href}
              >
                {l.label}
              </Link>
            </li>
          )
        )}
      </ul>
    </div>
  );
}

function Social({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      aria-label={label}
      className="inline-flex size-9 items-center justify-center border border-transparent text-[#9c9ca6] transition-colors hover:border-[#262626] hover:text-white"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

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
