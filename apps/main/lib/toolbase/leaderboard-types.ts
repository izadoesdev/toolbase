export type AgentAuthMode = "none" | "agent_key" | "human_login" | "unknown";

export type LeaderboardSort = "ease" | "popular" | "rating";

export interface LeaderboardEntry {
  agent_auth: AgentAuthMode;
  agent_ready: boolean;
  avg_rating: number | null;
  category: string;
  description: string;
  difficulty?: string;
  docs_url?: string;
  ease_score: number;
  has_free_tier: boolean;
  id: string;
  mcp_supported: boolean;
  name: string;
  pricing_model: string;
  review_count: number;
  setup_minutes?: number;
  tagline?: string;
}

export function sortLeaderboard(
  entries: LeaderboardEntry[],
  sort: LeaderboardSort
): LeaderboardEntry[] {
  const copy = [...entries];
  if (sort === "ease") {
    copy.sort((a, b) => b.ease_score - a.ease_score);
  } else if (sort === "popular") {
    copy.sort((a, b) => b.review_count - a.review_count);
  } else if (sort === "rating") {
    copy.sort(
      (a, b) =>
        (b.avg_rating ?? 0) * Math.log10(b.review_count + 1) -
        (a.avg_rating ?? 0) * Math.log10(a.review_count + 1)
    );
  }
  return copy;
}
