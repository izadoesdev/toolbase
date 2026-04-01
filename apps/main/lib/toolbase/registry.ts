import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db } from "@/lib/db";
import {
  bugReport as bugReportTable,
  catalogProduct,
  review as reviewTable,
} from "@/lib/db/schema";
import type { QueryFilters } from "./match";
import { queryProducts } from "./match";
import type {
  BugReport,
  BugReportInput,
  Product,
  Review,
  ReviewInput,
} from "./schema";
import { bugReportSchema, productSchema, reviewSchema } from "./schema";

// ── Seed ───────────────────────────────────────────────────────────────────

let seedProducts: Product[] = [];
let seedLoaded = false;
let dbProducts: Product[] = []; // approved only

function loadSeed(): Product[] {
  const path = join(process.cwd(), "data", "products.json");
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("products.json must be an array");
  }
  return parsed.map((p) => productSchema.parse(p));
}

function ensureSeed(): void {
  if (seedLoaded) {
    return;
  }
  seedProducts = loadSeed();
  seedLoaded = true;
}

function allProducts(): Product[] {
  ensureSeed();
  const byId = new Map(seedProducts.map((p) => [p.id, p]));
  for (const p of dbProducts) {
    byId.set(p.id, p);
  }
  return [...byId.values()];
}

// ── Products ───────────────────────────────────────────────────────────────

export function listProducts(): Product[] {
  return allProducts();
}

export function getProduct(id: string): Product | undefined {
  return allProducts().find((p) => p.id === id);
}

export function searchProducts(query: string, filters?: QueryFilters) {
  return queryProducts(query, allProducts(), filters);
}

export async function addProductToDb(
  product: Product,
  submittedBy?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (allProducts().some((p) => p.id === product.id)) {
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

export async function loadDbProducts(): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(catalogProduct)
      .where(eq(catalogProduct.status, "approved"));
    dbProducts = rows.map((r) => productSchema.parse(r.data));
  } catch {
    dbProducts = [];
  }
}

// ── Admin ──────────────────────────────────────────────────────────────────

export interface PendingProduct {
  createdAt: Date;
  data: Product;
  id: string;
  submittedBy: string | null;
}

export async function listPendingProducts(): Promise<PendingProduct[]> {
  const rows = await db
    .select()
    .from(catalogProduct)
    .where(eq(catalogProduct.status, "processing"))
    .orderBy(catalogProduct.createdAt);

  return rows.map((r) => ({
    createdAt: r.createdAt,
    data: productSchema.parse(r.data),
    id: r.id,
    submittedBy: r.submittedBy,
  }));
}

export async function approveProduct(
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
    .set({ status: "approved" })
    .where(eq(catalogProduct.id, id));

  dbProducts = [...dbProducts, productSchema.parse(row.data)];
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

// ── Reviews ────────────────────────────────────────────────────────────────

export async function submitReview(
  input: ReviewInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!getProduct(input.product_id)) {
    return {
      ok: false,
      error: `No product with id "${input.product_id}". Use toolbase_search to find valid ids.`,
    };
  }

  const id = uuidv7();
  const data: Review = { ...input, id, submitted_at: new Date().toISOString() };

  await db
    .insert(reviewTable)
    .values({ id, productId: input.product_id, data });
  return { ok: true, id };
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
  } catch {
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

// ── Bug reports ────────────────────────────────────────────────────────────

export async function submitBugReport(
  input: BugReportInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!getProduct(input.product_id)) {
    return {
      ok: false,
      error: `No product with id "${input.product_id}". Use toolbase_search to find valid ids.`,
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
  return { ok: true, id };
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
  } catch {
    return [];
  }
}
