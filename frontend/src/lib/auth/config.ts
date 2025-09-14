/**
 * Authentication Configuration
 *
 * Central configuration for Better-Auth with provider-specific settings.
 * This file separates configuration concerns from the main auth implementation.
 */

import { env } from "@/env";
import { authLogger } from "@/lib/logger";
import { createAuthMiddleware } from "better-auth/api";
import {
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
    // Add your Azure AD app role mappings here
    // Example: { azureRole: "MyApp.Admin", betterAuthRole: "admin", description: "Custom app admin" },
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
    // Check if this is a Microsoft OAuth callback
    if (ctx.path === "/callback/microsoft") {
      authLogger.info("Microsoft OAuth callback completed", {
        hasUser: !!ctx.context?.newSession?.user,
        hasSession: !!ctx.context?.newSession,
      });

      // Log role assignment for debugging
      if (ctx.context?.newSession?.user) {
        const user = ctx.context.newSession.user;
        authLogger.debug("User role after OAuth", {
          userId: user.id,
          userRole: user.role || "user",
          userEmail: user.email,
        });
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
