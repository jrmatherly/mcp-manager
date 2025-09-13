/**
 * Admin and system configuration schema
 *
 * Handles system-wide settings, feature flags, maintenance modes,
 * and administrative configurations.
 */

import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, json, uuid, integer, index, unique } from "drizzle-orm/pg-core";
import type {
  FeatureFlagTargetingRule,
  FeatureFlagEnvironments,
  FeatureFlagEvaluationMetadata,
  SystemConfigValidationSchema,
} from "../types";

// System-wide configuration settings
export const systemConfig = pgTable(
  "system_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Configuration identification
    key: text("key").notNull().unique(),
    category: text("category").notNull(), // e.g., "security", "features", "limits"

    // Configuration value and metadata
    value: json("value").$type<unknown>().notNull(),
    valueType: text("value_type", {
      enum: ["string", "number", "boolean", "object", "array"],
    }).notNull(),

    // Configuration properties
    description: text("description"),
    isPublic: boolean("is_public").default(false), // Can be read by frontend
    isSecret: boolean("is_secret").default(false), // Contains sensitive data

    // Validation and constraints
    validationSchema: json("validation_schema").$type<SystemConfigValidationSchema>(),

    // Configuration lifecycle
    isActive: boolean("is_active").default(true).notNull(),
    environment: text("environment", {
      enum: ["development", "staging", "production", "all"],
    })
      .default("all")
      .notNull(),

    // Change tracking
    lastModifiedBy: text("last_modified_by"), // user.id
    changeReason: text("change_reason"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    keyUniqueIdx: unique("system_config_key_unique_idx").on(table.key),
    categoryIdx: index("system_config_category_idx").on(table.category),
    publicIdx: index("system_config_public_idx").on(table.isPublic),
    activeIdx: index("system_config_active_idx").on(table.isActive),
    environmentIdx: index("system_config_environment_idx").on(table.environment),
  }),
);

// Feature flags for gradual rollouts and A/B testing
export const featureFlag = pgTable(
  "feature_flag",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Flag identification
    name: text("name").notNull().unique(),
    key: text("key").notNull().unique(), // Programmatic key (snake_case)
    description: text("description"),

    // Flag configuration
    type: text("type", {
      enum: ["boolean", "string", "number", "json"],
    })
      .default("boolean")
      .notNull(),

    defaultValue: json("default_value").$type<unknown>().notNull(),

    // Targeting and rollout
    isEnabled: boolean("is_enabled").default(false).notNull(),
    rolloutPercentage: integer("rollout_percentage").default(0), // 0-100

    // Targeting rules
    targetingRules: json("targeting_rules").$type<FeatureFlagTargetingRule[]>().default([]),

    // Environment configuration
    environments: json("environments").$type<FeatureFlagEnvironments>().default({}),

    // Flag lifecycle
    status: text("status", {
      enum: ["development", "testing", "active", "deprecated", "archived"],
    })
      .default("development")
      .notNull(),

    // Metadata
    tags: json("tags").$type<string[]>().default([]),
    owner: text("owner"), // user.id or team name

    // Temporary flag settings
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    killSwitchEnabled: boolean("kill_switch_enabled").default(false),

    // Change tracking
    lastModifiedBy: text("last_modified_by"), // user.id

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    nameUniqueIdx: unique("feature_flag_name_unique_idx").on(table.name),
    keyUniqueIdx: unique("feature_flag_key_unique_idx").on(table.key),
    statusIdx: index("feature_flag_status_idx").on(table.status),
    enabledIdx: index("feature_flag_enabled_idx").on(table.isEnabled),
    expiresIdx: index("feature_flag_expires_idx").on(table.expiresAt),
  }),
);

// Feature flag evaluation history
export const featureFlagEvaluation = pgTable(
  "feature_flag_evaluation",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Flag and context
    flagId: uuid("flag_id")
      .notNull()
      .references(() => featureFlag.id, { onDelete: "cascade" }),
    flagKey: text("flag_key").notNull(),

    // Evaluation context
    userId: text("user_id"), // user who was evaluated
    tenantId: text("tenant_id"), // tenant context

    // Evaluation result
    value: json("value").$type<unknown>().notNull(),
    reason: text("reason", {
      enum: ["default", "targeting_match", "rollout", "forced", "error"],
    }).notNull(),

    // Request context
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),

    // Additional metadata
    metadata: json("metadata").$type<FeatureFlagEvaluationMetadata>().default({}),

    // Timestamp
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    flagIdx: index("feature_flag_evaluation_flag_idx").on(table.flagId),
    flagKeyIdx: index("feature_flag_evaluation_flag_key_idx").on(table.flagKey),
    userIdx: index("feature_flag_evaluation_user_idx").on(table.userId),
    tenantIdx: index("feature_flag_evaluation_tenant_idx").on(table.tenantId),
    evaluatedAtIdx: index("feature_flag_evaluation_evaluated_at_idx").on(table.evaluatedAt),
  }),
);

