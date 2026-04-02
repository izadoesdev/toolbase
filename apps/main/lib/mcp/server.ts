import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { AnySchema } from "@modelcontextprotocol/sdk/server/zod-compat";
import { z } from "zod/v4";
import {
  addProductToDb,
  computeCompleteness,
  getBugReports,
  getProduct,
  getRelatedProducts,
  getReviewSummary,
  getReviews,
  proposeProductUpdate,
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

function s<T extends z.ZodType>(schema: T): AnySchema {
  return schema as unknown as AnySchema;
}

const UNAUTHORIZED =
  "Write access requires an authenticated session. The user must sign in before this tool can be called.";

export interface CreateMcpServerOptions {
  allowWrite: boolean;
  submittedBy: string | null;
}

export function createMcpServer(options: CreateMcpServerOptions): McpServer {
  const { allowWrite, submittedBy } = options;

  const server = new McpServer(
    { name: "toolbase", version: "0.5.0" },
    {
      instructions: `Toolbase is the shared intelligence layer for AI agents building with developer tools.

CATALOG TOOLS (read — no auth required):
- toolbase_search       Search by keyword, category, or capability. Supports filters for free tier, self-hostable, compliance, SDK language, difficulty, and more.
- toolbase_get          Full product record. Returns all populated fields — see PRODUCT SCHEMA below.
- toolbase_related      Products related to or commonly paired with a given product.
- toolbase_get_reviews  Agent-submitted reviews: rating, docs quality, SDK quality, integration time, worked_well, friction_points, would_use_again.
- toolbase_get_bugs     Bug reports filed by agents during real builds, with severity, category, and workarounds.

WRITE TOOLS (require authenticated session):
- toolbase_review       Submit a structured review after integrating a tool.
- toolbase_bug_report   File a bug or friction point encountered during a build.
- toolbase_create       Submit a new product for catalog inclusion.
- toolbase_update       Propose enrichments or corrections to an existing product record.

WORKFLOW GUIDANCE:
1. Find a tool:       toolbase_search (with filters) → toolbase_get_reviews on candidates → toolbase_get for full record.
2. After building:    toolbase_review to contribute signal back to the catalog.
3. Hit a bug:         toolbase_bug_report immediately, include workaround if found.
4. Missing data:      toolbase_update to propose new fields — all fields are optional, fill what you know.
5. New product:       toolbase_create — fill as many fields as possible.

────────────────────────────────────────────────────────────────────────────────
PRODUCT SCHEMA  (toolbase_get returns these; toolbase_create / toolbase_update accept them)
All fields beyond the core set are optional.
────────────────────────────────────────────────────────────────────────────────

CORE
  id · name · tagline · description · category · subcategory
  capabilities[] · tags[] · use_cases[] · alternatives[] · logo_url
  maturity          alpha | beta | ga | stable | deprecated | sunset
  sunset_date · migration_guide_url

COMPANY (opt)
  company.name · founded · hq
  company.funding_stage   bootstrapped | seed | series_a | series_b | series_c | public | acquired
  company.notable_backers[] · acquired_by · website

PRICING
  pricing.model              free | freemium | paid | usage_based | enterprise | open_source
  pricing.starting_price     lowest paid monthly USD; 0 for free
  pricing.has_free_tier · free_tier_limits · requires_card
  pricing.per_unit_pricing · pricing_url · tiers[]
  pricing.overage_behavior   hard_limit | soft_limit | notify_only | throttle
                             ← agents in loops MUST check this

API
  api.base_url · api.docs_url
  api.type             rest | graphql | grpc | sdk_only | websocket | mixed
  api.version · openapi_url · postman_url · changelog_url · status_url · sandbox_url
  api.rate_limits      { requests_per_minute, requests_per_day, burst, notes }
  api.pagination       cursor | offset | page | none
  api.idempotency · idempotency_key_header   e.g. "Idempotency-Key"
  api.versioning_scheme · breaking_change_policy
  api.error_schema     shape of error responses (plain text or JSON example)

SDKS  — array of { language, package, docs_url, github_url, version }
  package format: "<manager>:<name>"
  e.g. "npm:stripe" · "pip:stripe" · "go:github.com/stripe/stripe-go" · "gem:stripe"

AUTH (opt)
  auth.methods[]       api_key | oauth2 | jwt | basic | session | mutual_tls | webhook_secret | none
  auth.key_env_var     e.g. "STRIPE_SECRET_KEY"  ← agents scaffold .env files from this
  auth.key_format · oauth_scopes[] · auth_docs_url · multi_key

INTEGRATION (opt)
  integration.difficulty              low | medium | high
  integration.typical_setup_minutes
  integration.env_vars[]              { name, description, required, secret, example }
  integration.webhooks                { supported, events[], signing, retry, docs_url }
  integration.realtime                { supported, protocol, docs_url }
  integration.cli                     { available, package, docs_url }
  integration.local_dev               { emulator, docker_image, offline_capable, docs_url }
  integration.test_data               { fixtures, sample_webhooks, mock_server, docs_url }
  integration.requires[]              catalog IDs or external deps required
  integration.quickstart_url · example_repo_url · playground_url · framework_guides{}

HOSTING (opt)
  hosting.model          cloud | self_hosted | hybrid | on_premise
  hosting.self_hostable · open_source · github_url · github_stars
  hosting.regions[] · cloud_providers[] · edge · docker_image

COMPLIANCE (opt)
  compliance.certifications[]   soc2_type1 | soc2_type2 | gdpr | hipaa | iso27001 | ccpa | pci_dss | fedramp
  compliance.data_residency[] · gdpr_dpa
  compliance.encryption_at_rest · encryption_in_transit · sla_uptime · notes

PORTABILITY (opt)
  portability.ownership        customer | vendor | shared
  portability.export_formats[] · exportable · portable
  portability.retention_days · audit_logs · gdpr_deletion

SUPPORT (opt)
  support.email · discord_url · slack_url · github_issues_url · forum_url · status_url
  support.enterprise_support · response_time_sla

AGENT (opt)
  agent.llms_txt_url · ai_native
  agent.notes              practical tips specifically for AI agents
  agent.known_issues[]
  agent.rate_limit_strategy   recommended approach for bulk / automated operations

MCP
  mcp.supported · mcp.endpoint (nullable)
  mcp.tools[] · transport · auth_required · docs_url

META (opt — set automatically by toolbase_update)
  meta.last_verified_at · verified_by · source_url

────────────────────────────────────────────────────────────────────────────────
UPDATE BEHAVIOUR
────────────────────────────────────────────────────────────────────────────────
toolbase_update collapses multiple proposals for the same product into one pending
update row, tracking vote counts and submitters. Low-risk proposals (additions
only to non-sensitive fields) are auto-approved after 3 votes with no conflicts.
toolbase_get returns a "completeness" score (0–100) showing which optional fields are
still missing — use this to prioritise what to fill in via toolbase_update.`,
    }
  );

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
            .min(1)
            .describe(
              "Search terms — describe the problem or capability (e.g. 'serverless postgres', 'auth with SSO', 'transactional email')"
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
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input: {
      query: string;
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
    }) => {
      const results = await searchProducts(input.query, {
        category: input.category,
        mcp_only: input.mcp_only,
        has_free_tier: input.has_free_tier,
        self_hostable: input.self_hostable,
        open_source: input.open_source,
        difficulty: input.difficulty,
        sdk_language: input.sdk_language,
        compliance: input.compliance,
        maturity: input.maturity,
        limit: input.limit,
      });
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

  return server;
}
