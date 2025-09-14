import { db } from "@/db";
import { env } from "../env";
import * as schema from "@/db/schema";
import { apiKey as apiKeyTable } from "@/db/schema/better-auth-api-key";
import { sendEmail } from "@/lib/email";
import { redisSecondaryStorage } from "@/lib/redis";
import { betterAuthLogger } from "@/lib/logger";
import { betterAuth } from "better-auth";
import { admin, apiKey } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  ADMIN_CONFIG,
  API_KEY_CONFIG,
  EMAIL_CONFIG,
  ACCOUNT_CONFIG,
  OAUTH_HOOKS,
  PROVIDER_CONFIGS,
  validateProviderConfig,
} from "./auth/config";
import { AZURE_OAUTH_CONFIG, GOOGLE_OAUTH_CONFIG, GITHUB_OAUTH_CONFIG } from "./auth/providers";

// Validate provider configuration on module load
validateProviderConfig();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      // Use the Better-Auth compatible apiKey table (lowercase key required by Better-Auth)
      apikey: apiKeyTable,
    },
  }),
  // Redis secondary storage for high-performance caching
  secondaryStorage: redisSecondaryStorage,
  // Integrated logger using existing logger infrastructure
  logger: betterAuthLogger,
  // OAuth hooks for provider-specific handling
  hooks: {
    after: OAUTH_HOOKS.after,
  },
  // Account linking configuration
  account: ACCOUNT_CONFIG,
  // Email and password configuration
  emailAndPassword: {
    enabled: true,
    ...EMAIL_CONFIG,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
    ...EMAIL_CONFIG,
  },
  socialProviders: {
    github:
      env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            ...GITHUB_OAUTH_CONFIG,
          }
        : undefined,
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            ...GOOGLE_OAUTH_CONFIG,
          }
        : undefined,
    microsoft:
      env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET
        ? {
            clientId: env.AZURE_CLIENT_ID,
            clientSecret: env.AZURE_CLIENT_SECRET,
            tenantId: PROVIDER_CONFIGS.azure?.tenantId || env.AZURE_TENANT_ID,
            ...AZURE_OAUTH_CONFIG,
          }
        : undefined,
  },
  plugins: [
    nextCookies(),
    admin({
      ...ADMIN_CONFIG,
      adminRoles: [...ADMIN_CONFIG.adminRoles],
    }),
    apiKey(API_KEY_CONFIG),
  ],
});
