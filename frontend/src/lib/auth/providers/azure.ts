/**
 * Azure AD / Microsoft OAuth Provider Configuration
 *
 * Handles role mapping from Azure AD app roles to Better-Auth roles.
 * This configuration supports both organizational and personal Microsoft accounts.
 */

import { authLogger, type LogContext } from "@/lib/logger";
import type { MicrosoftProfile, OAuthTokens, BetterAuthRole } from "@/types/better-auth";

// Azure AD role mapping configuration
export interface AzureRoleMapping {
  /** Azure AD app role name or built-in role */
  azureRole: string;
  /** Corresponding Better-Auth role */
  betterAuthRole: BetterAuthRole;
  /** Description for documentation */
  description?: string;
}

/**
 * Default Azure AD to Better-Auth role mappings
 * Customize these mappings based on your Azure AD app role configuration
 */
export const DEFAULT_AZURE_ROLE_MAPPINGS: AzureRoleMapping[] = [
  // Administrator roles - map to admin
  { azureRole: "Admin", betterAuthRole: "admin", description: "Custom app admin role" },
  { azureRole: "Administrator", betterAuthRole: "admin", description: "Generic administrator" },
  { azureRole: "Global Administrator", betterAuthRole: "admin", description: "Azure AD Global Admin" },
  { azureRole: "Application Administrator", betterAuthRole: "admin", description: "Azure AD Application Admin" },

  // Server owner roles - map to server_owner
  { azureRole: "Server Owner", betterAuthRole: "server_owner", description: "Custom server owner role" },
  { azureRole: "ServerOwner", betterAuthRole: "server_owner", description: "Server owner (no spaces)" },
  { azureRole: "Owner", betterAuthRole: "server_owner", description: "Generic owner role" },

  // User roles - map to user
  { azureRole: "User", betterAuthRole: "user", description: "Standard user role" },
  { azureRole: "Member", betterAuthRole: "user", description: "Organization member" },
  { azureRole: "Reader", betterAuthRole: "user", description: "Read-only user" },
];

/**
 * Maps Azure AD app roles to Better-Auth roles
 * Uses priority-based mapping (admin > server_owner > user)
 */
export function mapAzureRolesToBetterAuth(azureRoles: string[], customMappings?: AzureRoleMapping[]): BetterAuthRole {
  const mappings = customMappings || DEFAULT_AZURE_ROLE_MAPPINGS;
  const context: LogContext = { azureRoles, mappingCount: mappings.length };

  authLogger.debug("Mapping Azure roles to Better-Auth roles", context);

  // Create a lookup map for efficient role checking
  const roleMapping = new Map<string, BetterAuthRole>();
  mappings.forEach((mapping) => {
    roleMapping.set(mapping.azureRole, mapping.betterAuthRole);
  });

  // Check roles in priority order (admin > server_owner > user)
  const hasAdminRole = azureRoles.some((role) => roleMapping.get(role) === "admin");
  if (hasAdminRole) {
    const adminRoles = azureRoles.filter((role) => roleMapping.get(role) === "admin");
    authLogger.info("Mapped to admin role", { adminRoles });
    return "admin";
  }

  const hasServerOwnerRole = azureRoles.some((role) => roleMapping.get(role) === "server_owner");
  if (hasServerOwnerRole) {
    const serverOwnerRoles = azureRoles.filter((role) => roleMapping.get(role) === "server_owner");
    authLogger.info("Mapped to server_owner role", { serverOwnerRoles });
    return "server_owner";
  }

  const userRoles = azureRoles.filter((role) => roleMapping.get(role) === "user");
  if (userRoles.length > 0) {
    authLogger.info("Mapped to user role", { userRoles });
  } else {
    authLogger.warn("No role mapping found, defaulting to user", { azureRoles });
  }

  // Default to user role
  return "user";
}

/**
 * Azure AD OAuth configuration for Better-Auth
 * Includes scope configuration for accessing role information
 */
