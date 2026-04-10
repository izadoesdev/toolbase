import type { SQL } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogProduct } from "@/lib/db/schema";
import { buildEmbeddingDoc, embedDocument, embedQuery } from "./embed";
import type { QueryFilters, RelatedHit } from "./match";
import { findRelatedProducts, productToHit, queryProducts } from "./match";
import type { Product } from "./schema";
import { productSchema } from "./schema";

export async function listProducts(
  opts?: { limit?: number; offset?: number }
): Promise<Product[]> {
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

export async function searchProducts(
  query: string,
  filters?: QueryFilters
): Promise<ReturnType<typeof queryProducts>> {
  if (process.env.VOYAGE_API_KEY) {
    try {
      const embedding = await embedQuery(query);
      return vectorSearchProducts(embedding, query, filters);
    } catch (err) {
      console.error(
        "[registry] Vector search failed, falling back to keyword search",
        err
      );
    }
  }
  const products = await listProducts();
  return queryProducts(query, products, filters);
}

async function vectorSearchProducts(
  embedding: number[],
  query: string,
  filters?: QueryFilters
): Promise<ReturnType<typeof queryProducts>> {
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
  const result = await db.execute<{ id: string; data: unknown; score: string }>(
    sql`SELECT id, data, 1 - (embedding <=> ${vecStr}::vector) AS score
        FROM catalog_product
        WHERE ${whereClause}
        ORDER BY embedding <=> ${vecStr}::vector
        LIMIT ${limit}
        OFFSET ${offset}`
  );

  return result.rows.flatMap((row) => {
    const parsed = productSchema.safeParse(row.data);
    if (!parsed.success) {
      return [];
    }
    const score = Number.parseFloat(row.score);
    return [
      productToHit(parsed.data, score, [`semantic match for '${query}'`]),
    ];
  });
}

export async function getRelatedProducts(
  id: string,
  limit = 8
): Promise<RelatedHit[]> {
  if (process.env.VOYAGE_API_KEY) {
    try {
      const embResult = await db.execute<{ embedding: string | null }>(
        sql`SELECT embedding FROM catalog_product
            WHERE id = ${id} AND status = 'approved' AND embedding IS NOT NULL
            LIMIT 1`
      );
      const embStr = embResult.rows[0]?.embedding;
      if (embStr) {
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
        const hits = result.rows.flatMap((row) => {
          const parsed = productSchema.safeParse(row.data);
          if (!parsed.success) {
            return [];
          }
          const p = parsed.data;
          return [
            {
              category: p.category,
              description: p.description,
              id: p.id,
              mcp_supported: p.mcp.supported,
              name: p.name,
              pricing_model: p.pricing.model,
              relation: "complementary" as const,
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
