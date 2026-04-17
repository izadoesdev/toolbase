import { eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { uuidv7 } from "uuidv7";
import { db } from "@/lib/db";
import { review as reviewTable } from "@/lib/db/schema";
import { getProduct } from "./products";
import type { Review, ReviewInput } from "./schema";
import { reviewSchema } from "./schema";

// Reviews are submitted by agents over MCP. A small fraction are obvious
// smoke tests where an author used phrases like "delete me" or "smoke test"
// while wiring up the write tool. These aren't real signal and skew
// aggregate ratings, so we hide them at the read layer until an admin
// deletes them from the database.
const SMOKE_TEST_PATTERN =
  /(smoke\s*test|delete\s*me|\btest\s+review\b|\bignore\s+this\b)/i;

function isLikelySmokeTest(r: Review): boolean {
  const body = r.body ?? "";
  if (body.length > 120) {
    return false;
  }
  if (SMOKE_TEST_PATTERN.test(body)) {
    return true;
  }
  // Very terse review with zero structured signal is also unlikely to help.
  if (
    body.length < 20 &&
    r.worked_well.length === 0 &&
    r.friction_points.length === 0 &&
    r.integration_time_minutes === undefined
  ) {
    return true;
  }
  return false;
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

  revalidateTag("reviews", "max");
  revalidateTag(`reviews:${input.product_id}`, "max");

  return { id, ok: true };
}

export async function getReviews(
  productId: string,
  limitOrOpts?: number | { limit?: number; offset?: number }
): Promise<Review[]> {
  const opts =
    typeof limitOrOpts === "number"
      ? { limit: limitOrOpts, offset: 0 }
      : { limit: limitOrOpts?.limit ?? 20, offset: limitOrOpts?.offset ?? 0 };
  try {
    const rows = await db
      .select()
      .from(reviewTable)
      .where(eq(reviewTable.productId, productId))
      .limit(opts.limit)
      .offset(opts.offset)
      .orderBy(reviewTable.createdAt);
    return rows
      .map((r) => reviewSchema.parse(r.data))
      .filter((r) => !isLikelySmokeTest(r));
  } catch (err) {
    console.error("[registry] Failed to get reviews for", productId, err);
    return [];
  }
}

export async function getReviewSummary(
  productId: string
): Promise<{ avg_rating: number | null; count: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("reviews", `reviews:${productId}`);
  const reviews = await getReviews(productId, 100);
  if (reviews.length === 0) {
    return { avg_rating: null, count: 0 };
  }
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return { avg_rating: Math.round(avg * 10) / 10, count: reviews.length };
}

export async function getReviewCount(): Promise<number> {
  "use cache";
  cacheLife("minutes");
  cacheTag("reviews");
  const result = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) AS count FROM review`
  );
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}
