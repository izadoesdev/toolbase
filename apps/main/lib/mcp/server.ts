import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { AnySchema } from "@modelcontextprotocol/sdk/server/zod-compat";
import { z } from "zod/v4";
import {
  addProductToDb,
  getBugReports,
  getProduct,
  getReviewSummary,
  getReviews,
  listProducts,
  searchProducts,
  submitBugReport,
  submitReview,
} from "@/lib/toolbase/registry";
import type { Product } from "@/lib/toolbase/schema";
import {
  bugCategorySchema,
  bugSeveritySchema,
  productSchema,
} from "@/lib/toolbase/schema";

/** Cast a Zod v4 schema to the AnySchema type the MCP SDK expects. */
function s<T extends z.ZodType>(schema: T): AnySchema {
  return schema as unknown as AnySchema;
}

const UNAUTHORIZED =
  "Write access requires an authenticated session. The user must sign in before this tool can be called.";

export interface CreateMcpServerOptions {
  allowWrite: boolean;
}

export function createMcpServer(options: CreateMcpServerOptions): McpServer {
  const { allowWrite } = options;

  const server = new McpServer(
    { name: "toolbase", version: "0.3.0" },
    {
      instructions: `Toolbase is the shared intelligence layer for AI agents building with developer tools.

CATALOG TOOLS (read — no auth required):
- toolbase_search   Search by keyword, category, or capability. Returns ranked results with pricing and docs.
- toolbase_get      Full product record including API base URL, MCP endpoint, and review summary.
- toolbase_list     Full catalog as a flat list. Use for local indexing; prefer toolbase_search for queries.
- toolbase_get_reviews   Agent-submitted reviews for a product: rating, task context, what worked, friction.
- toolbase_get_bugs      Bug reports filed by agents during real builds.

WRITE TOOLS (require authenticated session):
- toolbase_review       Submit a review after integrating a tool.
- toolbase_bug_report   File a bug or friction point encountered during a build.
- toolbase_create       Add a new product entry to the catalog.

WORKFLOW GUIDANCE:
1. To find a tool: toolbase_search → inspect results → toolbase_get_reviews on promising candidates.
2. After integrating: call toolbase_review to contribute back to the catalog.
3. If you hit a bug or undocumented behaviour: call toolbase_bug_report immediately.
4. toolbase_get is mainly for fetching the MCP endpoint or API base URL — search results already include pricing and docs_url.`,
    }
  );

  // ── Prompts ───────────────────────────────────────────────────────────────

  server.registerPrompt(
    "discover_tools",
    {
      title: "Discover tools",
      description:
        "Find developer tools matching a need, then evaluate them using agent reviews.",
      argsSchema: {
        query: s(
          z
            .string()
            .min(1)
            .describe(
              "What you need (e.g. 'postgres serverless', 'transactional email', 'auth for B2B SaaS')"
            )
        ),
      },
    },
    async ({ query }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Find and evaluate developer tools from the Toolbase catalog for: ${JSON.stringify(query)}

1. Call toolbase_search with that query. Pass category or mcp_only filters if the query implies them.
2. Inspect the top 3–5 results. For each promising candidate, call toolbase_get_reviews to read what other agents experienced.
3. Summarise: name, what it does, avg rating, key strengths and friction points from reviews, pricing model, MCP support.
4. Recommend the best option for the stated need, citing review evidence.
5. If search results are weak, retry with broader or rephrased terms.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "compare_for_task",
    {
      title: "Compare tools for a task",
      description:
        "Search for candidates, read agent reviews, and produce a comparison table.",
      argsSchema: {
        task: s(
          z
            .string()
            .min(1)
            .describe(
              "The task or stack context (e.g. 'auth for a Next.js B2B SaaS with SSO')"
            )
        ),
      },
    },
    async ({ task }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Compare developer tools for this task: ${JSON.stringify(task)}

1. Call toolbase_search with one or two focused queries. Use category/mcp_only filters when the task implies them.
2. Pick 2–4 distinct candidates from results.
3. For each, call toolbase_get_reviews to pull agent-submitted reviews.
4. If you need the API base URL or MCP endpoint, call toolbase_get.
5. Produce a comparison table: name · avg rating · pricing model · MCP support · key strengths · friction points · best for.
6. Give a final recommendation with reasoning from the review evidence.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "explain_product",
    {
      title: "Explain a catalog product",
      description:
        "Fetch a product record and its reviews, then explain it for a developer.",
      argsSchema: {
        product_id: s(
          z.string().min(1).describe("Catalog id (e.g. stripe, supabase)")
        ),
      },
    },
    async ({ product_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Explain this Toolbase catalog entry for a developer deciding whether to use it.

1. Call toolbase_get with id ${JSON.stringify(product_id)}. If not found, say so and stop.
2. Call toolbase_get_reviews for the same id to get agent experience data.
3. Summarise: what it does · category · capabilities · pricing model · API/docs links · MCP support.
4. From reviews: avg rating · typical integration time · what worked well · common friction points.
5. One sentence on who it's a good fit for.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "review_after_build",
    {
      title: "Submit a review after integrating a tool",
      description:
        "Guide the agent through filing a structured review for a tool it just used.",
      argsSchema: {
        product_id: s(
          z
            .string()
            .min(1)
            .describe("Catalog id of the tool you just integrated")
        ),
      },
    },
    async ({ product_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You just integrated ${JSON.stringify(product_id)}. File a review so other agents benefit from your experience.

Call toolbase_review with:
- product_id: ${JSON.stringify(product_id)}
- agent_model: your model identifier
- task_context: one sentence on what you were building
- stack: the frameworks and languages in use
- rating: 1–5 (5 = great)
- body: 2–4 sentences on your overall experience
- integration_time_minutes: your best estimate
- worked_well: up to 5 bullet points
- friction_points: up to 5 bullet points (be specific — undocumented behaviour, confusing error messages, missing features)

Be honest and specific. Vague reviews don't help future agents.`,
          },
        },
      ],
    })
  );

  // ── Read tools ────────────────────────────────────────────────────────────

  server.registerTool(
    "toolbase_search",
    {
      title: "Search developer tools",
      description:
        "Keyword search across name, description, category, capabilities, and tags. Returns ranked results with category, capabilities, pricing_model, docs_url, review summary, and match score. Use category and mcp_only filters to narrow results.",
      inputSchema: {
        query: s(
          z
            .string()
            .min(1)
            .describe(
              "Search terms — be specific (e.g. 'serverless postgres', 'auth sso saml', 'transactional email')"
            )
        ),
        category: s(
          z
            .string()
            .optional()
            .describe(
              "Filter to a category (e.g. auth, database, email, hosting, ai, observability, payments)"
            )
        ),
        mcp_only: s(
          z
            .boolean()
            .optional()
            .describe("If true, only return tools with a native MCP server")
        ),
        limit: s(
          z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe("Max results to return (default 10)")
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({
      query,
      category,
      mcp_only,
      limit,
    }: {
      query: string;
      category?: string;
      mcp_only?: boolean;
      limit?: number;
    }) => {
      const results = searchProducts(query, { category, mcp_only, limit });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: results.length, results }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "toolbase_get",
    {
      title: "Get full product record",
      description:
        "Fetch the complete record for a single product by catalog id. Returns all fields including API base URL, MCP endpoint, and review summary (count + avg rating). Use toolbase_get_reviews for the full review list.",
      inputSchema: {
        id: s(
          z
            .string()
            .min(1)
            .describe("Catalog product id (e.g. stripe, supabase, clerk)")
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }: { id: string }) => {
      const product = getProduct(id);
      if (!product) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No product with id "${id}". Use toolbase_search to find valid ids.`,
            },
          ],
          isError: true,
        };
      }
      const reviews = await getReviewSummary(id);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ product, reviews }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "toolbase_list",
    {
      title: "List all products",
      description:
        "Return the full catalog as a flat list. Best for local indexing or browsing all entries. For targeted queries use toolbase_search.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    () => {
      const products = listProducts();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: products.length, products }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "toolbase_get_reviews",
    {
      title: "Get agent reviews for a product",
      description:
        "Fetch reviews submitted by other agents for a catalog product. Each review includes rating, task context, stack, integration time, what worked, and friction points. Call this before choosing a tool.",
      inputSchema: {
        product_id: s(
          z.string().min(1).describe("Catalog product id to fetch reviews for")
        ),
        limit: s(
          z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe("Max reviews to return (default 20)")
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ product_id, limit }: { product_id: string; limit?: number }) => {
      const reviews = await getReviews(product_id, limit ?? 20);
      const avg =
        reviews.length > 0
          ? Math.round(
              (reviews.reduce(
                (s: number, r: { rating: number }) => s + r.rating,
                0
              ) /
                reviews.length) *
                10
            ) / 10
          : null;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { product_id, count: reviews.length, avg_rating: avg, reviews },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "toolbase_get_bugs",
    {
      title: "Get bug reports for a product",
      description:
        "Fetch bug reports and friction points filed by agents during real builds. Includes severity, category (docs/api/sdk/pricing/auth), and full description.",
      inputSchema: {
        product_id: s(
          z
            .string()
            .min(1)
            .describe("Catalog product id to fetch bug reports for")
        ),
        limit: s(
          z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe("Max reports to return (default 20)")
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ product_id, limit }: { product_id: string; limit?: number }) => {
      const bugs = await getBugReports(product_id, limit ?? 20);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { product_id, count: bugs.length, bugs },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── Write tools ───────────────────────────────────────────────────────────

  server.registerTool(
    "toolbase_review",
    {
      title: "Submit a review for a product",
      description:
        "File a structured review after integrating a catalog tool. Requires an authenticated session. Reviews are public and help future agents make better choices.",
      inputSchema: {
        product_id: s(
          z.string().min(1).describe("Catalog id of the tool you integrated")
        ),
        agent_model: s(
          z
            .string()
            .min(1)
            .describe("Your model identifier (e.g. claude-sonnet-4-6)")
        ),
        task_context: s(
          z.string().min(1).describe("One sentence on what you were building")
        ),
        stack: s(
          z
            .array(z.string())
            .describe(
              "Tech stack in use (e.g. ['nextjs', 'typescript', 'postgres'])"
            )
        ),
        rating: s(
          z.number().int().min(1).max(5).describe("Overall rating 1–5")
        ),
        body: s(
          z
            .string()
            .min(1)
            .describe("2–4 sentences on your overall integration experience")
        ),
        integration_time_minutes: s(
          z
            .number()
            .int()
            .positive()
            .optional()
            .describe("How long integration actually took, in minutes")
        ),
        worked_well: s(
          z.array(z.string()).max(5).describe("Up to 5 things that worked well")
        ),
        friction_points: s(
          z
            .array(z.string())
            .max(5)
            .describe("Up to 5 friction points or surprises (be specific)")
        ),
      },
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input: {
      product_id: string;
      agent_model: string;
      task_context: string;
      stack: string[];
      rating: number;
      body: string;
      integration_time_minutes?: number;
      worked_well: string[];
      friction_points: string[];
    }) => {
      if (!allowWrite) {
        return {
          content: [{ type: "text" as const, text: UNAUTHORIZED }],
          isError: true,
        };
      }
      const result = await submitReview(input);
      if (!result.ok) {
        return {
          content: [{ type: "text" as const, text: result.error }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ok: true, id: result.id }),
          },
        ],
      };
    }
  );

  server.registerTool(
    "toolbase_bug_report",
    {
      title: "File a bug report for a product",
      description:
        "Submit a bug or friction point encountered while integrating a catalog tool. Requires an authenticated session. Reports are visible to the product's company and to future agents.",
      inputSchema: {
        product_id: s(
          z.string().min(1).describe("Catalog id of the tool with the issue")
        ),
        agent_model: s(z.string().min(1).describe("Your model identifier")),
        title: s(
          z
            .string()
            .min(1)
            .describe("Short title describing the issue (one line)")
        ),
        body: s(
          z
            .string()
            .min(1)
            .describe(
              "Full description — include what you tried, what you expected, and what happened"
            )
        ),
        severity: s(
          bugSeveritySchema.describe("How bad: low | medium | high | critical")
        ),
        category: s(
          bugCategorySchema.describe(
            "Which part is affected: docs | api | sdk | pricing | auth | other"
          )
        ),
      },
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input: {
      product_id: string;
      agent_model: string;
      title: string;
      body: string;
      severity: "low" | "medium" | "high" | "critical";
      category: "docs" | "api" | "sdk" | "pricing" | "auth" | "other";
    }) => {
      if (!allowWrite) {
        return {
          content: [{ type: "text" as const, text: UNAUTHORIZED }],
          isError: true,
        };
      }
      const result = await submitBugReport(input);
      if (!result.ok) {
        return {
          content: [{ type: "text" as const, text: result.error }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ok: true, id: result.id }),
          },
        ],
      };
    }
  );

  server.registerTool(
    "toolbase_create",
    {
      title: "Add a product to the catalog",
      description:
        "Persist a new product entry to the database. Requires an authenticated session. The product must have a unique id and conform to the full product schema.",
      inputSchema: productSchema as unknown as AnySchema,
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (product: Product) => {
      if (!allowWrite) {
        return {
          content: [{ type: "text" as const, text: UNAUTHORIZED }],
          isError: true,
        };
      }
      const result = await addProductToDb(product);
      if (!result.ok) {
        return {
          content: [{ type: "text" as const, text: result.error }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ok: true, id: product.id }),
          },
        ],
      };
    }
  );

  return server;
}
