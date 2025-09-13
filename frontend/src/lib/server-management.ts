import { db } from "@/db";
import { mcpServer, mcpServerHealthCheck } from "@/db/schema/mcp";
import { eq, and, desc, asc, ilike, or, sql, count } from "drizzle-orm";
import type { CreateServerRequest, UpdateServerRequest, ServerQuery, ServerResponse } from "@/db/schema/server";
import { nanoid } from "nanoid";

// Generate a unique server ID
export function generateServerId(): string {
  return `mcp-${nanoid(12)}`;
}

// Get user's tenant ID from session
export async function getUserTenantId(userId: string): Promise<string | null> {
  // TODO: For now, we'll use userId as tenantId for simplicity
  // In a more complex implementation, this would query a user-tenant relationship table
  return userId;
}

// Create a new MCP server
export async function createMcpServer(
  serverData: CreateServerRequest,
  ownerId: string,
  tenantId: string | null = null,
): Promise<ServerResponse> {
  const serverId = generateServerId();

  const [newServer] = await db
    .insert(mcpServer)
    .values({
      id: serverId,
      name: serverData.name,
      description: serverData.description,
      version: serverData.version,
      endpointUrl: serverData.endpointUrl,
      transportType: serverData.transportType,
      authType: serverData.authType || "none",
      authConfig: serverData.authConfig,
      tags: serverData.tags || [],
      category: serverData.category,
      tenantId: tenantId,
      ownerId: ownerId,
      isPublic: serverData.isPublic || false,
      settings: serverData.settings || {},
      healthCheckInterval: serverData.healthCheckInterval || 300,
      status: "inactive", // New servers start as inactive
      healthStatus: "unknown",
    })
    .returning();

  return transformServerResponse(newServer);
}

