import type { SQL } from "drizzle-orm";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db } from "@/lib/db";
import {
  bugReport as bugReportTable,
  catalogProduct,
  review as reviewTable,
} from "@/lib/db/schema";
import { buildEmbeddingDoc, embedDocument, embedQuery } from "./embed";
import type { QueryFilters, RelatedHit } from "./match";
import { findRelatedProducts, productToHit, queryProducts } from "./match";
import type {
  BugReport,
  BugReportInput,
  Product,
  Review,
  ReviewInput,
} from "./schema";
import { bugReportSchema, productSchema, reviewSchema } from "./schema";

const RATE_LIMIT_MAX_PENDING = 30;
const AUTO_APPROVE_VOTES = 3;

const HIGH_RISK_KEYS = new Set(["id", "maturity", "name", "sunset_date"]);
const MEDIUM_RISK_KEYS = new Set([
  "category",
  "company",
  "description",
  "pricing",
]);

export interface ToolbaseMeta {
  conflicts: Record<string, { current: unknown; proposed: unknown }>;
  fields_added: string[];
  fields_changed: string[];
  first_proposed: string;
  last_proposed: string;
  notes: string[];
  risk: "high" | "low" | "medium";
  submitters: string[];
  vote_count: number;
}

type UpdateResult =
  | { auto_approved: boolean; ok: true; update_id: string }
  | { error: string; ok: false };

