import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { AnySchema } from "@modelcontextprotocol/sdk/server/zod-compat";
import { z } from "zod/v4";
import {
  computeCompleteness,
  getProduct,
  getRelatedProducts,
  getReviewSummary,
  listCategories,
  searchProducts,
} from "@/lib/toolbase/registry";

function s<T extends z.ZodType>(schema: T): AnySchema {
  return schema as unknown as AnySchema;
}

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "toolbase_search",
    {
      title: "Search developer tools",
      description:
        "Keyword search across name, description, category, capabilities, tags, and use_cases. Returns ranked results including tagline, SDK languages, key_env_var, difficulty, and free tier status. Use filters to narrow by category, compliance, SDK language, free tier, self-hostable, and more.",
      inputSchema: {
        query: s(
          z
            .string()
            .max(512)
            .optional()
            .describe(
              "Search terms — describe the problem or capability (e.g. 'serverless postgres', 'auth with SSO', 'transactional email'). Optional when at least one filter is set; omit to list filter-matched products."
            )
        ),
        category: s(
          z
            .string()
            .optional()
            .describe(
              "Filter to a category (e.g. auth, database, email, payments, analytics, ai, observability)"
            )
        ),
        mcp_only: s(
          z
            .boolean()
            .optional()
            .describe("Only return tools with a native MCP server")
        ),
        has_free_tier: s(
          z.boolean().optional().describe("Only return tools with a free tier")
        ),
        self_hostable: s(
          z.boolean().optional().describe("Only return self-hostable tools")
        ),
        open_source: s(
          z.boolean().optional().describe("Only return open-source tools")
        ),
        difficulty: s(
          z
            .enum(["low", "medium", "high"])
            .optional()
            .describe("Filter by integration difficulty")
        ),
        sdk_language: s(
          z
            .string()
            .optional()
            .describe(
              "Only return tools with an official SDK for this language (e.g. 'python', 'typescript', 'go')"
            )
        ),
        compliance: s(
          z
            .string()
            .optional()
            .describe(
              "Only return tools with this compliance certification (e.g. 'hipaa', 'soc2_type2', 'gdpr')"
            )
        ),
        maturity: s(
          z
            .string()
            .optional()
            .describe(
              "Filter by lifecycle stage: alpha | beta | ga | stable | deprecated | sunset"
            )
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
        offset: s(
          z
            .number()
            .int()
            .min(0)
            .optional()
            .describe("Number of results to skip (for pagination, default 0)")
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input: {
      query?: string;
      category?: string;
      mcp_only?: boolean;
      has_free_tier?: boolean;
      self_hostable?: boolean;
      open_source?: boolean;
      difficulty?: "low" | "medium" | "high";
      sdk_language?: string;
      compliance?: string;
      maturity?: string;
      limit?: number;
      offset?: number;
    }) => {
      const trimmedQuery = (input.query ?? "").trim();
      const hasFilter =
        input.category !== undefined ||
        input.mcp_only !== undefined ||
        input.has_free_tier !== undefined ||
        input.self_hostable !== undefined ||
        input.open_source !== undefined ||
        input.difficulty !== undefined ||
        input.sdk_language !== undefined ||
        input.compliance !== undefined ||
        input.maturity !== undefined;

      if (trimmedQuery.length === 0 && !hasFilter) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Provide a query or at least one filter (e.g. category, mcp_only, has_free_tier). Use toolbase_categories to list available categories.",
            },
          ],
          isError: true,
        };
      }

      if (input.category !== undefined) {
        const categories = await listCategories();
        const known = categories.map((c) => c.category);
        if (!known.includes(input.category)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Unknown category "${input.category}". Valid categories: ${known.join(", ") || "(none — catalog is empty)"}.`,
              },
            ],
            isError: true,
          };
        }
      }

      const limit = input.limit ?? 10;
      const offset = input.offset ?? 0;
      const page = await searchProducts(trimmedQuery, {
        category: input.category,
        mcp_only: input.mcp_only,
        has_free_tier: input.has_free_tier,
        self_hostable: input.self_hostable,
        open_source: input.open_source,
        difficulty: input.difficulty,
        sdk_language: input.sdk_language,
        compliance: input.compliance,
        maturity: input.maturity,
        limit,
        offset,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: page.hits.length,
                total: page.total,
                offset,
                limit,
                has_more: offset + page.hits.length < page.total,
                results: page.hits,
              },
              null,
              2
            ),
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
        "Fetch the complete record for a single product by catalog id. Returns all populated fields: pricing tiers, SDKs, auth methods, env vars, webhooks, compliance certifications, hosting details, portability, agent notes, rate limit strategy, and more. Also returns a review summary (count + avg rating). Use toolbase_get_reviews for the full review list.",
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
      const product = await getProduct(id);
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
      const completeness = computeCompleteness(product);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ product, reviews, completeness }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "toolbase_related",
    {
      title: "Get related products",
      description:
        "Return products related to a given catalog entry — alternatives in the same category and tools commonly paired with it. Each result includes a relation type: 'alternative' | 'same_category' | 'complementary'.",
      inputSchema: {
        id: s(
          z
            .string()
            .min(1)
            .describe("Catalog product id to find related tools for")
        ),
        limit: s(
          z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe("Max results (default 8)")
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, limit }: { id: string; limit?: number }) => {
      const related = await getRelatedProducts(id, limit ?? 8);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { product_id: id, count: related.length, related },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "toolbase_categories",
    {
      title: "List all categories",
      description:
        "Returns all product categories in the catalog with the number of tools in each. Use this to discover what categories are available before filtering searches.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const categories = await listCategories();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { count: categories.length, categories },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
