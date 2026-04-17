import type { SQL } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { catalogProduct } from "@/lib/db/schema";
import { buildEmbeddingDoc, embedDocument, embedQuery } from "./embed";
import type { QueryFilters, QueryHit, QueryPage, RelatedHit } from "./match";
import { findRelatedProducts, productToHit, queryProducts } from "./match";
import { getReviewSummary } from "./reviews";
import type { Product } from "./schema";
import { productSchema } from "./schema";

const WORD_SPLIT = /[\s_-]+/;
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function semanticMatchReasons(product: Product, query: string): string[] {
  const terms = query
    .toLowerCase()
    .split(WORD_SPLIT)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  if (terms.length === 0) {
    return [`semantic match for '${query}'`];
  }

  const hitCapabilities: string[] = [];
  const hitTags: string[] = [];
  let categoryMatched = false;
  let nameMatched = false;

  const name = product.name.toLowerCase();
  const category = product.category.toLowerCase();
  const subcategory = product.subcategory?.toLowerCase() ?? "";

  for (const term of terms) {
    if (name.includes(term)) {
      nameMatched = true;
    }
    if (category.includes(term) || subcategory.includes(term)) {
      categoryMatched = true;
    }
    for (const cap of product.capabilities) {
      const c = cap.toLowerCase().replaceAll("_", " ");
      if (c.includes(term) && !hitCapabilities.includes(cap)) {
        hitCapabilities.push(cap);
      }
    }
    for (const tag of product.tags) {
      const t = tag.toLowerCase();
      if (t.includes(term) && !hitTags.includes(tag)) {
        hitTags.push(tag);
      }
    }
  }

  const reasons: string[] = [];
  if (nameMatched) {
    reasons.push(`name matches '${query}'`);
  }
  if (categoryMatched) {
    reasons.push(`category '${product.category}' matches`);
  }
  if (hitCapabilities.length > 0) {
    reasons.push(`capability match: ${hitCapabilities.slice(0, 3).join(", ")}`);
  }
  if (hitTags.length > 0 && reasons.length < 3) {
    reasons.push(`tag match: ${hitTags.slice(0, 3).join(", ")}`);
  }
  if (reasons.length === 0) {
    reasons.push(`semantic match for '${query}'`);
  }
  return reasons.slice(0, 3);
}

export async function listProducts(opts?: {
  limit?: number;
  offset?: number;
}): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  const rows = await db
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.status, "approved"))
    .orderBy(catalogProduct.createdAt)
    .limit(opts?.limit ?? 1000)
    .offset(opts?.offset ?? 0);
  return rows.flatMap((r) => {
    const result = productSchema.safeParse(r.data);
    return result.success ? [result.data] : [];
  });
}

async function enrichWithReviews(hits: QueryHit[]): Promise<QueryHit[]> {
  const summaries = await Promise.all(
    hits.map((hit) => getReviewSummary(hit.id))
  );
  return hits.map((hit, i) => ({
    ...hit,
    avg_rating: summaries[i].avg_rating,
    review_count: summaries[i].count,
  }));
}

function applyReviewBoost(hits: QueryHit[]): QueryHit[] {
  const boosted = hits.map((hit) => {
    let boost = 0;
    const rc = hit.review_count ?? 0;
    const ar = hit.avg_rating ?? 0;
    if (rc > 0) {
      boost += 1;
    }
    if (ar >= 4 && rc >= 3) {
      boost += 2;
    }
    return { ...hit, score: hit.score + boost };
  });
  return boosted.sort((a, b) => b.score - a.score);
}

export async function searchProducts(
  query: string,
  filters?: QueryFilters
): Promise<QueryPage> {
  const trimmed = query.trim();

  if (process.env.VOYAGE_API_KEY && trimmed.length > 0) {
    try {
      const embedding = await embedQuery(trimmed);
      const page = await vectorSearchProducts(embedding, trimmed, filters);
      const enriched = await enrichWithReviews(page.hits);
      return {
        hits: applyReviewBoost(enriched),
        total: page.total,
      };
    } catch (err) {
      console.error(
        "[registry] Vector search failed, falling back to keyword search",
        err
      );
    }
  }

  const products = await listProducts();
  const page = queryProducts(trimmed, products, filters);
  const enriched = await enrichWithReviews(page.hits);
  return {
    hits: applyReviewBoost(enriched),
    total: page.total,
  };
}

