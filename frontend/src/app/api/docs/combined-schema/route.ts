import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import type { OpenAPIV3 } from "openapi-types";

/**
 * Combined OpenAPI Schema Endpoint
 *
 * Merges the Better-Auth authentication schema with the application API schema
 * to provide a unified documentation experience.
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = new URL(request.url).origin;

    // Generate Better-Auth schema
    // Note: Better-Auth generateOpenAPISchema doesn't accept parameters, it returns a fixed schema
    const baseAuthSchema = await auth.api.generateOpenAPISchema();

    // Enhance with custom info
    const authSchema = {
      ...baseAuthSchema,
      info: {
        title: "Authentication API",
        version: "1.0.0",
        description: "Authentication and user management endpoints",
      },
      servers: [
        {
          url: baseUrl,
          description: "Production Server",
        },
      ],
    };

    // Fetch schemas in parallel for better performance
    const [appResponse, backendResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/docs/app-schema`, {
        headers: {
          "User-Agent": "Internal-Schema-Merger/1.0",
        },
      }),
      fetch(`${baseUrl}/api/docs/backend-schema`, {
        headers: {
          "User-Agent": "Internal-Schema-Merger/1.0",
        },
      }),
    ]);

    // Handle application schema
    let appSchema: OpenAPIV3.Document | null = null;
    if (appResponse.status === "fulfilled" && appResponse.value.ok) {
      try {
        const contentType = appResponse.value.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          appSchema = await appResponse.value.json();
          apiLogger.info("Application schema loaded successfully");
        } else {
          apiLogger.warn("Application schema returned non-JSON response", { contentType });
        }
      } catch (error) {
        apiLogger.warn("Application schema parsing failed", { error });
      }
    } else {
      apiLogger.warn("Application schema unavailable", {
        status: appResponse.status === "fulfilled" ? appResponse.value.status : "rejected",
      });
    }

    // Handle backend schema (optional - don't fail if backend is unavailable)
    let backendSchema: OpenAPIV3.Document | null = null;
    if (backendResponse.status === "fulfilled" && backendResponse.value.ok) {
      try {
        const contentType = backendResponse.value.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          backendSchema = await backendResponse.value.json();
          apiLogger.info("Backend schema included in combined documentation");
        } else {
          apiLogger.warn("Backend schema returned non-JSON response", { contentType });
        }
      } catch (error) {
        apiLogger.warn("Backend schema parsing failed", { error });
      }
    } else {
      apiLogger.warn("Backend schema unavailable, proceeding without it", {
        status: backendResponse.status === "fulfilled" ? backendResponse.value.status : "rejected",
      });
    }

    // Merge the schemas
    const combinedSchema: OpenAPIV3.Document = {
      openapi: "3.0.3",
      info: {
        title: "MCP Registry Gateway - Complete API",
        version: "1.0.0",
        description: `
# MCP Registry Gateway - Complete API Documentation

Welcome to the comprehensive API documentation for the MCP Registry Gateway system. This documentation covers all available endpoints including authentication, server management, and administrative functions.

## System Overview

The MCP Registry Gateway is an enterprise-grade system for managing Model Context Protocol (MCP) servers with the following key features:

### 🔐 Authentication & Authorization
- **Multi-Provider OAuth**: Google, GitHub, Microsoft/Entra ID
- **Traditional Authentication**: Email/password with verification
- **API Key Management**: Bearer tokens and x-api-key headers
- **Role-Based Access Control**: Admin, Server Owner, and User roles
- **Session Management**: Secure session handling with Redis storage

### 🖥️ Server Management
- **MCP Server Lifecycle**: Create, configure, monitor, and manage MCP servers
- **Health Monitoring**: Real-time health checks and performance metrics
- **Multi-Tenancy**: Complete tenant isolation and resource management
- **Configuration Management**: Environment variables and startup parameters

### 📊 Analytics & Monitoring
- **Dashboard Analytics**: Usage statistics and performance dashboards
- **Database Optimization**: 38 strategic indexes for 40-90% query improvement
- **Real-time Monitoring**: Database functions for health and performance tracking
- **Automated Optimization**: Self-tuning database with health scoring

### 🛡️ Security Features
- **Rate Limiting**: Configurable limits per role (Admin: 1000 RPM, Server Owner: 500 RPM, User: 100 RPM)
- **CSRF Protection**: Built-in token validation
- **Password Security**: Bcrypt hashing with proper salt rounds
- **Session Security**: Secure cookies with httpOnly and sameSite
- **Audit Logging**: Complete audit trail of all operations

## API Organization

This documentation is organized into the following sections:

### Authentication Endpoints
All authentication-related operations including login, registration, OAuth, and session management.

### Application Endpoints
Server management, dashboard analytics, health monitoring, and administrative operations.

## Getting Started

1. **Authentication**: Start by authenticating using one of the available methods (OAuth, email/password, or API key)
2. **Explore Servers**: Use the server management endpoints to create and configure MCP servers
3. **Monitor Health**: Use the health endpoints to monitor server performance
4. **Analytics**: Access dashboard endpoints for usage statistics and insights

## Rate Limits

API rate limits are enforced per authentication method and user role:

- **Admin**: 1,000 requests per minute
- **Server Owner**: 500 requests per minute
- **User**: 100 requests per minute
- **Anonymous**: 20 requests per minute

## Support

For API support, please contact us at api@mcp-registry.com or visit our support portal.
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
        // Authentication tags
        {
          name: "Authentication",
          description: "Login, logout, and session management",
        },
        {
          name: "Registration",
          description: "Account creation and email verification",
        },
        {
          name: "OAuth",
          description: "Third-party provider authentication (Google, GitHub, Microsoft)",
        },
        {
          name: "User Management",
          description: "User profile and account management",
        },
        {
          name: "API Keys",
          description: "API key generation and management",
        },
        {
          name: "Security",
          description: "Password reset, email verification, and security operations",
        },
        // Application tags
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
        // Backend tags (if available)
        ...(backendSchema?.tags || []).map((tag) => ({
          ...tag,
          description: `${tag.description} (Backend)`,
        })),
      ],
      paths: {
        // Merge paths from all schemas with proper type casting
        ...(authSchema.paths as OpenAPIV3.PathsObject),
        ...((appSchema?.paths as OpenAPIV3.PathsObject) || {}),
        ...((backendSchema?.paths as OpenAPIV3.PathsObject) || {}),
      } as OpenAPIV3.PathsObject,
      components: {
        securitySchemes: {
          // Use the more comprehensive security schemes from auth schema with proper type casting
          ...(authSchema.components?.securitySchemes as Record<string, OpenAPIV3.SecuritySchemeObject>),
        },
        schemas: {
          // Merge schemas from all APIs
          ...authSchema.components?.schemas,
          ...(appSchema?.components?.schemas || {}),
          ...(backendSchema?.components?.schemas || {}),
        },
        responses: {
          // Merge responses from all schemas
          ...(appSchema?.components?.responses || {}),
          ...(backendSchema?.components?.responses || {}),
        },
      },
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
    };

    return NextResponse.json(combinedSchema, {
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
    apiLogger.logError(error, "Failed to generate combined OpenAPI schema");

    return NextResponse.json(
      {
        error: "Schema Generation Error",
        message: "Failed to generate combined API schema",
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
