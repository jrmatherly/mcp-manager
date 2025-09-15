import { auth } from "@/lib/auth";
import { authLogger } from "@/lib/logger";
import { type NextRequest, NextResponse } from "next/server";
import type { AuthSession } from "@/types/better-auth";

/**
 * Debug endpoint to examine Azure AD token claims
 * Only accessible to authenticated admin users
 * GET /api/debug/azure-claims
 */
export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Only allow admins to access this debug endpoint
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const userWithRole = session.user as AuthSession["user"];
    if (userWithRole.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Get the user's Microsoft account data
    const accounts = await auth.api.listUserAccounts({
      headers: request.headers,
    });

    const microsoftAccount = accounts?.find((account) => account?.providerId === "microsoft");

    if (!microsoftAccount) {
      return NextResponse.json({ error: "No Microsoft account found for this user" }, { status: 404 });
    }

    // Note: Better-Auth doesn't expose raw tokens in listUserAccounts for security
    // Token claims would need to be captured during OAuth callback if needed for debugging
    const debugInfo = {
      message: "Token access is restricted for security",
      note: "Raw token claims are not accessible through Better-Auth API for security reasons",
      suggestion: "Consider adding custom middleware during OAuth callback to capture claims if needed for debugging",
    };

    return NextResponse.json({
      message: "Azure AD Token Claims Debug Information",
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: userWithRole.role,
      },
      microsoftAccount: {
        accountId: microsoftAccount?.accountId,
        providerId: microsoftAccount?.providerId,
        scopes: microsoftAccount?.scopes,
        createdAt: microsoftAccount?.createdAt,
        updatedAt: microsoftAccount?.updatedAt,
      },
      tokenDebugging: debugInfo,
      roleMapping: {
        currentUserRole: userWithRole.role,
        explanation: "Role assignment is handled during OAuth callback",
        instructions: [
          "1. Check if your Azure AD application has app roles defined",
          "2. Ensure users are assigned to these app roles",
          "3. Verify the app registration includes 'roles' in token configuration",
          "4. Check the OAuth callback logs for role assignment details",
          "5. Role mapping is configured in /lib/auth/providers/azure.ts",
        ],
      },
    });
  } catch (error) {
    authLogger.error("Error in Azure claims debug endpoint", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