async function vectorSearchProducts(
  embedding: number[],
  query: string,
  filters?: QueryFilters
): Promise<QueryPage> {
  const vecStr = `[${embedding.join(",")}]`;
  const limit = filters?.limit ?? 10;
  const offset = filters?.offset ?? 0;

  const conditions: SQL[] = [
    sql`status = 'approved'`,
    sql`embedding IS NOT NULL`,
  ];

  if (filters?.category) {
    conditions.push(sql`data->>'category' = ${filters.category}`);
  }
  if (filters?.mcp_only) {
    conditions.push(sql`(data->'mcp'->>'supported')::boolean = true`);
  }
  if (filters?.has_free_tier !== undefined) {
    conditions.push(
      sql`(data->'pricing'->>'has_free_tier')::boolean = ${filters.has_free_tier}`
    );
  }
  if (filters?.self_hostable !== undefined) {
    conditions.push(
      sql`(data->'hosting'->>'self_hostable')::boolean = ${filters.self_hostable}`
    );
  }
  if (filters?.open_source !== undefined) {
    conditions.push(
      sql`(data->'hosting'->>'open_source')::boolean = ${filters.open_source}`
    );
  }
  if (filters?.difficulty) {
    conditions.push(
      sql`data->'integration'->>'difficulty' = ${filters.difficulty}`
    );
  }
  if (filters?.sdk_language) {
    conditions.push(
      sql`data->'sdks' @> ${JSON.stringify([{ language: filters.sdk_language }])}::jsonb`
    );
  }
  if (filters?.compliance) {
    conditions.push(
      sql`data->'compliance'->'certifications' ? ${filters.compliance}`
    );
  }
  if (filters?.maturity) {
    conditions.push(sql`data->>'maturity' = ${filters.maturity}`);
  }

  const whereClause = sql.join(conditions, sql` AND `);
  const result = await db.execute<{
    id: string;
    data: unknown;
    score: string;
    total_count: string;
  }>(
    sql`SELECT id, data, 1 - (embedding <=> ${vecStr}::vector) AS score,
               COUNT(*) OVER() AS total_count
        FROM catalog_product
        WHERE ${whereClause}
        ORDER BY embedding <=> ${vecStr}::vector
        LIMIT ${limit}
        OFFSET ${offset}`
  );

  const total = result.rows[0]
    ? Number.parseInt(result.rows[0].total_count, 10)
    : 0;

  const hits = result.rows.flatMap((row) => {
    const parsed = productSchema.safeParse(row.data);
    if (!parsed.success) {
      return [];
    }
    const score = Number.parseFloat(row.score);
    return [
      productToHit(
        parsed.data,
        score,
        semanticMatchReasons(parsed.data, query)
      ),
    ];
  });

  return { hits, total };
}

export async function getRelatedProducts(
  id: string,
  limit = 8
): Promise<RelatedHit[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", `product:${id}`);
  if (process.env.VOYAGE_API_KEY) {
    try {
      const targetRes = await db.execute<{
        embedding: string | null;
        data: unknown;
      }>(
        sql`SELECT embedding, data FROM catalog_product
            WHERE id = ${id} AND status = 'approved' AND embedding IS NOT NULL
            LIMIT 1`
      );
      const targetRow = targetRes.rows[0];
      const embStr = targetRow?.embedding;
      const target = targetRow ? productSchema.safeParse(targetRow.data) : null;
      if (embStr && target?.success) {
        const result = await db.execute<{
          id: string;
          data: unknown;
          score: string;
        }>(
          sql`SELECT id, data, 1 - (embedding <=> ${embStr}::vector) AS score
              FROM catalog_product
              WHERE status = 'approved'
                AND id != ${id}
                AND embedding IS NOT NULL
              ORDER BY embedding <=> ${embStr}::vector
              LIMIT ${limit}`
        );
        const targetAlts = new Set(target.data.alternatives ?? []);
        const hits = result.rows.flatMap((row) => {
          const parsed = productSchema.safeParse(row.data);
          if (!parsed.success) {
            return [];
          }
          const p = parsed.data;
          let relation: RelatedHit["relation"] = "complementary";
          if (
            targetAlts.has(p.id) ||
            p.alternatives?.includes(target.data.id)
          ) {
            relation = "alternative";
          } else if (p.category === target.data.category) {
            relation = "same_category";
          }
          return [
            {
              category: p.category,
              description: p.description,
              id: p.id,
              mcp_supported: p.mcp.supported,
              name: p.name,
              pricing_model: p.pricing.model,
              relation,
              score: Number.parseFloat(row.score),
            } satisfies RelatedHit,
          ];
        });
        if (hits.length > 0) {
          return hits;
        }
      }
    } catch (err) {
      console.error(
        "[registry] Vector related search failed, falling back",
        err
      );
    }
  }

  const { getProduct } = await import("./products");
  const target = await getProduct(id);
  if (!target) {
    return [];
  }
  const allProducts = await listProducts();
  return findRelatedProducts(target, allProducts, limit);
}

export async function listCategories(): Promise<
  Array<{ category: string; count: number }>
> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  const products = await listProducts();
  const counts = new Map<string, number>();
  for (const p of products) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function triggerEmbedding(productId: string): Promise<void> {
  if (!process.env.VOYAGE_API_KEY) {
    return;
  }
  try {
    const { getProduct } = await import("./products");
    const product = await getProduct(productId);
    if (!product) {
      return;
    }
    const embedding = await embedDocument(buildEmbeddingDoc(product));
    const vecStr = `[${embedding.join(",")}]`;
    await db.execute(
      sql`UPDATE catalog_product
          SET embedding = ${vecStr}::vector, embedding_updated_at = now()
          WHERE id = ${productId}`
    );
  } catch (err) {
    console.error("[registry] Failed to embed product", productId, err);
  }
}
