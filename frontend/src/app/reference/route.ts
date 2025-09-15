import { type NextRequest } from "next/server";
import { ApiReference } from "@scalar/nextjs-api-reference";
import { auth } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import type { User, Session } from "better-auth/types";
import {
  createScalarAuthConfig,
  createRoleBasedCSS,
  getCDNConfig,
  createScalarCallbacks,
  createServerConfig,
  validateSchemaType,
  getSchemaUrl,
} from "@/lib/scalar-utils";

/**
 * Create enhanced Scalar configuration with authentication and role-based features
 */
async function createScalarConfig(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseUrl = new URL(request.url).origin;

  // Validate and get the specific schema type from query params
  const schemaType = validateSchemaType(searchParams.get("schema"));

  // Get authentication state for enhanced documentation experience
  let session: { user: User; session: Session } | null = null;
  let userRole = "anonymous";

  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });

    if (session?.session && session.user) {
      userRole = (session.user as User & { role?: string }).role || "user";

      apiLogger.debug("Authenticated user accessing documentation", {
        userId: session.user.id,
        userRole,
        schemaType,
      });
    }
  } catch {
    // Authentication failed or user not logged in - continue with anonymous access
    apiLogger.debug("Anonymous user accessing documentation", { schemaType });
  }

  // Get the appropriate schema URL
  const spec = getSchemaUrl(baseUrl, schemaType);

  // Create enhanced Scalar configuration
  const authConfig = createScalarAuthConfig(session);
  const callbacks = createScalarCallbacks(userRole);

  return {
    url: spec,
    theme: "purple" as const,
    layout: "modern" as const,
    isEditable: false,
    showSidebar: true,
    searchHotKey: "k" as const,
    hideModels: false,
    hideDownloadButton: false,
    darkMode: true,
    // Performance optimizations
    withDefaultFonts: false, // Use system fonts for better performance
    cdn: getCDNConfig(process.env.NODE_ENV === "production"),
    // Authentication configuration
    authentication: authConfig,
    // Callback handlers for enhanced UX and analytics
    ...callbacks,
    // Role-based styling
    customCss: createRoleBasedCSS(userRole),
    metaData: {
      title: "MCP Registry Gateway API",
      description: "Enterprise-grade MCP (Model Context Protocol) Registry, Gateway, and Proxy System API documentation",
      version: "1.0.0",
      termsOfService: `${baseUrl}/terms`,
      contact: {
        name: "API Support",
        url: `${baseUrl}/support`,
        email: "jason@matherly.net",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    // Environment-aware server configuration
    servers: createServerConfig(baseUrl, process.env.BACKEND_URL),
  };
}

/**
 * Main API Documentation Route Handler
 *
 * Serves the Scalar API reference interface with unified documentation
 * from both Better-Auth and application APIs.
 *
 * Note: Using dynamic configuration wrapper to support authentication
 * and role-based features while maintaining Scalar's expected usage pattern.
 */
export async function GET(request: NextRequest) {
  try {
    const config = await createScalarConfig(request);

    // Create the Scalar API reference handler with dynamic config
    const handler = ApiReference(config);

    // Call the handler (no arguments needed) to get the Response
    return await handler();
  } catch (error) {
    apiLogger.error("Failed to serve API documentation", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Fallback error response
    return new Response(
      JSON.stringify({
        error: "Documentation Error",
        message: "Failed to load API documentation",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  }
}
