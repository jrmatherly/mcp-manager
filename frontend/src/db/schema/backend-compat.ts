/**
 * Backend Compatibility Schema
 *
 * Additional tables required by the Python backend that are not part of the
 * standard frontend Better-Auth schema. These tables provide advanced features
 * like circuit breakers, connection pooling, and performance monitoring.
 */

import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  real,
  json,
  varchar,
  bigint,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { mcpServer } from "./mcp";
import { user } from "./auth";
import { tenant } from "./tenant";

// Enums for backend compatibility
export const circuitBreakerStateEnum = pgEnum("circuit_breaker_state", ["closed", "open", "half_open"]);

export const transportTypeEnum = pgEnum("transport_type", ["http", "websocket", "stdio", "sse"]);

export const serverStatusEnum = pgEnum("server_status", ["healthy", "unhealthy", "degraded", "unknown", "maintenance"]);

export const apiKeyScopeEnum = pgEnum("api_key_scope", ["read", "write", "admin", "proxy", "metrics", "health"]);

// Legacy session table (backend expects different schema than Better-Auth)
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),

    // Session metadata
    ipAddress: varchar("ip_address", { length: 45 }), // IPv6 max length
    userAgent: varchar("user_agent", { length: 500 }),

    // Expiration
    expiresAt: timestamp("expires_at").notNull(),

    // Session data
    sessionData: json("session_data").$type<Record<string, unknown>>().default({}),

    // State
    isActive: boolean("is_active").default(true),
    lastActivity: timestamp("last_activity").defaultNow().notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_idx").on(table.userId),
    sessionTokenIdx: uniqueIndex("sessions_token_unique").on(table.sessionToken),
    activeIdx: index("sessions_active_idx").on(table.isActive),
    expiresIdx: index("sessions_expires_idx").on(table.expiresAt),
    lastActivityIdx: index("sessions_last_activity_idx").on(table.lastActivity),
  }),
);

// Enhanced API Keys (backend version)
export const enhancedApiKeys = pgTable(
  "enhanced_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Basic information
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Key security
    keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
    keyPrefix: varchar("key_prefix", { length: 20 }).notNull(),
    salt: varchar("salt", { length: 255 }).notNull(),

    // Ownership
    userId: text("user_id").references(() => user.id),
    tenantId: text("tenant_id").references(() => tenant.id),

    // Permissions and scopes
    scopes: json("scopes").$type<string[]>().default([]),
    allowedServers: json("allowed_servers").$type<string[]>().default([]),
    allowedMethods: json("allowed_methods").$type<string[]>().default([]),

    // Access restrictions
    ipWhitelist: json("ip_whitelist").$type<string[]>().default([]),
    rateLimitPerHour: integer("rate_limit_per_hour").default(1000),
    rateLimitPerDay: integer("rate_limit_per_day").default(10000),

    // State and expiration
    isActive: boolean("is_active").default(true),
    expiresAt: timestamp("expires_at"),
    lastUsed: timestamp("last_used"),

    // Usage tracking
    totalRequests: integer("total_requests").default(0),
    totalErrors: integer("total_errors").default(0),
    lastSuccess: timestamp("last_success"),
    lastError: timestamp("last_error"),

    // Security events
    failedAttempts: integer("failed_attempts").default(0),
    lastFailedAttempt: timestamp("last_failed_attempt"),
    isLocked: boolean("is_locked").default(false),
    lockedUntil: timestamp("locked_until"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("enhanced_api_keys_name_idx").on(table.name),
    keyHashIdx: uniqueIndex("enhanced_api_keys_hash_unique").on(table.keyHash),
    keyPrefixIdx: index("enhanced_api_keys_prefix_idx").on(table.keyPrefix),
    userIdIdx: index("enhanced_api_keys_user_idx").on(table.userId),
    tenantIdIdx: index("enhanced_api_keys_tenant_idx").on(table.tenantId),
    activeIdx: index("enhanced_api_keys_active_idx").on(table.isActive),
    expiresIdx: index("enhanced_api_keys_expires_idx").on(table.expiresAt),
    lastUsedIdx: index("enhanced_api_keys_last_used_idx").on(table.lastUsed),
    lockedIdx: index("enhanced_api_keys_locked_idx").on(table.isLocked),
  }),
);

