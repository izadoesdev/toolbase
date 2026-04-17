"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  LeaderboardEntry,
  LeaderboardSort,
} from "@/lib/toolbase/leaderboard-types";
import { sortLeaderboard } from "@/lib/toolbase/leaderboard-types";
import { cn } from "@/lib/utils";

interface Props {
  entries: LeaderboardEntry[];
  initialSort?: LeaderboardSort;
  limit?: number;
  showRank?: boolean;
}

const SORTS: { value: LeaderboardSort; label: string; hint: string }[] = [
  { value: "ease", label: "Ease of use", hint: "lowest friction first" },
  { value: "popular", label: "Most reviewed", hint: "agent-popular" },
  { value: "rating", label: "Top rated", hint: "rating × volume" },
];

const AUTH_LABEL: Record<string, string> = {
  none: "no auth",
  agent_key: "api key",
  human_login: "human oauth",
  unknown: "unknown",
};

const AUTH_TONE: Record<string, string> = {
  none: "text-[#9ece6a]",
  agent_key: "text-[#7aa2f7]",
  human_login: "text-[#e0af68]",
  unknown: "text-[#595959]",
};

function toneForScore(score: number): string {
  if (score >= 75) {
    return "bg-[#9ece6a]";
  }
  if (score >= 55) {
    return "bg-[#7aa2f7]";
  }
  return "bg-[#e0af68]";
}

function easeBar(score: number) {
  const w = `${Math.max(4, score)}%`;
  const tone = toneForScore(score);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden bg-[#262626]">
        <div className={cn("h-full", tone)} style={{ width: w }} />
      </div>
      <span className="font-mono text-white text-xs tabular-nums">{score}</span>
    </div>
  );
}

export function LeaderboardTable({
  entries,
  initialSort = "ease",
  limit,
  showRank = true,
}: Props) {
  const [sort, setSort] = useState<LeaderboardSort>(initialSort);
  const [agentOnly, setAgentOnly] = useState(false);

  let filtered = entries;
  if (agentOnly) {
    filtered = filtered.filter((e) => e.agent_ready);
  }
  const sorted = sortLeaderboard(filtered, sort);
  const visible = limit ? sorted.slice(0, limit) : sorted;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-0">
          {SORTS.map((s) => (
            <button
              className={cn(
                "-ml-px border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors first:ml-0",
                sort === s.value
                  ? "border-[#9ece6a] bg-[#9ece6a] text-[#0a0a0a]"
                  : "border-[#262626] bg-transparent text-[#9c9ca6] hover:border-[#595959] hover:text-white"
              )}
              key={s.value}
              onClick={() => setSort(s.value)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 font-mono text-[#9c9ca6] text-[11px] uppercase tracking-wider">
          <input
            checked={agentOnly}
            className="size-3.5 accent-[#9ece6a]"
            onChange={(e) => setAgentOnly(e.target.checked)}
            type="checkbox"
          />
          Agent-runnable only
        </label>
      </div>

      <div className="relative overflow-hidden border border-[#262626] bg-[#0a0a0a]">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent_0%,#595959_50%,transparent_100%)]" />
        <table className="w-full text-left text-sm">
          <thead className="border-[#262626] border-b bg-[#0d0d0d]">
            <tr className="font-mono text-[#9c9ca6] text-[10px] uppercase tracking-widest">
              {showRank && <th className="w-10 px-4 py-2.5">#</th>}
              <th className="px-4 py-2.5">Tool</th>
              <th className="hidden px-4 py-2.5 sm:table-cell">Auth</th>
              <th className="px-4 py-2.5">Ease</th>
              <th className="px-4 py-2.5">Reviews</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-[#595959] text-xs"
                  colSpan={showRank ? 5 : 4}
                >
                  No tools match this filter yet.
                </td>
              </tr>
            ) : (
              visible.map((e, i) => (
                <tr
                  className="border-[#262626] border-b transition-colors last:border-b-0 hover:bg-[#111]"
                  key={e.id}
                >
                  {showRank && (
                    <td className="px-4 py-3 font-mono text-[#595959] text-xs tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link
                      className="group flex flex-col gap-0.5"
                      href={`/tools/${e.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white group-hover:underline">
                          {e.name}
                        </span>
                        {e.mcp_supported && (
                          <span className="border border-[#262626] bg-[#111] px-1.5 py-px font-mono text-[#9c9ca6] text-[9px] uppercase tracking-wider">
                            MCP
                          </span>
                        )}
                        {e.agent_ready && (
                          <span
                            className="flex items-center gap-1 font-mono text-[#9ece6a] text-[9px] uppercase tracking-wider"
                            title="Agent can complete the integration without a human in the loop"
                          >
                            <span className="inline-block size-1.5 bg-[#9ece6a]" />
                            agent-ready
                          </span>
                        )}
                      </div>
                      <span className="line-clamp-1 text-[#9c9ca6] text-xs">
                        {e.tagline ?? e.description}
                      </span>
                    </Link>
                  </td>
                  <td
                    className={cn(
                      "hidden px-4 py-3 font-mono text-xs sm:table-cell",
                      AUTH_TONE[e.agent_auth] ?? "text-[#9c9ca6]"
                    )}
                  >
                    {AUTH_LABEL[e.agent_auth]}
                  </td>
                  <td className="px-4 py-3">{easeBar(e.ease_score)}</td>
                  <td className="px-4 py-3 text-[#9c9ca6] text-xs">
                    {e.review_count > 0 ? (
                      <>
                        <span className="font-medium text-white">
                          {e.avg_rating?.toFixed(1)}
                        </span>{" "}
                        · {e.review_count}
                      </>
                    ) : (
                      <span className="text-[#595959]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
