import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { healthCheckSchema, type ErrorResponse } from "@/db/schema/server";
import { getServerById, getUserTenantId, getServerHealthHistory } from "@/lib/server-management";
import { performHealthCheck } from "@/lib/health-checker";
import { ZodError } from "zod";
import { apiLogger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/servers/[id]/health - Get server health history
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" } satisfies ErrorResponse, { status: 401 });
    }

    // Get user's tenant ID
    const tenantId = await getUserTenantId(session.user.id);

    // Check if server exists and user has access
    const server = await getServerById(id, tenantId, session.user.id);
    if (!server) {
      return NextResponse.json({ error: "Not Found", message: "Server not found" } satisfies ErrorResponse, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // Get health history
    const healthHistory = await getServerHealthHistory(id, limit);

    return NextResponse.json({
      serverId: id,
      currentStatus: server.healthStatus,
      lastHealthCheck: server.lastHealthCheck,
      history: healthHistory.map((record) => ({
        status: record.status,
        responseTime: record.responseTime,
        errorMessage: record.errorMessage,
        metrics: record.metrics,
        checkedAt: record.checkedAt.toISOString(),
      })),
    });
  } catch (error) {
    apiLogger.logError(error, `GET /api/servers/${(await params).id}/health error`);

    return NextResponse.json({ error: "Internal Server Error", message: "Failed to fetch health history" } satisfies ErrorResponse, {
      status: 500,
    });
  }
}

// POST /api/servers/[id]/health - Perform manual health check
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" } satisfies ErrorResponse, { status: 401 });
    }

    // Parse and validate request body (optional health check configuration)
    let healthCheckConfig = {};
    try {
      const body = await request.json();
      healthCheckConfig = healthCheckSchema.parse(body);
    } catch (jsonError) {
      // Body is optional, use default config if parsing fails
      if (jsonError instanceof SyntaxError) {
        // Empty or invalid JSON, use defaults
        healthCheckConfig = {};
      } else if (jsonError instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: "Invalid health check configuration",
            details: jsonError.issues,
          } satisfies ErrorResponse,
          { status: 400 },
        );
      }
    }

    // Get user's tenant ID
    const tenantId = await getUserTenantId(session.user.id);

    // Check if server exists and user has access
    const server = await getServerById(id, tenantId, session.user.id);
    if (!server) {
      return NextResponse.json({ error: "Not Found", message: "Server not found" } satisfies ErrorResponse, { status: 404 });
    }

    // Perform health check
    const healthResult = await performHealthCheck(
      server.id,
      server.endpointUrl,
      server.transportType,
      server.authType !== "none"
        ? {
            authType: server.authType,
            ...(server.authConfig || {}),
          }
        : undefined,
      healthCheckConfig,
    );

    return NextResponse.json(healthResult);
  } catch (error) {
    apiLogger.logError(error, `POST /api/servers/${(await params).id}/health error`);

    // Handle specific health check errors
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            error: "Timeout",
            message: "Health check timed out",
          } satisfies ErrorResponse,
          { status: 408 },
        );
      }

      if (error.message.includes("connection")) {
        return NextResponse.json(
          {
            error: "Connection Error",
            message: "Unable to connect to server",
          } satisfies ErrorResponse,
          { status: 503 },
        );
      }

      if (error.message.includes("unauthorized") || error.message.includes("forbidden")) {
        return NextResponse.json(
          {
            error: "Authentication Error",
            message: "Server authentication failed",
          } satisfies ErrorResponse,
          { status: 401 },
        );
      }
    }

    return NextResponse.json({ error: "Internal Server Error", message: "Health check failed" } satisfies ErrorResponse, { status: 500 });
  }
}
