import { eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { uuidv7 } from "uuidv7";
import { db } from "@/lib/db";
import { review as reviewTable } from "@/lib/db/schema";
import { getProduct } from "./products";
import type { Review, ReviewInput } from "./schema";
import { reviewSchema } from "./schema";

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
    return rows.map((r) => reviewSchema.parse(r.data));
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
