/**
 * Authentication and user management schema for Better-Auth integration
 *
 * This schema maintains compatibility with Better-Auth expected table structure
 * while extending with enterprise features like multi-tenancy and RBAC.
 */

import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, json, uuid, index, unique } from "drizzle-orm/pg-core";

// Core Better-Auth compatible user table
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified")
      .$defaultFn(() => false)
      .notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),

    // Extended fields for enterprise features
    role: text("role", { enum: ["admin", "server_owner", "user"] })
      .default("user")
      .notNull(),
    tenantId: text("tenant_id"), // Multi-tenancy support
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    // Ban/suspension features
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),

    // User preferences
    preferences: json("preferences")
      .$type<{
        theme?: "light" | "dark" | "system";
        notifications?: boolean;
        language?: string;
      }>()
      .default({}),

    // Two-factor authentication
    twoFactorEnabled: boolean("two_factor_enabled").default(false),
    backupCodes: json("backup_codes").$type<string[]>(),

    // Terms and privacy
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index("user_email_idx").on(table.email),
    tenantIdx: index("user_tenant_idx").on(table.tenantId),
    roleIdx: index("user_role_idx").on(table.role),
    activeIdx: index("user_active_idx").on(table.isActive),
    lastLoginIdx: index("user_last_login_idx").on(table.lastLoginAt),
  }),
);

// Better-Auth compatible session table
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Extended session fields
    impersonatedBy: text("impersonated_by"),
    deviceInfo: json("device_info").$type<{
      browser?: string;
      os?: string;
      device?: string;
      isMobile?: boolean;
    }>(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),

    // Security features
    isRevoked: boolean("is_revoked").default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
  },
  (table) => ({
    userIdx: index("session_user_idx").on(table.userId),
    tokenIdx: index("session_token_idx").on(table.token),
    expiresIdx: index("session_expires_idx").on(table.expiresAt),
    activeIdx: index("session_active_idx").on(table.isRevoked),
    lastActivityIdx: index("session_last_activity_idx").on(table.lastActivityAt),
  }),
);

// Better-Auth compatible account table (OAuth providers)
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"), // For credential-based auth
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),

    // Extended OAuth fields
    tokenType: text("token_type"),
    providerAccountId: text("provider_account_id"),
    refreshTokenRotationEnabled: boolean("refresh_token_rotation_enabled").default(true),
  },
  (table) => ({
    userIdx: index("account_user_idx").on(table.userId),
    providerIdx: index("account_provider_idx").on(table.providerId, table.accountId),
    uniqueProviderAccount: unique("account_provider_account_unique").on(table.providerId, table.accountId),
  }),
);

// Better-Auth compatible verification table
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$defaultFn(() => new Date()),

    // Extended verification fields
    type: text("type", { enum: ["email", "phone", "password_reset", "two_factor"] }).notNull(),
    attempts: text("attempts").default("0"),
    maxAttempts: text("max_attempts").default("3"),
    isUsed: boolean("is_used").default(false),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
    typeIdx: index("verification_type_idx").on(table.type),
    expiresIdx: index("verification_expires_idx").on(table.expiresAt),
    usedIdx: index("verification_used_idx").on(table.isUsed),
  }),
);

// Two-factor authentication table
export const twoFactorAuth = pgTable(
  "two_factor_auth",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(), // Encrypted TOTP secret
    enabled: boolean("enabled").default(false).notNull(),
    backupCodes: json("backup_codes").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    enabledAt: timestamp("enabled_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx: unique("two_factor_user_unique").on(table.userId),
    enabledIdx: index("two_factor_enabled_idx").on(table.enabled),
  }),
);

// User permissions table for fine-grained access control
export const userPermission = pgTable(
  "user_permission",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(), // e.g., "servers.read", "servers.write"
    resource: text("resource"), // Optional resource ID for object-level permissions
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    grantedBy: text("granted_by").references(() => user.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    userPermissionIdx: index("user_permission_user_idx").on(table.userId),
    permissionIdx: index("user_permission_permission_idx").on(table.permission),
    resourceIdx: index("user_permission_resource_idx").on(table.resource),
    expiresIdx: index("user_permission_expires_idx").on(table.expiresAt),
    uniqueUserPermission: unique("user_permission_unique").on(table.userId, table.permission, table.resource),
  }),
);

// Relations for Better-Auth compatibility and extended features
export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  twoFactorAuth: one(twoFactorAuth),
  permissions: many(userPermission),
  // tenant relation defined in schema/index.ts to avoid circular imports
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const twoFactorAuthRelations = relations(twoFactorAuth, ({ one }) => ({
  user: one(user, {
    fields: [twoFactorAuth.userId],
    references: [user.id],
  }),
}));

export const userPermissionRelations = relations(userPermission, ({ one }) => ({
  user: one(user, {
    fields: [userPermission.userId],
    references: [user.id],
  }),
  grantedByUser: one(user, {
    fields: [userPermission.grantedBy],
    references: [user.id],
  }),
}));

// Note: tenant relation is handled in schema/index.ts to avoid circular imports
