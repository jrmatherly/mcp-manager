/**
 * Audit and logging schema for compliance and monitoring
 *
 * Handles audit trails, error tracking, system events,
 * and compliance logging for the MCP registry system.
 */

import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, json, uuid, integer, index } from "drizzle-orm/pg-core";

// Comprehensive audit log for all system events
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Event identification
    eventType: text("event_type").notNull(), // e.g., "server.created", "user.login"
    action: text("action").notNull(), // CREATE, READ, UPDATE, DELETE, EXECUTE

    // Actor information (who performed the action)
    actorType: text("actor_type", {
      enum: ["user", "system", "api", "scheduled_job"],
    }).notNull(),
    actorId: text("actor_id"), // user.id, api_token.id, etc.
    actorEmail: text("actor_email"),
    actorIp: text("actor_ip"),
    actorUserAgent: text("actor_user_agent"),

    // Target information (what was acted upon)
    resourceType: text("resource_type").notNull(), // server, user, tenant, etc.
    resourceId: text("resource_id"), // ID of the affected resource
    resourceName: text("resource_name"), // Human-readable name

    // Context information
    tenantId: text("tenant_id"), // Multi-tenancy context
    sessionId: text("session_id"), // User session
    requestId: text("request_id"), // Request correlation
    traceId: text("trace_id"), // Distributed tracing

    // Event details
    description: text("description").notNull(),
    changes: json("changes").$type<{
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      fields?: string[];
    }>(),

    // Request/response details
    httpMethod: text("http_method"),
    httpPath: text("http_path"),
    httpStatusCode: integer("http_status_code"),
    responseTime: integer("response_time"), // milliseconds

    // Risk and compliance
    riskLevel: text("risk_level", {
      enum: ["low", "medium", "high", "critical"],
    })
      .default("low")
      .notNull(),
    complianceRelevant: boolean("compliance_relevant").default(false),

    // Additional metadata
    metadata: json("metadata").$type<{
      location?: {
        country?: string;
        region?: string;
        city?: string;
      };
      device?: {
        type?: string;
        os?: string;
        browser?: string;
      };
      custom?: Record<string, unknown>;
    }>(),

    // Success/failure
    success: boolean("success").default(true).notNull(),
    errorMessage: text("error_message"),
    errorCode: text("error_code"),

    // Timestamp
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    eventTypeIdx: index("audit_log_event_type_idx").on(table.eventType),
    actionIdx: index("audit_log_action_idx").on(table.action),
    actorIdx: index("audit_log_actor_idx").on(table.actorType, table.actorId),
    resourceIdx: index("audit_log_resource_idx").on(table.resourceType, table.resourceId),
    tenantIdx: index("audit_log_tenant_idx").on(table.tenantId),
    occurredAtIdx: index("audit_log_occurred_at_idx").on(table.occurredAt),
    riskLevelIdx: index("audit_log_risk_level_idx").on(table.riskLevel),
    complianceIdx: index("audit_log_compliance_idx").on(table.complianceRelevant),
    successIdx: index("audit_log_success_idx").on(table.success),
  }),
);

// Error tracking and monitoring
export const errorLog = pgTable(
  "error_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Error identification
    errorId: text("error_id").notNull(), // Unique error identifier for grouping
    fingerprint: text("fingerprint").notNull(), // Error fingerprint for deduplication

    // Error details
    type: text("type").notNull(), // Exception type or error category
    message: text("message").notNull(),
    stackTrace: text("stack_trace"),

    // Context information
    userId: text("user_id"), // User who experienced the error
    tenantId: text("tenant_id"), // Tenant context
    sessionId: text("session_id"),
    requestId: text("request_id"),
    traceId: text("trace_id"),

    // Request context
    httpMethod: text("http_method"),
    httpPath: text("http_path"),
    httpHeaders: json("http_headers").$type<Record<string, string>>(),
    httpQuery: json("http_query").$type<Record<string, unknown>>(),
    httpBody: json("http_body").$type<unknown>(),

    // Technical details
    service: text("service").notNull(), // Which service/component
    version: text("version"), // Application version
    environment: text("environment").notNull(), // dev, staging, prod

    // User and device context
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    deviceInfo: json("device_info").$type<{
      browser?: string;
      os?: string;
      device?: string;
      viewport?: { width: number; height: number };
    }>(),

    // Error severity and status
    level: text("level", {
      enum: ["debug", "info", "warn", "error", "fatal"],
    })
      .default("error")
      .notNull(),

    status: text("status", {
      enum: ["new", "investigating", "resolved", "ignored"],
    })
      .default("new")
      .notNull(),

    // Resolution tracking
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"), // user.id who resolved
    resolution: text("resolution"),

    // Occurrence tracking
    firstSeen: timestamp("first_seen", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastSeen: timestamp("last_seen", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    occurrenceCount: integer("occurrence_count").default(1).notNull(),

    // Additional metadata
    metadata: json("metadata").$type<Record<string, unknown>>().default({}),

    // Timestamp
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    errorIdIdx: index("error_log_error_id_idx").on(table.errorId),
    fingerprintIdx: index("error_log_fingerprint_idx").on(table.fingerprint),
    typeIdx: index("error_log_type_idx").on(table.type),
    userIdx: index("error_log_user_idx").on(table.userId),
    tenantIdx: index("error_log_tenant_idx").on(table.tenantId),
    serviceIdx: index("error_log_service_idx").on(table.service),
    levelIdx: index("error_log_level_idx").on(table.level),
    statusIdx: index("error_log_status_idx").on(table.status),
    firstSeenIdx: index("error_log_first_seen_idx").on(table.firstSeen),
    lastSeenIdx: index("error_log_last_seen_idx").on(table.lastSeen),
  }),
);