// System maintenance windows and announcements
export const maintenanceWindow = pgTable(
  "maintenance_window",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Maintenance details
    title: text("title").notNull(),
    description: text("description"),

    // Maintenance type and impact
    type: text("type", {
      enum: ["scheduled", "emergency", "security_patch", "upgrade"],
    }).notNull(),

    impact: text("impact", {
      enum: ["none", "minimal", "partial", "full_outage"],
    }).notNull(),

    // Affected components/services
    affectedServices: json("affected_services").$type<string[]>().default([]),
    affectedTenants: json("affected_tenants").$type<string[]>().default([]), // empty = all tenants

    // Timing
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
    actualStart: timestamp("actual_start", { withTimezone: true }),
    actualEnd: timestamp("actual_end", { withTimezone: true }),

    // Status
    status: text("status", {
      enum: ["scheduled", "in_progress", "completed", "cancelled", "extended"],
    })
      .default("scheduled")
      .notNull(),

    // Notifications
    notifyUsers: boolean("notify_users").default(true),
    notificationSent: boolean("notification_sent").default(false),
    notificationChannels: json("notification_channels").$type<string[]>().default([]),

    // Additional information
    workarounds: text("workarounds"), // Temporary workarounds for users
    rollbackPlan: text("rollback_plan"), // Rollback procedures

    // Ownership and approval
    createdBy: text("created_by").notNull(), // user.id
    approvedBy: text("approved_by"), // user.id
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    typeIdx: index("maintenance_window_type_idx").on(table.type),
    statusIdx: index("maintenance_window_status_idx").on(table.status),
    scheduledStartIdx: index("maintenance_window_scheduled_start_idx").on(table.scheduledStart),
    scheduledEndIdx: index("maintenance_window_scheduled_end_idx").on(table.scheduledEnd),
  }),
);

// System announcements and notifications
export const systemAnnouncement = pgTable(
  "system_announcement",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Announcement content
    title: text("title").notNull(),
    message: text("message").notNull(),

    // Announcement type and priority
    type: text("type", {
      enum: ["info", "warning", "success", "error", "maintenance", "feature"],
    }).notNull(),

    priority: text("priority", {
      enum: ["low", "normal", "high", "urgent"],
    })
      .default("normal")
      .notNull(),

    // Targeting
    targetAudience: text("target_audience", {
      enum: ["all_users", "admins_only", "specific_tenants", "specific_users"],
    })
      .default("all_users")
      .notNull(),

    targetTenants: json("target_tenants").$type<string[]>().default([]),
    targetUsers: json("target_users").$type<string[]>().default([]),
    targetRoles: json("target_roles").$type<string[]>().default([]),

    // Display configuration
    displayLocation: json("display_location").$type<string[]>().default([]), // dashboard, header, modal
    isDismissible: boolean("is_dismissible").default(true),
    requiresAcknowledgment: boolean("requires_acknowledgment").default(false),

    // Styling
    backgroundColor: text("background_color"),
    textColor: text("text_color"),
    icon: text("icon"),

    // Scheduling
    startsAt: timestamp("starts_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Link/action
    actionUrl: text("action_url"),
    actionText: text("action_text"),

    // Tracking
    viewCount: integer("view_count").default(0),
    acknowledgmentCount: integer("acknowledgment_count").default(0),

    // Ownership
    createdBy: text("created_by").notNull(), // user.id

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    typeIdx: index("system_announcement_type_idx").on(table.type),
    priorityIdx: index("system_announcement_priority_idx").on(table.priority),
    activeIdx: index("system_announcement_active_idx").on(table.isActive),
    startsAtIdx: index("system_announcement_starts_at_idx").on(table.startsAt),
    endsAtIdx: index("system_announcement_ends_at_idx").on(table.endsAt),
  }),
);

// User acknowledgments of announcements
export const announcementAcknowledgment = pgTable(
  "announcement_acknowledgment",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Acknowledgment context
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => systemAnnouncement.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // user.id

    // Acknowledgment details
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),

    // Additional metadata
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => ({
    uniqueIdx: unique("announcement_acknowledgment_unique_idx").on(table.announcementId, table.userId),
    announcementIdx: index("announcement_acknowledgment_announcement_idx").on(table.announcementId),
    userIdx: index("announcement_acknowledgment_user_idx").on(table.userId),
  }),
);

// Relations
export const systemConfigRelations = relations(systemConfig, ({ one: _one }) => ({
  // No direct relations, but could reference user for lastModifiedBy
}));

export const featureFlagRelations = relations(featureFlag, ({ many }) => ({
  evaluations: many(featureFlagEvaluation),
}));

export const featureFlagEvaluationRelations = relations(featureFlagEvaluation, ({ one }) => ({
  flag: one(featureFlag, {
    fields: [featureFlagEvaluation.flagId],
    references: [featureFlag.id],
  }),
}));

export const maintenanceWindowRelations = relations(maintenanceWindow, ({ one: _one }) => ({
  // Could reference user for createdBy and approvedBy
}));

export const systemAnnouncementRelations = relations(systemAnnouncement, ({ many }) => ({
  acknowledgments: many(announcementAcknowledgment),
}));

export const announcementAcknowledgmentRelations = relations(announcementAcknowledgment, ({ one }) => ({
  announcement: one(systemAnnouncement, {
    fields: [announcementAcknowledgment.announcementId],
    references: [systemAnnouncement.id],
  }),
}));
