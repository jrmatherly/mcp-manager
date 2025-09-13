/**
 * Multi-tenancy schema for enterprise features
 *
 * Supports isolated tenant environments with configurable settings,
 * resource quotas, and billing integration.
 */

import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, json, uuid, integer, index, unique } from "drizzle-orm/pg-core";

export const tenant = pgTable(
  "tenant",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(), // URL-friendly identifier
    domain: text("domain"), // Custom domain support

    // Tenant status and lifecycle
    status: text("status", {
      enum: ["active", "suspended", "pending", "cancelled"],
    })
      .default("pending")
      .notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),

    // Owner and billing
    ownerId: text("owner_id").notNull(), // References user.id
    billingEmail: text("billing_email"),

    // Resource quotas and limits
    maxUsers: integer("max_users").default(10),
    maxServers: integer("max_servers").default(5),
    maxApiCalls: integer("max_api_calls").default(10000), // Per month

    // Feature flags
    features: json("features")
      .$type<{
        customDomain?: boolean;
        sso?: boolean;
        advancedAnalytics?: boolean;
        prioritySupport?: boolean;
        apiAccess?: boolean;
        webhooks?: boolean;
      }>()
      .default({}),

    // Configuration settings
    settings: json("settings")
      .$type<{
        allowUserRegistration?: boolean;
        requireEmailVerification?: boolean;
        sessionTimeout?: number; // minutes
        passwordPolicy?: {
          minLength?: number;
          requireUppercase?: boolean;
          requireLowercase?: boolean;
          requireNumbers?: boolean;
          requireSymbols?: boolean;
        };
        rateLimits?: {
          api?: number; // requests per minute
          login?: number; // attempts per hour
        };
        branding?: {
          logo?: string;
          primaryColor?: string;
          secondaryColor?: string;
        };
      }>()
      .default({}),

    // Usage tracking
    currentUsers: integer("current_users").default(0),
    currentServers: integer("current_servers").default(0),
    currentMonthApiCalls: integer("current_month_api_calls").default(0),

    // Billing and subscription
    planType: text("plan_type", {
      enum: ["free", "starter", "professional", "enterprise"],
    })
      .default("free")
      .notNull(),
    subscriptionStatus: text("subscription_status", {
      enum: ["active", "cancelled", "past_due", "unpaid", "incomplete"],
    }).default("active"),
    subscriptionId: text("subscription_id"), // External billing system ID
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),

    // Security and compliance
    dataRegion: text("data_region").default("us-east-1"),
    encryptionKeyId: text("encryption_key_id"),
    auditLogRetention: integer("audit_log_retention").default(90), // days

    // Contact and support
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    supportPlan: text("support_plan", {
      enum: ["community", "standard", "priority", "enterprise"],
    }).default("community"),
  },
  (table) => ({
    slugUniqueIdx: unique("tenant_slug_unique_idx").on(table.slug),
    domainIdx: index("tenant_domain_idx").on(table.domain),
    statusIdx: index("tenant_status_idx").on(table.status),
    ownerIdx: index("tenant_owner_idx").on(table.ownerId),
    planIdx: index("tenant_plan_idx").on(table.planType),
    regionIdx: index("tenant_region_idx").on(table.dataRegion),
  }),
);

