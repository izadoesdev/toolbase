import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp";
import { createMcpServer } from "@/lib/mcp/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { canMutateCatalog, getSessionUserId } from "@/lib/toolbase/permissions";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-api-key, Cookie, mcp-session-id, Last-Event-ID, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

/**
 * Validate the Origin header to prevent DNS rebinding attacks (MCP spec §Auth).
 * Non-browser clients (CLI tools, Claude Code) don't send Origin, so we only
 * reject requests that DO send an unexpected origin.
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    return true; // non-browser / direct API call — always allow
  }
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "toolbase.sh" ||
      hostname.endsWith(".toolbase.sh")
    );
  } catch {
    return false;
  }
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

/** Stateless Streamable HTTP MCP — one transport + server per request. */
export async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: new Headers(CORS_HEADERS),
    });
  }

  const origin = request.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      return withCors(
        new Response("Too Many Requests", {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        })
      );
    }
  }

  const allowWrite = await canMutateCatalog(request.headers);
  const submittedBy = await getSessionUserId(request.headers);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const mcp = createMcpServer({ allowWrite, submittedBy });
  await mcp.connect(transport);
  const response = await transport.handleRequest(request);
  return withCors(response);
}
