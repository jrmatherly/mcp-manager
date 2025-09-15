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
 *
 * Note: Disabled CDN usage to avoid version mismatches and export field warnings.
 * Using locally installed @scalar/nextjs-api-reference package instead.
 */
export function getCDNConfig(_isProduction: boolean): false | undefined {
  // Explicitly disable CDN to force local package usage
  return false;
}

/**
 * Create callback handlers for enhanced UX and analytics
 *
 * Note: These callbacks need to be browser-safe, so we avoid server-side imports
 * and use simple console logging instead of the logger module.
 *
 * Simplified to prevent recursion issues while maintaining functionality.
 */
export function createScalarCallbacks(_userRole: string) {
  // Return undefined instead of serialized functions to prevent potential
  // evaluation loops in Scalar's internal processing
  return undefined;
}

/**
 * Create safe event handlers that can be attached after Scalar initialization
 * This prevents recursion during initial configuration processing.
 */
export function createPostInitCallbacks(userRole: string) {
  return {
    onServerChange: function (serverUrl: string) {
      apiLogger.debug("[Scalar] API server changed:", {
        newServer: serverUrl,
        userRole: userRole,
        timestamp: new Date().toISOString(),
      });
    },
    onRequestSent: function (requestUrl: string) {
      apiLogger.debug("[Scalar] API request sent:", {
        url: requestUrl,
        userRole: userRole,
        timestamp: new Date().toISOString(),
      });

      // Track usage analytics if available
      if (typeof window !== "undefined" && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", "api_request_from_docs", {
          endpoint: requestUrl,
          user_role: userRole,
        });
      }
    },
    onSpecUpdate: function (specContent: unknown) {
      apiLogger.debug("[Scalar] API specification updated:", {
        specLength: typeof specContent === "string" ? specContent.length : "unknown",
        userRole: userRole,
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

/**
 * Preprocess OpenAPI schema to prevent circular references and recursion issues
 *
 * This function sanitizes the schema structure to prevent Scalar from
 * encountering circular references that could cause infinite recursion.
 */
export function preprocessSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const visited = new Set();
  const processed = new Map();

  function processNode(node: unknown, path: string = ""): unknown {
    // Handle primitive types
    if (node === null || typeof node !== "object") {
      return node;
    }

    // Handle arrays
    if (Array.isArray(node)) {
      return node.map((item, index) => processNode(item, `${path}[${index}]`));
    }

    // Create a unique identifier for this object based on its content
    const nodeId = `${path}:${JSON.stringify(Object.keys(node).sort())}`;

    // Check for circular references
    if (visited.has(nodeId)) {
      // Replace circular reference with a safe reference
      return {
        type: "object",
        description: `Circular reference detected at ${path}`,
        "x-circular-ref": path,
      };
    }

    // Check if we've already processed this exact structure
    if (processed.has(nodeId)) {
      return processed.get(nodeId);
    }

    visited.add(nodeId);

    let result: Record<string, unknown> = {};

    // Process each property safely
    for (const [key, value] of Object.entries(node)) {
      const propertyPath = path ? `${path}.${key}` : key;

      // Special handling for $ref to prevent complex reference chains
      if (key === "$ref" && typeof value === "string") {
        // Keep simple component references but avoid complex paths
        if (value.startsWith("#/components/")) {
          result[key] = value;
        } else {
          // Replace complex references with a simplified schema
          result = {
            type: "object",
            description: `Reference to ${value}`,
            "x-original-ref": value,
          };
          break;
        }
      } else {
        result[key] = processNode(value, propertyPath);
      }
    }

    processed.set(nodeId, result);
    visited.delete(nodeId);

    return result;
  }

  return processNode(schema);
}

/**
 * Create a safe schema configuration for Scalar that prevents recursion
 */
export function createSafeSchemaConfig(rawSchema: unknown): Record<string, unknown> {
  // First, preprocess the schema to remove circular references
  const safeSchema = preprocessSchema(rawSchema) as Record<string, unknown>;

  // Additional safeguards for Scalar-specific issues
  return {
    ...safeSchema,
    // Ensure components are properly structured
    components:
      safeSchema.components && typeof safeSchema.components === "object" && safeSchema.components !== null
        ? {
            ...(safeSchema.components as Record<string, unknown>),
            // Limit schema depth to prevent recursion
            schemas: (safeSchema.components as { schemas?: Record<string, unknown> }).schemas
              ? Object.fromEntries(
                  Object.entries((safeSchema.components as { schemas: Record<string, unknown> }).schemas).map(([key, schema]) => [
                    key,
                    limitSchemaDepth(schema, 5), // Max depth of 5 levels
                  ]),
                )
              : undefined,
          }
        : undefined,
  };
}

/**
 * Limit schema depth to prevent infinite recursion in complex nested schemas
 */
function limitSchemaDepth(schema: unknown, maxDepth: number, currentDepth: number = 0): unknown {
  if (currentDepth >= maxDepth || !schema || typeof schema !== "object") {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => limitSchemaDepth(item, maxDepth, currentDepth + 1));
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "properties" && typeof value === "object") {
      // Limit property depth
      result[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([propKey, propValue]) => [
          propKey,
          limitSchemaDepth(propValue, maxDepth, currentDepth + 1),
        ]),
      );
    } else if (key === "items" || key === "additionalProperties") {
      result[key] = limitSchemaDepth(value, maxDepth, currentDepth + 1);
    } else if (typeof value === "object" && !key.startsWith("x-")) {
      result[key] = limitSchemaDepth(value, maxDepth, currentDepth + 1);
    } else {
      result[key] = value;
    }
  }

  return result;
}
