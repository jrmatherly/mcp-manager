/**
 * GitHub OAuth Provider Configuration
 *
 * Handles role mapping for GitHub OAuth users.
 * Supports username-based, organization-based, and email-based role assignment.
 */

import { authLogger, type LogContext } from "@/lib/logger";
import type { BetterAuthRole } from "@/types/better-auth";

// GitHub role mapping configuration
export interface GitHubRoleMapping {
  /** GitHub username, organization, or email pattern */
  identifier: string;
  /** Type of identifier */
  type: "username" | "organization" | "email" | "email_domain";
  /** Corresponding Better-Auth role */
  betterAuthRole: BetterAuthRole;
  /** Description for documentation */
  description?: string;
}

/**
 * Default GitHub-based role mappings
 * Customize these mappings based on your GitHub organization and users
 */
export const DEFAULT_GITHUB_ROLE_MAPPINGS: GitHubRoleMapping[] = [
  // Example: Admin users by GitHub username
  {
    identifier: "admin-user",
    type: "username",
    betterAuthRole: "admin",
    description: "Specific admin GitHub user",
  },

  // Example: Admin users by organization membership
  {
    identifier: "my-org-admins",
    type: "organization",
    betterAuthRole: "admin",
    description: "GitHub organization admins",
  },

  // Example: Server owners by organization
  {
    identifier: "my-org-ops",
    type: "organization",
    betterAuthRole: "server_owner",
    description: "Operations team organization",
  },

  // Example: Users by main organization
  {
    identifier: "my-organization",
    type: "organization",
    betterAuthRole: "user",
    description: "Main organization members",
  },

  // Example: Admin by email domain
  {
    identifier: "admin.example.com",
    type: "email_domain",
    betterAuthRole: "admin",
    description: "Admin email domain",
  },

  // Example: Users by email domain
  {
    identifier: "example.com",
    type: "email_domain",
    betterAuthRole: "user",
    description: "Organization email domain",
  },
];

/**
 * Maps GitHub user information to Better-Auth roles
 * Supports multiple mapping strategies: username, organization, email
 */
export function mapGitHubUserToBetterAuth(
  profile: {
    login?: string; // GitHub username
    email?: string; // Primary email
    organizations?: string[]; // Organization memberships (if available)
  },
  customMappings?: GitHubRoleMapping[],
): BetterAuthRole {
  const mappings = customMappings || DEFAULT_GITHUB_ROLE_MAPPINGS;
  const { login, email, organizations = [] } = profile;
  const emailDomain = email?.split("@")[1]?.toLowerCase();

  const context: LogContext = {
    username: login,
    email,
    emailDomain,
    organizationCount: organizations.length,
    mappingCount: mappings.length,
  };

  authLogger.debug("Mapping GitHub user to Better-Auth role", context);

  // Check mappings in priority order (admin > server_owner > user)
  for (const mapping of mappings) {
    let matches = false;

    switch (mapping.type) {
      case "username":
        matches = login?.toLowerCase() === mapping.identifier.toLowerCase();
        break;

      case "organization":
        matches = organizations.some((org) => org.toLowerCase() === mapping.identifier.toLowerCase());
        break;

      case "email":
        matches = email?.toLowerCase() === mapping.identifier.toLowerCase();
        break;

      case "email_domain":
        matches = emailDomain === mapping.identifier.toLowerCase();
        break;
    }

    if (matches) {
      authLogger.info("Found GitHub user role mapping", {
        identifier: mapping.identifier,
        type: mapping.type,
        role: mapping.betterAuthRole,
        description: mapping.description,
        matchedValue:
          mapping.type === "username"
            ? login
            : mapping.type === "email"
            ? email
            : mapping.type === "email_domain"
            ? emailDomain
            : organizations.join(", "),
      });
      return mapping.betterAuthRole;
    }
  }

  authLogger.warn("No role mapping found for GitHub user, defaulting to user", {
    username: login,
    email,
    emailDomain,
    organizations,
  });

  // Default to user role if no mapping found
  return "user";
}

/**
 * GitHub OAuth configuration for Better-Auth
 */
export const GITHUB_OAUTH_CONFIG = {
  // Standard GitHub OAuth scopes
  // Add 'read:org' scope if you want to check organization membership
  scope: ["user:email"], // Can be extended to ["user:email", "read:org"]
};

/**
 * Validates GitHub profile data and returns normalized user profile
 */
export function normalizeGitHubProfile(
  profile: {
    id?: number | string;
    name?: string;
    login?: string;
    email?: string;
    avatar_url?: string;
  },
  mappedRole: BetterAuthRole,
) {
  const normalizedProfile = {
    id: String(profile.id), // GitHub ID is numeric
    name: profile.name || profile.login, // Use login as fallback for name
    email: profile.email,
    image: profile.avatar_url,
    role: mappedRole,
  };

  authLogger.debug("Normalized GitHub profile", {
    hasId: !!normalizedProfile.id,
    hasName: !!normalizedProfile.name,
    hasEmail: !!normalizedProfile.email,
    hasImage: !!normalizedProfile.image,
    role: normalizedProfile.role,
    username: profile.login,
  });

  return normalizedProfile;
}

/**
 * Checks if a GitHub user should have elevated privileges
 * This is a convenience function for additional role validation
 */
export function isGitHubUserElevated(
  profile: {
    login?: string;
    email?: string;
    organizations?: string[];
  },
  customMappings?: GitHubRoleMapping[],
): boolean {
  const role = mapGitHubUserToBetterAuth(profile, customMappings);
  return role === "admin" || role === "server_owner";
}

/**
 * Helper function to fetch GitHub organizations for a user
 * This would typically be called separately if organization-based
 * role mapping is needed, as it requires additional API calls
 */
export async function fetchGitHubOrganizations(accessToken: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.github.com/user/orgs", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      authLogger.warn("Failed to fetch GitHub organizations", {
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const orgs = (await response.json()) as Array<{ login: string }>;
    const orgNames = orgs.map((org) => org.login);

    authLogger.debug("Fetched GitHub organizations", {
      count: orgNames.length,
      organizations: orgNames,
    });

    return orgNames;
  } catch (error) {
    authLogger.error("Error fetching GitHub organizations", {
      error: String(error),
    });
    return [];
  }
}