export const AZURE_OAUTH_CONFIG = {
  // Use 'common' to support both personal and organizational accounts
  // or specify your tenant ID for organization-only access
  authority: "https://login.microsoftonline.com",

  // Forces account selection screen for better UX
  prompt: "select_account" as const,

  // Request additional scopes to get role information
  scope: ["openid", "profile", "email", "https://graph.microsoft.com/User.Read"],
};

/**
 * Extracts roles from Azure AD token claims
 * Supports both ID tokens and access tokens
 */
export function extractRolesFromTokens(tokens: OAuthTokens): string[] {
  const extractedRoles: string[] = [];
  const context: LogContext = {
    hasIdToken: !!tokens.id_token,
    hasAccessToken: !!tokens.access_token,
  };

  authLogger.debug("Extracting roles from Azure AD tokens", context);

  // Try to get role information from ID token claims
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(atob(tokens.id_token.split(".")[1]));
      authLogger.debug("ID token payload extracted", {
        hasRoles: !!payload.roles,
        hasGroups: !!payload.groups,
        sub: payload.sub,
        aud: payload.aud,
        iss: payload.iss,
        preferred_username: payload.preferred_username,
      });

      // Log all available claims for debugging
      authLogger.debug("ID token claims", {
        roles: payload.roles || [],
        groups: payload.groups || [],
        appRoles: payload.app_roles || [],
        wids: payload.wids || [], // Well-known IDs for Azure AD built-in roles
      });

      // Check for roles in the token payload
      if (payload.roles && Array.isArray(payload.roles)) {
        extractedRoles.push(...payload.roles);
        authLogger.info("Roles found in ID token", { roles: payload.roles, count: payload.roles.length });
      }

      // Also check for app_roles (alternative claim name)
      if (payload.app_roles && Array.isArray(payload.app_roles)) {
        extractedRoles.push(...payload.app_roles);
        authLogger.info("App roles found in ID token", { appRoles: payload.app_roles, count: payload.app_roles.length });
      }

      // Check for groups if configured to emit as roles
      if (payload.groups && Array.isArray(payload.groups) && extractedRoles.length === 0) {
        authLogger.debug("Groups found in ID token (no roles present)", { groups: payload.groups, count: payload.groups.length });
        // Groups might contain role GUIDs if configured with emit_as_roles
        extractedRoles.push(...payload.groups);
      }
    } catch (error) {
      authLogger.error("Failed to parse ID token", { error: String(error) });
    }
  }

  // Also try access token if available and no roles found yet
  if (tokens.access_token && extractedRoles.length === 0) {
    try {
      const accessPayload = JSON.parse(atob(tokens.access_token.split(".")[1]));
      authLogger.debug("Access token payload extracted", { hasRoles: !!accessPayload.roles });

      if (accessPayload.roles && Array.isArray(accessPayload.roles)) {
        extractedRoles.push(...accessPayload.roles);
        authLogger.debug("Roles found in access token", { roles: accessPayload.roles });
      }
    } catch (error) {
      authLogger.warn("Could not parse access token", { error: String(error) });
    }
  }

  authLogger.info("Role extraction completed", {
    totalRoles: extractedRoles.length,
    roles: extractedRoles,
  });

  return extractedRoles;
}

/**
 * Validates Azure AD profile data and returns normalized user profile
 */
export function normalizeAzureProfile(profile: MicrosoftProfile, mappedRole: BetterAuthRole) {
  const normalizedProfile = {
    id: profile.id || profile.sub,
    name: profile.name || profile.displayName,
    email: profile.email || profile.mail || profile.userPrincipalName,
    image: profile.picture,
    role: mappedRole,
  };

  authLogger.debug("Normalized Azure profile", {
    hasId: !!normalizedProfile.id,
    hasName: !!normalizedProfile.name,
    hasEmail: !!normalizedProfile.email,
    hasImage: !!normalizedProfile.image,
    role: normalizedProfile.role,
  });

  return normalizedProfile;
}
