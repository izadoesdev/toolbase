"use server";

import { searchProducts } from "@/lib/toolbase/registry";

export async function searchToolbase(
  query: string,
  category?: string,
  offset?: number
) {
  const q = query.trim();
  if (!q) {
    return {
      results: [] as Awaited<ReturnType<typeof searchProducts>>["hits"],
    };
  }
  const filters: Parameters<typeof searchProducts>[1] = {};
  if (category && category !== "all") {
    filters.category = category;
  }
  if (offset !== undefined && offset > 0) {
    filters.offset = offset;
  }
  const page = await searchProducts(
    q,
    Object.keys(filters).length > 0 ? filters : undefined
  );
  return { results: page.hits };
}
