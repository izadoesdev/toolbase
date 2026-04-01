import { auth } from "@/lib/auth";

interface ApiVerifyResult {
  valid: boolean;
}

interface AuthWithApiKey {
  api: typeof auth.api & {
    verifyApiKey: (opts: { body: { key: string } }) => Promise<ApiVerifyResult>;
  };
}

/**
 * Catalog writes require either:
 * - A valid API key in the `x-api-key` header  (MCP / programmatic access)
 * - An authenticated Better Auth session cookie or bearer token (web UI)
 */
export async function canMutateCatalog(headers: Headers): Promise<boolean> {
  const apiKeyValue = headers.get("x-api-key");
  if (apiKeyValue) {
    const result = await (auth as unknown as AuthWithApiKey).api.verifyApiKey({
      body: { key: apiKeyValue },
    });
    return result.valid;
  }
  const session = await auth.api.getSession({ headers });
  return Boolean(session?.user);
}

/**
 * Admin access requires a session where user.role === "admin".
 * API keys are not granted admin access.
 */
export async function isAdmin(headers: Headers): Promise<boolean> {
  const session = await auth.api.getSession({ headers });
  return session?.user?.role === "admin";
}

/**
 * Returns the current session user id, or null if not authenticated.
 */
export async function getSessionUserId(
  headers: Headers
): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}
