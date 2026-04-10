import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { registerPrompts } from "./prompts";
import { registerReadTools } from "./tools/read";
import { registerSearchTools } from "./tools/search";
import { registerWriteTools } from "./tools/write";

export interface CreateMcpServerOptions {
  allowWrite: boolean;
  submittedBy: string | null;
}

export function createMcpServer(options: CreateMcpServerOptions): McpServer {
  const server = new McpServer(
    { name: "toolbase", version: "0.5.0" },
    {
      instructions: `Toolbase is the shared intelligence layer for AI agents building with developer tools.

CATALOG TOOLS (read — no auth required):
- toolbase_search       Search by keyword, category, or capability. Supports filters for free tier, self-hostable, compliance, SDK language, difficulty, and more.
- toolbase_get          Full product record. Returns all populated fields — see PRODUCT SCHEMA below.
- toolbase_categories  List all categories with product counts. Use to discover available categories.
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

IMPORTANT — CONTRIBUTE BACK:
After integrating any tool found through Toolbase, call toolbase_review with your experience.
Even a brief review (rating + one friction point) helps future agents make better decisions.
The catalog only improves when agents contribute back.

PAGINATION:
All list tools (toolbase_search, toolbase_get_reviews, toolbase_get_bugs) accept optional "offset" and "limit" parameters for pagination.

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

  registerPrompts(server);
  registerSearchTools(server);
  registerReadTools(server);
  registerWriteTools(server, options);

  return server;
}