// Tenant membership for user-tenant associations
export const tenantMember = pgTable(
  "tenant_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // References user.id

    // Member role and permissions
    role: text("role", {
      enum: ["owner", "admin", "member", "readonly"],
    })
      .default("member")
      .notNull(),

    // Member status
    status: text("status", {
      enum: ["active", "invited", "suspended"],
    })
      .default("invited")
      .notNull(),

    // Timestamps
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    invitedAt: timestamp("invited_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    invitedBy: text("invited_by"), // References user.id

    // Member-specific settings
    permissions: json("permissions")
      .$type<{
        servers?: {
          read?: boolean;
          write?: boolean;
          delete?: boolean;
        };
        users?: {
          read?: boolean;
          write?: boolean;
          invite?: boolean;
        };
        billing?: {
          read?: boolean;
          write?: boolean;
        };
        settings?: {
          read?: boolean;
          write?: boolean;
        };
      }>()
      .default({}),

    // Access restrictions
    ipWhitelist: json("ip_whitelist").$type<string[]>(),
    lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
  },
  (table) => ({
    tenantUserUniqueIdx: unique("tenant_member_tenant_user_unique_idx").on(table.tenantId, table.userId),
    tenantIdx: index("tenant_member_tenant_idx").on(table.tenantId),
    userIdx: index("tenant_member_user_idx").on(table.userId),
    statusIdx: index("tenant_member_status_idx").on(table.status),
    roleIdx: index("tenant_member_role_idx").on(table.role),
  }),
);

// Tenant invitations for pending memberships
export const tenantInvitation = pgTable(
  "tenant_invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),

    // Invitation details
    email: text("email").notNull(),
    role: text("role", {
      enum: ["admin", "member", "readonly"],
    })
      .default("member")
      .notNull(),

    // Invitation lifecycle
    token: text("token").notNull().unique(),
    status: text("status", {
      enum: ["pending", "accepted", "expired", "revoked"],
    })
      .default("pending")
      .notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    // Who sent the invitation
    invitedBy: text("invited_by").notNull(), // References user.id

    // Optional personal message
    message: text("message"),
  },
  (table) => ({
    tokenUniqueIdx: unique("tenant_invitation_token_unique_idx").on(table.token),
    tenantEmailUniqueIdx: unique("tenant_invitation_tenant_email_unique_idx").on(table.tenantId, table.email),
    tenantIdx: index("tenant_invitation_tenant_idx").on(table.tenantId),
    statusIdx: index("tenant_invitation_status_idx").on(table.status),
    expiresIdx: index("tenant_invitation_expires_idx").on(table.expiresAt),
  }),
);

// Tenant usage tracking for billing and quotas
export const tenantUsage = pgTable(
  "tenant_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),

    // Time period for usage tracking
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

    // Usage metrics
    apiCalls: integer("api_calls").default(0),
    storageBytes: integer("storage_bytes").default(0),
    activeUsers: integer("active_users").default(0),
    activeServers: integer("active_servers").default(0),

    // Detailed breakdown
    usageDetails: json("usage_details")
      .$type<{
        apiCallsByEndpoint?: Record<string, number>;
        storageByType?: Record<string, number>;
        serversByType?: Record<string, number>;
      }>()
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
    tenantPeriodUniqueIdx: unique("tenant_usage_tenant_period_unique_idx").on(table.tenantId, table.periodStart, table.periodEnd),
    tenantIdx: index("tenant_usage_tenant_idx").on(table.tenantId),
    periodIdx: index("tenant_usage_period_idx").on(table.periodStart, table.periodEnd),
  }),
);

// Relations
export const tenantRelations = relations(tenant, ({ many }) => ({
  members: many(tenantMember),
  invitations: many(tenantInvitation),
  usage: many(tenantUsage),
  // Other relations defined in schema/index.ts to avoid circular imports
}));

export const tenantMemberRelations = relations(tenantMember, ({ one }) => ({
  tenant: one(tenant, {
    fields: [tenantMember.tenantId],
    references: [tenant.id],
  }),
}));

export const tenantInvitationRelations = relations(tenantInvitation, ({ one }) => ({
  tenant: one(tenant, {
    fields: [tenantInvitation.tenantId],
    references: [tenant.id],
  }),
}));

export const tenantUsageRelations = relations(tenantUsage, ({ one }) => ({
  tenant: one(tenant, {
    fields: [tenantUsage.tenantId],
    references: [tenant.id],
  }),
}));

// Note: Cross-schema relations are handled in schema/index.ts to avoid circular imports
