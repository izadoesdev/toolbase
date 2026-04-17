import { auth } from "@/lib/auth";
import { serverClient } from "@/lib/auth-server-client";
import { env } from "@/lib/env";

interface ApiVerifyResult {
  valid: boolean;
}

interface AgentSessionUser {
  id: string;
}

interface AgentSessionResult {
  user?: AgentSessionUser | null;
}

interface AuthWithExtras {
  api: typeof auth.api & {
    verifyApiKey: (opts: { body: { key: string } }) => Promise<ApiVerifyResult>;
    getAgentSession: (opts: {
      headers: Headers;
    }) => Promise<AgentSessionResult | null>;
  };
}

const authApi = auth as unknown as AuthWithExtras;

/**
 * Resolve an agent-auth session from a Bearer JWT. `auth.api.getAgentSession`
 * validates the JWT's signature, audience, JTI replay cache, and capability
 * grants. Returns the virtual user id produced by `resolveAutonomousUser`
 * (or the real user id for delegated agents).
 */
async function getUserIdFromAgentSession(
  headers: Headers
): Promise<string | null> {
  if (!headers.get("authorization")?.startsWith("Bearer ")) {
    return null;
  }
  try {
    const session = await authApi.api.getAgentSession({ headers });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

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
    const base = env.BETTER_AUTH_URL ?? "http://localhost:3000";
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
 * Resolve a caller's authorization once. Returns whether catalog writes are
 * permitted and the submitter's user id (when known). Agent-auth JWTs have
 * single-use JTIs — hitting `getAgentSession` twice in one request trips the
 * replay cache — so callers should use this single-pass helper rather than
 * calling `canMutateCatalog` and `getSessionUserId` separately.
 *
 * Accepted credentials:
 * - `x-api-key` header (programmatic MCP access)
 * - OAuth Bearer token from the MCP OAuth 2.1 flow
 * - Agent-auth Bearer JWT from a registered autonomous/delegated agent
 * - Better Auth session cookie or bearer session token (web UI)
 */
export async function resolveCallerAuth(
  headers: Headers
): Promise<{ allowWrite: boolean; userId: string | null }> {
  const apiKeyValue = headers.get("x-api-key");
  if (apiKeyValue) {
    const result = await authApi.api.verifyApiKey({
      body: { key: apiKeyValue },
    });
    return { allowWrite: result.valid, userId: null };
  }

  const oauthUserId = await getUserIdFromBearer(headers);
  if (oauthUserId) {
    return { allowWrite: true, userId: oauthUserId };
  }

  const agentUserId = await getUserIdFromAgentSession(headers);
  if (agentUserId) {
    return { allowWrite: true, userId: agentUserId };
  }

  try {
    const session = await auth.api.getSession({ headers });
    if (session?.user?.id) {
      return { allowWrite: true, userId: session.user.id };
    }
  } catch {
    // Better Auth can throw on malformed bearer tokens; treat as unauthenticated.
  }
  return { allowWrite: false, userId: null };
}

/** @deprecated prefer `resolveCallerAuth` — avoids duplicate JWT validation. */
export async function canMutateCatalog(headers: Headers): Promise<boolean> {
  const { allowWrite } = await resolveCallerAuth(headers);
  return allowWrite;
}

/** @deprecated prefer `resolveCallerAuth`. */
export async function getSessionUserId(
  headers: Headers
): Promise<string | null> {
  const { userId } = await resolveCallerAuth(headers);
  return userId;
}

/**
 * Admin access requires a session where user.role === "admin".
 * API keys and MCP OAuth tokens are not granted admin access.
 */
export async function isAdmin(headers: Headers): Promise<boolean> {
  const session = await auth.api.getSession({ headers });
  return session?.user?.role === "admin";
}
