import { agentAuth } from "@better-auth/agent-auth";
import { apiKey } from "@better-auth/api-key";
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer, jwt } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/auth-schema";
import { env } from "./env";

const base = env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL: base,
  secret: env.BETTER_AUTH_SECRET,
  disabledPaths: ["/token"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // extend after 1 day of activity
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-min client cache — reduces DB hits on every request
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID ?? "",
      clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  plugins: [
    admin(),
    bearer(),
    jwt(),
    nextCookies(),
    apiKey({
      defaultPrefix: "toolbase_",
      rateLimit: {
        maxRequests: 10_000,
        timeWindow: 60 * 60 * 1000, // per hour
      },
    }),
    oauthProvider({
      loginPage: "/login",
      consentPage: "/consent",
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      validAudiences: [`${base}/api/mcp`],
    }),
    agentAuth({
      providerName: "Toolbase",
      providerDescription:
        "The directory of developer tools agents can run end-to-end. Register autonomously to submit reviews, bug reports, and new products.",
      modes: ["autonomous", "delegated"],
      allowDynamicHostRegistration: true,
      capabilities: [],
      resolveAutonomousUser: ({ hostId, agentId, hostName }) => ({
        id: `agent:${hostId}:${agentId}`,
        email: `${agentId}@agents.toolbase.sh`,
        name: hostName ? `${hostName} agent` : "Autonomous agent",
        emailVerified: true,
      }),
    }),
  ],
});
