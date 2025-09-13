import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createServerSchema, serverQuerySchema, type ServerListResponse, type ErrorResponse } from "@/db/schema/server";
import { createMcpServer, getServersForTenant, getUserTenantId } from "@/lib/server-management";
import { ZodError } from "zod";
import { apiLogger } from "@/lib/logger";

// GET /api/servers - List servers for the authenticated user/tenant
export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" } satisfies ErrorResponse, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const query = serverQuerySchema.parse(queryParams);

    // Get user's tenant ID
    const tenantId = await getUserTenantId(session.user.id);

    // Fetch servers
    const { servers, total } = await getServersForTenant(tenantId, session.user.id, query);

    const response: ServerListResponse = {
      servers,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    apiLogger.logError(error, "GET /api/servers error");

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Invalid query parameters",
          details: error.issues,
        } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Internal Server Error", message: "Failed to fetch servers" } satisfies ErrorResponse, {
      status: 500,
    });
  }
}

// POST /api/servers - Create a new MCP server
export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" } satisfies ErrorResponse, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const serverData = createServerSchema.parse(body);

    // Get user's tenant ID
    const tenantId = await getUserTenantId(session.user.id);

    // Create the server
    const newServer = await createMcpServer(serverData, session.user.id, tenantId);

    return NextResponse.json(newServer, { status: 201 });
  } catch (error) {
    apiLogger.logError(error, "POST /api/servers error");

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Invalid server configuration",
          details: error.issues,
        } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    // Check for unique constraint violations (server name conflicts, etc.)
    if (error instanceof Error) {
      if (error.message.includes("unique") || error.message.includes("duplicate")) {
        return NextResponse.json(
          {
            error: "Conflict",
            message: "A server with this configuration already exists",
          } satisfies ErrorResponse,
          { status: 409 },
        );
      }

      // Check for database connection errors
      if (error.message.includes("connection") || error.message.includes("database")) {
        return NextResponse.json(
          {
            error: "Database Error",
            message: "Unable to connect to database",
          } satisfies ErrorResponse,
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ error: "Internal Server Error", message: "Failed to create server" } satisfies ErrorResponse, {
      status: 500,
    });
  }
}
