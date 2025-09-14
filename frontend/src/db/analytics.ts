/**
 * Database Analytics Functions
 *
 * TypeScript utilities for calling the database functions and views
 * created in the performance optimization migrations.
 */

import { sql } from "drizzle-orm";
import { db } from "./index";

// ============================================================================
// Type Definitions
// ============================================================================

export interface ServerHealthSummary {
  total_servers: number;
  healthy_servers: number;
  unhealthy_servers: number;
  degraded_servers: number;
  avg_response_time: number | null;
}

export interface RequestPerformanceSummary {
  total_requests: number;
  successful_requests: number;
  error_requests: number;
  avg_duration_ms: number | null;
  p95_duration_ms: number | null;
  p99_duration_ms: number | null;
}

export interface TenantUsageSummary {
  total_servers: number;
  active_servers: number;
  total_tools: number;
  total_resources: number;
  total_api_calls: number;
  avg_response_time: number | null;
  total_users: number;
  active_sessions: number;
}

export interface ApiUsageStatistics {
  date: Date;
  total_calls: number;
  unique_tenants: number;
  unique_users: number;
  avg_response_time: number | null;
  error_count: number;
}

export interface ServerPerformanceRanking {
  server_id: string;
  server_name: string;
  health_status: string;
  avg_response_time: number | null;
  uptime: number | null;
  total_requests: number;
  performance_score: number | null;
}

export interface AuditTrailEntry {
  audit_id: string;
  timestamp: Date;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  success: boolean;
  metadata: Record<string, unknown>;
}

export interface CircuitBreakerStatus {
  server_id: string;
  server_name: string | null;
  service_name: string;
  state: string;
  failure_count: number;
  success_count: number;
  last_state_change: Date;
  time_in_current_state: string;
}

export interface ConnectionPoolStats {
  server_id: string;
  server_name: string | null;
  pool_name: string;
  active_connections: number;
  idle_connections: number;
  total_connections: number;
  utilization_percentage: number | null;
  avg_wait_time_ms: number | null;
  last_used: Date | null;
}

// ============================================================================
// Analytics Functions
// ============================================================================

/**
 * Get server health summary across all MCP servers
 */
export async function getServerHealthSummary(): Promise<ServerHealthSummary[]> {
  const result = await db.execute(sql`SELECT * FROM get_server_health_summary()`);
  return result.rows as unknown as ServerHealthSummary[];
}

/**
 * Get request performance summary for a specified time window
 */
export async function getRequestPerformanceSummary(hours: number = 24): Promise<RequestPerformanceSummary[]> {
  const result = await db.execute(sql`SELECT * FROM get_request_performance_summary(${hours})`);
  return result.rows as unknown as RequestPerformanceSummary[];
}

/**
 * Get tenant usage summary for a specific tenant
 */
export async function getTenantUsageSummary(tenantId: string): Promise<TenantUsageSummary[]> {
  const result = await db.execute(sql`SELECT * FROM get_tenant_usage_summary(${tenantId})`);
  return result.rows as unknown as TenantUsageSummary[];
}

/**
 * Get API usage statistics for the specified number of days
 */
export async function getApiUsageStatistics(days: number = 7): Promise<ApiUsageStatistics[]> {
  const result = await db.execute(sql`SELECT * FROM get_api_usage_statistics(${days})`);
  return result.rows as unknown as ApiUsageStatistics[];
}

/**
 * Get server performance ranking
 */
export async function getServerPerformanceRanking(limit: number = 10): Promise<ServerPerformanceRanking[]> {
  const result = await db.execute(sql`SELECT * FROM get_server_performance_ranking(${limit})`);
  return result.rows as unknown as ServerPerformanceRanking[];
}

/**
 * Search audit trail with flexible filters
 */
