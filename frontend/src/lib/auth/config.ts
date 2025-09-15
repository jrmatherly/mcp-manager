/**
 * Authentication Configuration
 *
 * Central configuration for Better-Auth with provider-specific settings.
 * This file separates configuration concerns from the main auth implementation.
 */

import { env } from "@/env";
import { authLogger } from "@/lib/logger";
import { createAuthMiddleware } from "better-auth/api";
import type { AuthSession } from "@/types/better-auth";
import {
  extractRolesFromTokens,
  mapAzureRolesToBetterAuth,
  DEFAULT_PROVIDER_CONFIGURATIONS,
  type ProviderConfigurations,
  type AzureRoleMapping,
  type GoogleRoleMapping,
  type GitHubRoleMapping,
} from "./providers";

/**
 * Application-specific role mappings
 * Customize these based on your organization's requirements
 */
export const APP_ROLE_MAPPINGS = {
  azure: [
    // Azure AD Security Groups (actual groups from your organization)
    { azureRole: "SG WLH Admins", betterAuthRole: "admin", description: "WLH Admin Security Group" },
    { azureRole: "SG MEM SSC Users", betterAuthRole: "user", description: "MEM SSC Users Security Group" },

    // Azure AD app role mappings for MCP Registry Gateway (if using app roles)
    { azureRole: "admin", betterAuthRole: "admin", description: "MCP Registry Gateway Administrator" },
    { azureRole: "Admin", betterAuthRole: "admin", description: "Administrator role (capitalized)" },
    { azureRole: "Administrator", betterAuthRole: "admin", description: "Generic administrator" },
    { azureRole: "Server Owner", betterAuthRole: "server_owner", description: "MCP Server Owner" },
    { azureRole: "ServerOwner", betterAuthRole: "server_owner", description: "Server owner (no spaces)" },
    { azureRole: "User", betterAuthRole: "user", description: "Standard user role" },
  ] as AzureRoleMapping[],

  google: [
    // Add your Google email-based role mappings here
    // Example: { emailPattern: "yourcompany.com", isDomain: true, betterAuthRole: "user", description: "Company domain" },
  ] as GoogleRoleMapping[],

  github: [
    // Add your GitHub-based role mappings here
    // Example: { identifier: "your-org", type: "organization", betterAuthRole: "user", description: "Your organization" },
  ] as GitHubRoleMapping[],
};

/**
 * Provider configurations with environment-specific settings
 */
export const PROVIDER_CONFIGS: ProviderConfigurations = {
  azure: {
    ...DEFAULT_PROVIDER_CONFIGURATIONS.azure,
    roleMappings: APP_ROLE_MAPPINGS.azure,
    tenantId: env.AZURE_TENANT_ID,
  },
  google: {
    ...DEFAULT_PROVIDER_CONFIGURATIONS.google,
    roleMappings: APP_ROLE_MAPPINGS.google,
  },
  github: {
    ...DEFAULT_PROVIDER_CONFIGURATIONS.github,
    roleMappings: APP_ROLE_MAPPINGS.github,
  },
};

/**
 * Better-Auth admin plugin configuration
 */
export const ADMIN_CONFIG = {
  defaultRole: "user",
  adminRoles: ["admin"] as string[],
};

/**
 * API Key plugin configuration
 */
