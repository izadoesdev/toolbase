import { cacheLife, cacheTag } from "next/cache";
import type { AgentAuthMode, LeaderboardEntry } from "./leaderboard-types";
import { getReviewSummary } from "./reviews";
import type { Product } from "./schema";
import { listProducts } from "./search";

export type {
  AgentAuthMode,
  LeaderboardEntry,
  LeaderboardSort,
} from "./leaderboard-types";
export { sortLeaderboard } from "./leaderboard-types";

const AGENT_FRIENDLY_AUTH = new Set([
  "api_key",
  "jwt",
  "basic",
  "mutual_tls",
  "webhook_secret",
]);

export function getAgentAuthMode(product: Product): AgentAuthMode {
  const methods = product.auth?.methods;
  if (!methods || methods.length === 0) {
    return "unknown";
  }
  if (methods.includes("none")) {
    return "none";
  }
  if (methods.some((m) => AGENT_FRIENDLY_AUTH.has(m))) {
    return "agent_key";
  }
  return "human_login";
}

export function isAgentReady(product: Product): boolean {
  const mode = getAgentAuthMode(product);
  return mode === "none" || mode === "agent_key" || mode === "unknown";
}

interface EaseInputs {
  avgRating: number | null;
  product: Product;
  reviewCount: number;
}

export function computeEaseScore({
  product,
  avgRating,
  reviewCount,
}: EaseInputs): number {
  let score = 50;

  const difficulty = product.integration?.difficulty;
  if (difficulty === "low") {
    score += 18;
  } else if (difficulty === "high") {
    score -= 15;
  }

  const setup = product.integration?.typical_setup_minutes;
  if (setup !== undefined) {
    if (setup <= 10) {
      score += 10;
    } else if (setup <= 30) {
      score += 4;
    } else if (setup > 60) {
      score -= 6;
    }
  }

  if (product.mcp.supported) {
    score += 8;
  }
  if (product.pricing.has_free_tier) {
    score += 4;
  }
  if (product.integration?.cli?.available) {
    score += 2;
  }
  if (product.integration?.local_dev?.emulator) {
    score += 2;
  }
  if (product.agent?.ai_native) {
    score += 4;
  }

  const auth = getAgentAuthMode(product);
  if (auth === "none") {
    score += 14;
  } else if (auth === "agent_key") {
    score += 10;
  } else if (auth === "human_login") {
    score -= 22;
  }

  if (reviewCount > 0 && avgRating !== null) {
    score += (avgRating - 3) * 4;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", "reviews");

  const products = await listProducts();
  const summaries = await Promise.all(
    products.map((p) => getReviewSummary(p.id))
  );

  return products.map((product, i) => {
    const summary = summaries[i];
    const authMode = getAgentAuthMode(product);
    return {
      id: product.id,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      category: product.category,
      pricing_model: product.pricing.model,
      has_free_tier: product.pricing.has_free_tier ?? false,
      mcp_supported: product.mcp.supported,
      docs_url: product.api.docs_url,
      difficulty: product.integration?.difficulty,
      setup_minutes: product.integration?.typical_setup_minutes,
      agent_auth: authMode,
      agent_ready: isAgentReady(product),
      ease_score: computeEaseScore({
        product,
        avgRating: summary.avg_rating,
        reviewCount: summary.count,
      }),
      avg_rating: summary.avg_rating,
      review_count: summary.count,
    };
  });
}
