import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer } from "better-auth/plugins";
import { db } from "./db";
/** biome-ignore lint/performance/noNamespaceImport: Drizzle adapter requires namespace import  DO NOT REMOVE THIS*/
import * as schema from "./db/schema";
import { env } from "./env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: env.BETTER_AUTH_SECRET,
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
    nextCookies(),
    apiKey({
      defaultPrefix: "toolbase_",
      // MCP keys need high limits — override the terrible 10/day default
      rateLimit: {
        maxRequests: 10_000,
        timeWindow: 60 * 60 * 1000, // per hour
      },
    }),
  ],
});
