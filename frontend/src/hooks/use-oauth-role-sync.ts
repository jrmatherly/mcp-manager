/**
 * OAuth Role Synchronization Hook
 *
 * This hook handles role synchronization after OAuth authentication,
 * ensuring that user roles from external providers (Azure AD, GitHub, Google)
 * are properly persisted to the database.
 */

import { authLogger } from "@/lib/logger";
import type { AuthSession } from "@/types/better-auth";
import { createAuthMiddleware } from "better-auth/api";

/**
 * Creates an OAuth callback middleware that synchronizes user roles
 * from OAuth providers to the database after successful authentication.
 *
 * Features:
 * - Detects OAuth callbacks from various providers
 * - Extracts and validates user roles from session data
 * - Updates database with latest role information
 * - Comprehensive logging for debugging and auditing
 *
 * @returns Better-Auth middleware for OAuth callbacks
 */
export function createOAuthRoleSyncMiddleware() {
  return createAuthMiddleware(async (ctx) => {
    const pathIncludesCallback = ctx.path?.includes("/callback/");
    const requestUrl = ctx.request?.url || "";

    // Skip if not a callback
    if (!pathIncludesCallback) {
      return;
    }

    // Extract provider from path
    const provider = ctx.path.split("/callback/")[1] || "unknown";

    // Detect specific providers (handle parameterized routes)
    const isMicrosoftCallback =
      provider === "microsoft" || (provider === ":id" && (requestUrl.includes("/callback/microsoft") || requestUrl.includes("microsoft")));

    const isGoogleCallback = provider === "google" || (provider === ":id" && requestUrl.includes("/callback/google"));

    const isGitHubCallback = provider === "github" || (provider === ":id" && requestUrl.includes("/callback/github"));

    // Log callback details
    authLogger.info("OAuth callback detected", {
      provider,
      path: ctx.path,
      requestUrl: requestUrl.substring(0, 100),
      isMicrosoftCallback,
      isGoogleCallback,
      isGitHubCallback,
      hasUser: !!ctx.context?.newSession?.user,
      hasSession: !!ctx.context?.newSession,
      hasAccount: !!ctx.context?.account,
    });

    // Process role synchronization if we have a new session with user data
    if (ctx.context?.newSession?.user) {
      // Cast the user to our extended type since Better-Auth's types might not include our custom fields
      const userWithRole = ctx.context.newSession.user as unknown as AuthSession["user"];

      // Log the current state for debugging
      authLogger.info("OAuth callback - user session data", {
        userId: userWithRole.id,
        currentRole: userWithRole.role,
        email: userWithRole.email,
        provider,
        isNewUser: !!ctx.context?.isNewUser,
      });

      // For existing users, the role might not be updated properly by Better-Auth
      // Only try to fix it if we have the necessary data
      let correctRole = userWithRole.role || "user";

      // Check if we have account data with tokens (might not be available for existing users)
      if (isMicrosoftCallback && ctx.context?.account) {
        // For Microsoft users, Better-Auth doesn't update custom fields like 'role'
        // We need to extract roles from OAuth tokens and re-map them
        authLogger.info("Re-computing role from Microsoft OAuth tokens", {
          userId: userWithRole.id,
          currentRole: userWithRole.role,
          email: userWithRole.email,
          hasIdToken: !!ctx.context.account.idToken,
          hasAccessToken: !!ctx.context.account.accessToken,
        });

        // Import utilities for role extraction and mapping
        const { extractRolesFromTokens, mapAzureRolesToBetterAuth } = await import("@/lib/auth/providers");
        const { PROVIDER_CONFIGS } = await import("@/lib/auth/config");

        // Extract roles from OAuth tokens
        const tokens = {
          id_token: ctx.context.account.idToken || undefined,
          access_token: ctx.context.account.accessToken || undefined,
        };

        const extractedRoles = extractRolesFromTokens(tokens);

        if (extractedRoles.length > 0) {
          // Map extracted roles using configured mappings
          const mappedRole = mapAzureRolesToBetterAuth(extractedRoles, PROVIDER_CONFIGS.azure?.roleMappings);

          authLogger.info("Successfully mapped Azure roles to Better-Auth role", {
            userId: userWithRole.id,
            extractedRoles,
            mappedRole,
            previousRole: userWithRole.role,
          });

          correctRole = mappedRole;
        } else {
          authLogger.warn("No roles found in OAuth tokens, will use existing role", {
            userId: userWithRole.id,
            existingRole: userWithRole.role,
          });
        }
      } else if (isMicrosoftCallback && !ctx.context?.account) {
        // Account data not available in context (common for existing users)
        // For existing users, we need to fetch the correct role from the database
        // or use a session-based approach
        authLogger.warn("No account data available in OAuth callback context", {
          userId: userWithRole.id,
          currentRole: userWithRole.role,
          provider,
          hasAccount: !!ctx.context?.account,
        });

        // As a fallback, check if this is a known admin user
        // In production, you would query the user's accounts table to get latest tokens
        // or make an API call to refresh role information from Azure AD

        // Import utilities for querying the database
        const { db } = await import("@/db");
        const { account: accountTable } = await import("@/db/schema/auth");
        const { eq, and, desc } = await import("drizzle-orm");

        try {
          // Try to get the most recent Microsoft account for this user
          const accounts = await db
            .select()
            .from(accountTable)
            .where(and(eq(accountTable.userId, userWithRole.id), eq(accountTable.providerId, "microsoft")))
            .orderBy(desc(accountTable.updatedAt))
            .limit(1);

          if (accounts.length > 0 && accounts[0].idToken) {
            authLogger.info("Found Microsoft account with tokens in database", {
              userId: userWithRole.id,
              hasIdToken: !!accounts[0].idToken,
              hasAccessToken: !!accounts[0].accessToken,
            });

            // Extract roles from stored tokens
            const { extractRolesFromTokens, mapAzureRolesToBetterAuth } = await import("@/lib/auth/providers");
            const { PROVIDER_CONFIGS } = await import("@/lib/auth/config");

            const tokens = {
              id_token: accounts[0].idToken || undefined,
              access_token: accounts[0].accessToken || undefined,
            };

            const extractedRoles = extractRolesFromTokens(tokens);

            if (extractedRoles.length > 0) {
              const mappedRole = mapAzureRolesToBetterAuth(extractedRoles, PROVIDER_CONFIGS.azure?.roleMappings);

              authLogger.info("Mapped roles from stored tokens", {
                userId: userWithRole.id,
                extractedRoles,
                mappedRole,
              });

              correctRole = mappedRole;
            }
          }
        } catch (error) {
          authLogger.error("Failed to fetch account data from database", {
            error: String(error),
            userId: userWithRole.id,
          });
        }
      }

      // Create a user object with the correct role
      const userWithCorrectRole = {
        ...userWithRole,
        role: correctRole as AuthSession["user"]["role"],
      };

      await syncUserRole(
        { user: userWithCorrectRole },
        {
          isMicrosoftCallback,
          isGoogleCallback,
          isGitHubCallback,
          provider,
          isNewUser: !!ctx.context?.isNewUser,
        },
      );
    }
  });
}

