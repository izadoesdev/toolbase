"use server";

import { searchProducts } from "@/lib/toolbase/registry";

// biome-ignore lint/suspicious/useAwait: Next.js Server Actions must be async
export async function searchToolbase(query: string) {
  const q = query.trim();
  if (!q) {
    return { results: [] as ReturnType<typeof searchProducts> };
  }
  return { results: searchProducts(q) };
}
