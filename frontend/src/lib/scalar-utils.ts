import type { Session, User } from "better-auth/types";
import { apiLogger } from "@/lib/logger";

/**
 * Enhanced authentication token management for Scalar API documentation
 */
export interface ScalarServer {
  url: string;
  description?: string;
  variables?: Record<string, { default: string; enum?: string[]; description?: string }>;
}

export interface ScalarRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ScalarSpec {
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  openapi?: string;
  swagger?: string;
}

/**
 * Extract authentication token from Better-Auth session
 */
export function getBetterAuthToken(session: Session | null): string | null {
  if (!session?.token) {
    return null;
  }

  return `Bearer ${session.token}`;
}

/**
 * Create authentication configuration for Scalar based on user session
 */
export function createScalarAuthConfig(session: { session: Session; user: User } | null) {
  if (!session?.session) {
    return undefined;
  }

  const authToken = getBetterAuthToken(session.session);

  if (!authToken) {
    return undefined;
  }

  return {
    preferredSecurityScheme: "BearerAuth",
    securitySchemes: {
      BearerAuth: {
        type: "http" as const,
        scheme: "bearer" as const,
        token: authToken,
        description: "Better-Auth session token",
      },
      ApiKeyAuth: {
        type: "apiKey" as const,
        name: "X-API-KEY",
        in: "header" as const,
        description: "API key for programmatic access",
      },
      SessionAuth: {
        type: "apiKey" as const,
        name: "session",
        in: "cookie" as const,
        description: "Browser session cookie",
      },
    },
    persistAuth: true,
  };
}

/**
 * Inject authentication headers into API requests
 */
export function injectAuthHeaders(request: Request, session: { session: Session; user: User } | null): void {
  if (!session?.session?.token) {
    return;
  }

  // Add authorization header
  request.headers.set("Authorization", `Bearer ${session.session.token}`);

  // Add additional security headers
  request.headers.set("X-Content-Type-Options", "nosniff");
  request.headers.set("X-Frame-Options", "DENY");

  apiLogger.debug("Authentication headers injected into API request", {
    userId: session.user?.id,
    hasAuth: !!session.session.token,
  });
}

/**
 * Create role-based CSS styling for documentation interface
 */
export function createRoleBasedCSS(userRole: string): string {
  const baseCSS = `
    .scalar-api-reference {
      --scalar-color-1: hsl(262, 83%, 58%);
      --scalar-color-2: hsl(262, 83%, 48%);
      --scalar-color-3: hsl(262, 83%, 38%);
      --scalar-background-1: hsl(224, 71%, 4%);
      --scalar-background-2: hsl(220, 13%, 9%);
      --scalar-background-3: hsl(220, 13%, 14%);
      /* Performance optimizations */
      font-display: swap;
    }
  `;

  const roleStyles: Record<string, string> = {
    admin: `
      --scalar-border-color: hsl(120, 50%, 50%);
      .scalar-api-reference__header::after {
        content: "👑 Admin Access";
        position: absolute;
        top: 10px;
        right: 10px;
        background: hsl(120, 50%, 20%);
        color: hsl(120, 50%, 80%);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
      }
    `,
    server_owner: `
      --scalar-border-color: hsl(200, 50%, 50%);
      .scalar-api-reference__header::after {
        content: "🔧 Server Owner";
        position: absolute;
        top: 10px;
        right: 10px;
        background: hsl(200, 50%, 20%);
        color: hsl(200, 50%, 80%);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
      }
    `,
    user: `
      --scalar-border-color: hsl(262, 50%, 50%);
      .scalar-api-reference__header::after {
        content: "👤 User";
        position: absolute;
        top: 10px;
        right: 10px;
        background: hsl(262, 50%, 20%);
        color: hsl(262, 50%, 80%);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
      }
    `,
  };

  const roleCSS = roleStyles[userRole] || "";

  return baseCSS + (roleCSS ? `\n.scalar-api-reference {\n${roleCSS}\n}` : "");
}

/**
 * Performance-optimized CDN configuration
 */
export function getCDNConfig(isProduction: boolean): string | undefined {
  if (isProduction) {
    // Pin specific version for production stability
    return "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.28";
  }

  // Use default/latest for development
  return undefined;
}

/**
 * Create callback handlers for enhanced UX and analytics
 */
export function createScalarCallbacks(userRole: string) {
  return {
    onServerChange: (serverUrl: string) => {
      apiLogger.debug("API server changed in documentation", {
        newServer: serverUrl,
        userRole,
        timestamp: new Date().toISOString(),
      });
    },
    onRequestSent: (requestUrl: string) => {
      apiLogger.debug("API request sent from documentation", {
        url: requestUrl,
        userRole,
        timestamp: new Date().toISOString(),
      });

      // Track usage analytics (could be extended with external analytics)
      if (typeof window !== "undefined" && (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as typeof window & { gtag: (...args: unknown[]) => void }).gtag("event", "api_request_from_docs", {
          endpoint: requestUrl,
          user_role: userRole,
        });
      }
    },
    onSpecUpdate: (specContent: string) => {
      apiLogger.debug("API specification updated in documentation", {
        specContent: specContent.substring(0, 100) + "...", // Log first 100 chars
        userRole,
        timestamp: new Date().toISOString(),
      });
    },
  };
}

/**
 * Caching headers for optimal performance
 */
export function getCacheHeaders(isError: boolean = false): Record<string, string> {
  if (isError) {
    return {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };
  }

  return {
    "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/**
 * Server configuration with environment awareness
 */
export function createServerConfig(baseUrl: string, backendUrl?: string) {
  const servers = [
    {
      url: baseUrl,
      description: "Frontend API",
      variables: {
        version: {
          default: "v1",
          enum: ["v1"],
          description: "API version",
        },
      },
    },
    {
      url: "http://localhost:3000",
      description: "Development API",
    },
  ];

  if (backendUrl) {
    servers.push(
      {
        url: backendUrl,
        description: "Backend API (Direct)",
      },
      {
        url: `${baseUrl}/api/gateway`,
        description: "Backend API (via Proxy)",
      },
    );
  }

  return servers;
}

/**
 * Validate and sanitize schema type parameter
 */
export function validateSchemaType(schemaType: string | null): string {
  const validTypes = ["auth", "app", "backend", "combined"];

  if (!schemaType || !validTypes.includes(schemaType)) {
    return "combined";
  }

  return schemaType;
}

/**
 * Generate schema URL based on type and base URL
 */
export function getSchemaUrl(baseUrl: string, schemaType: string): string {
  const urls: Record<string, string> = {
    auth: `${baseUrl}/api/docs/auth-schema`,
    app: `${baseUrl}/api/docs/app-schema`,
    backend: `${baseUrl}/api/docs/backend-schema`,
    combined: `${baseUrl}/api/docs/combined-schema`,
  };

  return urls[schemaType] || urls.combined;
}