// Circuit Breaker State Tracking
export const circuitBreakers = pgTable(
  "circuit_breakers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Target identification
    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id),
    serviceName: varchar("service_name", { length: 255 }).notNull(),

    // Circuit breaker state
    state: circuitBreakerStateEnum("state").default("closed"),
    failureCount: integer("failure_count").default(0),
    successCount: integer("success_count").default(0),

    // Thresholds and timing
    failureThreshold: integer("failure_threshold").default(5),
    successThreshold: integer("success_threshold").default(2),
    timeoutMs: integer("timeout_ms").default(60000),

    // State timing
    lastFailureTime: timestamp("last_failure_time"),
    lastSuccessTime: timestamp("last_success_time"),
    lastStateChange: timestamp("last_state_change").defaultNow().notNull(),

    // Statistics
    totalRequests: integer("total_requests").default(0),
    totalFailures: integer("total_failures").default(0),
    totalTimeouts: integer("total_timeouts").default(0),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index("circuit_breakers_server_idx").on(table.serverId),
    serviceNameIdx: index("circuit_breakers_service_idx").on(table.serviceName),
    stateIdx: index("circuit_breakers_state_idx").on(table.state),
    lastStateChangeIdx: index("circuit_breakers_last_change_idx").on(table.lastStateChange),
  }),
);

// Connection Pool Management
export const connectionPools = pgTable(
  "connection_pools",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Pool identification
    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id),
    poolName: varchar("pool_name", { length: 255 }).notNull(),
    transportType: transportTypeEnum("transport_type").notNull(),

    // Pool configuration
    maxSize: integer("max_size").default(10),
    minSize: integer("min_size").default(2),
    timeoutMs: integer("timeout_ms").default(30000),
    idleTimeoutMs: integer("idle_timeout_ms").default(300000),

    // Current state
    activeConnections: integer("active_connections").default(0),
    idleConnections: integer("idle_connections").default(0),
    pendingRequests: integer("pending_requests").default(0),

    // Health status
    isHealthy: boolean("is_healthy").default(true),
    lastHealthCheck: timestamp("last_health_check"),

    // Statistics
    totalConnectionsCreated: integer("total_connections_created").default(0),
    totalConnectionsClosed: integer("total_connections_closed").default(0),
    connectionErrors: integer("connection_errors").default(0),
    avgConnectionTimeMs: real("avg_connection_time_ms"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index("connection_pools_server_idx").on(table.serverId),
    poolNameIdx: index("connection_pools_name_idx").on(table.poolName),
    healthyIdx: index("connection_pools_healthy_idx").on(table.isHealthy),
  }),
);

// Request Queue Management
export const requestQueues = pgTable(
  "request_queues",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Queue identification
    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id),
    queueName: varchar("queue_name", { length: 255 }).notNull(),

    // Queue configuration
    maxSize: integer("max_size").default(1000),
    processingTimeoutMs: integer("processing_timeout_ms").default(60000),
    priorityLevels: integer("priority_levels").default(3),

    // Current state
    currentSize: integer("current_size").default(0),
    processingCount: integer("processing_count").default(0),

    // Queue health
    isAcceptingRequests: boolean("is_accepting_requests").default(true),
    lastProcessed: timestamp("last_processed"),

    // Statistics
    totalEnqueued: integer("total_enqueued").default(0),
    totalProcessed: integer("total_processed").default(0),
    totalTimeouts: integer("total_timeouts").default(0),
    totalErrors: integer("total_errors").default(0),
    avgProcessingTimeMs: real("avg_processing_time_ms"),
    avgWaitTimeMs: real("avg_wait_time_ms"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index("request_queues_server_idx").on(table.serverId),
    queueNameIdx: index("request_queues_name_idx").on(table.queueName),
    currentSizeIdx: index("request_queues_size_idx").on(table.currentSize),
    acceptingIdx: index("request_queues_accepting_idx").on(table.isAcceptingRequests),
  }),
);