// Get servers for a tenant with filtering and pagination
export async function getServersForTenant(
  tenantId: string | null,
  ownerId: string,
  query: ServerQuery,
): Promise<{ servers: ServerResponse[]; total: number }> {
  const conditions = [];

  // Base tenant/owner filter
  if (tenantId) {
    conditions.push(eq(mcpServer.tenantId, tenantId));
  } else {
    conditions.push(eq(mcpServer.ownerId, ownerId));
  }

  // Status filter
  if (query.status && query.status !== "all") {
    conditions.push(eq(mcpServer.status, query.status));
  }

  // Transport type filter
  if (query.transportType && query.transportType !== "all") {
    conditions.push(eq(mcpServer.transportType, query.transportType));
  }

  // Category filter
  if (query.category) {
    conditions.push(eq(mcpServer.category, query.category));
  }

  // Public filter
  if (query.isPublic !== undefined) {
    conditions.push(eq(mcpServer.isPublic, query.isPublic));
  }

  // Search filter
  if (query.search) {
    conditions.push(or(ilike(mcpServer.name, `%${query.search}%`), ilike(mcpServer.description, `%${query.search}%`)));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [totalResult] = await db.select({ count: count() }).from(mcpServer).where(whereClause);

  // Get servers with pagination and sorting
  const sortColumn = getSortColumn(query.sortBy);
  const sortDirection = query.sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

  const servers = await db.select().from(mcpServer).where(whereClause).orderBy(sortDirection).limit(query.limit).offset(query.offset);

  return {
    servers: servers.map(transformServerResponse),
    total: totalResult.count,
  };
}

// Get a specific server by ID for a tenant
export async function getServerById(serverId: string, tenantId: string | null, ownerId: string): Promise<ServerResponse | null> {
  const conditions = [eq(mcpServer.id, serverId)];

  if (tenantId) {
    conditions.push(eq(mcpServer.tenantId, tenantId));
  } else {
    conditions.push(eq(mcpServer.ownerId, ownerId));
  }

  const [server] = await db
    .select()
    .from(mcpServer)
    .where(and(...conditions));

  return server ? transformServerResponse(server) : null;
}

// Update an existing server
export async function updateMcpServer(
  serverId: string,
  serverData: UpdateServerRequest,
  tenantId: string | null,
  ownerId: string,
): Promise<ServerResponse | null> {
  const conditions = [eq(mcpServer.id, serverId)];

  if (tenantId) {
    conditions.push(eq(mcpServer.tenantId, tenantId));
  } else {
    conditions.push(eq(mcpServer.ownerId, ownerId));
  }

  const [updatedServer] = await db
    .update(mcpServer)
    .set({
      ...serverData,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning();

  return updatedServer ? transformServerResponse(updatedServer) : null;
}

// Delete a server
export async function deleteMcpServer(serverId: string, tenantId: string | null, ownerId: string): Promise<boolean> {
  const conditions = [eq(mcpServer.id, serverId)];

  if (tenantId) {
    conditions.push(eq(mcpServer.tenantId, tenantId));
  } else {
    conditions.push(eq(mcpServer.ownerId, ownerId));
  }

  const result = await db.delete(mcpServer).where(and(...conditions));

  return result.rowCount ? result.rowCount > 0 : false;
}

// Update server status
export async function updateServerStatus(
  serverId: string,
  status: "active" | "inactive" | "error" | "maintenance",
  tenantId: string | null,
  ownerId: string,
): Promise<void> {
  const conditions = [eq(mcpServer.id, serverId)];

  if (tenantId) {
    conditions.push(eq(mcpServer.tenantId, tenantId));
  } else {
    conditions.push(eq(mcpServer.ownerId, ownerId));
  }

  await db
    .update(mcpServer)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(and(...conditions));
}

// Update server health status
export async function updateServerHealth(
  serverId: string,
  healthStatus: "healthy" | "unhealthy" | "unknown",
  responseTime?: number,
  errorMessage?: string,
  metrics?: Record<string, unknown>,
): Promise<void> {
  const now = new Date();

  // Update server health status
  await db
    .update(mcpServer)
    .set({
      healthStatus,
      lastHealthCheck: now,
      updatedAt: now,
    })
    .where(eq(mcpServer.id, serverId));

  // Record health check history
  await db.insert(mcpServerHealthCheck).values({
    serverId,
    status: healthStatus === "healthy" ? "healthy" : "unhealthy",
    responseTime,
    errorMessage,
    metrics,
    checkedAt: now,
  });
}

// Get server health history
export async function getServerHealthHistory(
  serverId: string,
  limit: number = 50,
): Promise<
  Array<{
    status: string;
    responseTime: number | null;
    errorMessage: string | null;
    metrics: Record<string, unknown> | null;
    checkedAt: Date;
  }>
> {
  return await db
    .select()
    .from(mcpServerHealthCheck)
    .where(eq(mcpServerHealthCheck.serverId, serverId))
    .orderBy(desc(mcpServerHealthCheck.checkedAt))
    .limit(limit);
}

// Increment server usage statistics
export async function incrementServerUsage(serverId: string, responseTime?: number, isError: boolean = false): Promise<void> {
  const updateData: Record<string, unknown> = {
    requestCount: sql`${mcpServer.requestCount} + 1`,
    updatedAt: new Date(),
    lastUsedAt: new Date(),
  };

  if (isError) {
    updateData.errorCount = sql`${mcpServer.errorCount} + 1`;
  }

  if (responseTime !== undefined) {
    // Simple moving average calculation
    updateData.avgResponseTime = sql`
      CASE
        WHEN ${mcpServer.avgResponseTime} IS NULL THEN ${responseTime}
        ELSE (${mcpServer.avgResponseTime} + ${responseTime}) / 2
      END
    `;
  }

  await db.update(mcpServer).set(updateData).where(eq(mcpServer.id, serverId));
}

// Helper functions
function getSortColumn(sortBy: string) {
  switch (sortBy) {
    case "name":
      return mcpServer.name;
    case "createdAt":
      return mcpServer.createdAt;
    case "updatedAt":
      return mcpServer.updatedAt;
    case "lastUsedAt":
      return mcpServer.lastUsedAt;
    case "requestCount":
      return mcpServer.requestCount;
    default:
      return mcpServer.name;
  }
}

function transformServerResponse(server: {
  id: string;
  name: string;
  description: string | null;
  version: string;
  endpointUrl: string;
  transportType: "http" | "websocket" | "stdio" | "sse";
  authType: "none" | "bearer" | "api_key" | "oauth" | "custom";
  authConfig: {
    apiKey?: string;
    bearerToken?: string;
    oauth?: {
      clientId?: string;
      clientSecret?: string;
      scope?: string;
    };
    custom?: Record<string, unknown>;
  } | null;
  status: "active" | "inactive" | "error" | "maintenance";
  healthStatus: "healthy" | "unhealthy" | "unknown";
  lastHealthCheck: Date | null;
  healthCheckInterval: number | null;
  capabilities: Record<string, unknown> | null;
  tags: string[] | null;
  category: string | null;
  tenantId: string | null;
  ownerId: string;
  isPublic: boolean | null;
  requestCount: number | null;
  errorCount: number | null;
  avgResponseTime: string | null;
  uptime: string | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
}): ServerResponse {
  return {
    id: server.id,
    name: server.name,
    description: server.description,
    version: server.version,
    endpointUrl: server.endpointUrl,
    transportType: server.transportType,
    authType: server.authType,
    authConfig: server.authConfig || undefined,
    status: server.status,
    healthStatus: server.healthStatus,
    lastHealthCheck: server.lastHealthCheck?.toISOString() || null,
    healthCheckInterval: server.healthCheckInterval || 300,
    capabilities: server.capabilities || {},
    tags: server.tags || [],
    category: server.category,
    tenantId: server.tenantId,
    ownerId: server.ownerId,
    isPublic: server.isPublic ?? false,
    requestCount: server.requestCount ?? 0,
    errorCount: server.errorCount ?? 0,
    avgResponseTime: server.avgResponseTime,
    uptime: server.uptime || "0.00",
    settings: server.settings || {},
    createdAt: server.createdAt.toISOString(),
    updatedAt: server.updatedAt.toISOString(),
    lastUsedAt: server.lastUsedAt?.toISOString() || null,
  };
}