// System events and notifications
export const systemEvent = pgTable(
  "system_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Event identification
    type: text("type").notNull(), // e.g., "server_health_check", "backup_completed"
    category: text("category", {
      enum: ["system", "security", "performance", "maintenance", "business"],
    }).notNull(),

    // Event details
    title: text("title").notNull(),
    description: text("description"),

    // Severity and priority
    severity: text("severity", {
      enum: ["info", "warning", "error", "critical"],
    })
      .default("info")
      .notNull(),

    // Context
    source: text("source").notNull(), // Component that generated the event
    tenantId: text("tenant_id"), // Tenant context if applicable
    resourceType: text("resource_type"), // Affected resource type
    resourceId: text("resource_id"), // Affected resource ID

    // Event data
    data: json("data").$type<Record<string, unknown>>().default({}),

    // Status tracking
    status: text("status", {
      enum: ["active", "acknowledged", "resolved", "suppressed"],
    })
      .default("active")
      .notNull(),

    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    acknowledgedBy: text("acknowledged_by"), // user.id
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"), // user.id

    // Notification tracking
    notificationSent: boolean("notification_sent").default(false),
    notificationChannels: json("notification_channels").$type<string[]>().default([]),

    // Timestamp
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    typeIdx: index("system_event_type_idx").on(table.type),
    categoryIdx: index("system_event_category_idx").on(table.category),
    severityIdx: index("system_event_severity_idx").on(table.severity),
    sourceIdx: index("system_event_source_idx").on(table.source),
    tenantIdx: index("system_event_tenant_idx").on(table.tenantId),
    statusIdx: index("system_event_status_idx").on(table.status),
    occurredAtIdx: index("system_event_occurred_at_idx").on(table.occurredAt),
  }),
);

// Security events and alerts
export const securityEvent = pgTable(
  "security_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Event identification
    type: text("type").notNull(), // e.g., "failed_login", "suspicious_activity"
    severity: text("severity", {
      enum: ["low", "medium", "high", "critical"],
    }).notNull(),

    // Actor information (potential threat actor)
    sourceIp: text("source_ip").notNull(),
    userAgent: text("user_agent"),
    userId: text("user_id"), // If associated with a user
    tenantId: text("tenant_id"), // If associated with a tenant

    // Geographical information
    country: text("country"),
    region: text("region"),
    city: text("city"),

    // Event details
    description: text("description").notNull(),
    details: json("details")
      .$type<{
        failedAttempts?: number;
        timeWindow?: string;
        patterns?: string[];
        riskScore?: number;
        custom?: Record<string, unknown>;
      }>()
      .default({}),

    // Response actions
    actionTaken: text("action_taken", {
      enum: ["none", "logged", "blocked", "rate_limited", "account_locked", "investigated"],
    })
      .default("logged")
      .notNull(),

    // Investigation status
    investigationStatus: text("investigation_status", {
      enum: ["pending", "in_progress", "resolved", "false_positive"],
    })
      .default("pending")
      .notNull(),

    investigatedBy: text("investigated_by"), // user.id
    investigationNotes: text("investigation_notes"),

    // Timestamps
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    investigatedAt: timestamp("investigated_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    typeIdx: index("security_event_type_idx").on(table.type),
    severityIdx: index("security_event_severity_idx").on(table.severity),
    sourceIpIdx: index("security_event_source_ip_idx").on(table.sourceIp),
    userIdx: index("security_event_user_idx").on(table.userId),
    tenantIdx: index("security_event_tenant_idx").on(table.tenantId),
    actionIdx: index("security_event_action_idx").on(table.actionTaken),
    statusIdx: index("security_event_status_idx").on(table.investigationStatus),
    detectedAtIdx: index("security_event_detected_at_idx").on(table.detectedAt),
  }),
);

// Relations
export const auditLogRelations = relations(auditLog, ({ one: _one }) => ({
  // tenant relation defined in schema/index.ts to avoid circular imports
}));

export const errorLogRelations = relations(errorLog, ({ one: _one }) => ({
  // tenant relation defined in schema/index.ts to avoid circular imports
}));

export const systemEventRelations = relations(systemEvent, ({ one: _one }) => ({
  // tenant relation defined in schema/index.ts to avoid circular imports
}));

export const securityEventRelations = relations(securityEvent, ({ one: _one }) => ({
  // tenant relation defined in schema/index.ts to avoid circular imports
}));

// Note: tenant relation is handled in schema/index.ts to avoid circular imports
