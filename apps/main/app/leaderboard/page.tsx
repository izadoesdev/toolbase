import type { Metadata } from "next";
import { LeaderboardTable } from "@/components/home/leaderboard-table";
import { getLeaderboard } from "@/lib/toolbase/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Every tool in the Toolbase registry, ranked by ease-of-use score and agent popularity. Filter to tools your agent can run end-to-end.",
  alternates: {
    canonical: "https://toolbase.sh/leaderboard",
  },
};

export default async function LeaderboardPage() {
  "use cache";

  const entries = await getLeaderboard();
  const agentReady = entries.filter((e) => e.agent_ready).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
          leaderboard
        </p>
        <h1 className="mt-2 font-display font-normal text-3xl text-foreground tracking-tight sm:text-4xl">
          The full ranking
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground text-sm leading-relaxed">
          {entries.length} tools, {agentReady} runnable end-to-end by an agent
          (no human OAuth, no consent screen). The{" "}
          <span className="font-medium text-foreground">ease score</span>{" "}
          combines auth model, setup time, MCP support, and review signal.
          Switch to{" "}
          <span className="font-medium text-foreground">most reviewed</span> to
          see what agents are actually shipping with.
        </p>
      </div>
      <LeaderboardTable entries={entries} initialSort="ease" />
    </div>
  );
}