export const API_KEY_CONFIG = {
  // Custom header configuration for API key authentication
  apiKeyHeaders: ["x-api-key", "authorization"],

  // Custom getter to handle Bearer tokens and x-api-key headers
  customAPIKeyGetter: (ctx: { request?: Request }) => {
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
};

/**
 * Email verification configuration
 */
export const EMAIL_CONFIG = {
  requireEmailVerification: true,
  resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  sendOnSignUp: true,
  autoSignInAfterVerification: true,
};

/**
 * Account linking configuration
 */
export const ACCOUNT_CONFIG = {
  accountLinking: {
    enabled: true,
  },
};

/**
 * OAuth callback hook configuration using Better-Auth middleware
 */
export const OAUTH_HOOKS = {
  after: createAuthMiddleware(async (ctx) => {
    // Enhanced logging for all OAuth callbacks
    if (ctx.path?.includes("/callback/")) {
      const provider = ctx.path.split("/callback/")[1];
      authLogger.info("OAuth callback completed", {
        provider,
        path: ctx.path,
        hasUser: !!ctx.context?.newSession?.user,
        hasSession: !!ctx.context?.newSession,
        hasAccount: !!ctx.context?.account,
      });

      // Detailed logging and role processing for Microsoft OAuth callback
      if (provider === "microsoft") {
        authLogger.info("Microsoft OAuth callback details", {
          hasUser: !!ctx.context?.newSession?.user,
          hasSession: !!ctx.context?.newSession,
          hasAccount: !!ctx.context?.account,
          isNewUser: !!ctx.context?.isNewUser,
        });

        // Process Azure AD roles from tokens
        if (ctx.context?.account && ctx.context?.newSession?.user) {
          const account = ctx.context.account;
          const user = ctx.context.newSession.user;

          // Extract roles from Azure AD tokens
          const tokens = {
            id_token: account.idToken,
            access_token: account.accessToken,
          };

          try {
            const extractedRoles = extractRolesFromTokens(tokens);
            const mappedRole = mapAzureRolesToBetterAuth(extractedRoles, PROVIDER_CONFIGS.azure?.roleMappings);

            authLogger.info("Azure AD role mapping completed in OAuth hook", {
              extractedRoles,
              mappedRole,
              userId: user.id,
              customMappingsUsed: !!PROVIDER_CONFIGS.azure?.roleMappings?.length,
            });

            // Update user role if different from current role
            // This ensures roles are synced on every login, handling role changes in Azure AD
            if (user.role !== mappedRole) {
              authLogger.info("Updating user role from Azure AD", {
                currentRole: user.role,
                newRole: mappedRole,
                userId: user.id,
              });

              // Import the database and user schema to update the role
              const { db } = await import("@/db");
              const { user: userTable } = await import("@/db/schema/auth");
              const { eq } = await import("drizzle-orm");

              try {
                // Update the user's role in the database
                await db
                  .update(userTable)
                  .set({
                    role: mappedRole,
                    updatedAt: new Date(),
                    lastLoginAt: new Date(),
                  })
                  .where(eq(userTable.id, user.id));

                authLogger.info("User role successfully updated in database", {
                  userId: user.id,
                  newRole: mappedRole,
                });

                // Update the session user object to reflect the new role
                if (ctx.context.newSession) {
                  ctx.context.newSession.user.role = mappedRole;
                }
              } catch (dbError) {
                authLogger.error("Failed to update user role in database", {
                  error: String(dbError),
                  userId: user.id,
                  attemptedRole: mappedRole,
                });
              }
            } else {
              authLogger.debug("User role already matches Azure AD role", {
                role: mappedRole,
                userId: user.id,
              });

              // Still update lastLoginAt even if role hasn't changed
              const { db } = await import("@/db");
              const { user: userTable } = await import("@/db/schema/auth");
              const { eq } = await import("drizzle-orm");

              await db
                .update(userTable)
                .set({
                  lastLoginAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(userTable.id, user.id))
                .catch((error) => {
                  authLogger.warn("Failed to update lastLoginAt", { error: String(error) });
                });
            }
          } catch (error) {
            authLogger.error("Failed to process Azure AD roles in OAuth hook", {
              error: String(error),
              userId: user.id,
            });
          }
        }

        // Log user details after OAuth
        if (ctx.context?.newSession?.user) {
          const user = ctx.context.newSession.user;
          authLogger.info("User created/updated after Microsoft OAuth", {
            userId: user.id,
            userRole: (user as AuthSession["user"]).role || "user",
            userEmail: user.email,
            userName: user.name,
            emailVerified: user.emailVerified,
            isNewUser: !!ctx.context?.isNewUser,
          });
        }

        // Log account details
        if (ctx.context?.account) {
          const account = ctx.context.account;
          authLogger.debug("Microsoft account details", {
            accountId: account.id,
            providerId: account.providerId,
            providerAccountId: account.accountId,
            hasAccessToken: !!account.accessToken,
            hasIdToken: !!account.idToken,
            hasRefreshToken: !!account.refreshToken,
          });
        }
      }
    }
  }),
};

/**
 * Validates that required environment variables are present for enabled providers
 */
export function validateProviderConfig(): void {
  const issues: string[] = [];

  // Check GitHub configuration
  if (env.GITHUB_CLIENT_ID || env.GITHUB_CLIENT_SECRET) {
    if (!env.GITHUB_CLIENT_ID) {
      issues.push("GITHUB_CLIENT_ID is required when GitHub is enabled");
    }
    if (!env.GITHUB_CLIENT_SECRET) {
      issues.push("GITHUB_CLIENT_SECRET is required when GitHub is enabled");
    }
  }

  // Check Google configuration
  if (env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET) {
    if (!env.GOOGLE_CLIENT_ID) {
      issues.push("GOOGLE_CLIENT_ID is required when Google is enabled");
    }
    if (!env.GOOGLE_CLIENT_SECRET) {
      issues.push("GOOGLE_CLIENT_SECRET is required when Google is enabled");
    }
  }

  // Check Azure configuration
  if (env.AZURE_CLIENT_ID || env.AZURE_CLIENT_SECRET) {
    if (!env.AZURE_CLIENT_ID) {
      issues.push("AZURE_CLIENT_ID is required when Azure is enabled");
    }
    if (!env.AZURE_CLIENT_SECRET) {
      issues.push("AZURE_CLIENT_SECRET is required when Azure is enabled");
    }
  }

  if (issues.length > 0) {
    authLogger.warn("Provider configuration issues detected", { issues });
  } else {
    authLogger.debug("Provider configuration validation passed");
  }
}

/**
 * Gets enabled providers based on environment configuration
 */
export function getEnabledProviders(): string[] {
  const enabled: string[] = [];

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    enabled.push("github");
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    enabled.push("google");
  }
  if (env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET) {
    enabled.push("microsoft");
  }

  authLogger.debug("Enabled OAuth providers", { providers: enabled });
  return enabled;
}
