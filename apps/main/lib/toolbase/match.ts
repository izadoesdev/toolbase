import type { Product } from "./schema";

const WORD_SPLIT = /[\s_]+/;

export interface QueryHit {
  capabilities: string[];
  category: string;
  description: string;
  docs_url: string;
  id: string;
  match_reason: string;
  mcp_supported: boolean;
  name: string;
  pricing_model: string;
  score: number;
}

export interface QueryFilters {
  category?: string;
  limit?: number;
  mcp_only?: boolean;
}

const FIELD_WEIGHTS = {
  name: 5,
  category: 4,
  capability: 3,
  tag: 2,
  description: 1,
} as const;

type FieldLabel = keyof typeof FIELD_WEIGHTS;

interface ScoredField {
  label: FieldLabel;
  text: string;
  words: string[];
}

function scoredFields(p: Product): ScoredField[] {
  return [
    {
      label: "name",
      words: p.name.toLowerCase().split(WORD_SPLIT),
      text: p.name.toLowerCase(),
    },
    {
      label: "description",
      words: p.description.toLowerCase().split(WORD_SPLIT),
      text: p.description.toLowerCase(),
    },
    {
      label: "category",
      words: [p.category.toLowerCase()],
      text: p.category.toLowerCase(),
    },
    ...p.capabilities.map((c) => ({
      label: "capability" as const,
      words: c.toLowerCase().split(WORD_SPLIT),
      text: c.replaceAll("_", " ").toLowerCase(),
    })),
    ...p.tags.map((t) => ({
      label: "tag" as const,
      words: [t.toLowerCase()],
      text: t.toLowerCase(),
    })),
  ];
}

function termMatchesField(term: string, field: ScoredField): boolean {
  if (field.text.includes(term)) {
    return true;
  }
  if (term.length >= 3) {
    return field.words.some((w) => w.startsWith(term));
  }
  return false;
}

function toHit(product: Product, score: number, reasons: string[]): QueryHit {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    capabilities: product.capabilities,
    mcp_supported: product.mcp.supported,
    pricing_model: product.pricing.model,
    docs_url: product.api.docs_url,
    match_reason: reasons.join("; "),
    score,
  };
}

export function queryProducts(
  query: string,
  products: readonly Product[],
  filters?: QueryFilters
): QueryHit[] {
  const terms = query.toLowerCase().trim().split(WORD_SPLIT).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }

  let filtered = products;
  if (filters?.category) {
    const cat = filters.category.toLowerCase();
    filtered = filtered.filter((p) => p.category.toLowerCase() === cat);
  }
  if (filters?.mcp_only) {
    filtered = filtered.filter((p) => p.mcp.supported);
  }

  const scored: { hit: QueryHit }[] = [];

  for (const p of filtered) {
    const fields = scoredFields(p);
    let score = 0;
    const reasons: string[] = [];

    for (const term of terms) {
      let bestWeight = 0;
      let bestLabel = "";

      for (const field of fields) {
        if (
          termMatchesField(term, field) &&
          FIELD_WEIGHTS[field.label] > bestWeight
        ) {
          bestWeight = FIELD_WEIGHTS[field.label];
          bestLabel = field.label;
        }
      }

      if (bestWeight > 0) {
        score += bestWeight;
        reasons.push(`${bestLabel} matches '${term}'`);
      }
    }

    if (score > 0) {
      scored.push({ hit: toHit(p, score, [...new Set(reasons)].slice(0, 4)) });
    }
  }

  scored.sort((a, b) => b.hit.score - a.hit.score);

  const limit = filters?.limit ?? 10;
  return scored.slice(0, limit).map((s) => s.hit);
}
