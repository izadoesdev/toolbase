import Link from "next/link";
import { CopyButton } from "@/components/home/copy-button";
import { HeroCodeCard } from "@/components/home/hero-code-card";
import type { LeaderboardEntry } from "@/lib/toolbase/leaderboard-types";

const MCP_URL = "https://toolbase.sh/api/mcp";

export function Hero({
  top,
  agentReadyCount,
}: {
  top?: LeaderboardEntry;
  agentReadyCount: number;
}) {
  return (
    <section className="mx-auto w-full max-w-[1232px] px-6 pt-14 pb-24">
      <div className="flex flex-col items-start gap-12 lg:flex-row lg:justify-between">
        <Copy />
        <div className="flex w-full max-w-[512px] flex-col gap-3">
          <HeroCodeCard />
          <LiveTop agentReadyCount={agentReadyCount} top={top} />
        </div>
      </div>
    </section>
  );
}

function Copy() {
  return (
    <div className="flex w-full max-w-[512px] flex-col gap-6">
      <div className="flex w-max items-center gap-3 bg-[#111] px-3 py-2 font-medium font-mono text-[#9c9ca6] text-[14px] uppercase leading-5">
        <span aria-hidden className="inline-block size-[14px] bg-[#9ece6a]" />
        <span>Agent-runnable · no human oauth</span>
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="max-w-[480px] font-semibold text-[clamp(40px,7vw,60px)] text-white leading-[1.05] tracking-[-1.5px]">
          Tools agents run.{" "}
          <span className="text-[#9c9ca6]">No human required.</span>
        </h1>
        <p className="max-w-[512px] text-[#9c9ca6] text-[18px] leading-[27px]">
          A directory of developer APIs your agent can authenticate, use, and
          ship — end-to-end. Scored by the agents that used them.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex gap-6">
          <a
            className="inline-flex h-12 items-center justify-center whitespace-nowrap bg-[#9ece6a] px-6 font-medium font-mono text-[#0a0a0a] text-[16px] uppercase tracking-[0.02em] transition-colors hover:bg-[#b5df83]"
            href="#install"
          >
            Install MCP
          </a>
          <Link
            className="relative inline-flex h-12 items-center justify-center whitespace-nowrap px-6 font-medium font-mono text-[16px] text-white uppercase tracking-[0.02em] transition-colors before:absolute before:inset-0 before:border before:border-[#9c9ca6] hover:text-[#9ece6a] hover:before:border-[#9ece6a]"
            href="/tools"
          >
            Browse directory
          </Link>
        </div>

        <div className="flex w-full max-w-[512px] items-center justify-between gap-3 border border-[#262626] bg-[#060606] px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[#595959] text-[10px] uppercase tracking-[0.2em]">
              Agent endpoint
            </p>
            <code className="mt-0.5 block truncate font-mono text-[#e5e5e5] text-[13px] tracking-[0.01em]">
              {MCP_URL}
            </code>
          </div>
          <CopyButton text={MCP_URL} />
        </div>

        <p className="text-[#9c9ca6] text-[13px] leading-5 tracking-[0.01em]">
          <span className="text-[#9ece6a]">●</span> API key or no auth — never
          human OAuth. Built for agents and the humans shipping them.
        </p>
      </div>
    </div>
  );
}

function LiveTop({
  top,
  agentReadyCount,
}: {
  top?: LeaderboardEntry;
  agentReadyCount: number;
}) {
  return (
    <div className="relative w-full overflow-hidden border border-[#262626] bg-[#0a0a0a]">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent_0%,#595959_50%,transparent_100%)]" />
      <div className="flex h-12 items-center justify-between border-[#262626] border-b px-6 font-mono text-[14px] leading-5">
        <span className="text-[#a8a8a8]">Top ranked · live</span>
        <span className="flex items-center gap-2 text-[#595959] text-[12px]">
          <span className="inline-block size-1.5 animate-pulse rounded-full bg-[#9ece6a]" />
          <span className="uppercase tracking-wider">
            {agentReadyCount} agent-ready
          </span>
        </span>
      </div>
      {top && (
        <>
          <div className="flex items-center justify-between border-[#262626] border-b px-6 py-3">
            <Link
              className="flex min-w-0 items-center gap-2"
              href={`/tools/${top.id}`}
            >
              <span className="font-medium text-white">{top.name}</span>
              {top.mcp_supported && (
                <span className="border border-[#262626] bg-[#111] px-1.5 py-px font-mono text-[#9c9ca6] text-[10px] uppercase tracking-wider">
                  MCP
                </span>
              )}
              <span className="line-clamp-1 text-[#9c9ca6] text-[13px]">
                {top.tagline ?? top.description}
              </span>
            </Link>
            <span className="shrink-0 font-mono text-[#9ece6a] text-[14px] tabular-nums">
              ★ {top.avg_rating?.toFixed(1) ?? "—"}
            </span>
          </div>
          <dl className="flex items-center gap-6 px-6 py-4 font-mono text-[12px]">
            <Stat label="ease" value={String(top.ease_score)} />
            <Stat label="reviews" value={String(top.review_count)} />
            <Stat label="auth" value={top.agent_auth} />
          </dl>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 text-[#595959]">
      <dt>{label}</dt>
      <dd className="text-[#9c9ca6] tabular-nums">{value}</dd>
    </div>
  );
}
