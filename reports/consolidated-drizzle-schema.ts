/**
 * Consolidated Drizzle Schema for MCP Manager
 *
 * This schema unifies the current backend SQLModel and frontend Drizzle schemas
 * while maintaining Better-Auth compatibility and all enterprise features.
 */

import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  integer,
  real,
  jsonb,
  uuid,
  index,
  foreignKey,
  unique,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

export const transportTypeEnum = pgEnum("transport_type", [
  "http",
  "websocket",
  "stdio",
  "sse",
]);

export const serverStatusEnum = pgEnum("server_status", [
  "healthy",
  "unhealthy",
  "degraded",
  "unknown",
  "maintenance",
]);

export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "suspended",
  "disabled",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "user",
  "service",
  "readonly",
]);

export const circuitBreakerStateEnum = pgEnum("circuit_breaker_state", [
  "closed",
  "open",
  "half_open",
]);

export const loadBalancingAlgorithmEnum = pgEnum("load_balancing_algorithm", [
  "round_robin",
  "weighted",
  "least_connections",
  "random",
  "consistent_hash",
]);

export const apiKeyScopeEnum = pgEnum("api_key_scope", [
  "read",
  "write",
  "admin",
  "proxy",
  "metrics",
  "health",
]);

// ============================================================================
// CORE TABLES (Better-Auth Compatible)
// ============================================================================

/**
 * User table - Extended for enterprise features while maintaining Better-Auth compatibility
 */
export const user = pgTable(
  "user",
  {
    // Better-Auth required fields
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),

    // Enterprise extensions
    username: text("username").unique(), // Backend requirement
    fullName: text("full_name"),
    role: userRoleEnum("role").notNull().default("user"),
    isActive: boolean("is_active").notNull().default(true),
    authProvider: text("auth_provider"), // github, google, azure, etc.
    authProviderId: text("auth_provider_id"),
    tenantId: text("tenant_id"),
    userMetadata: jsonb("user_metadata").default({}),

    // Admin/moderation fields (from current frontend schema)
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
  },
  (table) => ({
    emailIdx: index("user_email_idx").on(table.email),
    usernameIdx: index("user_username_idx").on(table.username),
    tenantIdx: index("user_tenant_idx").on(table.tenantId),
    roleIdx: index("user_role_idx").on(table.role),
  })
);

/**
 * Session table - Better-Auth compatible with enterprise extensions
 */
export const session = pgTable(
  "session",
  {
    // Better-Auth required fields
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull(),

    // Enterprise extensions
    impersonatedBy: text("impersonated_by"), // Admin impersonation
    sessionData: jsonb("session_data").default({}),
    isActive: boolean("is_active").notNull().default(true),
    lastActivity: timestamp("last_activity").notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: index("session_token_idx").on(table.token),
    userIdx: index("session_user_idx").on(table.userId),
    expiresIdx: index("session_expires_idx").on(table.expiresAt),
  })
);

/**
 * Account table - Better-Auth OAuth accounts
 */
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    userIdx: index("account_user_idx").on(table.userId),
    providerIdx: index("account_provider_idx").on(
      table.providerId,
      table.accountId
    ),
  })
);

/**
 * Verification table - Better-Auth email verification
 */
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
    expiresIdx: index("verification_expires_idx").on(table.expiresAt),
  })
);

// ============================================================================
// ENTERPRISE TABLES
// ============================================================================

/**
 * Tenant table - Multi-tenancy support
 */
export const tenant = pgTable(
  "tenants",
  {
    id: text("id").primaryKey().default(uuid()),
    name: text("name").notNull(),
    description: text("description"),
    status: tenantStatusEnum("status").notNull().default("active"),
    settings: jsonb("settings").default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("tenant_name_idx").on(table.name),
    statusIdx: index("tenant_status_idx").on(table.status),
  })
);

/**
 * MCP Server registry
 */
export const mcpServer = pgTable(
  "mcp_servers",
  {
    id: text("id").primaryKey().default(uuid()),
    name: text("name").notNull(),
    description: text("description"),
    version: text("version").notNull(),
    endpointUrl: text("endpoint_url").notNull(),
    transportType: transportTypeEnum("transport_type").notNull(),
    capabilities: jsonb("capabilities").default({}),
    tags: jsonb("tags").default([]),
    healthStatus: serverStatusEnum("health_status")
      .notNull()
      .default("unknown"),
    lastHealthCheck: timestamp("last_health_check"),
    healthMetadata: jsonb("health_metadata").default({}),
    avgResponseTime: real("avg_response_time"),
    successRate: real("success_rate"),
    activeConnections: integer("active_connections"),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("mcp_server_name_idx").on(table.name),
    endpointIdx: index("mcp_server_endpoint_idx").on(table.endpointUrl),
    tenantIdx: index("mcp_server_tenant_idx").on(table.tenantId),
    statusIdx: index("mcp_server_status_idx").on(table.healthStatus),
  })
);

/**
 * MCP Server tools registry
 */
