/**
 * Authentication Module Index
 *
 * Central export point for all authentication-related functionality.
 * This provides a clean interface for importing auth components
 * throughout the application.
 */

// Export the main auth instance
export { auth } from "../auth";

// Export configuration utilities
export {
  ADMIN_CONFIG,
  API_KEY_CONFIG,
  EMAIL_CONFIG,
  ACCOUNT_CONFIG,
  OAUTH_HOOKS,
  PROVIDER_CONFIGS,
  validateProviderConfig,
  getEnabledProviders,
  APP_ROLE_MAPPINGS,
} from "./config";

// Export all provider configurations and utilities
export * from "./providers";

// Re-export commonly used types
export type {
  BetterAuthRole,
  AzureRoleMapping,
  GoogleRoleMapping,
  GitHubRoleMapping,
  ProviderConfigurations,
} from "./providers";