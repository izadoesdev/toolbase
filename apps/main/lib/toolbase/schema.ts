import { z } from "zod";

export const pricingModelSchema = z.enum([
  "free",
  "freemium",
  "paid",
  "usage_based",
  "enterprise",
  "open_source",
]);

export const maturitySchema = z.enum([
  "alpha",
  "beta",
  "ga",
  "stable",
  "deprecated",
  "sunset",
]);

export const apiTypeSchema = z.enum([
  "rest",
  "graphql",
  "grpc",
  "sdk_only",
  "websocket",
  "mixed",
]);

export const authMethodSchema = z.enum([
  "api_key",
  "oauth2",
  "jwt",
  "basic",
  "session",
  "mutual_tls",
  "webhook_secret",
  "none",
]);

export const complianceCertSchema = z.enum([
  "soc2_type1",
  "soc2_type2",
  "gdpr",
  "hipaa",
  "iso27001",
  "ccpa",
  "pci_dss",
  "fedramp",
]);

const pricingTierSchema = z.object({
  name: z.string().max(64),
  price_per_month: z.number().nullable(),
  description: z.string().max(300).optional(),
});

const sdkSchema = z.object({
  language: z.string().max(64),
  package: z.string().max(256),
  docs_url: z.string().max(512).optional(),
  github_url: z.string().max(512).optional(),
  version: z.string().max(64).optional(),
});

const envVarSchema = z.object({
  name: z.string().max(128),
  description: z.string().max(300),
  required: z.boolean(),
  secret: z.boolean(),
  example: z.string().max(256).optional(),
});

export const productSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000),
  category: z.string().max(64),
  subcategory: z.string().max(64).optional(),
  capabilities: z.array(z.string().max(128)).max(30),
  tags: z.array(z.string().max(64)).max(30),
  use_cases: z.array(z.string().max(300)).max(15).optional(),
  alternatives: z.array(z.string().max(128)).max(10).optional(),
  logo_url: z.string().max(512).optional(),
  maturity: maturitySchema.optional(),
  sunset_date: z.string().max(32).optional(),
  migration_guide_url: z.string().max(512).optional(),

  company: z
    .object({
      name: z.string().max(128).optional(),
      founded: z.number().int().optional(),
      hq: z.string().max(128).optional(),
      funding_stage: z
        .enum([
          "bootstrapped",
          "seed",
          "series_a",
          "series_b",
          "series_c",
          "public",
          "acquired",
        ])
        .optional(),
      notable_backers: z.array(z.string().max(128)).max(10).optional(),
      acquired_by: z.string().max(128).optional(),
      website: z.string().max(512).optional(),
    })
    .optional(),

  pricing: z.object({
    model: pricingModelSchema,
    starting_price: z.number(),
    has_free_tier: z.boolean().optional(),
    free_tier_limits: z.string().max(300).optional(),
    requires_card: z.boolean().optional(),
    per_unit_pricing: z.string().max(200).optional(),
    pricing_url: z.string().max(512).optional(),
    tiers: z.array(pricingTierSchema).max(8).optional(),
    overage_behavior: z
      .enum(["hard_limit", "soft_limit", "notify_only", "throttle"])
      .optional(),
  }),

  api: z.object({
    base_url: z.string().max(512),
    docs_url: z.string().max(512),
    type: apiTypeSchema.optional(),
    version: z.string().max(64).optional(),
    openapi_url: z.string().max(512).optional(),
    postman_url: z.string().max(512).optional(),
    changelog_url: z.string().max(512).optional(),
    status_url: z.string().max(512).optional(),
    sandbox_url: z.string().max(512).optional(),
    rate_limits: z
      .object({
        requests_per_minute: z.number().int().optional(),
        requests_per_day: z.number().int().optional(),
        burst: z.number().int().optional(),
        notes: z.string().max(300).optional(),
      })
      .optional(),
    pagination: z.enum(["cursor", "offset", "page", "none"]).optional(),
    idempotency: z.boolean().optional(),
    idempotency_key_header: z.string().max(128).optional(),
    versioning_scheme: z.enum(["semver", "date", "integer", "none"]).optional(),
    breaking_change_policy: z.string().max(300).optional(),
    error_schema: z.string().max(500).optional(),
  }),

  sdks: z.array(sdkSchema).max(15).optional(),

  auth: z
    .object({
      methods: z.array(authMethodSchema).min(1),
      key_env_var: z.string().max(128).optional(),
      key_format: z.string().max(128).optional(),
      oauth_scopes: z.array(z.string().max(128)).max(20).optional(),
      auth_docs_url: z.string().max(512).optional(),
      multi_key: z.boolean().optional(),
    })
    .optional(),

  integration: z
    .object({
      difficulty: z.enum(["low", "medium", "high"]).optional(),
      typical_setup_minutes: z.number().int().positive().optional(),
      env_vars: z.array(envVarSchema).max(20).optional(),
      webhooks: z
        .object({
          supported: z.boolean(),
          events: z.array(z.string().max(128)).max(100).optional(),
          signing: z.boolean().optional(),
          retry: z.boolean().optional(),
          docs_url: z.string().max(512).optional(),
        })
        .optional(),
      realtime: z
        .object({
          supported: z.boolean(),
          protocol: z
            .enum(["websocket", "sse", "long_poll", "grpc_stream"])
            .optional(),
          docs_url: z.string().max(512).optional(),
        })
        .optional(),
      cli: z
        .object({
          available: z.boolean(),
          package: z.string().max(256).optional(),
          docs_url: z.string().max(512).optional(),
        })
        .optional(),
      local_dev: z
        .object({
          emulator: z.boolean(),
          docker_image: z.string().max(256).optional(),
          offline_capable: z.boolean().optional(),
          docs_url: z.string().max(512).optional(),
        })
        .optional(),
      test_data: z
        .object({
          fixtures: z.boolean().optional(),
          sample_webhooks: z.boolean().optional(),
          mock_server: z.boolean().optional(),
          docs_url: z.string().max(512).optional(),
        })
        .optional(),
      requires: z.array(z.string().max(128)).max(10).optional(),
      quickstart_url: z.string().max(512).optional(),
      example_repo_url: z.string().max(512).optional(),
      playground_url: z.string().max(512).optional(),
      framework_guides: z.record(z.string(), z.string().max(512)).optional(),
    })
    .optional(),

  hosting: z
    .object({
      model: z
        .enum(["cloud", "self_hosted", "hybrid", "on_premise"])
        .optional(),
      self_hostable: z.boolean().optional(),
      open_source: z.boolean().optional(),
      github_url: z.string().max(512).optional(),
      github_stars: z.number().int().optional(),
      regions: z.array(z.string().max(64)).max(20).optional(),
      cloud_providers: z
        .array(
          z.enum([
            "aws",
            "gcp",
            "azure",
            "cloudflare",
            "vercel",
            "fly",
            "other",
          ])
        )
        .optional(),
      edge: z.boolean().optional(),
      docker_image: z.string().max(256).optional(),
    })
    .optional(),

  compliance: z
    .object({
      certifications: z.array(complianceCertSchema).optional(),
      data_residency: z.array(z.string().max(64)).optional(),
      gdpr_dpa: z.boolean().optional(),
      encryption_at_rest: z.boolean().optional(),
      encryption_in_transit: z.boolean().optional(),
      sla_uptime: z.number().min(0).max(100).optional(),
      notes: z.string().max(500).optional(),
    })
    .optional(),

  portability: z
    .object({
      ownership: z.enum(["customer", "vendor", "shared"]).optional(),
      export_formats: z.array(z.string().max(64)).max(10).optional(),
      exportable: z.boolean().optional(),
      portable: z.boolean().optional(),
      retention_days: z.number().int().optional(),
      audit_logs: z.boolean().optional(),
      gdpr_deletion: z.boolean().optional(),
    })
    .optional(),

  support: z
    .object({
      email: z.string().max(256).optional(),
      discord_url: z.string().max(512).optional(),
      slack_url: z.string().max(512).optional(),
      github_issues_url: z.string().max(512).optional(),
      forum_url: z.string().max(512).optional(),
      status_url: z.string().max(512).optional(),
      enterprise_support: z.boolean().optional(),
      response_time_sla: z.string().max(128).optional(),
    })
    .optional(),

  agent: z
    .object({
      llms_txt_url: z.string().max(512).optional(),
      ai_native: z.boolean().optional(),
      notes: z.string().max(1000).optional(),
      known_issues: z.array(z.string().max(300)).max(10).optional(),
      rate_limit_strategy: z.string().max(500).optional(),
    })
    .optional(),

  mcp: z.object({
    supported: z.boolean(),
    endpoint: z.string().max(512).nullable(),
    tools: z.array(z.string().max(128)).max(50).optional(),
    transport: z.enum(["http", "stdio", "sse"]).optional(),
    auth_required: z.boolean().optional(),
    docs_url: z.string().max(512).optional(),
  }),

  meta: z
    .object({
      last_verified_at: z.string().max(32).optional(),
      verified_by: z.string().max(128).optional(),
      source_url: z.string().max(512).optional(),
      update_for: z.string().max(128).optional(),
    })
    .optional(),
});