export const serverTool = pgTable(
  "server_tools",
  {
    id: text("id").primaryKey().default(uuid()),
    serverId: text("server_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    toolSchema: jsonb("tool_schema").notNull(),
    tags: jsonb("tags").default([]),
    totalCalls: integer("total_calls").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    avgExecutionTime: real("avg_execution_time"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    serverIdx: index("server_tool_server_idx").on(table.serverId),
    nameIdx: index("server_tool_name_idx").on(table.name),
  })
);

/**
 * MCP Server resources registry
 */
export const serverResource = pgTable(
  "server_resources",
  {
    id: text("id").primaryKey().default(uuid()),
    serverId: text("server_id").notNull(),
    uriTemplate: text("uri_template").notNull(),
    name: text("name"),
    description: text("description"),
    mimeType: text("mime_type"),
    totalAccesses: integer("total_accesses").notNull().default(0),
    avgSizeBytes: integer("avg_size_bytes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    serverIdx: index("server_resource_server_idx").on(table.serverId),
    uriIdx: index("server_resource_uri_idx").on(table.uriTemplate),
  })
);

/**
 * Server performance metrics over time
 */
export const serverMetric = pgTable(
  "server_metrics",
  {
    id: text("id").primaryKey().default(uuid()),
    serverId: text("server_id").notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    responseTimeMs: real("response_time_ms"),
    requestsPerSecond: real("requests_per_second"),
    errorRate: real("error_rate"),
    cpuUsage: real("cpu_usage"),
    memoryUsageMb: real("memory_usage_mb"),
    activeConnections: integer("active_connections"),
    connectionPoolSize: integer("connection_pool_size"),
    customMetrics: jsonb("custom_metrics").default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    serverIdx: index("server_metric_server_idx").on(table.serverId),
    timestampIdx: index("server_metric_timestamp_idx").on(table.timestamp),
  })
);

/**
 * Enhanced API keys with better security
 */
export const enhancedApiKey = pgTable(
  "enhanced_api_keys",
  {
    id: text("id").primaryKey().default(uuid()),
    name: text("name").notNull(),
    description: text("description"),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(),
    salt: text("salt").notNull(),
    userId: text("user_id"),
    tenantId: text("tenant_id"),
    scopes: jsonb("scopes").default([]).notNull(),
    allowedServers: jsonb("allowed_servers").default([]),
    allowedMethods: jsonb("allowed_methods").default([]),
    ipWhitelist: jsonb("ip_whitelist").default([]),
    rateLimitPerHour: integer("rate_limit_per_hour").notNull().default(1000),
    rateLimitPerDay: integer("rate_limit_per_day").notNull().default(10000),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at"),
    lastUsed: timestamp("last_used"),
    totalRequests: integer("total_requests").notNull().default(0),
    totalErrors: integer("total_errors").notNull().default(0),
    lastSuccess: timestamp("last_success"),
    lastError: timestamp("last_error"),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lastFailedAttempt: timestamp("last_failed_attempt"),
    isLocked: boolean("is_locked").notNull().default(false),
    lockedUntil: timestamp("locked_until"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    hashIdx: index("enhanced_api_key_hash_idx").on(table.keyHash),
    prefixIdx: index("enhanced_api_key_prefix_idx").on(table.keyPrefix),
    userIdx: index("enhanced_api_key_user_idx").on(table.userId),
    tenantIdx: index("enhanced_api_key_tenant_idx").on(table.tenantId),
    activeIdx: index("enhanced_api_key_active_idx").on(table.isActive),
  })
);

/**
 * Audit log for tracking system activities
 */
export const auditLog = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey().default(uuid()),
    userId: text("user_id"),
    tenantId: text("tenant_id"),
    serviceName: text("service_name"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    details: jsonb("details").default({}),
    requestId: text("request_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    success: boolean("success").notNull().default(true),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("audit_log_user_idx").on(table.userId),
    actionIdx: index("audit_log_action_idx").on(table.action),
    timestampIdx: index("audit_log_timestamp_idx").on(table.timestamp),
    resourceIdx: index("audit_log_resource_idx").on(
      table.resourceType,
      table.resourceId
    ),
    requestIdx: index("audit_log_request_idx").on(table.requestId),
  })
);

/**
 * Request log for API gateway requests
 */
export const requestLog = pgTable(
  "request_logs",
  {
    id: text("id").primaryKey().default(uuid()),
    requestId: text("request_id").notNull().unique(),
    userId: text("user_id"),
    tenantId: text("tenant_id"),
    ipAddress: text("ip_address"),
    method: text("method").notNull(),
    path: text("path").notNull(),
    queryParams: jsonb("query_params").default({}),
    headers: jsonb("headers").default({}),
    targetServerId: text("target_server_id"),
    requestTime: timestamp("request_time").notNull().defaultNow(),
    responseTime: timestamp("response_time"),
    durationMs: real("duration_ms"),
    statusCode: integer("status_code"),
    responseSizeBytes: integer("response_size_bytes"),
    errorType: text("error_type"),
    errorMessage: text("error_message"),
    requestMetadata: jsonb("request_metadata").default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    requestIdIdx: index("request_log_request_idx").on(table.requestId),
    userIdx: index("request_log_user_idx").on(table.userId),
    pathIdx: index("request_log_path_idx").on(table.path),
    ipIdx: index("request_log_ip_idx").on(table.ipAddress),
    timestampIdx: index("request_log_timestamp_idx").on(table.requestTime),
    serverIdx: index("request_log_server_idx").on(table.targetServerId),
  })
);

