import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getServerHealthSummary, getSystemHealthScore } from "@/db/analytics";
import { getUserTenantId, getServersForTenant } from "@/lib/server-management";
import { apiLogger } from "@/lib/logger";

export interface DashboardStats {
  totalServers: number;
  healthyServers: number;
  unhealthyServers: number;
  unknownServers: number;
  avgResponseTime: number | null;
  systemHealthScore: number;
  systemStatus: "healthy" | "degraded" | "unhealthy";
  recentActivity: Array<{
    id: string;
    name: string;
    status: string;
    healthStatus: string;
    lastHealthCheck: string | null;
    responseTime: number | null;
  }>;
}

// GET /api/dashboard - Get dashboard statistics and overview
export async function GET(_request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", message: "Authentication required" }, { status: 401 });
    }

    // Get user's tenant ID
    const tenantId = await getUserTenantId(session.user.id);

    // Get servers for the tenant/user
    const { servers } = await getServersForTenant(tenantId, session.user.id, {
      limit: 100,
      offset: 0,
      sortBy: "lastUsedAt",
      sortOrder: "desc",
    });

    // Get server health summary (not used but kept for potential future enhancements)
    const [_healthSummary] = await getServerHealthSummary();

    // Get system health score
    const systemHealth = await getSystemHealthScore();

    // Calculate stats from servers
    const totalServers = servers.length;
    const healthyServers = servers.filter((s) => s.healthStatus === "healthy").length;
    const unhealthyServers = servers.filter((s) => s.healthStatus === "unhealthy").length;
    const unknownServers = servers.filter((s) => s.healthStatus === "unknown").length;

    // Calculate average response time from servers with valid data
    const serversWithResponseTime = servers.filter((s) => s.avgResponseTime && parseFloat(s.avgResponseTime) > 0);
    const avgResponseTime =
      serversWithResponseTime.length > 0
        ? serversWithResponseTime.reduce((sum, s) => sum + parseFloat(s.avgResponseTime!), 0) / serversWithResponseTime.length
        : null;

    // Get recent activity (last 10 servers ordered by last health check)
    const recentActivity = servers
      .filter((s) => s.lastHealthCheck)
      .slice(0, 10)
      .map((server) => ({
        id: server.id,
        name: server.name,
        status: server.status,
        healthStatus: server.healthStatus,
        lastHealthCheck: server.lastHealthCheck,
        responseTime: server.avgResponseTime ? parseFloat(server.avgResponseTime) : null,
      }));

    const dashboardStats: DashboardStats = {
      totalServers,
      healthyServers,
      unhealthyServers,
      unknownServers,
      avgResponseTime,
      systemHealthScore: systemHealth.score,
      systemStatus: systemHealth.status,
      recentActivity,
    };

    return NextResponse.json(dashboardStats);
  } catch (error) {
    apiLogger.logError(error, "GET /api/dashboard error");

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch dashboard data",
      },
      { status: 500 },
    );
  }
}