// Server Access Control
export const serverAccessControl = pgTable(
  "server_access_control",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Target server
    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id),

    // Access subject
    userId: text("user_id").references(() => user.id),
    tenantId: text("tenant_id").references(() => tenant.id),
    apiKeyId: uuid("api_key_id").references(() => enhancedApiKeys.id),

    // Permissions
    canRead: boolean("can_read").default(true),
    canWrite: boolean("can_write").default(false),
    canAdmin: boolean("can_admin").default(false),
    canProxy: boolean("can_proxy").default(true),

    // Method-level permissions
    allowedMethods: json("allowed_methods").$type<string[]>().default([]),
    deniedMethods: json("denied_methods").$type<string[]>().default([]),

    // Time-based restrictions
    accessStartTime: timestamp("access_start_time"),
    accessEndTime: timestamp("access_end_time"),
    allowedDays: json("allowed_days").$type<number[]>().default([]), // 0=Monday
    allowedHours: json("allowed_hours").$type<number[]>().default([]), // 0-23

    // State
    isActive: boolean("is_active").default(true),

    // Usage tracking
    lastAccess: timestamp("last_access"),
    accessCount: integer("access_count").default(0),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index("server_access_server_idx").on(table.serverId),
    userIdIdx: index("server_access_user_idx").on(table.userId),
    tenantIdIdx: index("server_access_tenant_idx").on(table.tenantId),
    apiKeyIdIdx: index("server_access_api_key_idx").on(table.apiKeyId),
    activeIdx: index("server_access_active_idx").on(table.isActive),
  }),
);

// Performance Alerts
export const performanceAlerts = pgTable(
  "performance_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Alert identification
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Alert target
    serverId: text("server_id").references(() => mcpServer.id),
    metricName: varchar("metric_name", { length: 100 }).notNull(),

    // Alert conditions
    thresholdValue: real("threshold_value").notNull(),
    comparisonOperator: varchar("comparison_operator", { length: 10 }).notNull(), // >, <, >=, <=, ==
    durationMinutes: integer("duration_minutes").default(5),

    // Alert state
    isActive: boolean("is_active").default(true),
    isTriggered: boolean("is_triggered").default(false),
    firstTriggered: timestamp("first_triggered"),
    lastTriggered: timestamp("last_triggered"),
    triggerCount: integer("trigger_count").default(0),

    // Notification settings
    notificationChannels: json("notification_channels").$type<string[]>().default([]),
    cooldownMinutes: integer("cooldown_minutes").default(60),
    lastNotification: timestamp("last_notification"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("performance_alerts_name_idx").on(table.name),
    serverIdIdx: index("performance_alerts_server_idx").on(table.serverId),
    metricNameIdx: index("performance_alerts_metric_idx").on(table.metricName),
    activeIdx: index("performance_alerts_active_idx").on(table.isActive),
    triggeredIdx: index("performance_alerts_triggered_idx").on(table.isTriggered),
  }),
);

// Server Metrics (Time-series performance data)
export const serverMetrics = pgTable(
  "server_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id),

    // Time-series data
    timestamp: timestamp("timestamp").defaultNow().notNull(),

    // Performance metrics
    responseTimeMs: real("response_time_ms"),
    requestsPerSecond: real("requests_per_second"),
    errorRate: real("error_rate"),
    cpuUsage: real("cpu_usage"),
    memoryUsageMb: real("memory_usage_mb"),

    // Connection metrics
    activeConnections: integer("active_connections"),
    connectionPoolSize: integer("connection_pool_size"),

    // Custom metrics
    customMetrics: json("custom_metrics").$type<Record<string, unknown>>().default({}),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index("server_metrics_server_idx").on(table.serverId),
    timestampIdx: index("server_metrics_timestamp_idx").on(table.timestamp),
    serverTimeIdx: index("server_metrics_server_time_idx").on(table.serverId, table.timestamp),
    performanceIdx: index("server_metrics_performance_idx").on(table.responseTimeMs, table.errorRate),
  }),
);