export type Product = z.infer<typeof productSchema>;

export const reviewSchema = z.object({
  id: z.string().min(1),
  product_id: z.string().min(1),
  agent_model: z.string().min(1).max(128),
  task_context: z.string().min(1).max(500),
  stack: z.array(z.string().max(64)).max(20),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(1).max(5000),
  integration_time_minutes: z.number().int().positive().optional(),
  worked_well: z.array(z.string()).max(5),
  friction_points: z.array(z.string()).max(5),
  submitted_at: z.string(),
  would_use_again: z.boolean().optional(),
  docs_quality: z.number().int().min(1).max(5).optional(),
  sdk_quality: z.number().int().min(1).max(5).optional(),
  affected_version: z.string().max(128).optional(),
  workaround: z.string().max(1000).optional(),
  recommended_for: z.array(z.string().max(128)).max(5).optional(),
  not_recommended_for: z.array(z.string().max(128)).max(5).optional(),
});

export const reviewInputSchema = reviewSchema.omit({
  id: true,
  submitted_at: true,
});

export type Review = z.infer<typeof reviewSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;

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
  id: z.string().min(1),
  product_id: z.string().min(1),
  agent_model: z.string().min(1),
  title: z.string().min(1).max(256),
  body: z.string().min(1).max(5000),
  severity: bugSeveritySchema,
  category: bugCategorySchema,
  submitted_at: z.string(),
  affected_version: z.string().max(128).optional(),
  workaround: z.string().max(1000).optional(),
});

export const bugReportInputSchema = bugReportSchema.omit({
  id: true,
  submitted_at: true,
});

export type BugReport = z.infer<typeof bugReportSchema>;
export type BugReportInput = z.infer<typeof bugReportInputSchema>;
