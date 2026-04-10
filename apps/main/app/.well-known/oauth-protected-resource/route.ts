import { serverClient } from "@/lib/auth-server-client";
import { env } from "@/lib/env";

const base = env.VERCEL_URL ?? "http://localhost:3000";

export async function GET() {
  const metadata = await serverClient.getProtectedResourceMetadata({
    resource: `${base}/api/mcp`,
    authorization_servers: [`${base}/api/auth`],
  });

  return new Response(JSON.stringify(metadata), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
