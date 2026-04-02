import type { Product } from "./schema";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3-large";
const BATCH_SIZE = 128;

export function buildEmbeddingDoc(p: Product): string {
  const parts: string[] = [
    `${p.name}: ${p.tagline ?? ""}\n${p.description}`,
    `Category: ${p.category}`,
  ];
  if (p.subcategory) {
    parts.push(`Subcategory: ${p.subcategory}`);
  }
  if (p.capabilities.length > 0) {
    parts.push(`Capabilities: ${p.capabilities.join(", ")}`);
  }
  if (p.use_cases && p.use_cases.length > 0) {
    parts.push(`Use cases: ${p.use_cases.join(", ")}`);
  }
  if (p.tags.length > 0) {
    parts.push(`Tags: ${p.tags.join(", ")}`);
  }
  if (p.agent?.notes) {
    parts.push(`Agent notes: ${p.agent.notes}`);
  }
  if (p.mcp.supported) {
    parts.push("MCP supported");
  }
  return parts.join("\n");
}

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>;
}

async function voyageEmbed(
  input: string[],
  input_type: "document" | "query"
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY not set");
  }

  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: VOYAGE_MODEL, input, input_type }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voyage API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as VoyageResponse;
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedDocument(text: string): Promise<number[]> {
  const [emb] = await voyageEmbed([text], "document");
  return emb;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [emb] = await voyageEmbed([text], "query");
  return emb;
}

export async function embedDocumentsBatch(
  texts: string[]
): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const embeddings = await voyageEmbed(
      texts.slice(i, i + BATCH_SIZE),
      "document"
    );
    results.push(...embeddings);
  }
  return results;
}