export async function listProducts(): Promise<Product[]> {
  const rows = await db
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.status, "approved"))
    .orderBy(catalogProduct.createdAt);
  return rows.flatMap((r) => {
    const result = productSchema.safeParse(r.data);
    return result.success ? [result.data] : [];
  });
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const [row] = await db
    .select()
    .from(catalogProduct)
    .where(
      and(eq(catalogProduct.id, id), eq(catalogProduct.status, "approved"))
    );
  return row ? productSchema.parse(row.data) : undefined;
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
        LIMIT ${limit}`
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

async function triggerEmbedding(productId: string): Promise<void> {
  if (!process.env.VOYAGE_API_KEY) {
    return;
  }
  try {
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

  const target = await getProduct(id);
  if (!target) {
    return [];
  }
  const allProducts = await listProducts();
  return findRelatedProducts(target, allProducts, limit);
}

export function computeCompleteness(p: Product): number {
  const checks = [
    !!p.tagline,
    (p.use_cases?.length ?? 0) > 0,
    (p.sdks?.length ?? 0) > 0,
    !!p.auth?.key_env_var,
    !!p.integration?.difficulty,
    (p.integration?.env_vars?.length ?? 0) > 0,
    p.pricing.has_free_tier !== undefined,
    !!p.pricing.free_tier_limits,
    p.hosting?.self_hostable !== undefined,
    (p.compliance?.certifications?.length ?? 0) > 0,
    !!p.agent?.notes,
    !!p.agent?.rate_limit_strategy,
    !!p.api.type,
    !!p.maturity,
    p.pricing.overage_behavior !== undefined,
    p.integration?.webhooks?.supported !== undefined,
    !!p.company?.name,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function classifyRisk(
  patch: Record<string, unknown>,
  original: Product,
  conflicts: Record<string, unknown>
): "high" | "low" | "medium" {
  if (Object.keys(conflicts).length > 0) {
    return "high";
  }
  const orig = original as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    if (key === "_toolbase_meta" || key === "meta") {
      continue;
    }
    if (HIGH_RISK_KEYS.has(key)) {
      return "high";
    }
    if (MEDIUM_RISK_KEYS.has(key) && orig[key] !== undefined) {
      return "medium";
    }
  }
  return "low";
}

function buildSubmitters(
  existing: string[],
  submittedBy: string | undefined
): string[] {
  if (!submittedBy) {
    return existing;
  }
  return [...new Set([...existing, submittedBy])];
}

function buildToolbaseMeta(
  original: Product,
  patch: Record<string, unknown>,
  existing: ToolbaseMeta | null,
  submittedBy: string | undefined,
  now: string,
  conflicts: Record<string, { current: unknown; proposed: unknown }>
): ToolbaseMeta {
  const orig = original as Record<string, unknown>;
  const keys = Object.keys(patch).filter(
    (k) => k !== "_toolbase_meta" && k !== "meta"
  );
  const newAdded = keys.filter((k) => orig[k] === undefined);
  const newChanged = keys.filter((k) => orig[k] !== undefined);

  return {
    conflicts,
    fields_added: existing
      ? [...new Set([...existing.fields_added, ...newAdded])]
      : newAdded,
    fields_changed: existing
      ? [...new Set([...existing.fields_changed, ...newChanged])]
      : newChanged,
    first_proposed: existing?.first_proposed ?? now,
    last_proposed: now,
    notes: existing?.notes ?? [],
    risk: classifyRisk(patch, original, conflicts),
    submitters: buildSubmitters(existing?.submitters ?? [], submittedBy),
    vote_count: (existing?.vote_count ?? 0) + 1,
  };
}

function mergePatchIntoProduct(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
  updateForId: string
): Record<string, unknown> {
  const merged = deepMerge(base, patch);
  const existingMeta =
    typeof merged.meta === "object" && merged.meta !== null
      ? (merged.meta as Record<string, unknown>)
      : {};
  return { ...merged, meta: { ...existingMeta, update_for: updateForId } };
}

async function applyUpdateToOriginal(
  updateRowId: string,
  product: Product,
  originalId: string
): Promise<void> {
  const { update_for: _removed, ...metaWithout } = product.meta ?? {};
  const stripped: Product = {
    ...product,
    meta: Object.keys(metaWithout).length > 0 ? metaWithout : undefined,
  };
  await db
    .update(catalogProduct)
    .set({ data: stripped })
    .where(eq(catalogProduct.id, originalId));
  await db.delete(catalogProduct).where(eq(catalogProduct.id, updateRowId));
}

export async function addProductToDb(
  product: Product,
  submittedBy?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [existing] = await db
    .select({ id: catalogProduct.id })
    .from(catalogProduct)
    .where(eq(catalogProduct.id, product.id));

  if (existing) {
    return { ok: false, error: `Product id "${product.id}" already exists` };
  }

  await db.insert(catalogProduct).values({
    id: product.id,
    data: product,
    status: "processing",
    submittedBy: submittedBy ?? null,
  });

  return { ok: true };
}

export async function proposeProductUpdate(
  id: string,
  patch: Record<string, unknown>,
  submittedBy?: string
): Promise<UpdateResult> {
  const existing = await getProduct(id);
  if (!existing) {
    return {
      error: `No approved product with id "${id}". Use toolbase_search to find valid ids.`,
      ok: false,
    };
  }

  if (submittedBy) {
    const pendingRows = await db
      .select({ id: catalogProduct.id })
      .from(catalogProduct)
      .where(
        and(
          eq(catalogProduct.submittedBy, submittedBy),
          inArray(catalogProduct.status, ["processing", "update_pending"])
        )
      );
    if (pendingRows.length >= RATE_LIMIT_MAX_PENDING) {
      return {
        error: `Rate limit: you have ${pendingRows.length} pending proposals. Wait for some to be resolved before submitting more.`,
        ok: false,
      };
    }
  }

  const now = new Date().toISOString();

  const [existingUpdateRow] = await db
    .select()
    .from(catalogProduct)
    .where(
      and(
        eq(catalogProduct.status, "update_pending"),
        like(catalogProduct.id, `${id}__update__%`)
      )
    );

  if (existingUpdateRow) {
    return collapseIntoExistingUpdate(
      existingUpdateRow,
      existing,
      id,
      patch,
      submittedBy,
      now
    );
  }

  return createNewUpdateRow(existing, id, patch, submittedBy, now);
}

async function collapseIntoExistingUpdate(
  updateRow: { data: unknown; id: string; submittedBy: string | null },
  original: Product,
  id: string,
  patch: Record<string, unknown>,
  submittedBy: string | undefined,
  now: string
): Promise<UpdateResult> {
  const rawData = updateRow.data as Record<string, unknown>;
  const existingMeta =
    (rawData._toolbase_meta as ToolbaseMeta | undefined) ?? null;

  const conflicts: Record<string, { current: unknown; proposed: unknown }> = {
    ...(existingMeta?.conflicts ?? {}),
  };
  for (const [key, value] of Object.entries(patch)) {
    if (key === "_toolbase_meta" || key === "meta") {
      continue;
    }
    const currentVal = rawData[key];
    if (
      currentVal !== undefined &&
      JSON.stringify(currentVal) !== JSON.stringify(value) &&
      !conflicts[key]
    ) {
      conflicts[key] = { current: currentVal, proposed: value };
    }
  }

  const toolbaseMeta = buildToolbaseMeta(
    original,
    patch,
    existingMeta,
    submittedBy,
    now,
    conflicts
  );
  const parsed = productSchema.safeParse(
    mergePatchIntoProduct(rawData, patch, id)
  );

  if (!parsed.success) {
    return {
      error: `Patch produces an invalid product: ${parsed.error.message}`,
      ok: false,
    };
  }

  await db
    .update(catalogProduct)
    .set({
      data: { ...parsed.data, _toolbase_meta: toolbaseMeta },
      submittedBy: submittedBy ?? updateRow.submittedBy,
    })
    .where(eq(catalogProduct.id, updateRow.id));

  if (
    toolbaseMeta.risk === "low" &&
    toolbaseMeta.vote_count >= AUTO_APPROVE_VOTES &&
    Object.keys(toolbaseMeta.conflicts).length === 0
  ) {
    await applyUpdateToOriginal(updateRow.id, parsed.data, id);
    await triggerEmbedding(id);
    return { auto_approved: true, ok: true, update_id: updateRow.id };
  }

  return { auto_approved: false, ok: true, update_id: updateRow.id };
}

async function createNewUpdateRow(
  original: Product,
  id: string,
  patch: Record<string, unknown>,
  submittedBy: string | undefined,
  now: string
): Promise<UpdateResult> {
  const toolbaseMeta = buildToolbaseMeta(
    original,
    patch,
    null,
    submittedBy,
    now,
    {}
  );
  const parsed = productSchema.safeParse(
    mergePatchIntoProduct(original as Record<string, unknown>, patch, id)
  );

  if (!parsed.success) {
    return {
      error: `Patch produces an invalid product: ${parsed.error.message}`,
      ok: false,
    };
  }

  const updateId = `${id}__update__${uuidv7()}`;

  await db.insert(catalogProduct).values({
    id: updateId,
    data: { ...parsed.data, _toolbase_meta: toolbaseMeta },
    status: "update_pending",
    submittedBy: submittedBy ?? null,
  });

  return { auto_approved: false, ok: true, update_id: updateId };
}

export interface PendingProduct {
  createdAt: Date;
  data: Product;
  id: string;
  isUpdate: boolean;
  submittedBy: string | null;
  toolbaseMeta: ToolbaseMeta | null;
  updateFor: string | null;
}

export async function listPendingProducts(): Promise<PendingProduct[]> {
  const rows = await db
    .select()
    .from(catalogProduct)
    .where(inArray(catalogProduct.status, ["processing", "update_pending"]))
    .orderBy(catalogProduct.createdAt);

  return rows.flatMap((r) => {
    const rawData = r.data as Record<string, unknown>;
    const result = productSchema.safeParse(rawData);
    if (!result.success) {
      return [];
    }
    return [
      {
        createdAt: r.createdAt,
        data: result.data,
        id: r.id,
        isUpdate: r.status === "update_pending",
        submittedBy: r.submittedBy,
        toolbaseMeta:
          (rawData._toolbase_meta as ToolbaseMeta | undefined) ?? null,
        updateFor: (result.data.meta?.update_for as string | undefined) ?? null,
      },
    ];
  });
}

export async function getPendingProduct(
  id: string
): Promise<PendingProduct | undefined> {
  const [r] = await db
    .select()
    .from(catalogProduct)
    .where(
      and(
        eq(catalogProduct.id, id),
        inArray(catalogProduct.status, ["processing", "update_pending"])
      )
    );
  if (!r) {
    return undefined;
  }
  const rawData = r.data as Record<string, unknown>;
  const result = productSchema.safeParse(rawData);
  if (!result.success) {
    return undefined;
  }
  return {
    createdAt: r.createdAt,
    data: result.data,
    id: r.id,
    isUpdate: r.status === "update_pending",
    submittedBy: r.submittedBy,
    toolbaseMeta: (rawData._toolbase_meta as ToolbaseMeta | undefined) ?? null,
    updateFor: (result.data.meta?.update_for as string | undefined) ?? null,
  };
}

async function applyConflictResolutions(
  base: Product,
  originalId: string,
  conflicts: Record<string, { current: unknown; proposed: unknown }>,
  resolutions: Record<string, "current" | "proposed">
): Promise<Product> {
  const orig = await getProduct(originalId);
  if (!orig) {
    return base;
  }
  const origRecord = orig as Record<string, unknown>;
  const overrides: Record<string, unknown> = {};
  for (const [field, choice] of Object.entries(resolutions)) {
    if (choice === "current" && field in conflicts) {
      overrides[field] = origRecord[field];
    }
  }
  if (Object.keys(overrides).length === 0) {
    return base;
  }
  return productSchema.parse({ ...base, ...overrides });
}

export async function approveProduct(
  id: string,
  resolutions?: Record<string, "current" | "proposed">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.id, id));

  if (!row) {
    return { ok: false, error: `No product with id "${id}"` };
  }

  if (row.status === "update_pending") {
    const rawData = row.data as Record<string, unknown>;
    const parsed = productSchema.safeParse(rawData);
    const originalId = parsed.success
      ? (parsed.data.meta?.update_for ?? null)
      : null;
    if (originalId && parsed.success) {
      const meta = rawData._toolbase_meta as ToolbaseMeta | undefined;
      const resolvedData =
        resolutions && meta
          ? await applyConflictResolutions(
              parsed.data,
              originalId,
              meta.conflicts,
              resolutions
            )
          : parsed.data;
      await applyUpdateToOriginal(id, resolvedData, originalId);
      await triggerEmbedding(originalId);
      return { ok: true };
    }
  }

  await db
    .update(catalogProduct)
    .set({ status: "approved" })
    .where(eq(catalogProduct.id, id));
  await triggerEmbedding(id);
  return { ok: true };
}

export async function rejectProduct(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.id, id));

  if (!row) {
    return { ok: false, error: `No product with id "${id}"` };
  }

  await db
    .update(catalogProduct)
    .set({ status: "rejected" })
    .where(eq(catalogProduct.id, id));
  return { ok: true };
}

export async function submitReview(
  input: ReviewInput
): Promise<{ id: string; ok: true } | { error: string; ok: false }> {
  if (!(await getProduct(input.product_id))) {
    return {
      error: `No product with id "${input.product_id}". Use toolbase_search to find valid ids.`,
      ok: false,
    };
  }

  const id = uuidv7();
  const data: Review = { ...input, id, submitted_at: new Date().toISOString() };
  await db
    .insert(reviewTable)
    .values({ id, productId: input.product_id, data });
  return { id, ok: true };
}

export async function getReviews(
  productId: string,
  limit = 20
): Promise<Review[]> {
  try {
    const rows = await db
      .select()
      .from(reviewTable)
      .where(eq(reviewTable.productId, productId))
      .limit(limit)
      .orderBy(reviewTable.createdAt);
    return rows.map((r) => reviewSchema.parse(r.data));
  } catch (err) {
    console.error("[registry] Failed to get reviews for", productId, err);
    return [];
  }
}

export async function getReviewSummary(
  productId: string
): Promise<{ avg_rating: number | null; count: number }> {
  const reviews = await getReviews(productId, 100);
  if (reviews.length === 0) {
    return { avg_rating: null, count: 0 };
  }
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return { avg_rating: Math.round(avg * 10) / 10, count: reviews.length };
}

export async function submitBugReport(
  input: BugReportInput
): Promise<{ id: string; ok: true } | { error: string; ok: false }> {
  if (!(await getProduct(input.product_id))) {
    return {
      error: `No product with id "${input.product_id}". Use toolbase_search to find valid ids.`,
      ok: false,
    };
  }

  const id = uuidv7();
  const data: BugReport = {
    ...input,
    id,
    submitted_at: new Date().toISOString(),
  };
  await db
    .insert(bugReportTable)
    .values({ id, productId: input.product_id, data });
  return { id, ok: true };
}

export async function getBugReports(
  productId: string,
  limit = 20
): Promise<BugReport[]> {
  try {
    const rows = await db
      .select()
      .from(bugReportTable)
      .where(eq(bugReportTable.productId, productId))
      .limit(limit)
      .orderBy(bugReportTable.createdAt);
    return rows.map((r) => bugReportSchema.parse(r.data));
  } catch (err) {
    console.error("[registry] Failed to get bug reports for", productId, err);
    return [];
  }
}

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const baseVal = result[key];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      baseVal !== null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
