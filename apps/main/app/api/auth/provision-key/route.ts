import { headers } from "next/headers";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

interface ApiKeyCreateResult {
  id: string;
  key: string;
}

interface AuthWithApiKey {
  api: typeof auth.api & {
    createApiKey: (opts: {
      body: { name: string; userId: string };
    }) => Promise<ApiKeyCreateResult>;
    listApiKeys: (opts: { body: { userId: string } }) => Promise<{
      apiKeys: Array<{ id: string; name: string | null; start: string | null }>;
    }>;
  };
}

const authApi = auth as unknown as AuthWithApiKey;

export async function POST() {
  await connection();
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await authApi.api.listApiKeys({
    body: { userId: session.user.id },
  });

  if (existing.apiKeys.length > 0) {
    return Response.json({
      provisioned: false,
      message: "You already have an API key. Check your settings page.",
      key_prefix: existing.apiKeys[0].start,
    });
  }

  const result = await authApi.api.createApiKey({
    body: {
      name: "MCP (auto-provisioned)",
      userId: session.user.id,
    },
  });

  return Response.json({
    provisioned: true,
    key: result.key,
    message:
      "API key created. Save it now — it won't be shown again. Add it as x-api-key header in your MCP config.",
  });
}
