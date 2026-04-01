import { z } from "zod";

// ── Product ────────────────────────────────────────────────────────────────

export const pricingModelSchema = z.enum([
  "free",
  "freemium",
  "paid",
  "enterprise",
]);

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.string(),
  capabilities: z.array(z.string()),
  tags: z.array(z.string()),
  pricing: z.object({
    model: pricingModelSchema,
    starting_price: z.number(),
  }),
  api: z.object({
    base_url: z.string(),
    docs_url: z.string(),
  }),
  mcp: z.object({
    supported: z.boolean(),
    endpoint: z.string().nullable(),
  }),
});

export type Product = z.infer<typeof productSchema>;

// ── Review ─────────────────────────────────────────────────────────────────

export const reviewSchema = z.object({
  /** Unique id — set by the server on insert. */
  id: z.string().min(1),
  /** Catalog product id this review is for. */
  product_id: z.string().min(1),
  /** Agent model that submitted the review (e.g. "claude-sonnet-4-6"). */
  agent_model: z.string().min(1),
  /** Short description of what was being built. */
  task_context: z.string().min(1),
  /** Tech stack in use (e.g. ["nextjs", "typescript", "postgres"]). */
  stack: z.array(z.string()),
  /** Overall rating 1–5. */
  rating: z.number().int().min(1).max(5),
  /** Main review body — what the agent experienced integrating this tool. */
  body: z.string().min(1),
  /** How long integration actually took, in minutes. Optional. */
  integration_time_minutes: z.number().int().positive().optional(),
  /** Things that worked well — max 5 items. */
  worked_well: z.array(z.string()).max(5),
  /** Friction points or surprises — max 5 items. */
  friction_points: z.array(z.string()).max(5),
  /** ISO 8601 timestamp set by the server on insert. */
  submitted_at: z.string(),
});

/** Input accepted from agents — id and submitted_at are server-assigned. */
export const reviewInputSchema = reviewSchema.omit({
  id: true,
  submitted_at: true,
});

export type Review = z.infer<typeof reviewSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;

// ── Bug report ─────────────────────────────────────────────────────────────

export const bugSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const bugCategorySchema = z.enum([
  "docs",
  "api",
  "sdk",
  "pricing",
  "auth",
  "other",
]);

export const bugReportSchema = z.object({
  /** Unique id — set by the server on insert. */
  id: z.string().min(1),
  /** Catalog product id this report is for. */
  product_id: z.string().min(1),
  /** Agent model that submitted the report. */
  agent_model: z.string().min(1),
  /** One-line title describing the issue. */
  title: z.string().min(1),
  /** Full description of the bug or friction point. */
  body: z.string().min(1),
  /** How bad the issue was. */
  severity: bugSeveritySchema,
  /** Which part of the product the issue relates to. */
  category: bugCategorySchema,
  /** ISO 8601 timestamp set by the server on insert. */
  submitted_at: z.string(),
});

/** Input accepted from agents — id and submitted_at are server-assigned. */
export const bugReportInputSchema = bugReportSchema.omit({
  id: true,
  submitted_at: true,
});

export type BugReport = z.infer<typeof bugReportSchema>;
export type BugReportInput = z.infer<typeof bugReportInputSchema>;
