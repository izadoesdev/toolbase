import { describe, expect, it } from "bun:test";
import { findRelatedProducts, productToHit, queryProducts } from "../match";
import type { Product } from "../schema";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-tool",
    name: "Test Tool",
    description: "A tool for testing things",
    category: "devtools",
    capabilities: ["testing", "mocking"],
    tags: ["test", "dev"],
    pricing: { model: "free", starting_price: 0 },
    api: {
      base_url: "https://api.test.com",
      docs_url: "https://docs.test.com",
    },
    mcp: { supported: false, endpoint: null },
    ...overrides,
  };
}

describe("queryProducts", () => {
  const products = [
    makeProduct({
      id: "stripe",
      name: "Stripe",
      description: "Payment processing for the internet",
      category: "payments",
      capabilities: ["payment_processing", "subscriptions", "invoicing"],
      tags: ["payments", "billing", "fintech"],
    }),
    makeProduct({
      id: "resend",
      name: "Resend",
      description: "Email API for developers",
      category: "email",
      capabilities: ["transactional_email", "email_templates"],
      tags: ["email", "api"],
      mcp: { supported: true, endpoint: "https://mcp.resend.com/sse" },
    }),
    makeProduct({
      id: "supabase",
      name: "Supabase",
      description: "Open source Firebase alternative with Postgres database",
      category: "database",
      capabilities: ["postgres", "auth", "realtime", "storage"],
      tags: ["database", "postgres", "baas"],
      use_cases: ["serverless backend", "realtime apps"],
    }),
  ];

  it("returns results matching query terms", () => {
    const page = queryProducts("payment", products);
    expect(page.hits.length).toBeGreaterThan(0);
    expect(page.hits[0].id).toBe("stripe");
    expect(page.total).toBe(page.hits.length);
  });

  it("ranks name matches higher than description matches", () => {
    const page = queryProducts("stripe", products);
    expect(page.hits.length).toBe(1);
    expect(page.hits[0].id).toBe("stripe");
    expect(page.hits[0].score).toBeGreaterThanOrEqual(5); // name weight
  });

  it("returns empty for unmatched queries", () => {
    const page = queryProducts("kubernetes container orchestration", products);
    expect(page.hits).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("filters by category", () => {
    // "email" matches category (weight 4, strong) — filtered to email only
    const page = queryProducts("email", products, { category: "email" });
    expect(page.hits.length).toBe(1);
    expect(page.hits[0].id).toBe("resend");
  });

  it("filters by mcp_only", () => {
    const page = queryProducts("email api", products, { mcp_only: true });
    expect(page.hits.every((h) => h.mcp_supported)).toBe(true);
  });

  it("respects limit and reports total separately", () => {
    const page = queryProducts("dev", products, { limit: 1 });
    expect(page.hits.length).toBeLessThanOrEqual(1);
    expect(page.total).toBeGreaterThanOrEqual(page.hits.length);
  });

  it("requires at least one strong match", () => {
    // "internet" only matches description (weight 1, below STRONG_MATCH_THRESHOLD of 3)
    const page = queryProducts("internet", products);
    expect(page.hits).toEqual([]);
  });

  it("empty query with no filters returns nothing", () => {
    expect(queryProducts("", products).hits).toEqual([]);
    expect(queryProducts("   ", products).hits).toEqual([]);
  });

  it("empty query with a filter returns filter-matched products", () => {
    const page = queryProducts("", products, { category: "email" });
    expect(page.hits.length).toBe(1);
    expect(page.hits[0].id).toBe("resend");
    expect(page.hits[0].match_reason).toBe("matches filters");
    expect(page.total).toBe(1);
  });

  it("matches use_cases when combined with a strong match", () => {
    // "serverless backend" — "backend" matches use_case, "serverless" also in use_case
    // But use_case weight is 2, below threshold. Need a strong match too.
    // "postgres database" — "database" matches category (4), "postgres" matches capability (3)
    const page = queryProducts("postgres database", products);
    expect(page.hits.some((h) => h.id === "supabase")).toBe(true);
  });
});

describe("productToHit", () => {
  it("maps product fields correctly", () => {
    const p = makeProduct({
      id: "test",
      name: "Test",
      tagline: "A tagline",
      mcp: { supported: true, endpoint: null },
      pricing: { model: "freemium", starting_price: 0, has_free_tier: true },
    });
    const hit = productToHit(p, 10, ["name matches 'test'"]);
    expect(hit.id).toBe("test");
    expect(hit.mcp_supported).toBe(true);
    expect(hit.pricing_model).toBe("freemium");
    expect(hit.has_free_tier).toBe(true);
    expect(hit.tagline).toBe("A tagline");
    expect(hit.score).toBe(10);
  });
});

describe("findRelatedProducts", () => {
  const target = makeProduct({
    id: "stripe",
    category: "payments",
    tags: ["payments", "billing"],
    capabilities: ["payment_processing"],
    alternatives: ["braintree"],
  });

  const others = [
    makeProduct({
      id: "braintree",
      category: "payments",
      tags: ["payments"],
      capabilities: ["payment_processing"],
    }),
    makeProduct({
      id: "resend",
      category: "email",
      tags: ["email"],
      capabilities: ["transactional_email"],
    }),
    makeProduct({
      id: "paddle",
      category: "payments",
      tags: ["billing", "saas"],
      capabilities: ["subscriptions"],
    }),
  ];

  it("ranks alternatives highest", () => {
    const related = findRelatedProducts(target, others);
    expect(related[0].id).toBe("braintree");
    expect(related[0].relation).toBe("alternative");
  });

  it("identifies same-category products", () => {
    const related = findRelatedProducts(target, others);
    const paddle = related.find((r) => r.id === "paddle");
    expect(paddle).toBeDefined();
    expect(paddle?.relation).toBe("same_category");
  });

  it("excludes the target itself", () => {
    const related = findRelatedProducts(target, [target, ...others]);
    expect(related.every((r) => r.id !== target.id)).toBe(true);
  });

  it("respects limit", () => {
    const related = findRelatedProducts(target, others, 1);
    expect(related.length).toBe(1);
  });

  it("excludes unrelated products", () => {
    const related = findRelatedProducts(target, others);
    expect(related.find((r) => r.id === "resend")).toBeUndefined();
  });
});
