/**
 * API management schema for tokens, rate limiting, and access control
 *
 * Handles API token management, rate limiting configurations,
 * and API usage tracking for the MCP registry system.
 */

import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, json, uuid, integer, index, unique, decimal } from "drizzle-orm/pg-core";

// API tokens for authentication and authorization
export const apiToken = pgTable(
  "api_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Token identification
    name: text("name").notNull(),
    description: text("description"),
    tokenHash: text("token_hash").notNull().unique(), // SHA-256 hash of the actual token
    tokenPrefix: text("token_prefix").notNull(), // First 8 chars for identification

    // Token ownership and scope
    userId: text("user_id").notNull(), // References user.id
    tenantId: text("tenant_id"), // References tenant.id, null for user-level tokens

    // Token permissions and scope
    scopes: json("scopes").$type<string[]>().default([]), // e.g., ["servers:read", "servers:write"]

    // Token configuration
    type: text("type", {
      enum: ["personal", "service", "integration", "webhook"],
    })
      .default("personal")
      .notNull(),

    // Access control
    allowedIps: json("allowed_ips").$type<string[]>(), // IP whitelist
    allowedDomains: json("allowed_domains").$type<string[]>(), // Domain whitelist

    // Rate limiting (overrides default tenant/user limits)
    rateLimit: json("rate_limit").$type<{
      rpm?: number; // requests per minute
      rph?: number; // requests per hour
      rpd?: number; // requests per day
      burst?: number; // burst capacity
    }>(),

    // Token status and lifecycle
    isActive: boolean("is_active").default(true).notNull(),

    // Usage tracking
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    usageCount: integer("usage_count").default(0),

    // Expiration
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    tokenHashIdx: unique("api_token_hash_unique").on(table.tokenHash),
    userIdx: index("api_token_user_idx").on(table.userId),
    tenantIdx: index("api_token_tenant_idx").on(table.tenantId),
    activeIdx: index("api_token_active_idx").on(table.isActive),
    expiresIdx: index("api_token_expires_idx").on(table.expiresAt),
    lastUsedIdx: index("api_token_last_used_idx").on(table.lastUsedAt),
  }),
);

// Rate limiting configuration and tracking
export const rateLimitConfig = pgTable(
  "rate_limit_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Configuration identity
    name: text("name").notNull(),
    description: text("description"),

    // Rate limit rules
    rules: json("rules")
      .$type<
        Array<{
          path?: string; // API path pattern (e.g., "/api/servers/*")
          method?: string; // HTTP method
          rpm?: number; // requests per minute
          rph?: number; // requests per hour
          rpd?: number; // requests per day
          burst?: number; // burst capacity
          windowSize?: number; // sliding window size in seconds
        }>
      >()
      .default([]),

    // Scope and application
    scope: text("scope", {
      enum: ["global", "tenant", "user", "token"],
    }).notNull(),

    // Priority for rule resolution (higher = higher priority)
    priority: integer("priority").default(100),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    nameIdx: index("rate_limit_config_name_idx").on(table.name),
    scopeIdx: index("rate_limit_config_scope_idx").on(table.scope),
    priorityIdx: index("rate_limit_config_priority_idx").on(table.priority),
    activeIdx: index("rate_limit_config_active_idx").on(table.isActive),
  }),
);

// Rate limiting violations and tracking
export const rateLimitViolation = pgTable(
  "rate_limit_violation",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Violation context
    tokenId: uuid("token_id"), // References api_token.id if applicable
    userId: text("user_id"), // References user.id
    tenantId: text("tenant_id"), // References tenant.id

    // Request details
    ipAddress: text("ip_address").notNull(),
    userAgent: text("user_agent"),
    path: text("path").notNull(),
    method: text("method").notNull(),

    // Rate limit details
    ruleId: uuid("rule_id"), // References rate_limit_config.id
    limitType: text("limit_type", {
      enum: ["rpm", "rph", "rpd", "burst"],
    }).notNull(),
    limitValue: integer("limit_value").notNull(),
    currentValue: integer("current_value").notNull(),

    // Violation response
    action: text("action", {
      enum: ["blocked", "throttled", "warned", "logged"],
    }).notNull(),

    // Additional metadata
    metadata: json("metadata").$type<{
      requestId?: string;
      responseTime?: number;
      severity?: "low" | "medium" | "high";
    }>(),

    // Timestamp
    violatedAt: timestamp("violated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    tokenIdx: index("rate_limit_violation_token_idx").on(table.tokenId),
    userIdx: index("rate_limit_violation_user_idx").on(table.userId),
    tenantIdx: index("rate_limit_violation_tenant_idx").on(table.tenantId),
    ipIdx: index("rate_limit_violation_ip_idx").on(table.ipAddress),
    pathIdx: index("rate_limit_violation_path_idx").on(table.path),
    violatedAtIdx: index("rate_limit_violation_violated_at_idx").on(table.violatedAt),
  }),
);

