import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db } from "@/lib/db";
import { bugReport as bugReportTable } from "@/lib/db/schema";
import { getProduct } from "./products";
import type { BugReport, BugReportInput } from "./schema";
import { bugReportSchema } from "./schema";

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
  limitOrOpts?: number | { limit?: number; offset?: number }
): Promise<BugReport[]> {
  const opts =
    typeof limitOrOpts === "number"
      ? { limit: limitOrOpts, offset: 0 }
      : { limit: limitOrOpts?.limit ?? 20, offset: limitOrOpts?.offset ?? 0 };
  try {
    const rows = await db
      .select()
      .from(bugReportTable)
      .where(eq(bugReportTable.productId, productId))
      .limit(opts.limit)
      .offset(opts.offset)
      .orderBy(bugReportTable.createdAt);
    return rows.map((r) => bugReportSchema.parse(r.data));
  } catch (err) {
    console.error("[registry] Failed to get bug reports for", productId, err);
    return [];
  }
}
