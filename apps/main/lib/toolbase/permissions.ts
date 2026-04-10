import { auth } from "@/lib/auth";
import { serverClient } from "@/lib/auth-server-client";
import { env } from "@/lib/env";

interface ApiVerifyResult {
  valid: boolean;
}

interface AuthWithApiKey {
  api: typeof auth.api & {
    verifyApiKey: (opts: { body: { key: string } }) => Promise<ApiVerifyResult>;
  };
}

const authApi = auth as unknown as AuthWithApiKey;

/**
 * Extract a user id from an OAuth Bearer token via JWT verification.
 * Returns null if no Bearer token or invalid.
 */
async function getUserIdFromBearer(headers: Headers): Promise<string | null> {
  const authorization = headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const accessToken = authorization.slice(7);
  try {
    const base = env.VERCEL_URL ?? "http://localhost:3000";
    const payload = await serverClient.verifyAccessToken(accessToken, {
      verifyOptions: {
        audience: `${base}/api/mcp`,
        issuer: `${base}/api/auth`,
      },
      jwksUrl: `${base}/api/auth/jwks`,
    });
    return (payload as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Catalog writes require one of:
 * - A valid API key in the `x-api-key` header  (MCP / programmatic access)
 * - An OAuth Bearer token from the MCP OAuth 2.1 flow
 * - An authenticated Better Auth session cookie or bearer token (web UI)
 */
export async function canMutateCatalog(headers: Headers): Promise<boolean> {
  const apiKeyValue = headers.get("x-api-key");
  if (apiKeyValue) {
    const result = await authApi.api.verifyApiKey({
      body: { key: apiKeyValue },
    });
    return result.valid;
  }

  const oauthUserId = await getUserIdFromBearer(headers);
  if (oauthUserId) {
    return true;
  }

  const session = await auth.api.getSession({ headers });
  return Boolean(session?.user);
}

/**
 * Admin access requires a session where user.role === "admin".
 * API keys and MCP OAuth tokens are not granted admin access.
 */
export async function isAdmin(headers: Headers): Promise<boolean> {
  const session = await auth.api.getSession({ headers });
  return session?.user?.role === "admin";
}

/**
 * Returns the current user id from any auth method, or null if not authenticated.
 */
export async function getSessionUserId(
  headers: Headers
): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  if (session?.user?.id) {
    return session.user.id;
  }

  return getUserIdFromBearer(headers);
}
