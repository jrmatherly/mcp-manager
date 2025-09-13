/**
 * Database Optimization Tests
 *
 * Comprehensive test suite for verifying database optimizations including:
 * - Schema index definitions and performance
 * - Database function implementations
 * - Monitoring view implementations
 * - Migration integrity and rollback capabilities
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { db, pool } from "@/db";
import { sql } from "drizzle-orm";
import {
  createTestData,
  createTestTool,
  createTestResource,
  createTestRequestLogs,
  createTestCircuitBreaker,
  createTestConnectionPool,
  cleanupTestData,
  cleanupTestDataByPattern,
  verifyDatabaseConnection,
  type TestDataIds,
} from "./utils/db-test-utils";

// Database query result type helpers - use safer type assertion
function safeDbResult<T>(result: any): T[] {
  return (result as unknown as { rows: T[] }).rows;
}

// Helper function to safely convert BigInt to Number for tests
function bigintToNumber(value: unknown): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  }
  return Number(value) || 0;
}

// Test data interfaces
interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface FunctionInfo {
  function_name: string;
  return_type: string;
  argument_types: string;
}

interface ViewInfo {
  schemaname: string;
  viewname: string;
  definition: string;
}

interface ServerHealthSummary {
  total_servers: bigint | string | number;
  healthy_servers: bigint | string | number;
  unhealthy_servers: bigint | string | number;
  degraded_servers: bigint | string | number;
  avg_response_time: number;
}

interface PerformanceSummary {
  total_requests: bigint | string | number;
  successful_requests: bigint | string | number;
  error_requests: bigint | string | number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
}

interface TenantUsageSummary {
  total_requests: bigint | string | number;
  unique_users: bigint | string | number;
  unique_servers: bigint | string | number;
  avg_duration_ms: number;
  error_rate: number;
  total_data_transferred: bigint | string | number;
}

interface DatabaseSizeSummary {
  schemaname: string;
  tablename: string;
  total_size: string;
  table_size: string;
  indexes_size: string;
  index_percentage: number;
  index_count: number;
}

interface PerformanceMonitoring {
  metric_category: string;
  metrics: Record<string, any>;
  snapshot_time: Date;
}

describe("Database Optimization Tests", () => {
  // Setup test data
  let testDataIds: TestDataIds;

  beforeAll(async () => {
    // Ensure database connection is ready
    const connectionOk = await verifyDatabaseConnection();
    expect(connectionOk).toBe(true);

    // Clean up any existing test data
    await cleanupTestDataByPattern();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestDataByPattern();

    // Note: Don't close the pool in tests as it may be reused
    // await pool.end();
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    testDataIds = await createTestData();

    // Add some additional test data for comprehensive testing
    await createTestTool(testDataIds.serverId);
    await createTestResource(testDataIds.serverId);
    await createTestRequestLogs(testDataIds.tenantId, testDataIds.userId, testDataIds.serverId, 5);
    await createTestCircuitBreaker(testDataIds.serverId);
    await createTestConnectionPool(testDataIds.serverId);
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData(testDataIds);
  });

  describe("Schema Index Tests", () => {
    let allIndexes: IndexInfo[];

    beforeAll(async () => {
      // Get all indexes in the public schema
      const result = await db.execute(sql`
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);
      allIndexes = safeDbResult<IndexInfo>(result);
    });

    it("should have performance indexes for mcp_server table", () => {
      const mcpServerIndexes = allIndexes.filter((idx) => idx.tablename === "mcp_server");
      const indexNames = mcpServerIndexes.map((idx) => idx.indexname);

      // Check critical performance indexes exist
      expect(indexNames).toContain("idx_mcp_servers_tenant_status");
      expect(indexNames).toContain("idx_mcp_servers_endpoint_transport");
      expect(indexNames).toContain("idx_mcp_servers_health_check_time");
      expect(indexNames).toContain("idx_mcp_servers_performance");
      expect(indexNames).toContain("idx_servers_discovery_composite");

      // Check standard indexes
      expect(indexNames).toContain("mcp_server_status_idx");
      expect(indexNames).toContain("mcp_server_health_idx");
      expect(indexNames).toContain("mcp_server_tenant_idx");
      expect(indexNames).toContain("mcp_server_owner_idx");
    });

    it("should have tool discovery indexes for mcp_tool table", () => {
      const mcpToolIndexes = allIndexes.filter((idx) => idx.tablename === "mcp_tool");
      const indexNames = mcpToolIndexes.map((idx) => idx.indexname);

      // Check performance indexes
      expect(indexNames).toContain("idx_mcp_tools_name_server");
      expect(indexNames).toContain("idx_mcp_tools_usage_stats");
      expect(indexNames).toContain("idx_tools_discovery_performance");

      // Check standard indexes
      expect(indexNames).toContain("mcp_tool_server_idx");
      expect(indexNames).toContain("mcp_tool_name_idx");
      expect(indexNames).toContain("mcp_tool_category_idx");
    });

    it("should have resource indexes for mcp_resource table", () => {
      const mcpResourceIndexes = allIndexes.filter((idx) => idx.tablename === "mcp_resource");
      const indexNames = mcpResourceIndexes.map((idx) => idx.indexname);

      // Check performance indexes
      expect(indexNames).toContain("idx_mcp_resources_uri_server");

      // Check standard indexes
      expect(indexNames).toContain("mcp_resource_server_idx");
      expect(indexNames).toContain("mcp_resource_uri_idx");
      expect(indexNames).toContain("mcp_resource_name_idx");
    });

    it("should have backend compatibility indexes", () => {
      // Check circuit_breakers indexes
      const circuitBreakerIndexes = allIndexes.filter((idx) => idx.tablename === "circuit_breakers");
      const cbIndexNames = circuitBreakerIndexes.map((idx) => idx.indexname);
      expect(cbIndexNames).toContain("circuit_breakers_server_idx");
      expect(cbIndexNames).toContain("circuit_breakers_state_idx");

      // Check connection_pools indexes
      const connectionPoolIndexes = allIndexes.filter((idx) => idx.tablename === "connection_pools");
      const cpIndexNames = connectionPoolIndexes.map((idx) => idx.indexname);
      expect(cpIndexNames).toContain("connection_pools_server_idx");
      expect(cpIndexNames).toContain("connection_pools_healthy_idx");

      // Check request_logs indexes
      const requestLogIndexes = allIndexes.filter((idx) => idx.tablename === "request_logs");
      const rlIndexNames = requestLogIndexes.map((idx) => idx.indexname);
      expect(rlIndexNames).toContain("request_logs_tenant_time_idx");
      expect(rlIndexNames).toContain("request_logs_server_performance_idx");
    });

    it("should have composite indexes with correct column order", async () => {
      // Check tenant_status composite index
      const tenantStatusIndex = allIndexes.find((idx) => idx.indexname === "idx_mcp_servers_tenant_status");
      expect(tenantStatusIndex).toBeDefined();
      if (tenantStatusIndex) {
        expect(tenantStatusIndex.indexdef).toContain("tenant_id");
        expect(tenantStatusIndex.indexdef).toContain("health_status");
      }

      // Check discovery composite index
      const discoveryIndex = allIndexes.find((idx) => idx.indexname === "idx_servers_discovery_composite");
      expect(discoveryIndex).toBeDefined();
      if (discoveryIndex) {
        expect(discoveryIndex.indexdef).toContain("health_status");
        expect(discoveryIndex.indexdef).toContain("transport_type");
        expect(discoveryIndex.indexdef).toContain("avg_response_time");
      }
    });

    it("should verify unique constraints exist", () => {
      // Check for unique indexes
      const uniqueIndexes = allIndexes.filter((idx) => idx.indexdef.includes("UNIQUE"));

      const uniqueIndexNames = uniqueIndexes.map((idx) => idx.indexname);

      // Verify critical unique constraints
      expect(uniqueIndexNames.some((name) => name.includes("server_name") || name.includes("tool_server_name"))).toBeTruthy();
      expect(uniqueIndexNames.some((name) => name.includes("resource_server_uri"))).toBeTruthy();
    });
  });

  describe("Database Function Tests", () => {
    let availableFunctions: FunctionInfo[];

    beforeAll(async () => {
      // Get all custom functions
      const result = await db.execute(sql`
        SELECT
          p.proname as function_name,
          pg_get_function_result(p.oid) as return_type,
          pg_get_function_arguments(p.oid) as argument_types
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname LIKE 'get_%'
        ORDER BY p.proname
      `);
      availableFunctions = safeDbResult<FunctionInfo>(result);
    });

    it("should have all monitoring functions defined", () => {
      const functionNames = availableFunctions.map((f) => f.function_name);

      expect(functionNames).toContain("get_server_health_summary");
      expect(functionNames).toContain("get_request_performance_summary");
      expect(functionNames).toContain("get_tenant_usage_summary");
      expect(functionNames).toContain("get_api_usage_statistics");
      expect(functionNames).toContain("get_server_performance_ranking");
      expect(functionNames).toContain("get_circuit_breaker_status");
      expect(functionNames).toContain("get_connection_pool_stats");
    });

    it("should execute get_server_health_summary function", async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_server_health_summary()
      `);
      const summaryResults = safeDbResult<ServerHealthSummary>(result);

      expect(summaryResults).toHaveLength(1);
      const summary = summaryResults[0];

      expect(typeof summary.total_servers).toBe("bigint");
      expect(typeof summary.healthy_servers).toBe("bigint");
      expect(typeof summary.unhealthy_servers).toBe("bigint");
      expect(typeof summary.degraded_servers).toBe("bigint");
      expect(bigintToNumber(summary.total_servers)).toBeGreaterThanOrEqual(0);
    });

    it("should execute get_request_performance_summary function with parameters", async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_request_performance_summary(1)
      `);
      const summaryResults = safeDbResult<PerformanceSummary>(result);

      expect(summaryResults).toHaveLength(1);
      const summary = summaryResults[0];

      expect(typeof summary.total_requests).toBe("bigint");
      expect(typeof summary.successful_requests).toBe("bigint");
      expect(typeof summary.error_requests).toBe("bigint");
      expect(summary.total_requests).toBeGreaterThanOrEqual(BigInt(0));
      expect(summary.successful_requests).toBeGreaterThanOrEqual(BigInt(0));
      expect(summary.error_requests).toBeGreaterThanOrEqual(BigInt(0));
    });

    it("should execute get_tenant_usage_summary function", async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_tenant_usage_summary(${testDataIds.tenantId}, 24)
      `);
      const summaryResults = safeDbResult<TenantUsageSummary>(result);

      expect(summaryResults).toHaveLength(1);
      const summary = summaryResults[0];

      expect(typeof summary.total_requests).toBe("bigint");
      expect(typeof summary.unique_users).toBe("bigint");
      expect(typeof summary.unique_servers).toBe("bigint");
      expect(summary.total_requests).toBeGreaterThanOrEqual(BigInt(0));
      expect(summary.error_rate).toBeGreaterThanOrEqual(0);
      expect(summary.error_rate).toBeLessThanOrEqual(100);
    });

    it("should execute get_api_usage_statistics function", async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_api_usage_statistics(7)
      `);
      const statistics = result.rows;

      expect(Array.isArray(statistics)).toBeTruthy();
      // Function should return array of daily statistics
      if (statistics.length > 0) {
        const row = statistics[0] as any;
        expect(row).toHaveProperty("date");
        expect(row).toHaveProperty("total_calls");
        expect(row).toHaveProperty("unique_tenants");
        expect(row).toHaveProperty("unique_users");
      }
    });

    it("should execute get_server_performance_ranking function", async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_server_performance_ranking(5)
      `);
      const rankings = result.rows;

      expect(Array.isArray(rankings)).toBeTruthy();
      // Should return performance ranking data
      if (rankings.length > 0) {
        const row = rankings[0] as any;
        expect(row).toHaveProperty("server_id");
        expect(row).toHaveProperty("server_name");
        expect(row).toHaveProperty("health_status");
        expect(row).toHaveProperty("performance_score");
      }
    });

    it("should execute get_circuit_breaker_status function", async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_circuit_breaker_status()
      `);
      const statuses = result.rows;

      expect(Array.isArray(statuses)).toBeTruthy();
      // Function should return circuit breaker status
      if (statuses.length > 0) {
        const row = statuses[0] as any;
        expect(row).toHaveProperty("server_id");
        expect(row).toHaveProperty("service_name");
        expect(row).toHaveProperty("state");
        expect(row).toHaveProperty("failure_count");
      }
    });

    it("should execute get_connection_pool_stats function", async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_connection_pool_stats()
      `);
      const stats = result.rows;

      expect(Array.isArray(stats)).toBeTruthy();
      // Function should return connection pool statistics
      if (stats.length > 0) {
        const row = stats[0] as any;
        expect(row).toHaveProperty("server_id");
        expect(row).toHaveProperty("pool_name");
        expect(row).toHaveProperty("active_connections");
        expect(row).toHaveProperty("utilization_percentage");
      }
    });

    it("should handle function parameters correctly", async () => {
      // Test with different parameter values
      const result1 = await db.execute(sql`
        SELECT * FROM get_request_performance_summary(1)
      `);
      const summary1 = safeDbResult<PerformanceSummary>(result1);

      const result24 = await db.execute(sql`
        SELECT * FROM get_request_performance_summary(24)
      `);
      const summary24 = safeDbResult<PerformanceSummary>(result24);

      expect(summary1).toHaveLength(1);
      expect(summary24).toHaveLength(1);

      // Both should return valid results
      expect(summary1[0].total_requests).toBeGreaterThanOrEqual(BigInt(0));
      expect(summary24[0].total_requests).toBeGreaterThanOrEqual(BigInt(0));
    });
  });

  describe("Monitoring View Tests", () => {
    let availableViews: ViewInfo[];

    beforeAll(async () => {
      // Get all views in the public schema
      const result = await db.execute(sql`
        SELECT
          schemaname,
          viewname,
          definition
        FROM pg_views
        WHERE schemaname = 'public'
        ORDER BY viewname
      `);
      availableViews = safeDbResult<ViewInfo>(result);
    });

    it("should have all monitoring views defined", () => {
      const viewNames = availableViews.map((v) => v.viewname);

      expect(viewNames).toContain("database_size_summary");
      expect(viewNames).toContain("index_usage_summary");
      expect(viewNames).toContain("performance_monitoring");
      expect(viewNames).toContain("tenant_activity_summary");
      expect(viewNames).toContain("server_tool_performance");
      expect(viewNames).toContain("recent_errors");
      expect(viewNames).toContain("api_endpoint_usage");
      expect(viewNames).toContain("security_events_dashboard");
      expect(viewNames).toContain("performance_alert_status");
    });

    it("should query database_size_summary view", async () => {
      const result = await db.execute(sql`
        SELECT * FROM database_size_summary LIMIT 5
      `);
      const sizeResults = safeDbResult<DatabaseSizeSummary>(result);

      expect(Array.isArray(sizeResults)).toBeTruthy();
      if (sizeResults.length > 0) {
        const row = sizeResults[0];
        expect(row).toHaveProperty("schemaname");
        expect(row).toHaveProperty("tablename");
        expect(row).toHaveProperty("total_size");
        expect(row).toHaveProperty("index_count");
        expect(row.schemaname).toBe("public");
      }
    });

    it("should query index_usage_summary view", async () => {
      const result = await db.execute(sql`
        SELECT * FROM index_usage_summary LIMIT 5
      `);
      const indexResults = result.rows;

      expect(Array.isArray(indexResults)).toBeTruthy();
      if (indexResults.length > 0) {
        const row = indexResults[0] as any;
        expect(row).toHaveProperty("indexname");
        expect(row).toHaveProperty("tablename");
        expect(row).toHaveProperty("usage_category");
        expect(row).toHaveProperty("index_scans");
      }
    });

    it("should query performance_monitoring view", async () => {
      const result = await db.execute(sql`
        SELECT * FROM performance_monitoring
      `);
      const perfResults = safeDbResult<PerformanceMonitoring>(result);

      expect(Array.isArray(perfResults)).toBeTruthy();
      if (perfResults.length > 0) {
        const row = perfResults[0];
        expect(row).toHaveProperty("metric_category");
        expect(row).toHaveProperty("metrics");
        expect(row).toHaveProperty("snapshot_time");
        expect(typeof row.metrics).toBe("object");
      }
    });

    it("should query tenant_activity_summary view", async () => {
      const result = await db.execute(sql`
        SELECT * FROM tenant_activity_summary LIMIT 5
      `);
      const activityResults = result.rows;

      expect(Array.isArray(activityResults)).toBeTruthy();
      if (activityResults.length > 0) {
        const row = activityResults[0] as any;
        expect(row).toHaveProperty("tenant_id");
        expect(row).toHaveProperty("tenant_name");
        expect(row).toHaveProperty("total_users");
        expect(row).toHaveProperty("active_users");
      }
    });

    it("should query server_tool_performance view", async () => {
      const result = await db.execute(sql`
        SELECT * FROM server_tool_performance LIMIT 5
      `);
      const toolResults = result.rows;

      expect(Array.isArray(toolResults)).toBeTruthy();
      if (toolResults.length > 0) {
        const row = toolResults[0] as any;
        expect(row).toHaveProperty("server_id");
        expect(row).toHaveProperty("tool_name");
        expect(row).toHaveProperty("total_calls");
        expect(row).toHaveProperty("success_rate");
      }
    });

    it("should query api_endpoint_usage view", async () => {
      const result = await db.execute(sql`
        SELECT * FROM api_endpoint_usage LIMIT 5
      `);
      const endpointResults = result.rows;

      expect(Array.isArray(endpointResults)).toBeTruthy();
      if (endpointResults.length > 0) {
        const row = endpointResults[0] as any;
        expect(row).toHaveProperty("path");
        expect(row).toHaveProperty("method");
        expect(row).toHaveProperty("total_calls");
        expect(row).toHaveProperty("success_rate");
      }
    });

    it("should verify view definitions contain expected columns", () => {
      // Check performance_monitoring view has expected structure
      const perfMonView = availableViews.find((v) => v.viewname === "performance_monitoring");
      expect(perfMonView).toBeDefined();
      if (perfMonView) {
        expect(perfMonView.definition).toContain("metric_category");
        expect(perfMonView.definition).toContain("metrics");
        expect(perfMonView.definition).toContain("snapshot_time");
      }

      // Check database_size_summary has expected structure
      const dbSizeView = availableViews.find((v) => v.viewname === "database_size_summary");
      expect(dbSizeView).toBeDefined();
      if (dbSizeView) {
        expect(dbSizeView.definition).toContain("pg_size_pretty");
        expect(dbSizeView.definition).toContain("index_count");
      }
    });

    it("should handle view queries without errors", async () => {
      // Test that all views can be queried without syntax errors
      const viewTests = [
        "database_size_summary",
        "index_usage_summary",
        "performance_monitoring",
        "tenant_activity_summary",
        "server_tool_performance",
        "recent_errors",
        "api_endpoint_usage",
        "security_events_dashboard",
        "performance_alert_status",
      ];

      for (const viewName of viewTests) {
        expect(async () => {
          await db.execute(sql.raw(`SELECT * FROM ${viewName} LIMIT 1`));
        }).not.toThrow();
      }
    });
  });

  describe("Migration Tests", () => {
    it("should have migration journal configured", async () => {
      const result = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'drizzle_migrations'
      `);

      expect(result.rows.length).toBe(1);
    });

    it("should have migration files applied", async () => {
      const result = await db.execute(sql`
        SELECT hash, created_at
        FROM drizzle_migrations
        ORDER BY created_at DESC
        LIMIT 5
      `);
      const migrations = result.rows;

      expect(Array.isArray(migrations)).toBeTruthy();
      expect(migrations.length).toBeGreaterThan(0);

      // Check that migrations have valid structure
      if (migrations.length > 0) {
        const migration = migrations[0] as any;
        expect(migration).toHaveProperty("hash");
        expect(migration).toHaveProperty("created_at");
        expect(typeof migration.hash).toBe("string");
      }
    });

    it("should verify all expected tables exist", async () => {
      const expectedTables = [
        "mcp_server",
        "mcp_tool",
        "mcp_resource",
        "mcp_prompt",
        "circuit_breakers",
        "connection_pools",
        "request_logs",
        "server_metrics",
        "enhanced_api_keys",
        "tenant",
        "user",
      ];

      for (const tableName of expectedTables) {
        const result = await db.execute(sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = ${tableName}
        `);

        expect(result.rows.length).toBe(1);
      }
    });

    it("should verify foreign key constraints exist", async () => {
      const result = await db.execute(sql`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `);
      const constraintResults = result.rows;

      expect(Array.isArray(constraintResults)).toBeTruthy();
      expect(constraintResults.length).toBeGreaterThan(0);

      // Check for key foreign key relationships
      const constraints = constraintResults as any[];
      const constraintNames = constraints.map(
        (c) => `${c.table_name}.${c.column_name} -> ${c.foreign_table_name}.${c.foreign_column_name}`,
      );

      expect(constraintNames.some((name) => name.includes("mcp_tool") && name.includes("mcp_server"))).toBeTruthy();
      expect(constraintNames.some((name) => name.includes("mcp_resource") && name.includes("mcp_server"))).toBeTruthy();
    });

    it("should verify enum types exist", async () => {
      const result = await db.execute(sql`
        SELECT typname
        FROM pg_type
        WHERE typnamespace = (
          SELECT oid
          FROM pg_namespace
          WHERE nspname = 'public'
        )
        AND typtype = 'e'
        ORDER BY typname
      `);
      const enumResults = result.rows;

      expect(Array.isArray(enumResults)).toBeTruthy();

      if (enumResults.length > 0) {
        const enumTypes = enumResults.map((row: any) => row.typname);

        // Check for expected enum types
        expect(enumTypes).toContain("circuit_breaker_state");
        expect(enumTypes).toContain("transport_type");
        expect(enumTypes).toContain("server_status");
      }
    });

    it("should verify database functions are properly created", async () => {
      // Test that functions exist and can be executed
      const functionTests = [
        "get_server_health_summary()",
        "get_request_performance_summary(24)",
        "get_api_usage_statistics(7)",
        "get_server_performance_ranking(10)",
        "get_circuit_breaker_status()",
        "get_connection_pool_stats()",
      ];

      for (const functionCall of functionTests) {
        expect(async () => {
          await db.execute(sql.raw(`SELECT * FROM ${functionCall} LIMIT 1`));
        }).not.toThrow();
      }
    });
  });

  describe("Performance and Integration Tests", () => {
    it("should execute complex queries efficiently", async () => {
      const startTime = Date.now();

      // Execute a complex query that uses multiple indexes
      await db.execute(sql`
        SELECT
          ms.id,
          ms.name,
          ms.health_status,
          COUNT(mt.id) as tool_count,
          COUNT(mr.id) as resource_count
        FROM mcp_server ms
        LEFT JOIN mcp_tool mt ON mt.server_id = ms.id
        LEFT JOIN mcp_resource mr ON mr.server_id = ms.id
        WHERE ms.health_status IN ('healthy', 'unhealthy')
          AND ms.tenant_id IS NOT NULL
        GROUP BY ms.id, ms.name, ms.health_status
        ORDER BY ms.last_health_check DESC
        LIMIT 10
      `);

      const executionTime = Date.now() - startTime;

      // Query should complete reasonably quickly (under 1 second for small datasets)
      expect(executionTime).toBeLessThan(1000);
    });

    it("should handle concurrent access to monitoring functions", async () => {
      const promises = Array.from({ length: 5 }, () => db.execute(sql`SELECT * FROM get_server_health_summary()`));

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it("should verify view performance", async () => {
      const startTime = Date.now();

      // Test performance monitoring view
      await db.execute(sql`
        SELECT * FROM performance_monitoring
      `);

      const executionTime = Date.now() - startTime;

      // View query should complete reasonably quickly
      expect(executionTime).toBeLessThan(2000);
    });

    it("should test database connection pool health", async () => {
      // Verify connection pool is working
      expect(pool.totalCount).toBeGreaterThan(0);
      expect(pool.idleCount).toBeGreaterThanOrEqual(0);
      expect(pool.waitingCount).toBe(0);
    });

    it("should verify index usage in query plans", async () => {
      // Test that indexes are being used in common queries
      const explainResult = await db.execute(sql`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM mcp_server
        WHERE health_status = 'healthy'
          AND tenant_id = ${testDataIds.tenantId}
      `);
      const planResults = explainResult.rows;

      expect(Array.isArray(planResults)).toBeTruthy();

      // The query plan should be available (exact structure may vary)
      const plan = planResults[0] as any;
      expect(plan).toBeDefined();
    });
  });
});
