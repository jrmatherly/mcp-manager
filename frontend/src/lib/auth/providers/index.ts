/**
 * OAuth Provider Configurations Index
 *
 * Centralized exports for all OAuth provider configurations.
 * This file provides a single import point for all provider-specific
 * role mapping and configuration logic.
 */

// Export Azure AD provider
export * from "./azure";
export {
  mapAzureRolesToBetterAuth,
  extractRolesFromTokens,
  normalizeAzureProfile,
  AZURE_OAUTH_CONFIG,
  DEFAULT_AZURE_ROLE_MAPPINGS,
  type AzureRoleMapping,
} from "./azure";

// Export Google provider
export * from "./google";
export {
  mapGoogleEmailToBetterAuth,
  normalizeGoogleProfile,
  isGoogleUserElevated,
  GOOGLE_OAUTH_CONFIG,
  DEFAULT_GOOGLE_ROLE_MAPPINGS,
  type GoogleRoleMapping,
} from "./google";

// Export GitHub provider
export * from "./github";
export {
  mapGitHubUserToBetterAuth,
  normalizeGitHubProfile,
  isGitHubUserElevated,
  fetchGitHubOrganizations,
  GITHUB_OAUTH_CONFIG,
  DEFAULT_GITHUB_ROLE_MAPPINGS,
  type GitHubRoleMapping,
} from "./github";

// Common types used across providers
export type { BetterAuthRole } from "./azure"; // Re-export from any provider since they're the same

/**
 * Provider-specific configuration interfaces
 * These can be used to define custom configurations for each provider
 */
export interface ProviderConfigurations {
  azure?: {
    roleMappings?: import("./azure").AzureRoleMapping[];
    tenantId?: string;
    authority?: string;
  };
  google?: {
    roleMappings?: import("./google").GoogleRoleMapping[];
    prompt?: string;
  };
  github?: {
    roleMappings?: import("./github").GitHubRoleMapping[];
    scope?: string;
    includeOrganizations?: boolean;
  };
}

/**
 * Default provider configurations
 * This can be customized based on your application's needs
 */
export const DEFAULT_PROVIDER_CONFIGURATIONS: ProviderConfigurations = {
  azure: {
    tenantId: "common", // Support both personal and organizational accounts
    authority: "https://login.microsoftonline.com",
  },
  google: {
    prompt: "select_account",
  },
  github: {
    scope: "user:email",
    includeOrganizations: false, // Set to true if you want to fetch org memberships
  },
};
