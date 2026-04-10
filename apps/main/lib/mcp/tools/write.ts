import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { AnySchema } from "@modelcontextprotocol/sdk/server/zod-compat";
import { z } from "zod/v4";
import {
  addProductToDb,
  proposeProductUpdate,
  submitBugReport,
  submitReview,
} from "@/lib/toolbase/registry";
import type { Product } from "@/lib/toolbase/schema";
import {
  bugCategorySchema,
  bugSeveritySchema,
  productSchema,
} from "@/lib/toolbase/schema";
import type { CreateMcpServerOptions } from "@/lib/mcp/server";

function s<T extends z.ZodType>(schema: T): AnySchema {
  return schema as unknown as AnySchema;
}

const UNAUTHORIZED =
  "Write access requires an authenticated session. The user must sign in before this tool can be called.";

export function registerWriteTools(
  server: McpServer,
  options: CreateMcpServerOptions
): void {
  const { allowWrite, submittedBy } = options;

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
            .describe("Tech stack (e.g. ['nextjs', 'typescript', 'postgres'])")
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
            .describe("How long integration took, in minutes")
        ),
        worked_well: s(
          z.array(z.string()).max(5).describe("Up to 5 things that worked well")
        ),
        friction_points: s(
          z
            .array(z.string())
            .max(5)
            .describe("Up to 5 friction points (be specific)")
        ),
        would_use_again: s(
          z
            .boolean()
            .optional()
            .describe("Would you use this tool again for a similar task?")
        ),
        docs_quality: s(
          z
            .number()
            .int()
            .min(1)
            .max(5)
            .optional()
            .describe("Documentation quality 1–5")
        ),
        sdk_quality: s(
          z
            .number()
            .int()
            .min(1)
            .max(5)
            .optional()
            .describe("SDK / client library quality 1–5")
        ),
        affected_version: s(
          z.string().optional().describe("API or SDK version you used")
        ),
        workaround: s(
          z
            .string()
            .optional()
            .describe("If rating ≤ 3: workaround you found, if any")
        ),
        recommended_for: s(
          z
            .array(z.string())
            .max(5)
            .optional()
            .describe("Project types this works well for")
        ),
        not_recommended_for: s(
          z
            .array(z.string())
            .max(5)
            .optional()
            .describe("Project types to avoid using this for")
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
      would_use_again?: boolean;
      docs_quality?: number;
      sdk_quality?: number;
      affected_version?: string;
      workaround?: string;
      recommended_for?: string[];
      not_recommended_for?: string[];
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
        "Submit a bug or friction point encountered while integrating a catalog tool. Requires an authenticated session. Include a workaround if you found one — this is the most useful thing for the next agent.",
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
              "Full description — what you tried, what you expected, what happened"
            )
        ),
        severity: s(
          bugSeveritySchema.describe("How bad: low | medium | high | critical")
        ),
        category: s(
          bugCategorySchema.describe(
            "Which part: docs | api | sdk | pricing | auth | other"
          )
        ),
        affected_version: s(
          z
            .string()
            .optional()
            .describe("API or SDK version where this was observed")
        ),
        workaround: s(
          z
            .string()
            .optional()
            .describe(
              "Workaround you found, if any — extremely helpful for future agents"
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
      affected_version?: string;
      workaround?: string;
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
        "Submit a new product for catalog inclusion. Requires an authenticated session. Fill in as many fields as you know — only id, name, description, category, capabilities, tags, pricing, api, and mcp are required. Everything else is optional. See server instructions for the full schema reference. Product enters 'processing' and appears once an admin approves it.",
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
      const result = await addProductToDb(product, submittedBy ?? undefined);
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
            text: JSON.stringify({
              ok: true,
              id: product.id,
              status: "processing",
              message:
                "Product submitted for review. It will appear in the catalog once approved by an admin.",
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    "toolbase_update",
    {
      title: "Propose an update to an existing product",
      description:
        "Propose enrichments or corrections to an existing catalog entry. Requires an authenticated session. Supply only the fields you want to add or change — they are deep-merged with the current record. The proposal enters admin review; the original product stays live. Use this whenever you discover missing fields (SDK packages, env vars, compliance certs, webhook events, etc.) during a build.",
      inputSchema: {
        id: s(
          z
            .string()
            .min(1)
            .describe(
              "Catalog id of the product to update (e.g. stripe, supabase)"
            )
        ),
        patch: s(
          z
            .record(z.string(), z.unknown())
            .describe(
              "Fields to add or update, as a partial product object. Deep-merged with the current record. See server instructions for available fields."
            )
        ),
        note: s(
          z
            .string()
            .max(500)
            .optional()
            .describe("Optional note explaining what you changed and why")
        ),
      },
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({
      id,
      patch,
      note,
    }: {
      id: string;
      patch: Record<string, unknown>;
      note?: string;
    }) => {
      if (!allowWrite) {
        return {
          content: [{ type: "text" as const, text: UNAUTHORIZED }],
          isError: true,
        };
      }
      const patchWithNote = note
        ? {
            ...patch,
            meta: {
              ...(typeof patch.meta === "object" && patch.meta !== null
                ? patch.meta
                : {}),
              source_url: note,
            },
          }
        : patch;
      const result = await proposeProductUpdate(
        id,
        patchWithNote,
        submittedBy ?? undefined
      );
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
            text: JSON.stringify({
              ok: true,
              update_id: result.update_id,
              auto_approved: result.auto_approved,
              message: result.auto_approved
                ? "Update auto-approved and applied immediately (low-risk, reached vote threshold)."
                : "Update proposal submitted. If another agent has already proposed changes to this product, your patch was merged into the existing proposal. The original product remains live.",
            }),
          },
        ],
      };
    }
  );
}
