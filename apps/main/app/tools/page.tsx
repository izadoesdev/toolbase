import type { Metadata } from "next";
import type { AgentAuthMode } from "@/lib/toolbase/leaderboard";
import {
  computeEaseScore,
  getAgentAuthMode,
  isAgentReady,
} from "@/lib/toolbase/leaderboard";
import { getReviewSummary, listProducts } from "@/lib/toolbase/registry";
import { CatalogClient } from "./catalog-client";

export const metadata: Metadata = {
  title: "Browse catalog",
  description:
    "Browse every tool in the Toolbase registry. Filter to tools your agent can run end-to-end without a human in the loop.",
  alternates: {
    canonical: "https://toolbase.sh/tools",
  },
};

export interface CatalogProduct {
  agent_auth: AgentAuthMode;
  agent_ready: boolean;
  category: string;
  description: string;
  difficulty?: string;
  ease_score: number;
  has_free_tier?: boolean;
  id: string;
  mcp_endpoint: string | null;
  mcp_supported: boolean;
  name: string;
  pricing_model: string;
  rating: number | null;
  review_count: number;
  tagline?: string;
  auth_env_var?: string | null;
}

export default async function ToolsPage() {
  "use cache";

  const products = await listProducts();

  const catalogProducts: CatalogProduct[] = await Promise.all(
    products.map(async (p) => {
      const summary = await getReviewSummary(p.id);
      return {
        agent_auth: getAgentAuthMode(p),
        agent_ready: isAgentReady(p),
        category: p.category,
        description: p.description,
        difficulty: p.integration?.difficulty,
        ease_score: computeEaseScore({
          product: p,
          avgRating: summary.avg_rating,
          reviewCount: summary.count,
        }),
        has_free_tier: p.pricing.has_free_tier,
        id: p.id,
        mcp_endpoint: p.mcp.endpoint ?? null,
        mcp_supported: p.mcp.supported,
        name: p.name,
        auth_env_var: p.auth?.key_env_var ?? null,
        pricing_model: p.pricing.model,
        rating: summary.avg_rating,
        review_count: summary.count,
        tagline: p.tagline,
      };
    })
  );

  const categories = [...new Set(products.map((p) => p.category))].sort();
  const agentReadyCount = catalogProducts.filter((p) => p.agent_ready).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
          catalog
        </p>
        <h1 className="mt-2 font-display font-normal text-3xl text-foreground tracking-tight sm:text-4xl">
          Browse all tools
        </h1>
        <p className="mt-3 max-w-lg text-muted-foreground text-sm leading-relaxed">
          {products.length} tools across {categories.length} categories.{" "}
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {agentReadyCount} runnable end-to-end
          </span>{" "}
          by an agent — no human OAuth, no consent screen.
        </p>
      </div>

      <CatalogClient categories={categories} products={catalogProducts} />
    </div>
  );
}