/**
 * Synchronizes user role from OAuth session to database
 *
 * @param session - The Better-Auth session containing user data
 * @param options - Provider detection flags and metadata
 */
async function syncUserRole(
  session: { user: AuthSession["user"] }, // Better-Auth session with typed user
  options: {
    isMicrosoftCallback: boolean;
    isGoogleCallback: boolean;
    isGitHubCallback: boolean;
    provider: string;
    isNewUser: boolean;
  },
) {
  const user = session.user as AuthSession["user"];

  // Skip if no user ID or role
  if (!user?.id || !user?.role) {
    authLogger.debug("Skipping role sync - missing user ID or role", {
      hasUserId: !!user?.id,
      hasRole: !!user?.role,
      provider: options.provider,
    });
    return;
  }

  // Log provider-specific details
  if (options.isMicrosoftCallback) {
    authLogger.info("Microsoft OAuth user details", {
      userId: user.id,
      currentRole: user.role,
      userEmail: user.email,
      isNewUser: options.isNewUser,
    });
  } else if (options.isGoogleCallback) {
    authLogger.info("Google OAuth user details", {
      userId: user.id,
      currentRole: user.role,
      userEmail: user.email,
      isNewUser: options.isNewUser,
    });
  } else if (options.isGitHubCallback) {
    authLogger.info("GitHub OAuth user details", {
      userId: user.id,
      currentRole: user.role,
      userEmail: user.email,
      isNewUser: options.isNewUser,
    });
  }

  // For existing users, Better-Auth doesn't automatically update the role
  // We need to explicitly update it in the database
  if (!options.isNewUser) {
    authLogger.info("Updating existing user role in database", {
      userId: user.id,
      role: user.role,
      provider: options.provider,
    });

    try {
      // Dynamic imports to avoid circular dependencies
      const { db } = await import("@/db");
      const { user: userTable } = await import("@/db/schema/auth");
      const { eq } = await import("drizzle-orm");

      // Update user role and timestamps
      const result = await db
        .update(userTable)
        .set({
          role: user.role,
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        })
        .where(eq(userTable.id, user.id))
        .returning();

      if (result && result.length > 0) {
        authLogger.info("User role successfully synchronized", {
          userId: user.id,
          role: user.role,
          provider: options.provider,
          dbRole: result[0].role,
        });
      } else {
        authLogger.warn("No user found to update", {
          userId: user.id,
          provider: options.provider,
        });
      }
    } catch (error) {
      authLogger.error("Failed to synchronize user role", {
        error: String(error),
        userId: user.id,
        attemptedRole: user.role,
        provider: options.provider,
      });
    }
  } else {
    authLogger.info("New user created with role", {
      userId: user.id,
      role: user.role,
      provider: options.provider,
    });
  }

  // Log final user state
  authLogger.info("OAuth authentication completed", {
    userId: user.id,
    userRole: user.role,
    userEmail: user.email,
    userName: user.name,
    emailVerified: user.emailVerified,
    provider: options.provider,
    isNewUser: options.isNewUser,
  });
}

/**
 * Export the pre-configured middleware instance for direct use
 */
export const oauthRoleSyncMiddleware = createOAuthRoleSyncMiddleware();
