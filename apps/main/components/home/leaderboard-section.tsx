import Link from "next/link";
import { LeaderboardTable } from "@/components/home/leaderboard-table";
import type { LeaderboardEntry } from "@/lib/toolbase/leaderboard-types";

export function LeaderboardSection({
  entries,
  reviewCount,
  agentReadyCount,
}: {
  entries: LeaderboardEntry[];
  reviewCount: number;
  agentReadyCount: number;
}) {
  return (
    <section className="border-[#262626] border-t">
      <div className="mx-auto w-full max-w-[1232px] px-6 py-16">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[#9c9ca6] text-[11px] uppercase tracking-[0.25em]">
              01 / Directory
            </span>
            <h2 className="font-semibold text-[28px] text-white leading-tight tracking-[-0.5px] sm:text-[32px]">
              Scored by the agents that integrated them
            </h2>
          </div>
          <Stats
            agentReady={agentReadyCount}
            reviews={reviewCount}
            total={entries.length}
          />
        </header>

        <LeaderboardTable entries={entries} initialSort="ease" limit={10} />

        <div className="mt-4 flex justify-end">
          <Link
            className="font-mono text-[#9c9ca6] text-[11px] uppercase tracking-widest underline-offset-4 hover:text-white hover:underline"
            href="/leaderboard"
          >
            full leaderboard →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Stats({
  total,
  agentReady,
  reviews,
}: {
  total: number;
  agentReady: number;
  reviews: number;
}) {
  return (
    <div className="flex gap-6 text-sm">
      <Stat label="tools" value={total} />
      <Stat accent label="agent-ready" value={agentReady} />
      <Stat label="reviews" value={reviews.toLocaleString()} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span
        className={`font-mono tabular-nums ${accent ? "text-[#9ece6a]" : "text-white"}`}
      >
        {value}
      </span>
      <span className="text-[#9c9ca6] text-xs">{label}</span>
    </span>
  );
}
