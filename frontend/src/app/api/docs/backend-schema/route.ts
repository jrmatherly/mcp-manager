import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { apiLogger } from "@/lib/logger";
import type { OpenAPIV3 } from "openapi-types";

/**
 * Backend OpenAPI Schema Endpoint
 *
 * Fetches the OpenAPI schema from the Python/FastAPI backend server
 * with error handling, caching, and path prefixing for clarity.
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = new URL(request.url).origin;
    const backendUrl = env.BACKEND_URL || "http://localhost:8000";

    apiLogger.debug("Fetching backend schema", {
      backendUrl,
      endpoint: `${backendUrl}/openapi.json`,
    });

    // Fetch backend OpenAPI schema with timeout and error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const backendResponse = await fetch(`${backendUrl}/openapi.json`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MCP-Manager-Frontend/1.0",
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      throw new Error(`Backend API returned ${backendResponse.status}: ${backendResponse.statusText}`);
    }

    const backendSchema: OpenAPIV3.Document = await backendResponse.json();

    // Enhance the backend schema with better organization and path prefixing
    const enhancedSchema: OpenAPIV3.Document = {
      ...backendSchema,
      info: {
        ...backendSchema.info,
        title: "MCP Registry Gateway - Backend API",
        description: `
# Backend API Documentation

This section covers the Python/FastAPI backend services for the MCP Registry Gateway system.

## Core Services

### 🔧 MCP Server Management
- **Server Lifecycle**: Create, start, stop, and manage MCP servers
- **Health Monitoring**: Real-time health checks and performance metrics
- **Configuration**: Environment variables and startup parameters

### 🚀 Gateway & Proxy
- **Request Routing**: Intelligent routing to MCP servers
- **Load Balancing**: Distribute requests across server instances
- **Circuit Breaker**: Fault tolerance and resilience patterns

### 📊 Analytics & Monitoring
- **Performance Metrics**: Response times, throughput, error rates
- **Usage Analytics**: Request patterns and usage statistics
- **Health Dashboards**: System-wide monitoring and alerting

### 🛡️ Security & Validation
- **Request Validation**: Input sanitization and validation
- **Rate Limiting**: Per-user and per-endpoint rate controls
- **Audit Logging**: Complete audit trail of operations

## Architecture

The backend is built with:
- **FastAPI**: High-performance Python web framework
- **Pydantic**: Type validation and serialization
- **PostgreSQL**: Primary data storage
- **Redis**: Caching and session storage
- **Docker**: Containerized deployment

## Base URL

All backend endpoints are prefixed with \`/api/gateway\` when accessed through the frontend proxy.

        `,
      },
      servers: [
        {
          url: `${baseUrl}/api/gateway`,
          description: "Backend API (via Frontend Proxy)",
        },
        {
          url: backendUrl,
          description: "Direct Backend API",
        },
      ],
      tags: [
        ...(backendSchema.tags || []),
        {
          name: "Gateway",
          description: "MCP Gateway and proxy operations",
        },
        {
          name: "Monitoring",
          description: "System monitoring and health checks",
        },
        {
          name: "Analytics",
          description: "Usage analytics and performance metrics",
        },
      ],
      paths: {},
    };

    // Add path prefixing for clarity when viewing through frontend
    if (backendSchema.paths) {
      for (const [path, pathItem] of Object.entries(backendSchema.paths)) {
        if (pathItem) {
          // Prefix all backend paths with /api/gateway for clarity
          const prefixedPath = `/api/gateway${path}`;
          enhancedSchema.paths[prefixedPath] = pathItem;

          // Add tags to operations for better organization
          if (pathItem.get) {
            pathItem.get.tags = [...(pathItem.get.tags || []), "Backend API"];
          }
          if (pathItem.post) {
            pathItem.post.tags = [...(pathItem.post.tags || []), "Backend API"];
          }
          if (pathItem.put) {
            pathItem.put.tags = [...(pathItem.put.tags || []), "Backend API"];
          }
          if (pathItem.delete) {
            pathItem.delete.tags = [...(pathItem.delete.tags || []), "Backend API"];
          }
          if (pathItem.patch) {
            pathItem.patch.tags = [...(pathItem.patch.tags || []), "Backend API"];
          }
        }
      }
    }

    apiLogger.info("Backend schema fetched successfully", {
      pathCount: Object.keys(enhancedSchema.paths).length,
      tagCount: enhancedSchema.tags?.length || 0,
    });

    return NextResponse.json(enhancedSchema, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=600", // 5 min cache, 10 min stale-while-revalidate
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    apiLogger.logError(error, "Failed to fetch backend OpenAPI schema", {
      backendUrl: env.BACKEND_URL,
    });

    // Return fallback schema in case of backend unavailability
    const fallbackSchema: OpenAPIV3.Document = {
      openapi: "3.0.3",
      info: {
        title: "MCP Registry Gateway - Backend API (Offline)",
        version: "1.0.0",
        description: `
# Backend API Currently Unavailable

The backend API is currently unavailable. This may be due to:

- Backend server is not running
- Network connectivity issues
- Backend server is starting up

## Troubleshooting

1. **Check Backend Status**: Ensure the Python/FastAPI backend is running on \`${env.BACKEND_URL || "http://localhost:8000"}\`
2. **Verify Configuration**: Check the \`BACKEND_URL\` environment variable
3. **Network Access**: Ensure the frontend can reach the backend server

## Starting the Backend

\`\`\`bash
cd backend
uv run mcp-gateway serve --reload --port 8000
\`\`\`

Once the backend is running, refresh this documentation to see the full API reference.
        `,
      },
      servers: [
        {
          url: env.BACKEND_URL || "http://localhost:8000",
          description: "Backend API (Currently Offline)",
        },
      ],
      paths: {},
      tags: [
        {
          name: "System Status",
          description: "Backend system status and troubleshooting",
        },
      ],
    };

    return NextResponse.json(fallbackSchema, {
      status: 503, // Service Unavailable
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate", // Don't cache errors
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Retry-After": "30", // Suggest retry after 30 seconds
      },
    });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
