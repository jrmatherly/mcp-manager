import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateServerSchema, type ErrorResponse } from "@/db/schema/server";
import { getServerById, updateMcpServer, deleteMcpServer, getUserTenantId } from "@/lib/server-management";
import { ZodError } from "zod";
import { apiLogger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/servers/[id] - Get a specific server
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

    // Fetch the server
    const server = await getServerById(id, tenantId, session.user.id);

    if (!server) {
      return NextResponse.json({ error: "Not Found", message: "Server not found" } satisfies ErrorResponse, { status: 404 });
    }

    return NextResponse.json(server);
  } catch (error) {
    apiLogger.logError(error, `GET /api/servers/${(await params).id} error`);

    return NextResponse.json({ error: "Internal Server Error", message: "Failed to fetch server" } satisfies ErrorResponse, {
      status: 500,
    });
  }
}

// PUT /api/servers/[id] - Update a specific server
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" } satisfies ErrorResponse, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const updateData = updateServerSchema.parse(body);

    // Get user's tenant ID
    const tenantId = await getUserTenantId(session.user.id);

    // Update the server
    const updatedServer = await updateMcpServer(id, updateData, tenantId, session.user.id);

    if (!updatedServer) {
      return NextResponse.json({ error: "Not Found", message: "Server not found" } satisfies ErrorResponse, { status: 404 });
    }

    return NextResponse.json(updatedServer);
  } catch (error) {
    apiLogger.logError(error, `PUT /api/servers/${(await params).id} error`);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Invalid server update data",
          details: error.issues,
        } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    // Check for unique constraint violations
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

    return NextResponse.json({ error: "Internal Server Error", message: "Failed to update server" } satisfies ErrorResponse, {
      status: 500,
    });
  }
}

// DELETE /api/servers/[id] - Delete a specific server
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check if server exists first
    const existingServer = await getServerById(id, tenantId, session.user.id);
    if (!existingServer) {
      return NextResponse.json({ error: "Not Found", message: "Server not found" } satisfies ErrorResponse, { status: 404 });
    }

    // Delete the server
    const deleted = await deleteMcpServer(id, tenantId, session.user.id);

    if (!deleted) {
      return NextResponse.json({ error: "Not Found", message: "Server not found" } satisfies ErrorResponse, { status: 404 });
    }

    // Return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    apiLogger.logError(error, `DELETE /api/servers/${(await params).id} error`);

    // Check for foreign key constraint violations (server has dependencies)
    if (error instanceof Error) {
      if (error.message.includes("foreign key") || error.message.includes("constraint")) {
        return NextResponse.json(
          {
            error: "Conflict",
            message: "Cannot delete server: it has dependent resources",
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

    return NextResponse.json({ error: "Internal Server Error", message: "Failed to delete server" } satisfies ErrorResponse, {
      status: 500,
    });
  }
}
