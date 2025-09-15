import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/logger";
import type { OpenAPIV3 } from "openapi-types";

/**
 * Application API Schema Endpoint
 *
 * Generates and serves the OpenAPI schema for the MCP Registry Gateway application APIs.
 * This includes server management, dashboard, and administrative endpoints.
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = new URL(request.url).origin;

    // Define the application API schema
    const appSchema: OpenAPIV3.Document = {
      openapi: "3.0.3",
      info: {
        title: "MCP Registry Gateway - Application API",
        version: "1.0.0",
        description: `
# MCP Registry Gateway Application API

This section covers all application-specific endpoints for the MCP Registry Gateway system, including:

## Core Features
- **MCP Server Management**: Create, configure, and manage MCP servers
- **Health Monitoring**: Real-time health checks and performance metrics
- **Dashboard Analytics**: Usage statistics and performance dashboards
- **Multi-Tenancy**: Tenant isolation and resource management
- **Registry Operations**: Server discovery and registry management

## Server Management
- **CRUD Operations**: Full lifecycle management of MCP servers
- **Configuration Management**: Environment variables, startup parameters
- **Health Monitoring**: Automated health checks with configurable intervals
- **Performance Metrics**: CPU, memory, and request statistics
- **Log Management**: Centralized logging and audit trails

## Security & Access Control
- **Role-Based Permissions**: Admin, Server Owner, and User access levels
- **Tenant Isolation**: Complete data isolation between tenants
- **API Rate Limiting**: Configurable rate limits per role and tenant
- **Audit Logging**: Complete audit trail of all operations

## Database Features
- **38 Strategic Indexes**: Optimized for 40-90% query performance improvement
- **Real-time Analytics**: Database functions for health and performance monitoring
- **Automated Optimization**: Self-tuning database with health scoring
- **Migration Management**: Automated schema migrations and rollback support

All endpoints require authentication unless explicitly marked as public.
        `,
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
      servers: [
        {
          url: baseUrl,
          description: "Production Server",
        },
        {
          url: "http://localhost:3000",
          description: "Development Server",
        },
      ],
      tags: [
        {
          name: "Servers",
          description: "MCP server management and configuration",
        },
        {
          name: "Dashboard",
          description: "Analytics and monitoring dashboards",
        },
        {
          name: "Health",
          description: "Health checks and system monitoring",
        },
        {
          name: "Admin",
          description: "Administrative operations and user management",
        },
        {
          name: "Debug",
          description: "Development and debugging endpoints",
        },
      ],
      paths: {
        "/api/servers": {
          get: {
            tags: ["Servers"],
            summary: "List MCP servers",
            description: "Retrieve a paginated list of MCP servers for the authenticated user's tenant",
            parameters: [
              {
                name: "limit",
                in: "query",
                description: "Maximum number of servers to return",
                schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              },
              {
                name: "offset",
                in: "query",
                description: "Number of servers to skip for pagination",
                schema: { type: "integer", minimum: 0, default: 0 },
              },
              {
                name: "search",
                in: "query",
                description: "Search term to filter servers by name or description",
                schema: { type: "string" },
              },
              {
                name: "status",
                in: "query",
                description: "Filter by server status",
                schema: { type: "string", enum: ["active", "inactive", "error", "pending"] },
              },
            ],
            responses: {
              200: {
                description: "Server list retrieved successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        servers: {
                          type: "array",
                          items: { $ref: "#/components/schemas/McpServer" },
                        },
                        pagination: { $ref: "#/components/schemas/PaginationInfo" },
                      },
                    },
                  },
                },
              },
              401: { $ref: "#/components/responses/Unauthorized" },
              400: { $ref: "#/components/responses/ValidationError" },
              500: { $ref: "#/components/responses/InternalError" },
            },
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
          },
          post: {
            tags: ["Servers"],
            summary: "Create MCP server",
            description: "Create a new MCP server configuration",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateServerRequest" },
                },
              },
            },
            responses: {
              201: {
                description: "Server created successfully",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/McpServer" },
                  },
                },
              },
              400: { $ref: "#/components/responses/ValidationError" },
              401: { $ref: "#/components/responses/Unauthorized" },
              409: { $ref: "#/components/responses/Conflict" },
              500: { $ref: "#/components/responses/InternalError" },
            },
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
          },
        },
        "/api/servers/{id}": {
          get: {
            tags: ["Servers"],
            summary: "Get MCP server",
            description: "Retrieve a specific MCP server by ID",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                description: "Server ID",
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              200: {
                description: "Server retrieved successfully",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/McpServer" },
                  },
                },
              },
              401: { $ref: "#/components/responses/Unauthorized" },
              404: { $ref: "#/components/responses/NotFound" },
              500: { $ref: "#/components/responses/InternalError" },
            },
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
          },
          put: {
            tags: ["Servers"],
            summary: "Update MCP server",
            description: "Update an existing MCP server configuration",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                description: "Server ID",
                schema: { type: "string", format: "uuid" },
              },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UpdateServerRequest" },
                },
              },
            },
            responses: {
              200: {
                description: "Server updated successfully",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/McpServer" },
                  },
                },
              },
              400: { $ref: "#/components/responses/ValidationError" },
              401: { $ref: "#/components/responses/Unauthorized" },
              404: { $ref: "#/components/responses/NotFound" },
              409: { $ref: "#/components/responses/Conflict" },
              500: { $ref: "#/components/responses/InternalError" },
            },
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
          },
          delete: {
            tags: ["Servers"],
            summary: "Delete MCP server",
            description: "Delete an MCP server configuration",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                description: "Server ID",
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              204: { description: "Server deleted successfully" },
              401: { $ref: "#/components/responses/Unauthorized" },
              404: { $ref: "#/components/responses/NotFound" },
              500: { $ref: "#/components/responses/InternalError" },
            },
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
          },
        },
        "/api/servers/{id}/health": {
          get: {
            tags: ["Health"],
            summary: "Get server health",
            description: "Retrieve health status and metrics for a specific MCP server",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                description: "Server ID",
                schema: { type: "string", format: "uuid" },
              },
            ],
            responses: {
              200: {
                description: "Health status retrieved successfully",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/HealthStatus" },
                  },
                },
              },
              401: { $ref: "#/components/responses/Unauthorized" },
              404: { $ref: "#/components/responses/NotFound" },
              500: { $ref: "#/components/responses/InternalError" },
            },
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
          },
        },
        "/api/dashboard": {
          get: {
            tags: ["Dashboard"],
            summary: "Get dashboard data",
            description: "Retrieve dashboard analytics and metrics for the authenticated user's tenant",
            responses: {
              200: {
                description: "Dashboard data retrieved successfully",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/DashboardData" },
                  },
                },
              },
              401: { $ref: "#/components/responses/Unauthorized" },
              500: { $ref: "#/components/responses/InternalError" },
            },
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
          },
        },
        "/api/admin/users": {
          get: {
            tags: ["Admin"],
            summary: "List users (Admin only)",
            description: "Retrieve a list of all users in the system. Requires admin role.",
            parameters: [
              {
                name: "limit",
                in: "query",
                description: "Maximum number of users to return",
                schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              },
              {
                name: "offset",
                in: "query",
                description: "Number of users to skip for pagination",
                schema: { type: "integer", minimum: 0, default: 0 },
              },
            ],
            responses: {
              200: {
                description: "User list retrieved successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        users: {
                          type: "array",
                          items: { $ref: "#/components/schemas/User" },
                        },
                        pagination: { $ref: "#/components/schemas/PaginationInfo" },
                      },
                    },
                  },
                },
              },
              401: { $ref: "#/components/responses/Unauthorized" },
              403: { $ref: "#/components/responses/Forbidden" },
              500: { $ref: "#/components/responses/InternalError" },
            },
            security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
          },
        },
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT token obtained from authentication endpoints",
          },
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "x-api-key",
            description: "API key for server-to-server authentication",
          },
          SessionAuth: {
            type: "apiKey",
            in: "cookie",
            name: "better-auth.session_token",
            description: "Session cookie for browser-based authentication",
          },
        },
        schemas: {
          McpServer: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid", description: "Unique server identifier" },
              name: { type: "string", description: "Server display name" },
              description: { type: "string", nullable: true, description: "Server description" },
              command: { type: "string", description: "Command to start the server" },
              args: { type: "array", items: { type: "string" }, description: "Command arguments" },
              env: { type: "object", additionalProperties: { type: "string" }, description: "Environment variables" },
              status: {
                type: "string",
                enum: ["active", "inactive", "error", "pending"],
                description: "Current server status",
              },
              health: { $ref: "#/components/schemas/HealthStatus" },
              createdAt: { type: "string", format: "date-time", description: "Creation timestamp" },
              updatedAt: { type: "string", format: "date-time", description: "Last update timestamp" },
              ownerId: { type: "string", format: "uuid", description: "Owner user ID" },
              tenantId: { type: "string", format: "uuid", description: "Tenant ID" },
            },
            required: ["id", "name", "command", "status", "createdAt", "updatedAt", "ownerId", "tenantId"],
          },
          CreateServerRequest: {
            type: "object",
            properties: {
              name: { type: "string", minLength: 1, maxLength: 255, description: "Server display name" },
              description: { type: "string", maxLength: 1000, nullable: true, description: "Server description" },
              command: { type: "string", minLength: 1, description: "Command to start the server" },
              args: { type: "array", items: { type: "string" }, description: "Command arguments" },
              env: { type: "object", additionalProperties: { type: "string" }, description: "Environment variables" },
            },
            required: ["name", "command"],
          },
          UpdateServerRequest: {
            type: "object",
            properties: {
              name: { type: "string", minLength: 1, maxLength: 255, description: "Server display name" },
              description: { type: "string", maxLength: 1000, nullable: true, description: "Server description" },
              command: { type: "string", minLength: 1, description: "Command to start the server" },
              args: { type: "array", items: { type: "string" }, description: "Command arguments" },
              env: { type: "object", additionalProperties: { type: "string" }, description: "Environment variables" },
              status: {
                type: "string",
                enum: ["active", "inactive", "error", "pending"],
                description: "Server status",
              },
            },
          },
          HealthStatus: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["healthy", "unhealthy", "unknown"], description: "Health status" },
              lastCheck: { type: "string", format: "date-time", description: "Last health check timestamp" },
              metrics: {
                type: "object",
                properties: {
                  cpu: { type: "number", minimum: 0, maximum: 100, description: "CPU usage percentage" },
                  memory: { type: "number", minimum: 0, description: "Memory usage in MB" },
                  requests: { type: "integer", minimum: 0, description: "Total requests handled" },
                  uptime: { type: "integer", minimum: 0, description: "Uptime in seconds" },
                },
              },
              errors: {
                type: "array",
                items: { type: "string" },
                description: "Recent error messages",
              },
            },
            required: ["status", "lastCheck"],
          },
          DashboardData: {
            type: "object",
            properties: {
              totalServers: { type: "integer", minimum: 0, description: "Total number of servers" },
              activeServers: { type: "integer", minimum: 0, description: "Number of active servers" },
              totalRequests: { type: "integer", minimum: 0, description: "Total requests processed" },
              averageResponseTime: { type: "number", minimum: 0, description: "Average response time in ms" },
              recentActivity: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    timestamp: { type: "string", format: "date-time" },
                    event: { type: "string" },
                    serverId: { type: "string", format: "uuid" },
                    serverName: { type: "string" },
                  },
                },
              },
            },
            required: ["totalServers", "activeServers", "totalRequests", "averageResponseTime"],
          },
          User: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid", description: "User ID" },
              email: { type: "string", format: "email", description: "User email" },
              name: { type: "string", description: "User display name" },
              role: { type: "string", enum: ["admin", "server_owner", "user"], description: "User role" },
              emailVerified: { type: "boolean", description: "Email verification status" },
              createdAt: { type: "string", format: "date-time", description: "Account creation timestamp" },
              updatedAt: { type: "string", format: "date-time", description: "Last update timestamp" },
            },
            required: ["id", "email", "name", "role", "emailVerified", "createdAt", "updatedAt"],
          },
          PaginationInfo: {
            type: "object",
            properties: {
              total: { type: "integer", minimum: 0, description: "Total number of items" },
              limit: { type: "integer", minimum: 1, description: "Items per page" },
              offset: { type: "integer", minimum: 0, description: "Items skipped" },
              hasMore: { type: "boolean", description: "Whether more items are available" },
            },
            required: ["total", "limit", "offset", "hasMore"],
          },
          ErrorResponse: {
            type: "object",
            properties: {
              error: { type: "string", description: "Error type" },
              message: { type: "string", description: "Human-readable error message" },
              details: { type: "array", items: { type: "object" }, description: "Additional error details" },
            },
            required: ["error", "message"],
          },
        },
        responses: {
          Unauthorized: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          Forbidden: {
            description: "Insufficient permissions",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          NotFound: {
            description: "Resource not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          ValidationError: {
            description: "Validation failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          Conflict: {
            description: "Resource conflict",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          InternalError: {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
    };

    return NextResponse.json(appSchema, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=300", // 5 minutes
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    apiLogger.logError(error, "Failed to generate application OpenAPI schema");

    return NextResponse.json(
      {
        error: "Schema Generation Error",
        message: "Failed to generate application API schema",
        details: error instanceof Error ? error.message : "Unknown error",
      },
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
