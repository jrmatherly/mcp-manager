import { db } from "@/db";
import * as schema from "@/db/schema";
import { apiKey as apiKeyTable } from "@/db/schema/better-auth-api-key";
import { sendEmail } from "@/lib/email";
import { redisSecondaryStorage } from "@/lib/redis";
import { betterAuth } from "better-auth";
import { admin, apiKey } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      // Use the Better-Auth compatible apiKey table
      apiKey: apiKeyTable,
    },
  }),
  // Redis secondary storage for high-performance caching
  secondaryStorage: redisSecondaryStorage,
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    microsoft: {
      clientId: process.env.AZURE_CLIENT_ID as string,
      clientSecret: process.env.AZURE_CLIENT_SECRET as string,
      // Use 'common' to support both personal and organizational accounts
      // or specify your tenant ID for organization-only access
      tenantId: process.env.AZURE_TENANT_ID || 'common',
      // Standard Microsoft Authentication authority
      authority: "https://login.microsoftonline.com",
      // Forces account selection screen for better UX
      prompt: "select_account",
    },
  },
  plugins: [
    nextCookies(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    apiKey({
      // Custom header configuration for API key authentication
      apiKeyHeaders: ["x-api-key", "authorization"],

      // Custom getter to handle Bearer tokens and x-api-key headers
      customAPIKeyGetter: (ctx) => {
        if (!ctx.request) {
          return null;
        }
        const authHeader = ctx.request.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          return authHeader.substring(7);
        }
        return ctx.request.headers.get("x-api-key");
      },

      // Default configuration for new API keys
      defaultKeyLength: 32,
      defaultPrefix: "mcp_",

      // Rate limiting defaults (can be overridden per token)
      rateLimit: {
        enabled: true,
        maxRequests: 1000,
        timeWindow: 1000 * 60 * 60, // 1 hour in milliseconds
      },

      // Enable metadata and permissions
      enableMetadata: true,
    }),
  ],
});