// Data Retention Policies
export const dataRetentionPolicies = pgTable(
  "data_retention_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Policy identification
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),

    // Target data
    tableName: varchar("table_name", { length: 100 }).notNull(),
    dateColumn: varchar("date_column", { length: 100 }).notNull(),

    // Retention rules
    retentionDays: integer("retention_days").notNull(),
    batchSize: integer("batch_size").default(1000),

    // Conditions
    conditions: json("conditions").$type<Record<string, unknown>>().default({}),

    // Schedule
    isActive: boolean("is_active").default(true),
    lastRun: timestamp("last_run"),
    nextRun: timestamp("next_run"),

    // Statistics
    totalDeleted: integer("total_deleted").default(0),
    lastDeletedCount: integer("last_deleted_count").default(0),
    avgExecutionTimeMs: real("avg_execution_time_ms"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex("data_retention_name_unique").on(table.name),
    tableNameIdx: index("data_retention_table_idx").on(table.tableName),
    activeIdx: index("data_retention_active_idx").on(table.isActive),
    lastRunIdx: index("data_retention_last_run_idx").on(table.lastRun),
    nextRunIdx: index("data_retention_next_run_idx").on(table.nextRun),
  }),
);

// Materialized Views
export const materializedViews = pgTable(
  "materialized_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // View identification
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),

    // View definition
    query: text("query").notNull(),
    indexes: json("indexes").$type<string[]>().default([]),

    // Refresh strategy
    refreshStrategy: varchar("refresh_strategy", { length: 50 }).default("manual"),
    refreshIntervalMinutes: integer("refresh_interval_minutes"),
    refreshTriggers: json("refresh_triggers").$type<string[]>().default([]),

    // State
    isActive: boolean("is_active").default(true),
    lastRefreshed: timestamp("last_refreshed"),
    nextRefresh: timestamp("next_refresh"),

    // Statistics
    refreshCount: integer("refresh_count").default(0),
    avgRefreshTimeMs: real("avg_refresh_time_ms"),
    rowCount: integer("row_count"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex("materialized_views_name_unique").on(table.name),
    activeIdx: index("materialized_views_active_idx").on(table.isActive),
    lastRefreshedIdx: index("materialized_views_last_refresh_idx").on(table.lastRefreshed),
    nextRefreshIdx: index("materialized_views_next_refresh_idx").on(table.nextRefresh),
  }),
);

// Request Logs (API Gateway)
export const requestLogs = pgTable(
  "request_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Request identification
    requestId: varchar("request_id", { length: 255 }).notNull().unique(),

    // Source
    userId: text("user_id").references(() => user.id),
    tenantId: text("tenant_id").references(() => tenant.id),
    ipAddress: varchar("ip_address", { length: 45 }),

    // Request details
    method: varchar("method", { length: 10 }).notNull(),
    path: varchar("path", { length: 500 }).notNull(),
    queryParams: json("query_params").$type<Record<string, unknown>>().default({}),
    headers: json("headers").$type<Record<string, unknown>>().default({}),

    // Target server
    targetServerId: text("target_server_id").references(() => mcpServer.id),

    // Timing
    requestTime: timestamp("request_time").defaultNow().notNull(),
    responseTime: timestamp("response_time"),
    durationMs: real("duration_ms"),

    // Response details
    statusCode: integer("status_code"),
    responseSizeBytes: integer("response_size_bytes"),

    // Error information
    errorType: varchar("error_type", { length: 100 }),
    errorMessage: text("error_message"),

    // Additional metadata
    requestMetadata: json("request_metadata").$type<Record<string, unknown>>().default({}),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    requestIdIdx: uniqueIndex("request_logs_request_id_unique").on(table.requestId),
    userIdIdx: index("request_logs_user_idx").on(table.userId),
    tenantIdIdx: index("request_logs_tenant_idx").on(table.tenantId),
    ipAddressIdx: index("request_logs_ip_idx").on(table.ipAddress),
    pathIdx: index("request_logs_path_idx").on(table.path),
    targetServerIdx: index("request_logs_server_idx").on(table.targetServerId),
    requestTimeIdx: index("request_logs_time_idx").on(table.requestTime),
    statusIdx: index("request_logs_status_idx").on(table.statusCode),
    tenantTimeIdx: index("request_logs_tenant_time_idx").on(table.tenantId, table.requestTime),
    serverPerformanceIdx: index("request_logs_server_performance_idx").on(table.targetServerId, table.durationMs, table.statusCode),
  }),
);

