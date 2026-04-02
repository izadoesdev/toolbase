"use server";

import { searchProducts } from "@/lib/toolbase/registry";

export async function searchToolbase(query: string, category?: string) {
  const q = query.trim();
  if (!q) {
    return { results: [] as Awaited<ReturnType<typeof searchProducts>> };
  }
  const filters = category && category !== "all" ? { category } : undefined;
  return { results: await searchProducts(q, filters) };
}
