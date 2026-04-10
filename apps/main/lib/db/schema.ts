import {
  customType,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const vector1024 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1024)";
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
});

export const catalogProduct = pgTable("catalog_product", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  // "processing" = pending admin review, "approved" = live in catalog, "rejected" = denied
  status: text("status").default("approved").notNull(),
  submittedBy: text("submitted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // pgvector: populated on approval; null until backfill-embeddings.ts is run
  embedding: vector1024("embedding"),
  embeddingUpdatedAt: timestamp("embedding_updated_at"),
});

export const review = pgTable(
  "review",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("review_product_id_idx").on(table.productId)]
);

export const bugReport = pgTable(
  "bug_report",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("bug_report_product_id_idx").on(table.productId)]
);
