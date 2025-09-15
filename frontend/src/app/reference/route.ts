import { type NextRequest } from "next/server";
import { ApiReference } from "@scalar/nextjs-api-reference";
import { auth } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import type { User, Session } from "better-auth/types";
import {
  createScalarAuthConfig,
  createRoleBasedCSS,
  getCDNConfig,
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

  // Create enhanced Scalar configuration with recursion safety
  const authConfig = createScalarAuthConfig(session);

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
    // Performance and safety optimizations
    withDefaultFonts: false, // Use system fonts for better performance
    cdn: getCDNConfig(process.env.NODE_ENV === "production") || undefined,
    // Recursion prevention: Disable callbacks to prevent evaluation loops
    // Callbacks were causing recursion in Scalar 1.25.11
    onServerChange: undefined,
    onRequestSent: undefined,
    onSpecUpdate: undefined,
    // Authentication configuration
    authentication: authConfig,
    // Role-based styling (simplified to avoid serialization issues)
    customCss: createRoleBasedCSS(userRole),
    // Minimal metadata to reduce complexity
    metaData: {
      title: "MCP Registry Gateway API",
      description: "Enterprise-grade MCP (Model Context Protocol) Registry, Gateway, and Proxy System API documentation",
      version: "1.0.0",
      // Simplify contact info to prevent potential circular references
      contact: {
        name: "API Support",
        email: "jason@matherly.net",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    // Environment-aware server configuration
    servers: createServerConfig(baseUrl, process.env.BACKEND_URL),
    // Additional safety configurations
    skipLinkHeader: true, // Prevent link header processing that could cause issues
    baseServerURL: baseUrl, // Explicit base URL to prevent resolution issues
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
    const { searchParams } = new URL(request.url);
    const schemaType = searchParams.get("schema") || "combined";

    apiLogger.debug("Starting Scalar API reference rendering", {
      schemaType,
      userAgent: request.headers.get("user-agent"),
      url: request.url,
    });

    const config = await createScalarConfig(request);

    apiLogger.debug("Scalar configuration created successfully", {
      schemaType,
      configKeys: Object.keys(config),
      hasAuth: !!config.authentication,
      serverCount: config.servers?.length || 0,
    });

    // Create the Scalar API reference handler with dynamic config
    // Use try-catch around handler creation to catch initialization errors
    let handler: () => Promise<Response>;
    try {
      handler = ApiReference(config);
      apiLogger.debug("Scalar handler created successfully");
    } catch (handlerError) {
      apiLogger.error("Failed to create Scalar handler", {
        error: handlerError instanceof Error ? handlerError.message : "Unknown handler error",
        stack: handlerError instanceof Error ? handlerError.stack : undefined,
        config: JSON.stringify(config, null, 2).substring(0, 1000) + "...", // Truncated config for debugging
      });
      throw handlerError;
    }

    // Call the handler with additional error catching
    let response: Response;
    try {
      response = await handler();
      apiLogger.debug("Scalar handler executed successfully", {
        status: response.status,
        contentType: response.headers.get("content-type"),
      });
    } catch (renderError) {
      apiLogger.error("Failed to render Scalar documentation", {
        error: renderError instanceof Error ? renderError.message : "Unknown render error",
        stack: renderError instanceof Error ? renderError.stack : undefined,
        isRecursionError: renderError instanceof Error && renderError.message.includes("recursion"),
      });
      throw renderError;
    }

    return response;
  } catch (error) {
    const isRecursionError =
      error instanceof Error && (error.message.includes("recursion") || error.message.includes("Maximum call stack"));

    apiLogger.error("Failed to serve API documentation", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      isRecursionError,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    // Enhanced fallback error response with more details for recursion issues
    const errorDetails = {
      error: "Documentation Error",
      message: isRecursionError
        ? "Recursion error detected in API documentation rendering. This has been logged for investigation."
        : "Failed to load API documentation",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      ...(isRecursionError && {
        troubleshooting: {
          issue: "Scalar recursion error",
          version: "1.25.11",
          mitigation: "Schema preprocessing and callback disabling applied",
          suggestion: "Try refreshing or contact support if issue persists",
        },
      }),
    };

    return new Response(JSON.stringify(errorDetails, null, 2), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}