/**
 * Circuit breaker state tracking
 */
export const circuitBreaker = pgTable(
  "circuit_breakers",
  {
    id: text("id").primaryKey().default(uuid()),
    serverId: text("server_id").notNull(),
    serviceName: text("service_name").notNull(),
    state: circuitBreakerStateEnum("state").notNull().default("closed"),
    failureCount: integer("failure_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    failureThreshold: integer("failure_threshold").notNull().default(5),
    successThreshold: integer("success_threshold").notNull().default(2),
    timeoutMs: integer("timeout_ms").notNull().default(60000),
    lastFailureTime: timestamp("last_failure_time"),
    lastSuccessTime: timestamp("last_success_time"),
    lastStateChange: timestamp("last_state_change").notNull().defaultNow(),
    totalRequests: integer("total_requests").notNull().default(0),
    totalFailures: integer("total_failures").notNull().default(0),
    totalTimeouts: integer("total_timeouts").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    serverIdx: index("circuit_breaker_server_idx").on(table.serverId),
    serviceIdx: index("circuit_breaker_service_idx").on(table.serviceName),
    stateIdx: index("circuit_breaker_state_idx").on(table.state),
  })
);

/**
 * System-wide configuration settings
 */
export const systemConfig = pgTable(
  "system_configs",
  {
    id: text("id").primaryKey().default(uuid()),
    key: text("key").notNull().unique(),
    value: jsonb("value").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    isRuntimeConfigurable: boolean("is_runtime_configurable")
      .notNull()
      .default(true),
    version: integer("version").notNull().default(1),
    tenantId: text("tenant_id"), // For tenant-specific overrides
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    keyIdx: index("system_config_key_idx").on(table.key),
    categoryIdx: index("system_config_category_idx").on(table.category),
    tenantIdx: index("system_config_tenant_idx").on(table.tenantId),
  })
);

// ============================================================================
// FOREIGN KEY RELATIONSHIPS
// ============================================================================

// Better-Auth relationships
export const accountUserFK = foreignKey({
  columns: [account.userId],
  foreignColumns: [user.id],
  name: "account_user_fk",
}).onDelete("cascade");

export const sessionUserFK = foreignKey({
  columns: [session.userId],
  foreignColumns: [user.id],
  name: "session_user_fk",
}).onDelete("cascade");

// Enterprise relationships
export const userTenantFK = foreignKey({
  columns: [user.tenantId],
  foreignColumns: [tenant.id],
  name: "user_tenant_fk",
}).onDelete("set null");

export const mcpServerTenantFK = foreignKey({
  columns: [mcpServer.tenantId],
  foreignColumns: [tenant.id],
  name: "mcp_server_tenant_fk",
}).onDelete("set null");

export const serverToolServerFK = foreignKey({
  columns: [serverTool.serverId],
  foreignColumns: [mcpServer.id],
  name: "server_tool_server_fk",
}).onDelete("cascade");

export const serverResourceServerFK = foreignKey({
  columns: [serverResource.serverId],
  foreignColumns: [mcpServer.id],
  name: "server_resource_server_fk",
}).onDelete("cascade");

export const serverMetricServerFK = foreignKey({
  columns: [serverMetric.serverId],
  foreignColumns: [mcpServer.id],
  name: "server_metric_server_fk",
}).onDelete("cascade");

export const enhancedApiKeyUserFK = foreignKey({
  columns: [enhancedApiKey.userId],
  foreignColumns: [user.id],
  name: "enhanced_api_key_user_fk",
}).onDelete("set null");

export const enhancedApiKeyTenantFK = foreignKey({
  columns: [enhancedApiKey.tenantId],
  foreignColumns: [tenant.id],
  name: "enhanced_api_key_tenant_fk",
}).onDelete("set null");

export const circuitBreakerServerFK = foreignKey({
  columns: [circuitBreaker.serverId],
  foreignColumns: [mcpServer.id],
  name: "circuit_breaker_server_fk",
}).onDelete("cascade");

// ============================================================================
// TYPE EXPORTS FOR DRIZZLE
// ============================================================================

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;
export type MCPServer = typeof mcpServer.$inferSelect;
export type NewMCPServer = typeof mcpServer.$inferInsert;
export type ServerTool = typeof serverTool.$inferSelect;
export type NewServerTool = typeof serverTool.$inferInsert;
export type ServerResource = typeof serverResource.$inferSelect;
export type NewServerResource = typeof serverResource.$inferInsert;
export type EnhancedApiKey = typeof enhancedApiKey.$inferSelect;
export type NewEnhancedApiKey = typeof enhancedApiKey.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
