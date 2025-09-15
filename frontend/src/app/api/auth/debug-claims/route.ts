/**
 * Debug endpoint for inspecting OAuth claims and tokens
 *
 * This endpoint helps debug authentication issues by showing:
 * - Current user session data
 * - OAuth token claims (if available)
 * - Role mapping results
 * - Azure AD specific claims
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authLogger } from "@/lib/logger";
import { extractRolesFromTokens, mapAzureRolesToBetterAuth } from "@/lib/auth/providers/azure";
import type { RuntimeAccount } from "@/types/better-auth";

// Type for user with role information (from Better Auth session)
interface UserWithRole {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
  role?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    authLogger.info("Debug claims endpoint accessed", {
      hasSession: !!session,
      userId: session?.user?.id,
    });

    if (!session) {
      return NextResponse.json(
        {
          error: "No active session",
          message: "User must be logged in to access debug claims",
        },
        { status: 401 },
      );
    }

    // Get user from database with all associated accounts
    const user = session.user;

    // Try to get account information for token inspection
    // Note: Better-Auth listUserAccounts returns runtime objects that don't include tokens
    const accounts = await auth.api.listUserAccounts({
      query: {
        userId: user.id,
      },
    }) as RuntimeAccount[] | null;

    authLogger.debug("Retrieved user accounts for debug", {
      userId: user.id,
      accountCount: accounts?.length || 0,
    });

    // Find Microsoft account for token inspection
    const microsoftAccount = accounts?.find((account) => account.providerId === "microsoft");

    let tokenDebugInfo = null;
    let roleExtractionDebug = null;

    if (microsoftAccount) {
      authLogger.debug("Found Microsoft account for token debug", {
        accountId: microsoftAccount.id,
        providerId: microsoftAccount.providerId,
      });

      // Note: Better-Auth runtime accounts don't include tokens for security reasons
      // Tokens are not directly accessible through listUserAccounts
      authLogger.info("Microsoft account found but tokens not accessible through runtime API", {
        accountId: microsoftAccount.id,
        providerId: microsoftAccount.providerId,
        scopes: microsoftAccount.scopes,
      });

      // We can only provide role debug info based on current user state
      roleExtractionDebug = {
        message: "Tokens not accessible in runtime account object",
        currentUserRole: (user as UserWithRole).role,
        accountId: microsoftAccount.id,
        accountScopes: microsoftAccount.scopes,
        note: "Better-Auth does not expose tokens through listUserAccounts for security",
      };

      tokenDebugInfo = {
        message: "Tokens not accessible in runtime account object",
        note: "Better-Auth stores tokens securely and doesn't expose them through API calls",
        providerId: microsoftAccount.providerId,
        accountCreatedAt: microsoftAccount.createdAt,
      };
    }

    const debugData = {
      session: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user as UserWithRole).role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        sessionId: session.session?.id,
        expiresAt: session.session?.expiresAt,
      },
      accounts:
        accounts?.map((account) => {
          return {
            id: account.id,
            providerId: account.providerId,
            accountId: account.accountId,
            scopes: account.scopes,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
            note: "Tokens not exposed in runtime account object",
          };
        }) || [],
      microsoftAccount: microsoftAccount
        ? {
            id: microsoftAccount.id,
            accountId: microsoftAccount.accountId,
            providerId: microsoftAccount.providerId,
            scopes: microsoftAccount.scopes,
            createdAt: microsoftAccount.createdAt,
            note: "Tokens not exposed in runtime account object",
          }
        : null,
      tokenDebugInfo,
      roleExtractionDebug,
      timestamp: new Date().toISOString(),
    };

    authLogger.info("Debug claims data prepared", {
      userId: user.id,
      hasTokenInfo: !!tokenDebugInfo,
      hasRoleDebug: !!roleExtractionDebug,
    });

    return NextResponse.json({
      success: true,
      data: debugData,
    });
  } catch (error) {
    authLogger.error("Debug claims endpoint error", { error: String(error) });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: String(error),
      },
      { status: 500 },
    );
  }
}

// Also support POST for testing with custom token data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokens } = body;

    if (!tokens || (!tokens.id_token && !tokens.access_token)) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "tokens.id_token or tokens.access_token is required",
        },
        { status: 400 },
      );
    }

    authLogger.info("Debug claims POST endpoint accessed", {
      hasIdToken: !!tokens.id_token,
      hasAccessToken: !!tokens.access_token,
    });

    // Extract roles from provided tokens
    const extractedRoles = extractRolesFromTokens(tokens);
    const mappedRole = mapAzureRolesToBetterAuth(extractedRoles);

    let tokenPayload = null;
    if (tokens.id_token) {
      try {
        tokenPayload = JSON.parse(atob(tokens.id_token.split(".")[1]));
      } catch (error) {
        authLogger.warn("Failed to decode provided ID token", { error: String(error) });
      }
    }

    const debugData = {
      input: {
        hasIdToken: !!tokens.id_token,
        hasAccessToken: !!tokens.access_token,
      },
      tokenPayload,
      roleExtraction: {
        extractedRoles,
        mappedRole,
        extractionMethod: tokens.id_token ? "id_token" : "access_token",
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: debugData,
    });
  } catch (error) {
    authLogger.error("Debug claims POST endpoint error", { error: String(error) });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: String(error),
      },
      { status: 500 },
    );
  }
}
