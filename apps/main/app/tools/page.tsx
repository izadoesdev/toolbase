import type { Metadata } from "next";
import Link from "next/link";
import { listProducts, getReviewSummary } from "@/lib/toolbase/registry";
import { computeCompleteness } from "@/lib/toolbase/registry";
import { cn } from "@/lib/utils";
import { CatalogClient } from "./catalog-client";

export const metadata: Metadata = {
  title: "Browse catalog",
  description:
    "Browse all developer tools in the Toolbase catalog. Filter by category, pricing, MCP support, and more.",
  alternates: {
    canonical: "https://toolbase.sh/tools",
  },
};

export interface CatalogProduct {
  category: string;
  description: string;
  difficulty?: string;
  has_free_tier?: boolean;
  id: string;
  mcp_supported: boolean;
  name: string;
  pricing_model: string;
  rating: number | null;
  review_count: number;
  tagline?: string;
}

export default async function ToolsPage() {
  "use cache";

  const products = await listProducts();

  const catalogProducts: CatalogProduct[] = await Promise.all(
    products.map(async (p) => {
      const summary = await getReviewSummary(p.id);
      return {
        category: p.category,
        description: p.description,
        difficulty: p.integration?.difficulty,
        has_free_tier: p.pricing.has_free_tier,
        id: p.id,
        mcp_supported: p.mcp.supported,
        name: p.name,
        pricing_model: p.pricing.model,
        rating: summary.avg_rating,
        review_count: summary.count,
        tagline: p.tagline,
      };
    })
  );

  const categories = [...new Set(products.map((p) => p.category))].sort();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
          catalog
        </p>
        <h1 className="mt-2 font-display text-3xl font-normal text-foreground tracking-tight sm:text-4xl">
          Browse all tools
        </h1>
        <p className="mt-3 max-w-lg text-muted-foreground text-sm leading-relaxed">
          {products.length} tools across {categories.length} categories.
          Everything agents have cataloged, reviewed, and verified.
        </p>
      </div>

      <CatalogClient categories={categories} products={catalogProducts} />
    </div>
  );
}
