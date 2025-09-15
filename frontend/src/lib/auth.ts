import { db } from "@/db";
import { env } from "../env";
import * as schema from "@/db/schema";
import { apiKey as apiKeyTable } from "@/db/schema/better-auth-api-key";
import { sendEmail } from "@/lib/email";
import { redisSecondaryStorage } from "@/lib/redis";
import { betterAuthLogger } from "@/lib/logger";
import { betterAuth } from "better-auth";
import { admin, apiKey, openAPI } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { BetterAuthLogger, MicrosoftProfile } from "@/types/better-auth";
import {
  ADMIN_CONFIG,
  API_KEY_CONFIG,
  EMAIL_CONFIG,
  ACCOUNT_CONFIG,
  OAUTH_HOOKS,
  PROVIDER_CONFIGS,
  validateProviderConfig,
} from "./auth/config";
import { AZURE_OAUTH_CONFIG, GOOGLE_OAUTH_CONFIG, GITHUB_OAUTH_CONFIG, mapAzureRolesToBetterAuth } from "./auth/providers";

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
  logger: betterAuthLogger as BetterAuthLogger,
  // Database hooks to ensure role updates during OAuth
  databaseHooks: {
    user: {
      update: {
        before: async (user, _context) => {
          // This hook runs before updating a user
          // We need to return the proper format for Better-Auth
          betterAuthLogger.debug("User update hook triggered", {
            userId: user.id,
            currentRole: user.role,
          });
          // Return data wrapper as required by Better-Auth
          return { data: user };
        },
      },
    },
  },
  // OAuth hooks for provider-specific handling
  hooks: {
    after: OAUTH_HOOKS.after,
  },
  // Custom user processing for OAuth providers
  user: {
    modelName: "user",
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        // Important: Set input to false to prevent users from setting their own role
        input: false,
      },
    },
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
            // Update user info on every sign-in to handle changes
            overrideUserInfoOnSignIn: true,
          }
        : undefined,
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            ...GOOGLE_OAUTH_CONFIG,
            // Update user info on every sign-in to handle changes
            overrideUserInfoOnSignIn: true,
          }
        : undefined,
    microsoft:
      env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET
        ? {
            clientId: env.AZURE_CLIENT_ID,
            clientSecret: env.AZURE_CLIENT_SECRET,
            tenantId: PROVIDER_CONFIGS.azure?.tenantId || env.AZURE_TENANT_ID,
            ...AZURE_OAUTH_CONFIG,
            // CRITICAL: Update user info on every sign-in to handle role changes
            overrideUserInfoOnSignIn: true,
            // Custom profile handler for Microsoft OAuth with role extraction
            mapProfileToUser: (profile: MicrosoftProfile) => {
              betterAuthLogger.debug("Processing Microsoft OAuth profile", {
                profileId: profile.id || profile.sub,
                profileEmail: profile.email || profile.mail || profile.userPrincipalName,
                hasRoles: !!profile.roles,
                hasAppRoles: !!profile.appRoles || !!profile.app_roles,
                hasGroups: !!profile.groups,
                rolesInProfile: profile.roles,
                appRolesInProfile: profile.appRoles || profile.app_roles,
                groupsInProfile: profile.groups,
              });

              // Extract roles from profile claims
              const extractedRoles: string[] = [];

              // Helper function to normalize claim values (string or array) to array
              const normalizeToArray = (value: string | string[] | undefined): string[] => {
                if (!value) {
                  return [];
                }
                return Array.isArray(value) ? value : [value];
              };

              // Check for roles in various claim names
              if (profile.roles) {
                const roles = normalizeToArray(profile.roles);
                if (roles.length > 0) {
                  extractedRoles.push(...roles);
                  betterAuthLogger.info("Roles found in profile.roles", { roles });
                }
              }

              if (profile.appRoles) {
                const appRoles = normalizeToArray(profile.appRoles);
                if (appRoles.length > 0) {
                  extractedRoles.push(...appRoles);
                  betterAuthLogger.info("Roles found in profile.appRoles", { appRoles });
                }
              }

              if (profile.app_roles) {
                const app_roles = normalizeToArray(profile.app_roles);
                if (app_roles.length > 0) {
                  extractedRoles.push(...app_roles);
                  betterAuthLogger.info("Roles found in profile.app_roles", { app_roles });
                }
              }

              // Use groups as fallback if no roles found
              if (extractedRoles.length === 0 && profile.groups) {
                const groups = normalizeToArray(profile.groups);
                if (groups.length > 0) {
                  extractedRoles.push(...groups);
                  betterAuthLogger.info("Using groups as roles (fallback)", { groups });
                }
              }

              // Map Azure roles to Better-Auth role
              let mappedRole = "user"; // Default role
              if (extractedRoles.length > 0) {
                mappedRole = mapAzureRolesToBetterAuth(extractedRoles, PROVIDER_CONFIGS.azure?.roleMappings);
                betterAuthLogger.info("Azure AD role mapping completed", {
                  extractedRoles,
                  mappedRole,
                  profileEmail: profile.email || profile.mail || profile.userPrincipalName,
                });
              } else {
                betterAuthLogger.warn("No roles found in Microsoft profile", {
                  profileEmail: profile.email || profile.mail || profile.userPrincipalName,
                  availableFields: Object.keys(profile),
                });
              }

              // CRITICAL: Based on the example project, when updating existing users,
              // we should ONLY return the fields we want to update.
              // For existing users, return minimal data to avoid overwriting
              // The example project returns only { role: mappedRole }

              // Always return the role, but for existing users, don't override other fields
              return {
                role: mappedRole,
                // Only update other fields if they're missing (for new users)
                ...(!(profile.email || profile.mail || profile.userPrincipalName)
                  ? {}
                  : {
                      email: profile.email || profile.mail || profile.userPrincipalName,
                    }),
                ...(!(profile.name || profile.displayName)
                  ? {}
                  : {
                      name: profile.name || profile.displayName,
                    }),
              };
            },
          }
        : undefined,
  },
  plugins: [nextCookies(), admin(ADMIN_CONFIG), apiKey(API_KEY_CONFIG), openAPI()],
});