// API usage analytics and metrics
export const apiUsage = pgTable(
  "api_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Usage context
    tokenId: uuid("token_id"), // References api_token.id if applicable
    userId: text("user_id"), // References user.id
    tenantId: text("tenant_id"), // References tenant.id
    serverId: text("server_id"), // References mcp_server.id if applicable

    // Request details
    path: text("path").notNull(),
    method: text("method").notNull(),
    statusCode: integer("status_code").notNull(),
    responseTime: integer("response_time"), // milliseconds
    requestSize: integer("request_size"), // bytes
    responseSize: integer("response_size"), // bytes

    // Geographic and client info
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    country: text("country"), // ISO country code
    region: text("region"),
    city: text("city"),

    // Error details (if applicable)
    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    // Additional metadata
    metadata: json("metadata").$type<{
      requestId?: string;
      traceId?: string;
      spanId?: string;
      custom?: Record<string, unknown>;
    }>(),

    // Timestamp
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    tokenIdx: index("api_usage_token_idx").on(table.tokenId),
    userIdx: index("api_usage_user_idx").on(table.userId),
    tenantIdx: index("api_usage_tenant_idx").on(table.tenantId),
    serverIdx: index("api_usage_server_idx").on(table.serverId),
    pathIdx: index("api_usage_path_idx").on(table.path),
    statusIdx: index("api_usage_status_idx").on(table.statusCode),
    requestedAtIdx: index("api_usage_requested_at_idx").on(table.requestedAt),
  }),
);

// API usage aggregated statistics (for performance)
export const apiUsageStats = pgTable(
  "api_usage_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Aggregation context
    tenantId: text("tenant_id"), // References tenant.id
    userId: text("user_id"), // References user.id
    serverId: text("server_id"), // References mcp_server.id
    tokenId: uuid("token_id"), // References api_token.id

    // Time period
    periodType: text("period_type", {
      enum: ["minute", "hour", "day", "week", "month"],
    }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

    // Aggregated metrics
    totalRequests: integer("total_requests").default(0),
    totalErrors: integer("total_errors").default(0),
    avgResponseTime: decimal("avg_response_time", { precision: 10, scale: 3 }),
    totalDataTransfer: integer("total_data_transfer").default(0), // bytes
    uniqueIps: integer("unique_ips").default(0),

    // Status code breakdown
    statusBreakdown: json("status_breakdown")
      .$type<{
        "2xx"?: number;
        "3xx"?: number;
        "4xx"?: number;
        "5xx"?: number;
      }>()
      .default({}),

    // Endpoint breakdown
    endpointBreakdown: json("endpoint_breakdown")
      .$type<
        Record<
          string,
          {
            requests: number;
            errors: number;
            avgResponseTime: number;
          }
        >
      >()
      .default({}),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    tenantPeriodIdx: index("api_usage_stats_tenant_period_idx").on(table.tenantId, table.periodType, table.periodStart),
    userPeriodIdx: index("api_usage_stats_user_period_idx").on(table.userId, table.periodType, table.periodStart),
    serverPeriodIdx: index("api_usage_stats_server_period_idx").on(table.serverId, table.periodType, table.periodStart),
    tokenPeriodIdx: index("api_usage_stats_token_period_idx").on(table.tokenId, table.periodType, table.periodStart),
    periodRangeIdx: index("api_usage_stats_period_range_idx").on(table.periodStart, table.periodEnd),
  }),
);

// Relations
export const apiTokenRelations = relations(apiToken, ({ many }) => ({
  violations: many(rateLimitViolation),
  usage: many(apiUsage),
  usageStats: many(apiUsageStats),
  // tenant relation defined in schema/index.ts to avoid circular imports
}));

export const rateLimitConfigRelations = relations(rateLimitConfig, ({ many }) => ({
  violations: many(rateLimitViolation),
}));

export const rateLimitViolationRelations = relations(rateLimitViolation, ({ one }) => ({
  token: one(apiToken, {
    fields: [rateLimitViolation.tokenId],
    references: [apiToken.id],
  }),
  rule: one(rateLimitConfig, {
    fields: [rateLimitViolation.ruleId],
    references: [rateLimitConfig.id],
  }),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  token: one(apiToken, {
    fields: [apiUsage.tokenId],
    references: [apiToken.id],
  }),
  // server relation defined in schema/index.ts to avoid circular imports
}));

export const apiUsageStatsRelations = relations(apiUsageStats, ({ one }) => ({
  token: one(apiToken, {
    fields: [apiUsageStats.tokenId],
    references: [apiToken.id],
  }),
  // Cross-schema relations defined in schema/index.ts to avoid circular imports
}));

// Note: Cross-schema relations are handled in schema/index.ts to avoid circular imports
