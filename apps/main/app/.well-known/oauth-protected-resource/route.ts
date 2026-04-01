/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728)
 * Tells MCP clients that this server uses API key auth, not OAuth.
 * Clients use this to discover how to authenticate without trial-and-error.
 */
export function GET() {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return Response.json(
    {
      resource: `${base}/api/mcp`,
      // No OAuth authorization servers — use API key via x-api-key header
      authorization_servers: [],
      bearer_methods_supported: ["header"],
      resource_documentation: `${base}/api`,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