// FastMCP Audit Log
export const fastmcpAuditLog = pgTable(
  "fastmcp_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User and tenant context
    userId: varchar("user_id", { length: 255 }).notNull(),
    tenantId: varchar("tenant_id", { length: 255 }),
    userRoles: json("user_roles").$type<string[]>().default([]),

    // MCP request details
    method: varchar("method", { length: 100 }).notNull(),
    params: json("params").$type<Record<string, unknown>>().default({}),
    requestId: varchar("request_id", { length: 255 }),
    jsonrpcVersion: varchar("jsonrpc_version", { length: 10 }).default("2.0"),

    // Execution details
    success: boolean("success").notNull(),
    durationMs: integer("duration_ms").notNull(),
    errorCode: integer("error_code"),
    errorMessage: text("error_message"),

    // Timestamp
    timestamp: timestamp("timestamp").defaultNow().notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("fastmcp_audit_user_idx").on(table.userId),
    tenantIdIdx: index("fastmcp_audit_tenant_idx").on(table.tenantId),
    methodIdx: index("fastmcp_audit_method_idx").on(table.method),
    successIdx: index("fastmcp_audit_success_idx").on(table.success),
    timestampIdx: index("fastmcp_audit_timestamp_idx").on(table.timestamp),
    userTimeIdx: index("fastmcp_audit_user_time_idx").on(table.userId, table.timestamp),
    methodSuccessIdx: index("fastmcp_audit_method_success_idx").on(table.method, table.success, table.timestamp),
    tenantPerformanceIdx: index("fastmcp_audit_tenant_performance_idx").on(table.tenantId, table.durationMs, table.timestamp),
  }),
);

// Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(user, {
    fields: [sessions.userId],
    references: [user.id],
  }),
}));

export const enhancedApiKeysRelations = relations(enhancedApiKeys, ({ one }) => ({
  user: one(user, {
    fields: [enhancedApiKeys.userId],
    references: [user.id],
  }),
  tenant: one(tenant, {
    fields: [enhancedApiKeys.tenantId],
    references: [tenant.id],
  }),
}));

export const circuitBreakersRelations = relations(circuitBreakers, ({ one }) => ({
  server: one(mcpServer, {
    fields: [circuitBreakers.serverId],
    references: [mcpServer.id],
  }),
}));

export const connectionPoolsRelations = relations(connectionPools, ({ one }) => ({
  server: one(mcpServer, {
    fields: [connectionPools.serverId],
    references: [mcpServer.id],
  }),
}));

export const requestQueuesRelations = relations(requestQueues, ({ one }) => ({
  server: one(mcpServer, {
    fields: [requestQueues.serverId],
    references: [mcpServer.id],
  }),
}));

export const serverAccessControlRelations = relations(serverAccessControl, ({ one }) => ({
  server: one(mcpServer, {
    fields: [serverAccessControl.serverId],
    references: [mcpServer.id],
  }),
  user: one(user, {
    fields: [serverAccessControl.userId],
    references: [user.id],
  }),
  tenant: one(tenant, {
    fields: [serverAccessControl.tenantId],
    references: [tenant.id],
  }),
  apiKey: one(enhancedApiKeys, {
    fields: [serverAccessControl.apiKeyId],
    references: [enhancedApiKeys.id],
  }),
}));

export const performanceAlertsRelations = relations(performanceAlerts, ({ one }) => ({
  server: one(mcpServer, {
    fields: [performanceAlerts.serverId],
    references: [mcpServer.id],
  }),
}));

export const serverMetricsRelations = relations(serverMetrics, ({ one }) => ({
  server: one(mcpServer, {
    fields: [serverMetrics.serverId],
    references: [mcpServer.id],
  }),
}));

export const requestLogsRelations = relations(requestLogs, ({ one }) => ({
  user: one(user, {
    fields: [requestLogs.userId],
    references: [user.id],
  }),
  tenant: one(tenant, {
    fields: [requestLogs.tenantId],
    references: [tenant.id],
  }),
  server: one(mcpServer, {
    fields: [requestLogs.targetServerId],
    references: [mcpServer.id],
  }),
}));
