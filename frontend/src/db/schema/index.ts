/**
 * Drizzle ORM Schema Index
 *
 * Consolidates all schema definitions for the MCP Registry Gateway.
 * Exports all tables, relations, and types for use throughout the application.
 */

import { relations } from "drizzle-orm";

// Authentication and user management
export * from "./auth";

// Multi-tenancy support
export * from "./tenant";

// MCP server and resource management
export * from "./mcp";

// API tokens and rate limiting
export * from "./api";

// Audit logging and compliance
export * from "./audit";

// System administration and configuration
export * from "./admin";

// Type exports for inference
import { user, session, account, verification, twoFactorAuth, userPermission } from "./auth";
import { tenant, tenantMember, tenantInvitation, tenantUsage } from "./tenant";
import { mcpServer, mcpTool, mcpResource, mcpPrompt, mcpServerDependency, mcpServerHealthCheck } from "./mcp";
import { apiToken, rateLimitConfig, rateLimitViolation, apiUsage, apiUsageStats } from "./api";
import { auditLog, errorLog, systemEvent, securityEvent } from "./audit";
import {
  systemConfig,
  featureFlag,
  featureFlagEvaluation,
  maintenanceWindow,
  systemAnnouncement,
  announcementAcknowledgment,
} from "./admin";

// Cross-schema relations to avoid circular imports
export const crossSchemaRelations = relations(user, ({ one }) => ({
  tenant: one(tenant, {
    fields: [user.tenantId],
    references: [tenant.id],
  }),
}));

export const tenantCrossRelations = relations(tenant, ({ many }) => ({
  users: many(user),
  servers: many(mcpServer),
  apiTokens: many(apiToken),
  auditLogs: many(auditLog),
  errorLogs: many(errorLog),
  systemEvents: many(systemEvent),
  securityEvents: many(securityEvent),
}));

export const mcpServerCrossRelations = relations(mcpServer, ({ one }) => ({
  tenant: one(tenant, {
    fields: [mcpServer.tenantId],
    references: [tenant.id],
  }),
}));

export const apiTokenCrossRelations = relations(apiToken, ({ one }) => ({
  tenant: one(tenant, {
    fields: [apiToken.tenantId],
    references: [tenant.id],
  }),
}));

export const apiUsageCrossRelations = relations(apiUsage, ({ one }) => ({
  server: one(mcpServer, {
    fields: [apiUsage.serverId],
    references: [mcpServer.id],
  }),
}));

export const apiUsageStatsCrossRelations = relations(apiUsageStats, ({ one }) => ({
  server: one(mcpServer, {
    fields: [apiUsageStats.serverId],
    references: [mcpServer.id],
  }),
  tenant: one(tenant, {
    fields: [apiUsageStats.tenantId],
    references: [tenant.id],
  }),
}));

export const auditLogCrossRelations = relations(auditLog, ({ one }) => ({
  tenant: one(tenant, {
    fields: [auditLog.tenantId],
    references: [tenant.id],
  }),
}));

export const errorLogCrossRelations = relations(errorLog, ({ one }) => ({
  tenant: one(tenant, {
    fields: [errorLog.tenantId],
    references: [tenant.id],
  }),
}));

export const systemEventCrossRelations = relations(systemEvent, ({ one }) => ({
  tenant: one(tenant, {
    fields: [systemEvent.tenantId],
    references: [tenant.id],
  }),
}));

export const securityEventCrossRelations = relations(securityEvent, ({ one }) => ({
  tenant: one(tenant, {
    fields: [securityEvent.tenantId],
    references: [tenant.id],
  }),
}));

// Complete schema object for Drizzle
export const schema = {
  // Authentication tables
  user,
  session,
  account,
  verification,
  twoFactorAuth,
  userPermission,

  // Tenant tables
  tenant,
  tenantMember,
  tenantInvitation,
  tenantUsage,

  // MCP tables
  mcpServer,
  mcpTool,
  mcpResource,
  mcpPrompt,
  mcpServerDependency,
  mcpServerHealthCheck,

  // API tables
  apiToken,
  rateLimitConfig,
  rateLimitViolation,
  apiUsage,
  apiUsageStats,

  // Audit tables
  auditLog,
  errorLog,
  systemEvent,
  securityEvent,

  // Admin tables
  systemConfig,
  featureFlag,
  featureFlagEvaluation,
  maintenanceWindow,
  systemAnnouncement,
  announcementAcknowledgment,

  // Cross-schema relations
  crossSchemaRelations,
  tenantCrossRelations,
  mcpServerCrossRelations,
  apiTokenCrossRelations,
  apiUsageCrossRelations,
  apiUsageStatsCrossRelations,
  auditLogCrossRelations,
  errorLogCrossRelations,
  systemEventCrossRelations,
  securityEventCrossRelations,
};

// Type inference helpers
export type Schema = typeof schema;

// Table type exports for better TypeScript support
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;
export type TenantMember = typeof tenantMember.$inferSelect;
export type NewTenantMember = typeof tenantMember.$inferInsert;

export type McpServer = typeof mcpServer.$inferSelect;
export type NewMcpServer = typeof mcpServer.$inferInsert;
export type McpTool = typeof mcpTool.$inferSelect;
export type NewMcpTool = typeof mcpTool.$inferInsert;
export type McpResource = typeof mcpResource.$inferSelect;
export type NewMcpResource = typeof mcpResource.$inferInsert;
export type McpPrompt = typeof mcpPrompt.$inferSelect;
export type NewMcpPrompt = typeof mcpPrompt.$inferInsert;

export type ApiToken = typeof apiToken.$inferSelect;
export type NewApiToken = typeof apiToken.$inferInsert;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type NewApiUsage = typeof apiUsage.$inferInsert;

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type ErrorLog = typeof errorLog.$inferSelect;
export type NewErrorLog = typeof errorLog.$inferInsert;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;
export type FeatureFlag = typeof featureFlag.$inferSelect;
export type NewFeatureFlag = typeof featureFlag.$inferInsert;