export async function searchAuditTrail(params: {
  tenantId?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditTrailEntry[]> {
  const {
    tenantId = null,
    userId = null,
    action = null,
    resourceType = null,
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate = new Date(),
    limit = 100,
  } = params;

  const result = await db.execute(
    sql`SELECT * FROM search_audit_trail(
      ${tenantId}, ${userId}, ${action}, ${resourceType},
      ${startDate}, ${endDate}, ${limit}
    )`,
  );
  return result.rows as unknown as AuditTrailEntry[];
}

/**
 * Get circuit breaker status for all servers
 */
export async function getCircuitBreakerStatus(): Promise<CircuitBreakerStatus[]> {
  const result = await db.execute(sql`SELECT * FROM get_circuit_breaker_status()`);
  return result.rows as unknown as CircuitBreakerStatus[];
}

/**
 * Get connection pool statistics
 */
export async function getConnectionPoolStats(): Promise<ConnectionPoolStats[]> {
  const result = await db.execute(sql`SELECT * FROM get_connection_pool_stats()`);
  return result.rows as unknown as ConnectionPoolStats[];
}

// ============================================================================
// View Queries
// ============================================================================

/**
 * Get database size summary
 */
export async function getDatabaseSizeSummary() {
  const result = await db.execute(sql`SELECT * FROM database_size_summary`);
  return result.rows;
}

/**
 * Get index usage summary
 */
export async function getIndexUsageSummary() {
  const result = await db.execute(sql`SELECT * FROM index_usage_summary`);
  return result.rows;
}

/**
 * Get performance monitoring overview
 */
export async function getPerformanceMonitoring() {
  const result = await db.execute(sql`SELECT * FROM performance_monitoring`);
  return result.rows;
}

/**
 * Get tenant activity summary
 */
export async function getTenantActivitySummary() {
  const result = await db.execute(sql`SELECT * FROM tenant_activity_summary`);
  return result.rows;
}

/**
 * Get server tool performance metrics
 */
export async function getServerToolPerformance() {
  const result = await db.execute(sql`SELECT * FROM server_tool_performance`);
  return result.rows;
}

/**
 * Get recent errors with context
 */
export async function getRecentErrors() {
  const result = await db.execute(sql`SELECT * FROM recent_errors`);
  return result.rows;
}

/**
 * Get API endpoint usage statistics
 */
export async function getApiEndpointUsage() {
  const result = await db.execute(sql`SELECT * FROM api_endpoint_usage`);
  return result.rows;
}

/**
 * Get security events dashboard
 */
export async function getSecurityEventsDashboard() {
  const result = await db.execute(sql`SELECT * FROM security_events_dashboard`);
  return result.rows;
}

/**
 * Get performance alert status
 */
export async function getPerformanceAlertStatus() {
  const result = await db.execute(sql`SELECT * FROM performance_alert_status`);
  return result.rows;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Run ANALYZE on critical tables to update query planner statistics
 */
export async function updateTableStatistics(): Promise<void> {
  const tables = [
    "mcp_server",
    "mcp_tool",
    "mcp_resource",
    "mcp_prompt",
    "server_metrics",
    "user",
    "session",
    "sessions",
    "api_token",
    "enhanced_api_keys",
    "audit_log",
    "request_logs",
    "fastmcp_audit_log",
    "system_config",
    "tenant",
    "tenant_member",
    "circuit_breakers",
    "connection_pools",
    "request_queues",
    "server_access_control",
    "performance_alerts",
    "data_retention_policies",
  ];

  for (const table of tables) {
    await db.execute(sql.raw(`ANALYZE "${table}"`));
  }
}

/**
 * Get overall system health score
 */
export async function getSystemHealthScore(): Promise<{
  score: number;
  status: "healthy" | "degraded" | "unhealthy";
  details: {
    servers: ServerHealthSummary;
    requests: RequestPerformanceSummary;
    circuitBreakers: number;
    activeAlerts: number;
  };
}> {
  const [serverHealth] = await getServerHealthSummary();
  const [requestPerf] = await getRequestPerformanceSummary(1); // Last hour
  const circuitBreakers = await getCircuitBreakerStatus();
  const alerts = await getPerformanceAlertStatus();

  const openBreakers = circuitBreakers.filter((cb) => cb.state === "OPEN").length;
  const activeAlerts = alerts.filter((alert) => {
    const alertStatus = alert as Record<string, unknown>;
    return String(alertStatus.alert_status || "").includes("Active") && alertStatus.severity === "CRITICAL";
  }).length;

  // Calculate health score (0-100)
  let score = 100;

  // Deduct for unhealthy servers
  if (serverHealth.total_servers > 0) {
    const healthyRatio = serverHealth.healthy_servers / serverHealth.total_servers;
    score -= (1 - healthyRatio) * 30; // Up to 30 points for server health
  }

  // Deduct for high error rate
  if (requestPerf.total_requests > 0) {
    const errorRate = requestPerf.error_requests / requestPerf.total_requests;
    score -= errorRate * 25; // Up to 25 points for error rate
  }

  // Deduct for open circuit breakers
  score -= openBreakers * 10; // 10 points per open breaker

  // Deduct for critical alerts
  score -= activeAlerts * 15; // 15 points per critical alert

  score = Math.max(0, Math.min(100, score));

  let status: "healthy" | "degraded" | "unhealthy";
  if (score >= 80) {
    status = "healthy";
  } else if (score >= 60) {
    status = "degraded";
  } else {
    status = "unhealthy";
  }

  return {
    score: Math.round(score),
    status,
    details: {
      servers: serverHealth,
      requests: requestPerf,
      circuitBreakers: openBreakers,
      activeAlerts,
    },
  };
}
