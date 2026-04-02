import type { Product } from "./schema";

const WORD_SPLIT = /[\s_-]+/;

export interface QueryHit {
  alternatives?: string[];
  capabilities: string[];
  category: string;
  description: string;
  difficulty?: "low" | "medium" | "high";
  docs_url: string;
  has_free_tier?: boolean;
  id: string;
  key_env_var?: string;
  match_reason: string;
  maturity?: string;
  mcp_supported: boolean;
  name: string;
  open_source?: boolean;
  pricing_model: string;
  requires_card?: boolean;
  score: number;
  sdk_languages?: string[];
  self_hostable?: boolean;
  subcategory?: string;
  tagline?: string;
  use_cases?: string[];
}

export interface QueryFilters {
  category?: string;
  compliance?: string;
  difficulty?: "low" | "medium" | "high";
  has_free_tier?: boolean;
  limit?: number;
  maturity?: string;
  mcp_only?: boolean;
  open_source?: boolean;
  sdk_language?: string;
  self_hostable?: boolean;
}

const FIELD_WEIGHTS = {
  name: 5,
  category: 4,
  capability: 3,
  use_case: 2,
  tag: 2,
  description: 1,
} as const;

const STRONG_MATCH_THRESHOLD = FIELD_WEIGHTS.capability;

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
    ...(p.subcategory
      ? [
          {
            label: "category" as const,
            words: [p.subcategory.toLowerCase()],
            text: p.subcategory.toLowerCase(),
          },
        ]
      : []),
    ...(p.tagline
      ? [
          {
            label: "description" as const,
            words: p.tagline.toLowerCase().split(WORD_SPLIT),
            text: p.tagline.toLowerCase(),
          },
        ]
      : []),
    ...p.capabilities.map((c) => ({
      label: "capability" as const,
      words: c.toLowerCase().split(WORD_SPLIT),
      text: c.replaceAll("_", " ").toLowerCase(),
    })),
    ...p.tags.map((t) => ({
      label: "tag" as const,
      words: t.toLowerCase().split(WORD_SPLIT),
      text: t.toLowerCase(),
    })),
    ...(p.use_cases ?? []).map((uc) => ({
      label: "use_case" as const,
      words: uc.toLowerCase().split(WORD_SPLIT),
      text: uc.toLowerCase(),
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

export function productToHit(
  product: Product,
  score: number,
  reasons: string[]
): QueryHit {
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
    ...(product.tagline !== undefined && { tagline: product.tagline }),
    ...(product.subcategory !== undefined && {
      subcategory: product.subcategory,
    }),
    ...(product.maturity !== undefined && { maturity: product.maturity }),
    ...(product.pricing.has_free_tier !== undefined && {
      has_free_tier: product.pricing.has_free_tier,
    }),
    ...(product.pricing.requires_card !== undefined && {
      requires_card: product.pricing.requires_card,
    }),
    ...(product.hosting?.self_hostable !== undefined && {
      self_hostable: product.hosting.self_hostable,
    }),
    ...(product.hosting?.open_source !== undefined && {
      open_source: product.hosting.open_source,
    }),
    ...(product.integration?.difficulty !== undefined && {
      difficulty: product.integration.difficulty,
    }),
    ...(product.sdks &&
      product.sdks.length > 0 && {
        sdk_languages: product.sdks.map((s) => s.language),
      }),
    ...(product.auth?.key_env_var !== undefined && {
      key_env_var: product.auth.key_env_var,
    }),
    ...(product.use_cases &&
      product.use_cases.length > 0 && { use_cases: product.use_cases }),
    ...(product.alternatives &&
      product.alternatives.length > 0 && {
        alternatives: product.alternatives,
      }),
  };
}

function scoreTerm(
  term: string,
  fields: ScoredField[]
): { label: FieldLabel | ""; weight: number } {
  let bestWeight = 0;
  let bestLabel: FieldLabel | "" = "";
  for (const field of fields) {
    if (
      termMatchesField(term, field) &&
      FIELD_WEIGHTS[field.label] > bestWeight
    ) {
      bestWeight = FIELD_WEIGHTS[field.label];
      bestLabel = field.label;
    }
  }
  return { weight: bestWeight, label: bestLabel };
}

function applyFilters(
  products: readonly Product[],
  filters?: QueryFilters
): readonly Product[] {
  let result = products;
  if (filters?.category) {
    const cat = filters.category.toLowerCase();
    result = result.filter((p) => p.category.toLowerCase() === cat);
  }
  if (filters?.mcp_only) {
    result = result.filter((p) => p.mcp.supported);
  }
  if (filters?.has_free_tier !== undefined) {
    result = result.filter(
      (p) => p.pricing.has_free_tier === filters.has_free_tier
    );
  }
  if (filters?.self_hostable !== undefined) {
    result = result.filter(
      (p) => p.hosting?.self_hostable === filters.self_hostable
    );
  }
  if (filters?.open_source !== undefined) {
    result = result.filter(
      (p) => p.hosting?.open_source === filters.open_source
    );
  }
  if (filters?.difficulty) {
    result = result.filter(
      (p) => p.integration?.difficulty === filters.difficulty
    );
  }
  if (filters?.sdk_language) {
    const lang = filters.sdk_language.toLowerCase();
    result = result.filter((p) =>
      p.sdks?.some((s) => s.language.toLowerCase() === lang)
    );
  }
  if (filters?.compliance) {
    const cert = filters.compliance.toLowerCase();
    result = result.filter((p) =>
      p.compliance?.certifications?.some((c) => c.toLowerCase() === cert)
    );
  }
  if (filters?.maturity) {
    result = result.filter((p) => p.maturity === filters.maturity);
  }
  return result;
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

  const filtered = applyFilters(products, filters);
  const scored: QueryHit[] = [];

  for (const p of filtered) {
    const fields = scoredFields(p);
    let totalScore = 0;
    const reasons: string[] = [];
    let allTermsMatched = true;
    let anyStrongMatch = false;

    for (const term of terms) {
      const { weight, label } = scoreTerm(term, fields);
      if (weight === 0) {
        allTermsMatched = false;
        break;
      }
      totalScore += weight;
      reasons.push(`${label} matches '${term}'`);
      if (weight >= STRONG_MATCH_THRESHOLD) {
        anyStrongMatch = true;
      }
    }

    if (!(allTermsMatched && anyStrongMatch)) {
      continue;
    }

    scored.push(productToHit(p, totalScore, [...new Set(reasons)].slice(0, 4)));
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, filters?.limit ?? 10);
}

export interface RelatedHit {
  category: string;
  description: string;
  id: string;
  mcp_supported: boolean;
  name: string;
  pricing_model: string;
  relation: "alternative" | "complementary" | "same_category";
  score: number;
}

export function findRelatedProducts(
  target: Product,
  allProducts: readonly Product[],
  limit = 8
): RelatedHit[] {
  const targetTagSet = new Set(target.tags.map((t) => t.toLowerCase()));
  const targetCapSet = new Set(target.capabilities.map((c) => c.toLowerCase()));
  const targetAlts = new Set(target.alternatives ?? []);

  const results: RelatedHit[] = [];

  for (const p of allProducts) {
    if (p.id === target.id) {
      continue;
    }

    let score = 0;
    let relation: RelatedHit["relation"] = "complementary";

    if (targetAlts.has(p.id) || p.alternatives?.includes(target.id)) {
      score += 10;
      relation = "alternative";
    }

    if (p.category === target.category) {
      score += 4;
      if (relation !== "alternative") {
        relation = "same_category";
      }
    }

    score += p.tags.filter((t) => targetTagSet.has(t.toLowerCase())).length;
    score += p.capabilities.filter((c) =>
      targetCapSet.has(c.toLowerCase())
    ).length;

    if (score === 0) {
      continue;
    }

    results.push({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      pricing_model: p.pricing.model,
      mcp_supported: p.mcp.supported,
      relation,
      score,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
