import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";

/**
 * Better-Auth OpenAPI Schema Endpoint
 *
 * Generates and serves the OpenAPI schema for Better-Auth endpoints.
 * This includes authentication, authorization, and user management APIs.
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = new URL(request.url).origin;

    // Generate the OpenAPI schema using Better-Auth's built-in function
    // Note: Better-Auth generateOpenAPISchema doesn't accept parameters, it returns a fixed schema
    const baseAuthSchema = await auth.api.generateOpenAPISchema();

    // Enhance the schema with custom info and configuration
    const authSchema = {
      ...baseAuthSchema,
      info: {
        title: "MCP Registry Gateway - Authentication API",
        version: "1.0.0",
        description: `
# Authentication & Authorization API

This section covers all authentication-related endpoints provided by Better-Auth, including:

## Features
- **Multi-Provider OAuth**: Google, GitHub, Microsoft/Entra ID
- **Email/Password Authentication**: Traditional credentials with verification
- **Session Management**: Secure session handling with Redis storage
- **API Key Authentication**: Bearer token and x-api-key header support
- **Role-Based Access Control**: Admin, Server Owner, and User roles
- **Account Linking**: Link multiple OAuth accounts to single user

## Security Features
- **Rate Limiting**: Admin (1000 RPM), Server Owner (500 RPM), User (100 RPM), Anonymous (20 RPM)
- **JWT Tokens**: Secure token-based authentication
- **Password Security**: Bcrypt hashing with proper salt rounds
- **Session Security**: Secure session cookies with httpOnly and sameSite
- **CSRF Protection**: Built-in CSRF token validation
- **Account Verification**: Email verification for new accounts

## Role Mapping
- **Azure AD**: Automatic role mapping from security groups and app roles
- **Google**: Domain-based and email pattern role assignment
- **GitHub**: Organization and team-based role mapping

## API Key Management
- **Token Generation**: Secure API key generation with custom prefixes
- **Metadata Support**: Custom metadata and permissions per token
- **Rate Limiting**: Per-token rate limiting configuration
- **Expiration**: Optional token expiration dates

All endpoints are secured and require appropriate authentication unless explicitly marked as public.
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
        ...baseAuthSchema.tags,
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
          name: "Admin",
          description: "Administrative user management endpoints",
        },
        {
          name: "Security",
          description: "Password reset, email verification, and security operations",
        },
      ],
      components: {
        ...baseAuthSchema.components,
        securitySchemes: {
          ...baseAuthSchema.components.securitySchemes,
          BearerAuth: {
            type: "http" as const,
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT token obtained from authentication endpoints",
          },
          ApiKeyAuth: {
            type: "apiKey" as const,
            in: "header" as const,
            name: "x-api-key",
            description: "API key for server-to-server authentication",
          },
          SessionAuth: {
            type: "apiKey" as const,
            in: "cookie" as const,
            name: "better-auth.session_token",
            description: "Session cookie for browser-based authentication",
          },
        },
      },
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }, { SessionAuth: [] }],
    };

    return NextResponse.json(authSchema, {
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
    apiLogger.logError(error, "Failed to generate auth OpenAPI schema");

    return NextResponse.json(
      {
        error: "Schema Generation Error",
        message: "Failed to generate authentication API schema",
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
