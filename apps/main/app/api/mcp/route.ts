import { handleMcpRequest } from "@/lib/mcp/http";

export const runtime = "nodejs";

// biome-ignore lint/suspicious/useAwait: Next.js route handlers must be async
export async function GET(request: Request) {
  return handleMcpRequest(request);
}

// biome-ignore lint/suspicious/useAwait: Next.js route handlers must be async
export async function POST(request: Request) {
  return handleMcpRequest(request);
}

// biome-ignore lint/suspicious/useAwait: Next.js route handlers must be async
export async function OPTIONS(request: Request) {
  return handleMcpRequest(request);
}
