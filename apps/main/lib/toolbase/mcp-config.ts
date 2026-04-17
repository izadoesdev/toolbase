const TOOLBASE_ENDPOINT = "https://toolbase.sh/api/mcp";

export interface McpConfigEntry {
  id: string;
  name: string;
  endpoint: string | null;
  envVar?: string | null;
}

function slug(id: string): string {
  return id.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

export function configForTool(entry: McpConfigEntry): string {
  const server: Record<string, unknown> = {
    url: entry.endpoint ?? TOOLBASE_ENDPOINT,
  };
  if (entry.envVar) {
    server.env = { [entry.envVar]: `$\{${entry.envVar}}` };
  }
  return JSON.stringify(
    { mcpServers: { [slug(entry.id)]: server } },
    null,
    2
  );
}

export function configForTools(entries: McpConfigEntry[]): string {
  const servers: Record<string, unknown> = {};
  const toolbaseFallback: string[] = [];
  for (const entry of entries) {
    if (!entry.endpoint) {
      toolbaseFallback.push(entry.id);
      continue;
    }
    const server: Record<string, unknown> = { url: entry.endpoint };
    if (entry.envVar) {
      server.env = { [entry.envVar]: `$\{${entry.envVar}}` };
    }
    servers[slug(entry.id)] = server;
  }
  if (toolbaseFallback.length > 0) {
    servers.toolbase = { url: TOOLBASE_ENDPOINT };
  }
  return JSON.stringify({ mcpServers: servers }, null, 2);
}

export const TOOLBASE_MCP_URL = TOOLBASE_ENDPOINT;
