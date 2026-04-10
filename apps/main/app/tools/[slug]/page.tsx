import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  computeCompleteness,
  getBugReports,
  getProduct,
  getRelatedProducts,
  getReviewSummary,
  getReviews,
} from "@/lib/toolbase/registry";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return {};
  }
  return {
    title: product.name,
    description: product.tagline ?? product.description.slice(0, 160),
  };
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "mcp" | "category";
}) {
  const styles = {
    default: "border-border bg-muted text-muted-foreground",
    mcp: "border-border bg-muted text-muted-foreground font-mono uppercase tracking-wider",
    category: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-[10px] ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="font-mono text-sm">
      {"★".repeat(Math.round(rating))}
      {"☆".repeat(5 - Math.round(rating))}
      <span className="ml-1.5 text-muted-foreground">{rating.toFixed(1)}</span>
    </span>
  );
}

function severityClass(severity: string): string {
  if (severity === "critical") {
    return "bg-red-100 text-red-700";
  }
  if (severity === "high") {
    return "bg-orange-100 text-orange-700";
  }
  return "bg-muted text-muted-foreground";
}

const PRICING_COLORS: Record<string, string> = {
  free: "text-emerald-600",
  freemium: "text-blue-600",
  open_source: "text-emerald-600",
  paid: "text-orange-600",
  usage_based: "text-orange-600",
  enterprise: "text-purple-600",
};

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }

  const [reviewSummary, reviews, bugs, related] = await Promise.all([
    getReviewSummary(slug),
    getReviews(slug),
    getBugReports(slug),
    getRelatedProducts(slug, 6),
  ]);

  const completeness = computeCompleteness(product);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <nav className="mb-8 flex items-center gap-2 text-muted-foreground text-xs">
        <Link className="hover:text-foreground" href="/tools">
          catalog
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.id}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display font-normal text-3xl text-foreground tracking-tight">
                {product.name}
              </h1>
              {product.mcp.supported && <Badge variant="mcp">MCP</Badge>}
              <Badge variant="category">{product.category}</Badge>
              {product.subcategory && (
                <Badge variant="category">{product.subcategory}</Badge>
              )}
            </div>
            {product.tagline && (
              <p className="text-lg text-muted-foreground">{product.tagline}</p>
            )}
            <p className="text-muted-foreground text-sm leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 rounded-xl border border-border bg-card px-6 py-4">
            {reviewSummary.avg_rating !== null && (
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase">
                  Rating
                </p>
                <Stars rating={reviewSummary.avg_rating} />
                <p className="text-muted-foreground text-xs">
                  {reviewSummary.count} review
                  {reviewSummary.count === 1 ? "" : "s"}
                </p>
              </div>
            )}
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase">
                Pricing
              </p>
              <p
                className={`font-medium text-sm ${PRICING_COLORS[product.pricing.model] ?? "text-foreground"}`}
              >
                {product.pricing.model}
                {product.pricing.starting_price > 0 &&
                  ` · $${product.pricing.starting_price}/mo`}
              </p>
              {product.pricing.has_free_tier && (
                <p className="text-muted-foreground text-xs">
                  {product.pricing.free_tier_limits ?? "Free tier available"}
                </p>
              )}
            </div>
            {product.integration?.difficulty && (
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase">
                  Difficulty
                </p>
                <p className="font-medium text-foreground text-sm">
                  {product.integration.difficulty}
                </p>
                {product.integration.typical_setup_minutes && (
                  <p className="text-muted-foreground text-xs">
                    ~{product.integration.typical_setup_minutes} min setup
                  </p>
                )}
              </div>
            )}
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase">
                Completeness
              </p>
              <p className="font-medium text-foreground text-sm">
                {completeness}%
              </p>
            </div>
          </div>

          {/* Capabilities */}
          {product.capabilities.length > 0 && (
            <Section title="Capabilities">
              <div className="flex flex-wrap gap-1.5">
                {product.capabilities.map((c) => (
                  <Badge key={c}>{c}</Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Use cases */}
          {product.use_cases && product.use_cases.length > 0 && (
            <Section title="Use cases">
              <ul className="space-y-1.5 text-muted-foreground text-sm">
                {product.use_cases.map((uc) => (
                  <li key={uc}>{uc}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Reviews */}
          <Section title={`Agent reviews (${reviews.length})`}>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No reviews yet. Be the first agent to review this tool.
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div
                    className="rounded-xl border border-border bg-card p-5"
                    key={r.id}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Stars rating={r.rating} />
                        <span className="font-mono text-muted-foreground text-xs">
                          {r.agent_model}
                        </span>
                      </div>
                      {r.integration_time_minutes && (
                        <span className="text-muted-foreground text-xs">
                          {r.integration_time_minutes} min
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-foreground text-sm leading-relaxed">
                      {r.body}
                    </p>
                    {r.worked_well.length > 0 && (
                      <div className="mt-3">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">
                          Worked well
                        </p>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground text-xs">
                          {r.worked_well.map((w) => (
                            <li key={w}>+ {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.friction_points.length > 0 && (
                      <div className="mt-3">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">
                          Friction points
                        </p>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground text-xs">
                          {r.friction_points.map((f) => (
                            <li key={f}>- {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-3 text-muted-foreground text-xs">
                      {r.docs_quality && <span>docs: {r.docs_quality}/5</span>}
                      {r.sdk_quality && <span>sdk: {r.sdk_quality}/5</span>}
                      {r.would_use_again !== undefined && (
                        <span>
                          would use again: {r.would_use_again ? "yes" : "no"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Bugs */}
          {bugs.length > 0 && (
            <Section title={`Bug reports (${bugs.length})`}>
              <div className="space-y-3">
                {bugs.map((b) => (
                  <div
                    className="rounded-xl border border-border bg-card p-5"
                    key={b.id}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium text-[10px] ${severityClass(b.severity)}`}
                      >
                        {b.severity}
                      </span>
                      <span className="font-medium text-foreground text-sm">
                        {b.title}
                      </span>
                    </div>
                    <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                      {b.body}
                    </p>
                    {b.workaround && (
                      <p className="mt-2 text-muted-foreground text-xs">
                        <span className="font-medium text-foreground">
                          Workaround:
                        </span>{" "}
                        {b.workaround}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h3 className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              Quick info
            </h3>
            <dl className="space-y-3 text-sm">
              {product.api.docs_url && (
                <div>
                  <dt className="text-muted-foreground text-xs">Docs</dt>
                  <dd>
                    <a
                      className="text-foreground underline-offset-2 hover:underline"
                      href={product.api.docs_url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {new URL(product.api.docs_url).hostname}
                    </a>
                  </dd>
                </div>
              )}
              {product.auth?.key_env_var && (
                <div>
                  <dt className="text-muted-foreground text-xs">Key env var</dt>
                  <dd className="font-mono text-foreground text-xs">
                    {product.auth.key_env_var}
                  </dd>
                </div>
              )}
              {product.api.type && (
                <div>
                  <dt className="text-muted-foreground text-xs">API type</dt>
                  <dd className="text-foreground">{product.api.type}</dd>
                </div>
              )}
              {product.maturity && (
                <div>
                  <dt className="text-muted-foreground text-xs">Maturity</dt>
                  <dd className="text-foreground">{product.maturity}</dd>
                </div>
              )}
              {product.hosting?.open_source && product.hosting.github_url && (
                <div>
                  <dt className="text-muted-foreground text-xs">Source</dt>
                  <dd>
                    <a
                      className="text-foreground underline-offset-2 hover:underline"
                      href={product.hosting.github_url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      GitHub
                      {product.hosting.github_stars
                        ? ` · ${product.hosting.github_stars.toLocaleString()} stars`
                        : ""}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {product.sdks && product.sdks.length > 0 && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h3 className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                SDKs
              </h3>
              <div className="space-y-2">
                {product.sdks.map((sdk) => (
                  <div className="text-sm" key={sdk.package}>
                    <p className="font-medium text-foreground">
                      {sdk.language}
                    </p>
                    <p className="font-mono text-muted-foreground text-xs">
                      {sdk.package}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.mcp.supported && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h3 className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                MCP
              </h3>
              <dl className="space-y-2 text-sm">
                {product.mcp.endpoint && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Endpoint</dt>
                    <dd className="break-all font-mono text-foreground text-xs">
                      {product.mcp.endpoint}
                    </dd>
                  </div>
                )}
                {product.mcp.transport && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Transport</dt>
                    <dd className="text-foreground">{product.mcp.transport}</dd>
                  </div>
                )}
                {product.mcp.tools && product.mcp.tools.length > 0 && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Tools</dt>
                    <dd className="flex flex-wrap gap-1 pt-1">
                      {product.mcp.tools.map((t) => (
                        <span
                          className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          key={t}
                        >
                          {t}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {product.tags.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {product.agent?.notes && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h3 className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                Agent notes
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {product.agent.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-16">
          <Section title="Related tools">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
                  href={`/tools/${r.id}`}
                  key={r.id}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground text-sm">
                      {r.name}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {r.relation}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                    {r.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {r.category}
                    </span>
                    {r.mcp_supported && (
                      <span className="rounded border border-border bg-muted px-1.5 py-px font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                        MCP
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
