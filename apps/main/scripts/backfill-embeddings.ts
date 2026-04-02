/**
 * Backfill embeddings for all approved products that don't have one yet.
 *
 * Prerequisites:
 *   1. Enable pgvector:  psql -c "CREATE EXTENSION IF NOT EXISTS vector;"
 *   2. Push schema:      bun run db:push  (adds embedding + embedding_updated_at columns)
 *   3. Set VOYAGE_API_KEY in .env
 *
 * Run with:
 *   bunx tsx scripts/backfill-embeddings.ts
 *
 * After backfill, create the HNSW index for fast ANN search:
 *   psql $DATABASE_URL -c "CREATE INDEX CONCURRENTLY ON catalog_product USING hnsw (embedding vector_cosine_ops);"
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../../../.env") });

import { Pool } from "pg";
import { buildEmbeddingDoc, embedDocumentsBatch } from "../lib/toolbase/embed";
import { productSchema } from "../lib/toolbase/schema";

if (!process.env.VOYAGE_API_KEY) {
  console.error("Error: VOYAGE_API_KEY is not set");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query<{ id: string; data: unknown }>(
  "SELECT id, data FROM catalog_product WHERE status = 'approved' AND embedding IS NULL"
);

console.log(`Found ${rows.length} products without embeddings`);

if (rows.length === 0) {
  await pool.end();
  process.exit(0);
}

const products = rows.flatMap((r) => {
  const parsed = productSchema.safeParse(r.data);
  return parsed.success ? [{ id: r.id, product: parsed.data }] : [];
});

console.log(`Embedding ${products.length} valid products...`);

const docs = products.map(({ product }) => buildEmbeddingDoc(product));
const embeddings = await embedDocumentsBatch(docs);

let updated = 0;
for (let i = 0; i < products.length; i++) {
  const { id } = products[i];
  const vecStr = `[${embeddings[i].join(",")}]`;
  await pool.query(
    "UPDATE catalog_product SET embedding = $1::vector, embedding_updated_at = now() WHERE id = $2",
    [vecStr, id]
  );
  updated++;
  if (updated % 10 === 0 || updated === products.length) {
    process.stdout.write(`\r${updated}/${products.length}`);
  }
}

console.log(`\nDone. Embedded ${updated} products.`);
console.log("\nNext: create the HNSW index for fast search:");
console.log(
  '  psql $DATABASE_URL -c "CREATE INDEX CONCURRENTLY ON catalog_product USING hnsw (embedding vector_cosine_ops);"'
);

await pool.end();
