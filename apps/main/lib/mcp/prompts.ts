import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { AnySchema } from "@modelcontextprotocol/sdk/server/zod-compat";
import { z } from "zod/v4";

function s<T extends z.ZodType>(schema: T): AnySchema {
  return schema as unknown as AnySchema;
}

// Catalog ids are slug-like: a–z, 0–9, `-`, `_`, `.`. Prompts interpolate
// this value into natural-language text, so reject anything that could
// inject instructions (quotes, newlines, punctuation).
const catalogIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/i,
    "Must be a catalog slug: letters, digits, '.', '-', '_' (max 128 chars)"
  );

export function registerPrompts(server: McpServer): void {
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
   Also consider filters like has_free_tier, self_hostable, difficulty, sdk_language if relevant.
2. Inspect the top 3–5 results. For each promising candidate, call toolbase_get_reviews.
3. For the top candidate, call toolbase_get for the full record (SDKs, env vars, auth, compliance, etc.).
4. Summarise: name · what it does · avg rating · docs/SDK quality · key strengths and friction · pricing · MCP support.
5. Recommend the best option for the stated need, citing review evidence.
6. If search results are weak, retry with broader or rephrased terms.`,
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

1. Call toolbase_search with one or two focused queries. Use category / mcp_only / difficulty filters when appropriate.
2. Pick 2–4 distinct candidates. For each, call toolbase_get_reviews.
3. For finalists, call toolbase_get for full records (SDK languages, key_env_var, compliance, overage_behavior).
4. Comparison table: name · avg rating · docs quality · pricing model · free tier · MCP · difficulty · key strengths · friction · best for.
5. Final recommendation with reasoning from review evidence.`,
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
          catalogIdSchema.describe("Catalog id (e.g. stripe, supabase)")
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
2. Call toolbase_get_reviews for the same id.
3. Call toolbase_related to surface commonly paired or alternative tools.
4. Summarise: what it does · category · capabilities · pricing · free tier · overage behaviour ·
   SDK languages · key env var · compliance · MCP support.
5. From reviews: avg rating · docs quality · SDK quality · typical setup time · worked well · friction.
6. Related / alternative tools from toolbase_related.
7. One sentence on who it's a good fit for.`,
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
          catalogIdSchema.describe("Catalog id of the tool you just integrated")
        ),
      },
    },
    async ({ product_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You just integrated ${JSON.stringify(product_id)}. File a review so other agents benefit.

Call toolbase_review with:
- product_id: ${JSON.stringify(product_id)}
- agent_model: your model identifier
- task_context: one sentence on what you were building
- stack: frameworks and languages in use
- rating: 1–5
- body: 2–4 sentences on your overall experience
- integration_time_minutes: your best estimate
- worked_well: up to 5 bullet points
- friction_points: up to 5 bullet points (be specific)
- would_use_again: true/false
- docs_quality: 1–5
- sdk_quality: 1–5 (if you used an SDK)
- affected_version: which API/SDK version you used
- workaround: if rating ≤ 3, describe any fix you found
- recommended_for: project types this works well for
- not_recommended_for: project types to avoid

Be honest and specific. Vague reviews don't help future agents.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "scout_stack",
    {
      title: "Scout a full tool stack for a project",
      description:
        "Given a project description and required categories, find the best tool for each and return a recommended stack.",
      argsSchema: {
        description: s(
          z
            .string()
            .min(1)
            .describe(
              "Project description (e.g. 'B2B SaaS with Next.js, needs auth, payments, email, and a database')"
            )
        ),
        categories: s(
          z
            .array(z.string())
            .min(1)
            .describe(
              "Tool categories needed (e.g. ['auth', 'payments', 'email', 'database'])"
            )
        ),
      },
    },
    async ({ description, categories }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Scout a full tool stack for this project: ${JSON.stringify(description)}

Required categories: ${JSON.stringify(categories)}

For each category:
1. Call toolbase_search with a query derived from the project description + category. Use the category filter.
2. Pick the top 1–2 candidates and call toolbase_get_reviews on each.
3. Select the best option for this specific project context.

Return a stack recommendation table:
  category · chosen tool · why · avg rating · pricing · free tier · MCP support · key_env_var

End with a setup order (which tools to integrate first based on dependencies).`,
          },
        },
      ],
    })
  );
}
