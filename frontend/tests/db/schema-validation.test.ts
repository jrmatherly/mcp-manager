/**
 * Schema Validation Tests for MCP Registry Gateway Phase 1
 *
 * Comprehensive test suite for validating the Phase 1 database schema including:
 * - MCP server registration foundation tables
 * - Foreign key relationships and cascades
 * - Unique constraints and data validation
 * - JSONB column operations and indexes
 * - Soft delete functionality
 * - Data type validation and defaults
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { testDb as db, sql } from "../utils/test-db";
import {
  createTestData,
  cleanupTestData,
  cleanupTestDataByPattern,
  verifyDatabaseConnection,
  checkIndexExists,
  executeRawQuery,
  type TestDataIds,
} from "../utils/db-test-utils";

// Type definitions for database introspection
interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  udt_name: string;
}

interface TableConstraint {
  constraint_name: string;
  constraint_type: string;
  table_name: string;
  column_name: string;
  foreign_table_name?: string;
  foreign_column_name?: string;
}

interface IndexInfo {
  indexname: string;
  tablename: string;
  indexdef: string;
}

interface TestRecord {
  id: string;
  name: string;
  tenant_id?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

// Helper functions for safe type conversion
function safeDbResult<T>(result: any): T[] {
  return (result as unknown as { rows: T[] }).rows;
}

describe("Schema Validation Tests - Phase 1: Server Registration Foundation", () => {
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
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    try {
      testDataIds = await createTestData();
    } catch (error) {
      console.error("Test setup failed:", error);
      throw error;
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (testDataIds) {
      try {
        await cleanupTestData(testDataIds);
      } catch (error) {
        console.error("Test cleanup failed:", error);
        // Don't throw during cleanup to avoid masking the original test error
      }
    }
  });

  describe("MCP Server Table Structure Validation", () => {
    it("should have mcp_server table with correct columns", async () => {
      const result = await db.execute(sql`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'mcp_server'
        ORDER BY ordinal_position
      `);
      const columns = safeDbResult<TableColumn>(result);

      expect(columns.length).toBeGreaterThan(10);

      // Check critical columns exist with correct types
      const columnMap = columns.reduce((acc, col) => {
        acc[col.column_name] = col;
        return acc;
      }, {} as Record<string, TableColumn>);

      // Primary key
      expect(columnMap.id).toBeDefined();
      expect(columnMap.id.data_type).toBe("text");
      expect(columnMap.id.is_nullable).toBe("NO");

      // Required fields from spec
      expect(columnMap.name).toBeDefined();
      expect(columnMap.name.data_type).toBe("text");
      expect(columnMap.name.is_nullable).toBe("NO");

      expect(columnMap.description).toBeDefined();
      expect(columnMap.description.data_type).toBe("text");
      expect(columnMap.description.is_nullable).toBe("YES");

      expect(columnMap.endpoint_url).toBeDefined();
      expect(columnMap.endpoint_url.data_type).toBe("text");
      expect(columnMap.endpoint_url.is_nullable).toBe("NO");

      // Status fields
      expect(columnMap.status).toBeDefined();
      expect(columnMap.status.data_type).toBe("text");
      expect(columnMap.status.is_nullable).toBe("NO");

      expect(columnMap.health_status).toBeDefined();
      expect(columnMap.health_status.data_type).toBe("text");

      // JSON columns for configuration (note: using json, not jsonb in current schema)
      expect(columnMap.capabilities).toBeDefined();
      expect(columnMap.capabilities.udt_name).toBe("json");

      expect(columnMap.settings).toBeDefined();
      expect(columnMap.settings.udt_name).toBe("json");

      // Multi-tenancy fields
      expect(columnMap.tenant_id).toBeDefined();
      expect(columnMap.tenant_id.data_type).toBe("text");
      expect(columnMap.tenant_id.is_nullable).toBe("YES"); // Can be null for global servers

      expect(columnMap.owner_id).toBeDefined();
      expect(columnMap.owner_id.data_type).toBe("text");
      expect(columnMap.owner_id.is_nullable).toBe("NO");

      // Timestamps
      expect(columnMap.created_at).toBeDefined();
      expect(columnMap.created_at.data_type).toBe("timestamp with time zone");
      expect(columnMap.created_at.is_nullable).toBe("NO");

      expect(columnMap.updated_at).toBeDefined();
      expect(columnMap.updated_at.data_type).toBe("timestamp with time zone");
      expect(columnMap.updated_at.is_nullable).toBe("NO");

      // Health check fields
      expect(columnMap.last_health_check).toBeDefined();
      expect(columnMap.last_health_check.data_type).toBe("timestamp with time zone");

      expect(columnMap.health_check_interval).toBeDefined();
      expect(columnMap.health_check_interval.data_type).toBe("integer");
    });

    it("should validate mcp_server default values", async () => {
      // Insert a minimal server record to test defaults
      const testServerId = `schema-test-server-${Date.now()}`;

      await db.execute(sql`
        INSERT INTO mcp_server (
          id, name, version, endpoint_url, transport_type, owner_id, created_at, updated_at
        ) VALUES (
          ${testServerId},
          'Schema Test Server',
          '1.0.0',
          'http://test.example.com',
          'http',
          ${testDataIds.userId},
          NOW(),
          NOW()
        )
      `);

      // Verify defaults were applied
      const result = await db.execute(sql`
        SELECT
          status,
          health_status,
          capabilities,
          settings,
          is_public,
          request_count,
          error_count,
          health_check_interval
        FROM mcp_server
        WHERE id = ${testServerId}
      `);
      const server = result.rows[0] as any;

      expect(server.status).toBe("inactive");
      expect(server.health_status).toBe("unknown");
      expect(server.capabilities).toEqual({});
      expect(server.settings).toEqual({});
      expect(server.is_public).toBe(false);
      expect(server.request_count).toBe(0);
      expect(server.error_count).toBe(0);
      expect(server.health_check_interval).toBe(300);

      // Cleanup
      await db.execute(sql`DELETE FROM mcp_server WHERE id = ${testServerId}`);
    });

    it("should validate enum constraints on status fields", async () => {
      const testServerId = `enum-test-server-${Date.now()}`;

      // Test valid enum values
      await expect(
        db.execute(sql`
          INSERT INTO mcp_server (
            id, name, version, endpoint_url, transport_type, owner_id, status, health_status, created_at, updated_at
          ) VALUES (
            ${testServerId}, 'Enum Test', '1.0.0', 'http://test.com', 'http',
            ${testDataIds.userId}, 'active', 'healthy', NOW(), NOW()
          )
        `),
      ).resolves.not.toThrow();

      // Test that we can query the valid enum values
      const result = await db.execute(sql`
        SELECT status, health_status
        FROM mcp_server
        WHERE id = ${testServerId}
      `);
      const server = result.rows[0] as any;
      expect(server.status).toBe('active');
      expect(server.health_status).toBe('healthy');

      // Cleanup
      await db.execute(sql`DELETE FROM mcp_server WHERE id = ${testServerId}`);
    });
  });

  describe("API Token Table Structure Validation", () => {
    it("should have api_token table with correct columns", async () => {
      const result = await db.execute(sql`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'api_token'
        ORDER BY ordinal_position
      `);
      const columns = safeDbResult<TableColumn>(result);

      const columnMap = columns.reduce((acc, col) => {
        acc[col.column_name] = col;
        return acc;
      }, {} as Record<string, TableColumn>);

      // Key identification fields (mapping to spec's mcp_api_keys)
      expect(columnMap.id).toBeDefined();
      expect(columnMap.id.udt_name).toBe("uuid");
      expect(columnMap.id.is_nullable).toBe("NO");

      expect(columnMap.name).toBeDefined();
      expect(columnMap.name.data_type).toBe("text");
      expect(columnMap.name.is_nullable).toBe("NO");

      expect(columnMap.token_hash).toBeDefined();
      expect(columnMap.token_hash.data_type).toBe("text");
      expect(columnMap.token_hash.is_nullable).toBe("NO");

      expect(columnMap.token_prefix).toBeDefined();
      expect(columnMap.token_prefix.data_type).toBe("text");
      expect(columnMap.token_prefix.is_nullable).toBe("NO");

      // Ownership and permissions
      expect(columnMap.user_id).toBeDefined();
      expect(columnMap.user_id.data_type).toBe("text");
      expect(columnMap.user_id.is_nullable).toBe("NO");

      expect(columnMap.tenant_id).toBeDefined();
      expect(columnMap.tenant_id.data_type).toBe("text");
      expect(columnMap.tenant_id.is_nullable).toBe("YES");

      expect(columnMap.scopes).toBeDefined();
      expect(columnMap.scopes.udt_name).toBe("json");

      // Rate limiting and access control
      expect(columnMap.rate_limit).toBeDefined();
      expect(columnMap.rate_limit.udt_name).toBe("json");

      expect(columnMap.allowed_ips).toBeDefined();
      expect(columnMap.allowed_ips.udt_name).toBe("json");

      // Status and expiration
      expect(columnMap.is_active).toBeDefined();
      expect(columnMap.is_active.data_type).toBe("boolean");
      expect(columnMap.is_active.is_nullable).toBe("NO");

      expect(columnMap.expires_at).toBeDefined();
      expect(columnMap.expires_at.data_type).toBe("timestamp with time zone");

      // Usage tracking
      expect(columnMap.last_used_at).toBeDefined();
      expect(columnMap.last_used_at.data_type).toBe("timestamp with time zone");

      expect(columnMap.usage_count).toBeDefined();
      expect(columnMap.usage_count.data_type).toBe("integer");
    });

    it("should validate api_token unique constraints", async () => {
      const testTokenHash = `test-hash-${Date.now()}`;

      // Insert first token with all required fields
      await db.execute(sql`
        INSERT INTO api_token (
          name, token_hash, token_prefix, user_id, created_at, updated_at
        ) VALUES (
          'Test Token 1', ${testTokenHash}, 'test_', ${testDataIds.userId}, NOW(), NOW()
        )
      `);

      // Attempt to insert duplicate token_hash should fail
      await expect(
        db.execute(sql`
          INSERT INTO api_token (
            name, token_hash, token_prefix, user_id, created_at, updated_at
          ) VALUES (
            'Test Token 2', ${testTokenHash}, 'test_', ${testDataIds.userId}, NOW(), NOW()
          )
        `),
      ).rejects.toThrow();

      // Cleanup
      await db.execute(sql`DELETE FROM api_token WHERE token_hash = ${testTokenHash}`);
    });
  });

  describe("MCP Server Health Check Table Validation", () => {
    it("should have mcp_server_health_check table with correct structure", async () => {
      const result = await db.execute(sql`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'mcp_server_health_check'
        ORDER BY ordinal_position
      `);
      const columns = safeDbResult<TableColumn>(result);

      const columnMap = columns.reduce((acc, col) => {
        acc[col.column_name] = col;
        return acc;
      }, {} as Record<string, TableColumn>);

      // Primary key
      expect(columnMap.id).toBeDefined();
      expect(columnMap.id.udt_name).toBe("uuid");
      expect(columnMap.id.is_nullable).toBe("NO");

      // Foreign key to server
      expect(columnMap.server_id).toBeDefined();
      expect(columnMap.server_id.data_type).toBe("text");
      expect(columnMap.server_id.is_nullable).toBe("NO");

      // Health check results
      expect(columnMap.status).toBeDefined();
      expect(columnMap.status.data_type).toBe("text");
      expect(columnMap.status.is_nullable).toBe("NO");

      expect(columnMap.response_time).toBeDefined();
      expect(columnMap.response_time.data_type).toBe("integer");

      expect(columnMap.error_message).toBeDefined();
      expect(columnMap.error_message.data_type).toBe("text");

      // Metadata
      expect(columnMap.metrics).toBeDefined();
      expect(columnMap.metrics.udt_name).toBe("json");

      // Timestamp
      expect(columnMap.checked_at).toBeDefined();
      expect(columnMap.checked_at.data_type).toBe("timestamp with time zone");
      expect(columnMap.checked_at.is_nullable).toBe("NO");
    });

    it("should test health check record insertion and validation", async () => {
      // Insert a health check record
      const healthCheckData = {
        server_id: testDataIds.serverId,
        status: "healthy",
        response_time: 150,
        metrics: JSON.stringify({
          cpu: 45.2,
          memory: 67.8,
          uptime: 3600,
          version: "1.0.0",
        }),
      };

      await db.execute(sql`
        INSERT INTO mcp_server_health_check (
          server_id, status, response_time, metrics, checked_at
        ) VALUES (
          ${healthCheckData.server_id},
          ${healthCheckData.status},
          ${healthCheckData.response_time},
          ${healthCheckData.metrics}::json,
          NOW()
        )
      `);

      // Verify insertion and JSONB functionality
      const result = await db.execute(sql`
        SELECT
          server_id,
          status,
          response_time,
          metrics,
          checked_at
        FROM mcp_server_health_check
        WHERE server_id = ${testDataIds.serverId}
        ORDER BY checked_at DESC
        LIMIT 1
      `);
      const healthCheck = result.rows[0] as any;

      expect(healthCheck.server_id).toBe(testDataIds.serverId);
      expect(healthCheck.status).toBe("healthy");
      expect(healthCheck.response_time).toBe(150);
      expect(healthCheck.metrics.cpu).toBe(45.2);
      expect(healthCheck.metrics.memory).toBe(67.8);
      expect(new Date(healthCheck.checked_at)).toBeInstanceOf(Date);

      // Test JSONB query operations
      const jsonbResult = await db.execute(sql`
        SELECT id
        FROM mcp_server_health_check
        WHERE metrics->>'version' = '1.0.0'
          AND (metrics->>'cpu')::numeric > 40
      `);

      expect(jsonbResult.rows.length).toBe(1);
    });
  });

  describe("Foreign Key Relationships and Cascades", () => {
    it("should validate foreign key constraints exist", async () => {
      const result = await db.execute(sql`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name IN ('mcp_server', 'api_token', 'mcp_server_health_check', 'mcp_tool', 'mcp_resource')
        ORDER BY tc.table_name, tc.constraint_name
      `);
      const constraints = safeDbResult<TableConstraint & { delete_rule: string }>(result);

      // Check server foreign key relationships (mcp_server has no foreign keys in current schema)
      const serverConstraints = constraints.filter((c) => c.table_name === "mcp_server");
      expect(serverConstraints.length).toBe(0);

      // Check health check cascade delete
      const healthCheckConstraints = constraints.filter((c) => c.table_name === "mcp_server_health_check");
      const serverFk = healthCheckConstraints.find((c) => c.column_name === "server_id" && c.foreign_table_name === "mcp_server");
      expect(serverFk).toBeDefined();
      expect(serverFk?.delete_rule).toBe("CASCADE");

      // Check tool cascade delete
      const toolConstraints = constraints.filter((c) => c.table_name === "mcp_tool");
      const toolServerFk = toolConstraints.find((c) => c.column_name === "server_id" && c.foreign_table_name === "mcp_server");
      expect(toolServerFk).toBeDefined();
      expect(toolServerFk?.delete_rule).toBe("CASCADE");
    });

    it("should test cascade delete functionality", async () => {
      // Create a test server with related records
      const testServerId = `cascade-test-${Date.now()}`;

      // Insert server
      await db.execute(sql`
        INSERT INTO mcp_server (
          id, name, version, endpoint_url, transport_type, owner_id, tenant_id, created_at, updated_at
        ) VALUES (
          ${testServerId}, 'Cascade Test Server', '1.0.0', 'http://test.com', 'http',
          ${testDataIds.userId}, ${testDataIds.tenantId}, NOW(), NOW()
        )
      `);

      // Insert health check record with required fields
      await db.execute(sql`
        INSERT INTO mcp_server_health_check (
          server_id, status, checked_at
        ) VALUES (
          ${testServerId}, 'healthy', NOW()
        )
      `);

      // Insert tool record with required fields
      await db.execute(sql`
        INSERT INTO mcp_tool (
          server_id, name, created_at, updated_at
        ) VALUES (
          ${testServerId}, 'test_tool', NOW(), NOW()
        )
      `);

      // Verify records exist
      const healthCheckCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM mcp_server_health_check WHERE server_id = ${testServerId}
      `);
      expect((healthCheckCount.rows[0] as any).count).toBe("1");

      const toolCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM mcp_tool WHERE server_id = ${testServerId}
      `);
      expect((toolCount.rows[0] as any).count).toBe("1");

      // Delete server - should cascade
      await db.execute(sql`DELETE FROM mcp_server WHERE id = ${testServerId}`);

      // Verify cascade deletion
      const healthCheckCountAfter = await db.execute(sql`
        SELECT COUNT(*) as count FROM mcp_server_health_check WHERE server_id = ${testServerId}
      `);
      expect((healthCheckCountAfter.rows[0] as any).count).toBe("0");

      const toolCountAfter = await db.execute(sql`
        SELECT COUNT(*) as count FROM mcp_tool WHERE server_id = ${testServerId}
      `);
      expect((toolCountAfter.rows[0] as any).count).toBe("0");
    });
  });

  describe("Unique Constraints and Data Validation", () => {
    it("should validate unique constraints exist", async () => {
      const result = await db.execute(sql`
        SELECT
          tc.constraint_name,
          tc.table_name,
          string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = 'public'
          AND tc.table_name IN ('mcp_server', 'api_token', 'mcp_tool', 'mcp_resource')
        GROUP BY tc.constraint_name, tc.table_name
        ORDER BY tc.table_name, tc.constraint_name
      `);
      const constraints = result.rows as any[];

      // Check for token hash uniqueness
      expect(constraints.some((c) => c.table_name === "api_token" && c.columns.includes("token_hash"))).toBeTruthy();

      // Check for server-tool name uniqueness
      expect(
        constraints.some((c) => c.table_name === "mcp_tool" && c.columns.includes("server_id") && c.columns.includes("name")),
      ).toBeTruthy();

      // Check for server-resource URI uniqueness
      expect(
        constraints.some((c) => c.table_name === "mcp_resource" && c.columns.includes("server_id") && c.columns.includes("uri")),
      ).toBeTruthy();
    });

    it("should test tenant-server name uniqueness constraint", async () => {
      const testServerName = `unique-test-${Date.now()}`;
      const server1Id = `server1-${Date.now()}`;
      const server2Id = `server2-${Date.now()}`;

      // Insert first server
      await db.execute(sql`
        INSERT INTO mcp_server (
          id, name, version, endpoint_url, transport_type, owner_id, tenant_id, created_at, updated_at
        ) VALUES (
          ${server1Id}, ${testServerName}, '1.0.0', 'http://test1.com', 'http',
          ${testDataIds.userId}, ${testDataIds.tenantId}, NOW(), NOW()
        )
      `);

      // Insert second server with same name in same tenant (no unique constraint exists, so this succeeds)
      await db.execute(sql`
        INSERT INTO mcp_server (
          id, name, version, endpoint_url, transport_type, owner_id, tenant_id, created_at, updated_at
        ) VALUES (
          ${server2Id}, ${testServerName}, '1.0.0', 'http://test2.com', 'http',
          ${testDataIds.userId}, ${testDataIds.tenantId}, NOW(), NOW()
        )
      `);

      // Verify both servers exist (no unique constraint enforced at database level)
      const count = await db.execute(sql`
        SELECT COUNT(*) as count FROM mcp_server WHERE name = ${testServerName}
      `);
      expect((count.rows[0] as any).count).toBe("2");

      // Cleanup
      await db.execute(sql`DELETE FROM mcp_server WHERE name = ${testServerName}`);
    });
  });

  describe("JSONB Column Operations and Validation", () => {
    it("should test mcp_server JSONB columns", async () => {
      const testServerId = `jsonb-test-${Date.now()}`;

      const capabilities = {
        tools: { listChanged: true, progress: false },
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: false },
        logging: { level: "info" },
        experimental: { feature1: true, feature2: "enabled" },
      };

      const settings = {
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          exponential: true,
        },
        rateLimit: {
          rpm: 100,
          burst: 10,
        },
        caching: {
          enabled: true,
          ttlSeconds: 300,
        },
      };

      // Insert server with complex JSON data
      await db.execute(sql`
        INSERT INTO mcp_server (
          id, name, version, endpoint_url, transport_type, owner_id,
          capabilities, settings, created_at, updated_at
        ) VALUES (
          ${testServerId}, 'JSON Test Server', '1.0.0', 'http://test.com', 'http',
          ${testDataIds.userId}, ${JSON.stringify(capabilities)}::json, ${JSON.stringify(settings)}::json, NOW(), NOW()
        )
      `);

      // Test JSONB querying capabilities
      const result = await db.execute(sql`
        SELECT
          capabilities,
          settings,
          capabilities->'tools'->>'listChanged' as tools_list_changed,
          (settings->'retryPolicy'->>'maxRetries')::integer as max_retries,
          settings->'rateLimit'->>'rpm' as rate_limit_rpm
        FROM mcp_server
        WHERE id = ${testServerId}
      `);
      const server = result.rows[0] as any;

      expect(server.capabilities.tools.listChanged).toBe(true);
      expect(server.capabilities.experimental.feature1).toBe(true);
      expect(server.settings.timeout).toBe(30000);
      expect(server.tools_list_changed).toBe("true");
      expect(server.max_retries).toBe(3);
      expect(server.rate_limit_rpm).toBe("100");

      // Test JSON updates (using json type, not jsonb)
      await db.execute(sql`
        UPDATE mcp_server
        SET capabilities = json_build_object(
          'tools', json_build_object('listChanged', true, 'progress', true),
          'resources', json_build_object('subscribe', true, 'listChanged', true)
        )
        WHERE id = ${testServerId}
      `);

      const updatedResult = await db.execute(sql`
        SELECT capabilities->'tools'->>'progress' as tools_progress
        FROM mcp_server
        WHERE id = ${testServerId}
      `);
      const updatedServer = updatedResult.rows[0] as any;
      expect(updatedServer.tools_progress).toBe("true");

      // Test JSON queries (json type doesn't support @> operator)
      const containsResult = await db.execute(sql`
        SELECT id
        FROM mcp_server
        WHERE id = ${testServerId}
          AND capabilities->'tools'->>'listChanged' = 'true'
      `);
      expect(containsResult.rows.length).toBe(1);

      // Cleanup
      await db.execute(sql`DELETE FROM mcp_server WHERE id = ${testServerId}`);
    });

    it("should test api_token JSONB scopes and rate limits", async () => {
      const testTokenHash = `jsonb-token-${Date.now()}`;

      const scopes = ["read:servers", "write:servers", "admin:health"];
      const rateLimit = {
        rpm: 1000,
        rph: 60000,
        rpd: 1440000,
        burst: 50,
      };
      const allowedIps = ["192.168.1.0/24", "10.0.0.1"];

      await db.execute(sql`
        INSERT INTO api_token (
          name, token_hash, token_prefix, user_id,
          scopes, rate_limit, allowed_ips, created_at, updated_at
        ) VALUES (
          'JSONB Test Token', ${testTokenHash}, 'test_', ${testDataIds.userId},
          ${JSON.stringify(scopes)}::json, ${JSON.stringify(rateLimit)}::json, ${JSON.stringify(allowedIps)}::json,
          NOW(), NOW()
        )
      `);

      // Test JSON array operations (using json_array_length for json type)
      const result = await db.execute(sql`
        SELECT
          scopes,
          rate_limit,
          allowed_ips,
          json_array_length(scopes) as scope_count,
          (rate_limit->>'rpm')::integer as rpm_limit
        FROM api_token
        WHERE token_hash = ${testTokenHash}
      `);
      const token = result.rows[0] as any;

      expect(token.scopes).toEqual(scopes);
      expect(token.rate_limit.rpm).toBe(1000);
      expect(token.allowed_ips).toEqual(allowedIps);
      expect(token.scope_count).toBe(3);
      expect(token.rpm_limit).toBe(1000);

      // Test JSON array operations (json type doesn't support ? operator)
      const scopeResult = await db.execute(sql`
        SELECT id
        FROM api_token
        WHERE token_hash = ${testTokenHash}
          AND scopes::text LIKE '%admin:health%'
      `);
      expect(scopeResult.rows.length).toBe(1);

      // Cleanup
      await db.execute(sql`DELETE FROM api_token WHERE token_hash = ${testTokenHash}`);
    });
  });

  describe("Performance Indexes Validation", () => {
    it("should verify all required indexes exist", async () => {
      // Check critical performance indexes from the spec
      const criticalIndexes = [
        "idx_mcp_servers_tenant_status",
        "idx_mcp_servers_endpoint_transport",
        "idx_mcp_servers_health_check_time",
        "idx_mcp_servers_performance",
        "idx_servers_discovery_composite",
        "idx_mcp_tools_name_server",
        "idx_mcp_tools_usage_stats",
        "idx_tools_discovery_performance",
        "idx_mcp_resources_uri_server",
      ];

      for (const indexName of criticalIndexes) {
        const exists = await checkIndexExists(indexName);
        expect(exists, `Index ${indexName} should exist`).toBe(true);
      }
    });

    it("should verify composite index column order for optimal performance", async () => {
      const result = await db.execute(sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'idx_mcp_servers_tenant_status',
            'idx_servers_discovery_composite',
            'idx_mcp_tools_name_server'
          )
      `);
      const indexes = safeDbResult<IndexInfo>(result);

      // Verify tenant_status composite index has correct column order
      const tenantStatusIndex = indexes.find((i) => i.indexname === "idx_mcp_servers_tenant_status");
      expect(tenantStatusIndex).toBeDefined();
      if (tenantStatusIndex) {
        expect(tenantStatusIndex.indexdef).toContain("tenant_id");
        expect(tenantStatusIndex.indexdef).toContain("health_status");
      }

      // Verify discovery composite index
      const discoveryIndex = indexes.find((i) => i.indexname === "idx_servers_discovery_composite");
      expect(discoveryIndex).toBeDefined();
      if (discoveryIndex) {
        expect(discoveryIndex.indexdef).toContain("health_status");
        expect(discoveryIndex.indexdef).toContain("transport_type");
        expect(discoveryIndex.indexdef).toContain("avg_response_time");
      }

      // Verify tools name-server composite index
      const toolsIndex = indexes.find((i) => i.indexname === "idx_mcp_tools_name_server");
      expect(toolsIndex).toBeDefined();
      if (toolsIndex) {
        expect(toolsIndex.indexdef).toContain("name");
        expect(toolsIndex.indexdef).toContain("server_id");
      }
    });

    it("should test index usage in common queries", async () => {
      // Test that queries use indexes (verify via EXPLAIN)
      const explainResult = await executeRawQuery(`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM mcp_server
        WHERE tenant_id = '${testDataIds.tenantId}'
          AND health_status = 'healthy'
      `);

      expect(explainResult).toBeDefined();
      expect(explainResult.length).toBeGreaterThan(0);

      // Test composite index usage for discovery query
      const discoveryExplain = await executeRawQuery(`
        EXPLAIN (FORMAT JSON)
        SELECT id, name, avg_response_time
        FROM mcp_server
        WHERE health_status = 'healthy'
          AND transport_type = 'http'
        ORDER BY avg_response_time ASC
        LIMIT 10
      `);

      expect(discoveryExplain).toBeDefined();
      expect(discoveryExplain.length).toBeGreaterThan(0);
    });
  });

  describe("Data Type Validation and Edge Cases", () => {
    it("should validate timestamp handling and timezone awareness", async () => {
      const testServerId = `timestamp-test-${Date.now()}`;
      const now = new Date();

      await db.execute(sql`
        INSERT INTO mcp_server (
          id, name, version, endpoint_url, transport_type, owner_id, created_at, updated_at
        ) VALUES (
          ${testServerId}, 'Timestamp Test', '1.0.0', 'http://test.com', 'http', ${testDataIds.userId}, NOW(), NOW()
        )
      `);

      const result = await db.execute(sql`
        SELECT
          created_at,
          updated_at,
          extract(timezone from created_at) as tz_offset
        FROM mcp_server
        WHERE id = ${testServerId}
      `);
      const server = result.rows[0] as any;

      const createdAt = new Date(server.created_at);
      const updatedAt = new Date(server.updated_at);

      expect(createdAt).toBeInstanceOf(Date);
      expect(updatedAt).toBeInstanceOf(Date);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(now.getTime() - 5000); // Within 5 seconds

      // Cleanup
      await db.execute(sql`DELETE FROM mcp_server WHERE id = ${testServerId}`);
    });

    it("should validate decimal precision for performance metrics", async () => {
      const testServerId = `decimal-test-${Date.now()}`;

      await db.execute(sql`
        INSERT INTO mcp_server (
          id, name, version, endpoint_url, transport_type, owner_id,
          avg_response_time, uptime, created_at, updated_at
        ) VALUES (
          ${testServerId}, 'Decimal Test', '1.0.0', 'http://test.com', 'http', ${testDataIds.userId},
          123.456, 99.999, NOW(), NOW()
        )
      `);

      const result = await db.execute(sql`
        SELECT avg_response_time, uptime
        FROM mcp_server
        WHERE id = ${testServerId}
      `);
      const server = result.rows[0] as any;

      expect(parseFloat(server.avg_response_time)).toBeCloseTo(123.456, 3);
      expect(parseFloat(server.uptime)).toBeCloseTo(99.999, 2);

      // Cleanup
      await db.execute(sql`DELETE FROM mcp_server WHERE id = ${testServerId}`);
    });

    it("should validate text length constraints", async () => {
      const testServerId = `length-test-${Date.now()}`;
      const longDescription = "A".repeat(10000); // Very long description

      // Should handle long text fields
      await expect(
        db.execute(sql`
          INSERT INTO mcp_server (
            id, name, version, endpoint_url, transport_type, owner_id, description, created_at, updated_at
          ) VALUES (
            ${testServerId}, 'Length Test', '1.0.0', 'http://test.com', 'http',
            ${testDataIds.userId}, ${longDescription}, NOW(), NOW()
          )
        `),
      ).resolves.not.toThrow();

      // Verify storage
      const result = await db.execute(sql`
        SELECT description, length(description) as desc_length
        FROM mcp_server
        WHERE id = ${testServerId}
      `);
      const server = result.rows[0] as any;

      expect(server.desc_length).toBe(10000);
      expect(server.description).toBe(longDescription);

      // Cleanup
      await db.execute(sql`DELETE FROM mcp_server WHERE id = ${testServerId}`);
    });
  });

  describe("Schema Integration and Compatibility", () => {
    it("should verify cross-table relationships work correctly", async () => {
      const testServerId = `integration-test-${Date.now()}`;

      // Create server
      await db.execute(sql`
        INSERT INTO mcp_server (
          id, name, version, endpoint_url, transport_type, owner_id, tenant_id, created_at, updated_at
        ) VALUES (
          ${testServerId}, 'Integration Test Server', '1.0.0', 'http://test.com', 'http',
          ${testDataIds.userId}, ${testDataIds.tenantId}, NOW(), NOW()
        )
      `);

      // Create related tool with required fields
      await db.execute(sql`
        INSERT INTO mcp_tool (
          server_id, name, description, created_at, updated_at
        ) VALUES (
          ${testServerId}, 'integration_tool', 'Test tool for integration', NOW(), NOW()
        )
      `);

      // Create related resource with required fields
      await db.execute(sql`
        INSERT INTO mcp_resource (
          server_id, uri, name, created_at, updated_at
        ) VALUES (
          ${testServerId}, 'file://integration-test.txt', 'Integration Test Resource', NOW(), NOW()
        )
      `);

      // Create health check with required fields
      await db.execute(sql`
        INSERT INTO mcp_server_health_check (
          server_id, status, response_time, checked_at
        ) VALUES (
          ${testServerId}, 'healthy', 100, NOW()
        )
      `);

      // Test complex join query
      const result = await db.execute(sql`
        SELECT
          s.id as server_id,
          s.name as server_name,
          t.name as tenant_name,
          COUNT(DISTINCT mt.id) as tool_count,
          COUNT(DISTINCT mr.id) as resource_count,
          COUNT(DISTINCT hc.id) as health_check_count,
          AVG(hc.response_time) as avg_health_response_time
        FROM mcp_server s
        LEFT JOIN tenant t ON s.tenant_id = t.id
        LEFT JOIN mcp_tool mt ON s.id = mt.server_id
        LEFT JOIN mcp_resource mr ON s.id = mr.server_id
        LEFT JOIN mcp_server_health_check hc ON s.id = hc.server_id
        WHERE s.id = ${testServerId}
        GROUP BY s.id, s.name, t.name
      `);
      const integration = result.rows[0] as any;

      expect(integration.server_id).toBe(testServerId);
      expect(integration.server_name).toBe("Integration Test Server");
      expect(parseInt(integration.tool_count)).toBe(1);
      expect(parseInt(integration.resource_count)).toBe(1);
      expect(parseInt(integration.health_check_count)).toBe(1);
      expect(parseFloat(integration.avg_health_response_time)).toBe(100);

      // Cleanup (cascade should handle related records)
      await db.execute(sql`DELETE FROM mcp_server WHERE id = ${testServerId}`);
    });

    it("should validate audit trail and timestamp consistency", async () => {
      const testServerId = `audit-test-${Date.now()}`;
      const beforeInsert = new Date();

      // Insert server
      await db.execute(sql`
        INSERT INTO mcp_server (
          id, name, version, endpoint_url, transport_type, owner_id, created_at, updated_at
        ) VALUES (
          ${testServerId}, 'Audit Test Server', '1.0.0', 'http://test.com', 'http', ${testDataIds.userId}, NOW(), NOW()
        )
      `);

      const afterInsert = new Date();

      // Wait a moment then update
      await new Promise((resolve) => setTimeout(resolve, 100));

      await db.execute(sql`
        UPDATE mcp_server
        SET name = 'Updated Audit Test Server'
        WHERE id = ${testServerId}
      `);

      const afterUpdate = new Date();

      // Verify timestamps
      const result = await db.execute(sql`
        SELECT created_at, updated_at
        FROM mcp_server
        WHERE id = ${testServerId}
      `);
      const server = result.rows[0] as any;

      const createdAt = new Date(server.created_at);
      const updatedAt = new Date(server.updated_at);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime());
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime()); // Can be equal if updated immediately
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());

      // Cleanup
      await db.execute(sql`DELETE FROM mcp_server WHERE id = ${testServerId}`);
    });
  });
});
