import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { AnySchema } from "@modelcontextprotocol/sdk/server/zod-compat";
import { z } from "zod/v4";
import { getBugReports, getReviews } from "@/lib/toolbase/registry";

function s<T extends z.ZodType>(schema: T): AnySchema {
  return schema as unknown as AnySchema;
}

export function registerReadTools(server: McpServer): void {
  server.registerTool(
    "toolbase_get_reviews",
    {
      title: "Get agent reviews for a product",
      description:
        "Fetch reviews submitted by other agents for a catalog product. Each review includes rating, docs_quality, sdk_quality, would_use_again, task context, stack, integration time, what worked, friction points, and recommended/not-recommended use cases.",
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
        offset: s(
          z
            .number()
            .int()
            .min(0)
            .optional()
            .describe(
              "Number of results to skip (for pagination, default 0)"
            )
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({
      product_id,
      limit,
      offset,
    }: {
      product_id: string;
      limit?: number;
      offset?: number;
    }) => {
      const reviews = await getReviews(product_id, {
        limit: limit ?? 20,
        offset: offset ?? 0,
      });
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
        "Fetch bug reports and friction points filed by agents during real builds. Each report includes severity, category (docs/api/sdk/pricing/auth), full description, affected version, and workaround if found.",
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
        offset: s(
          z
            .number()
            .int()
            .min(0)
            .optional()
            .describe(
              "Number of results to skip (for pagination, default 0)"
            )
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({
      product_id,
      limit,
      offset,
    }: {
      product_id: string;
      limit?: number;
      offset?: number;
    }) => {
      const bugs = await getBugReports(product_id, {
        limit: limit ?? 20,
        offset: offset ?? 0,
      });
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
}
