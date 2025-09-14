/**
 * Google OAuth Provider Configuration
 *
 * Handles role mapping for Google OAuth users.
 * Since Google doesn't provide role information directly,
 * this configuration supports email domain-based role assignment.
 */

import { authLogger, type LogContext } from "@/lib/logger";

// Better-Auth role type
export type BetterAuthRole = "admin" | "server_owner" | "user";

// Google role mapping configuration based on email domains or specific emails
export interface GoogleRoleMapping {
  /** Email pattern or domain for matching */
  emailPattern: string;
  /** Whether this is a domain (true) or specific email (false) */
  isDomain: boolean;
  /** Corresponding Better-Auth role */
  betterAuthRole: BetterAuthRole;
  /** Description for documentation */
  description?: string;
}

/**
 * Default Google email-based role mappings
 * Customize these mappings based on your organization's email domains
 */
export const DEFAULT_GOOGLE_ROLE_MAPPINGS: GoogleRoleMapping[] = [
  // Example: Admin users by specific email
  {
    emailPattern: "admin@example.com",
    isDomain: false,
    betterAuthRole: "admin",
    description: "Specific admin email",
  },

  // Example: Admin users by domain
  {
    emailPattern: "admin.example.com",
    isDomain: true,
    betterAuthRole: "admin",
    description: "Admin domain",
  },

  // Example: Server owners by domain
  {
    emailPattern: "ops.example.com",
    isDomain: true,
    betterAuthRole: "server_owner",
    description: "Operations team domain",
  },

  // Example: Organization users by main domain
  {
    emailPattern: "example.com",
    isDomain: true,
    betterAuthRole: "user",
    description: "Main organization domain",
  },
];

/**
 * Maps Google user email to Better-Auth roles
 * Uses email domain or specific email matching
 */
export function mapGoogleEmailToBetterAuth(email: string, customMappings?: GoogleRoleMapping[]): BetterAuthRole {
  const mappings = customMappings || DEFAULT_GOOGLE_ROLE_MAPPINGS;
  const emailDomain = email.split("@")[1]?.toLowerCase();
  const emailLower = email.toLowerCase();

  const context: LogContext = {
    email: emailLower,
    domain: emailDomain,
    mappingCount: mappings.length,
  };

  authLogger.debug("Mapping Google email to Better-Auth role", context);

  // Check mappings in priority order (admin > server_owner > user)
  for (const mapping of mappings) {
    let matches = false;

    if (mapping.isDomain) {
      // Domain-based matching
      matches = emailDomain === mapping.emailPattern.toLowerCase();
    } else {
      // Specific email matching
      matches = emailLower === mapping.emailPattern.toLowerCase();
    }

    if (matches) {
      authLogger.info("Found Google email role mapping", {
        email: emailLower,
        pattern: mapping.emailPattern,
        role: mapping.betterAuthRole,
        isDomain: mapping.isDomain,
        description: mapping.description,
      });
      return mapping.betterAuthRole;
    }
  }

  authLogger.warn("No role mapping found for Google email, defaulting to user", {
    email: emailLower,
    domain: emailDomain,
  });

  // Default to user role if no mapping found
  return "user";
}

/**
 * Google OAuth configuration for Better-Auth
 */
export const GOOGLE_OAUTH_CONFIG = {
  // Forces account selection screen for better UX
  prompt: "select_account" as const,
};

/**
 * Validates Google profile data and returns normalized user profile
 */
export function normalizeGoogleProfile(
  profile: {
    id?: string;
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
  },
  mappedRole: BetterAuthRole,
) {
  const normalizedProfile = {
    id: profile.id || profile.sub,
    name: profile.name,
    email: profile.email,
    image: profile.picture,
    role: mappedRole,
  };

  authLogger.debug("Normalized Google profile", {
    hasId: !!normalizedProfile.id,
    hasName: !!normalizedProfile.name,
    hasEmail: !!normalizedProfile.email,
    hasImage: !!normalizedProfile.image,
    role: normalizedProfile.role,
  });

  return normalizedProfile;
}

/**
 * Checks if a Google user should have elevated privileges
 * This is a convenience function for additional role validation
 */
export function isGoogleUserElevated(email: string, customMappings?: GoogleRoleMapping[]): boolean {
  const role = mapGoogleEmailToBetterAuth(email, customMappings);
  return role === "admin" || role === "server_owner";
}
