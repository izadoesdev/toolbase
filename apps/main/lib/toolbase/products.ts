import { and, eq, inArray, like } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { uuidv7 } from "uuidv7";
import { db } from "@/lib/db";
import { catalogProduct } from "@/lib/db/schema";
import type { Product } from "./schema";
import { productSchema } from "./schema";
import { triggerEmbedding } from "./search";

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

export type UpdateResult =
  | { auto_approved: boolean; ok: true; update_id: string }
  | { error: string; ok: false };

export interface PendingProduct {
  createdAt: Date;
  data: Product;
  id: string;
  isUpdate: boolean;
  submittedBy: string | null;
  toolbaseMeta: ToolbaseMeta | null;
  updateFor: string | null;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  "use cache";
  cacheLife("minutes");
  const [row] = await db
    .select()
    .from(catalogProduct)
    .where(
      and(eq(catalogProduct.id, id), eq(catalogProduct.status, "approved"))
    );
  return row ? productSchema.parse(row.data) : undefined;
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
