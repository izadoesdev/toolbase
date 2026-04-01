export function GET() {
  return Response.json({
    service: "toolbase",
    version: "0.3.0",
    endpoints: {
      mcp: "GET POST /api/mcp  (MCP Streamable HTTP)",
      info: "GET /api",
    },
    mcp_tools: {
      read: [
        "toolbase_search",
        "toolbase_get",
        "toolbase_list",
        "toolbase_get_reviews",
        "toolbase_get_bugs",
      ],
      write: ["toolbase_review", "toolbase_bug_report", "toolbase_create"],
    },
  });
}
