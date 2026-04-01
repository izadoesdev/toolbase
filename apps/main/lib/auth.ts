import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer } from "better-auth/plugins";
import { db } from "./db";
/** biome-ignore lint/performance/noNamespaceImport: Drizzle adapter requires namespace import  DO NOT REMOVE THIS*/
import * as schema from "./db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "",
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
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  plugins: [
    admin(),
    bearer(),
    nextCookies(),
    apiKey({
      defaultPrefix: "tb_",
      // MCP keys need high limits — override the terrible 10/day default
      rateLimit: {
        maxRequests: 10_000,
        timeWindow: 60 * 60 * 1000, // per hour
      },
    }),
  ],
});
