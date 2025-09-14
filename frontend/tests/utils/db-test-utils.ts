/**
 * Database Test Utilities
 *
 * Helper functions for database testing including test data creation,
 * cleanup, and database state verification.
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";

export interface TestDataIds {
  serverId: string;
  tenantId: string;
  userId: string;
  toolId?: string;
  resourceId?: string;
}

/**
 * Create minimal test data for database tests
 */
export async function createTestData(): Promise<TestDataIds> {
  const timestamp = Date.now();
  const testIds: TestDataIds = {
    serverId: `test-server-${timestamp}`,
    tenantId: `test-tenant-${timestamp}`,
    userId: `test-user-${timestamp}`,
  };

  // Create test user first (without tenant_id)
  await db.execute(sql`
    INSERT INTO "user" (id, name, email, email_verified, is_active, created_at, updated_at)
    VALUES (${testIds.userId}, 'Test User', 'test@example.com', true, true, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // Create test tenant with user as owner
  await db.execute(sql`
    INSERT INTO tenant (id, name, slug, owner_id, plan_type, status, created_at, updated_at)
    VALUES (${testIds.tenantId}, 'Test Tenant', ${"test-tenant-" + timestamp}, ${testIds.userId}, 'free', 'active', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  // Update user with tenant_id
  await db.execute(sql`
    UPDATE "user"
    SET tenant_id = ${testIds.tenantId}
    WHERE id = ${testIds.userId}
  `);

  // Create test MCP server
  await db.execute(sql`
    INSERT INTO mcp_server (
      id, name, version, endpoint_url, transport_type, owner_id, tenant_id,
      status, health_status, request_count, error_count, avg_response_time, uptime
    )
    VALUES (
      ${testIds.serverId}, 'Test Server', '1.0.0', 'http://test.example.com', 'http',
      ${testIds.userId}, ${testIds.tenantId}, 'active', 'healthy', 100, 5, 250.0, 99.5
    )
    ON CONFLICT (id) DO NOTHING
  `);

  return testIds;
}

/**
 * Create test tool data
 */
export async function createTestTool(serverId: string): Promise<string> {
  const toolId = `test-tool-${Date.now()}`;

  await db.execute(sql`
    INSERT INTO mcp_tool (
      id, server_id, name, description, call_count, error_count,
      avg_execution_time, is_active, category
    )
    VALUES (
      ${toolId}, ${serverId}, 'test_tool', 'Test tool description',
      50, 2, 150.0, true, 'testing'
    )
    ON CONFLICT (id) DO NOTHING
  `);

  return toolId;
}

/**
 * Create test resource data
 */
export async function createTestResource(serverId: string): Promise<string> {
  const resourceId = `test-resource-${Date.now()}`;

  await db.execute(sql`
    INSERT INTO mcp_resource (
      id, server_id, uri, name, description, mime_type, size,
      content_type, access_count, is_active
    )
    VALUES (
      ${resourceId}, ${serverId}, 'file://test.txt', 'Test Resource',
      'Test resource description', 'text/plain', 1024, 'text', 25, true
    )
    ON CONFLICT (id) DO NOTHING
  `);

  return resourceId;
}

/**
 * Create test request log data
 */
export async function createTestRequestLogs(tenantId: string, userId: string, serverId: string, count: number = 10): Promise<void> {
  const promises = Array.from({ length: count }, async (_, i) => {
    const requestId = `test-request-${Date.now()}-${i}`;
    const statusCode = i % 10 === 0 ? 500 : i % 5 === 0 ? 404 : 200;
    const durationMs = 100 + Math.random() * 500;

    await db.execute(sql`
      INSERT INTO request_logs (
        id, request_id, user_id, tenant_id, target_server_id,
        method, path, status_code, duration_ms, response_size_bytes,
        request_time, response_time
      )
      VALUES (
        gen_random_uuid(), ${requestId}, ${userId}, ${tenantId}, ${serverId},
        'POST', '/api/mcp/call', ${statusCode}, ${durationMs}, 512,
        NOW() - INTERVAL '${i} minutes', NOW() - INTERVAL '${i} minutes' + INTERVAL '${Math.round(durationMs)} milliseconds'
      )
      ON CONFLICT (request_id) DO NOTHING
    `);
  });

  await Promise.all(promises);
}

/**
 * Create test circuit breaker data
 */
export async function createTestCircuitBreaker(serverId: string): Promise<string> {
  const breakerId = `test-breaker-${Date.now()}`;

  await db.execute(sql`
    INSERT INTO circuit_breakers (
      id, server_id, service_name, state, failure_count, success_count,
      failure_threshold, success_threshold, total_requests, total_failures
    )
    VALUES (
      ${breakerId}, ${serverId}, 'test-service', 'closed', 2, 98,
      5, 2, 100, 2
    )
    ON CONFLICT (id) DO NOTHING
  `);

  return breakerId;
}

/**
 * Create test connection pool data
 */
export async function createTestConnectionPool(serverId: string): Promise<string> {
  const poolId = `test-pool-${Date.now()}`;

  await db.execute(sql`
    INSERT INTO connection_pools (
      id, server_id, pool_name, transport_type, max_size, min_size,
      active_connections, idle_connections, is_healthy, total_connections_created
    )
    VALUES (
      ${poolId}, ${serverId}, 'test-pool', 'http', 10, 2,
      5, 3, true, 50
    )
    ON CONFLICT (id) DO NOTHING
  `);

  return poolId;
}

/**
 * Create test performance alert data
 */
export async function createTestPerformanceAlert(serverId: string): Promise<string> {
  const alertId = `test-alert-${Date.now()}`;

  await db.execute(sql`
    INSERT INTO performance_alerts (
      id, name, description, server_id, metric_name, threshold_value,
      comparison_operator, is_active, is_triggered, trigger_count
    )
    VALUES (
      ${alertId}, 'Test Alert', 'Test performance alert', ${serverId},
      'response_time', 500.0, '>', true, false, 0
    )
    ON CONFLICT (id) DO NOTHING
  `);

  return alertId;
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(testIds: TestDataIds): Promise<void> {
  // Clean up in reverse order of dependencies
  const cleanupOps = [
    { table: "performance_alerts", where: "server_id", value: testIds.serverId },
    { table: "connection_pools", where: "server_id", value: testIds.serverId },
    { table: "circuit_breakers", where: "server_id", value: testIds.serverId },
    { table: "request_logs", where: "target_server_id", value: testIds.serverId },
    { table: "mcp_resource", where: "server_id", value: testIds.serverId },
    { table: "mcp_tool", where: "server_id", value: testIds.serverId },
    { table: "mcp_server", where: "id", value: testIds.serverId },
    { table: '"user"', where: "id", value: testIds.userId },
    { table: "tenant", where: "id", value: testIds.tenantId },
  ];

  for (const { table, where, value } of cleanupOps) {
    try {
      await db.execute(sql.raw(`DELETE FROM ${table} WHERE ${where} = '${value}'`));
    } catch (error: any) {
      // Ignore relation does not exist errors during cleanup
      if (error?.code === "42P01") {
        console.log(`Table ${table} does not exist yet, skipping cleanup`);
        continue;
      }
      throw error;
    }
  }
}

/**
 * Clean up test data by pattern
 */
export async function cleanupTestDataByPattern(): Promise<void> {
  // Clean up any test data that might have been left behind
  // Use try-catch for each table in case it doesn't exist yet
  const tables = [
    { table: "request_logs", column: "request_id", pattern: "test-request-%", isText: true },
    { table: "circuit_breakers", column: "id", pattern: "test-breaker-%", isText: false },
    { table: "connection_pools", column: "id", pattern: "test-pool-%", isText: false },
    { table: "performance_alerts", column: "id", pattern: "test-alert-%", isText: false },
    { table: "mcp_server", column: "id", pattern: "test-server-%", isText: true },
    { table: '"user"', column: "id", pattern: "test-user-%", isText: true },
    { table: "tenant", column: "id", pattern: "test-tenant-%", isText: true },
  ];

  for (const { table, column, pattern, isText } of tables) {
    try {
      // For text columns, use LIKE; for UUID columns, cast to text first
      const query = isText
        ? `DELETE FROM ${table} WHERE ${column} LIKE '${pattern}'`
        : `DELETE FROM ${table} WHERE ${column}::text LIKE '${pattern}'`;
      await db.execute(sql.raw(query));
    } catch (error: any) {
      // Ignore relation does not exist errors during cleanup
      if (error?.code === "42P01") {
        console.log(`Table ${table} does not exist yet, skipping cleanup`);
        continue;
      }
      throw error;
    }
  }
}

/**
 * Verify database connection and basic functionality
 */
export async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    const result = await db.execute(sql`SELECT 1 as test`);
    return Array.isArray(result.rows) && result.rows.length === 1;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

/**
 * Get database table count for monitoring
 */
export async function getTableCounts(): Promise<Record<string, number>> {
  const tables = [
    "mcp_server",
    "mcp_tool",
    "mcp_resource",
    "mcp_prompt",
    "tenant",
    "user",
    "request_logs",
    "circuit_breakers",
    "connection_pools",
    "enhanced_api_keys",
  ];

  const counts: Record<string, number> = {};

  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
      counts[table] = (result.rows[0] as any).count;
    } catch {
      counts[table] = -1; // Error indicator
    }
  }

  return counts;
}

/**
 * Check if a specific index exists
 */
export async function checkIndexExists(indexName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ${indexName}
    `);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a specific function exists
 */
export async function checkFunctionExists(functionName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = ${functionName}
    `);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a specific view exists
 */
export async function checkViewExists(viewName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1
      FROM pg_views
      WHERE schemaname = 'public'
        AND viewname = ${viewName}
    `);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get query execution plan for testing index usage
 */
export async function getQueryPlan(query: string): Promise<any[]> {
  try {
    const result = await db.execute(sql.raw(`EXPLAIN (FORMAT JSON) ${query}`));
    return result.rows;
  } catch (error) {
    console.error("Failed to get query plan:", error);
    return [];
  }
}

/**
 * Execute a raw SQL query for testing
 */
export async function executeRawQuery(query: string): Promise<any[]> {
  try {
    const result = await db.execute(sql.raw(query));
    return result.rows;
  } catch (error) {
    console.error("Failed to execute raw query:", error);
    throw error;
  }
}
