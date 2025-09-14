/**
 * Comprehensive JSON Schema Validation for Database Fields
 *
 * This file contains Zod schemas for all JSON fields in the database,
 * ensuring data integrity and type safety at the application level.
 */

import { z } from "zod";

// ============================================================================
// CORE UTILITY SCHEMAS
// ============================================================================

export const LocationInfoSchema = z
  .object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    timezone: z.string().optional(),
    coordinates: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional(),
  })
  .strict();

export const DeviceInfoSchema = z
  .object({
    browser: z.string().optional(),
    os: z.string().optional(),
    device: z.string().optional(),
    type: z.enum(["desktop", "mobile", "tablet"]).optional(),
    isMobile: z.boolean().optional(),
    viewport: z
      .object({
        width: z.number().positive(),
        height: z.number().positive(),
      })
      .optional(),
  })
  .strict();

// ============================================================================
// USER & AUTHENTICATION SCHEMAS
// ============================================================================

export const UserPreferencesSchema = z
  .object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    notifications: z.boolean().optional(),
    language: z.string().min(2).max(5).optional(),
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.enum(["12h", "24h"]).optional(),
  })
  .strict();

export const SessionDeviceInfoSchema = z
  .object({
    browser: z.string().optional(),
    os: z.string().optional(),
    device: z.string().optional(),
    isMobile: z.boolean().optional(),
  })
  .strict();

export const TwoFactorBackupCodesSchema = z.array(z.string().length(8)).max(10);

// ============================================================================
// TENANT & MULTI-TENANCY SCHEMAS
// ============================================================================

export const TenantFeaturesSchema = z
  .object({
    customDomain: z.boolean().optional(),
    sso: z.boolean().optional(),
    advancedAnalytics: z.boolean().optional(),
    prioritySupport: z.boolean().optional(),
    apiAccess: z.boolean().optional(),
    webhooks: z.boolean().optional(),
    auditLogs: z.boolean().optional(),
    multiRegion: z.boolean().optional(),
  })
  .strict();

export const PasswordPolicySchema = z
  .object({
    minLength: z.number().min(6).max(64).optional(),
    maxLength: z.number().min(8).max(128).optional(),
    requireUppercase: z.boolean().optional(),
    requireLowercase: z.boolean().optional(),
    requireNumbers: z.boolean().optional(),
    requireSymbols: z.boolean().optional(),
    preventCommon: z.boolean().optional(),
    preventReuse: z.number().min(0).max(20).optional(),
  })
  .strict();

export const RateLimitConfigSchema = z
  .object({
    api: z.number().positive().optional(),
    login: z.number().positive().optional(),
    registration: z.number().positive().optional(),
    passwordReset: z.number().positive().optional(),
  })
  .strict();

export const BrandingConfigSchema = z
  .object({
    logo: z.string().url().optional(),
    favicon: z.string().url().optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    secondaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    accentColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    fontFamily: z.string().optional(),
    customCss: z.string().optional(),
  })
  .strict();

export const TenantSettingsSchema = z
  .object({
    allowUserRegistration: z.boolean().optional(),
    requireEmailVerification: z.boolean().optional(),
    allowGoogleAuth: z.boolean().optional(),
    allowGithubAuth: z.boolean().optional(),
    sessionTimeout: z.number().positive().max(43200).optional(), // Max 30 days in minutes
    passwordPolicy: PasswordPolicySchema.optional(),
    rateLimits: RateLimitConfigSchema.optional(),
    branding: BrandingConfigSchema.optional(),
    defaultUserRole: z.enum(["user", "server_owner"]).optional(),
    maintenanceMode: z.boolean().optional(),
    customDomainVerified: z.boolean().optional(),
  })
  .strict();

export const TenantMemberPermissionsSchema = z
  .object({
    servers: z
      .object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
        manage: z.boolean().optional(),
      })
      .optional(),
    users: z
      .object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        invite: z.boolean().optional(),
        remove: z.boolean().optional(),
      })
      .optional(),
    billing: z
      .object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
      })
      .optional(),
    settings: z
      .object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
      })
      .optional(),
    audit: z
      .object({
        read: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

export const TenantUsageDetailsSchema = z
  .object({
    apiCallsByEndpoint: z.record(z.string(), z.number().nonnegative()).optional(),
    apiCallsByStatus: z.record(z.string(), z.number().nonnegative()).optional(),
    storageByType: z.record(z.string(), z.number().nonnegative()).optional(),
    serversByType: z.record(z.string(), z.number().nonnegative()).optional(),
    serversByStatus: z.record(z.string(), z.number().nonnegative()).optional(),
    errorsByType: z.record(z.string(), z.number().nonnegative()).optional(),
  })
  .strict();

// ============================================================================
// FEATURE FLAG SCHEMAS
// ============================================================================

export const FeatureFlagConditionSchema = z
  .object({
    attribute: z.string().min(1),
    operator: z.enum(["equals", "not_equals", "in", "not_in", "contains", "starts_with", "ends_with"]),
    value: z.unknown(),
  })
  .strict();

export const FeatureFlagTargetingRuleSchema = z
  .object({
    conditions: z.array(FeatureFlagConditionSchema).min(1),
    value: z.unknown(),
    percentage: z.number().min(0).max(100).optional(),
    description: z.string().optional(),
  })
  .strict();

export const FeatureFlagEnvironmentsSchema = z
  .object({
    development: z.unknown().optional(),
    staging: z.unknown().optional(),
    production: z.unknown().optional(),
    testing: z.unknown().optional(),
  })
  .strict();

export const FeatureFlagEvaluationMetadataSchema = z
  .object({
    ruleIndex: z.number().nonnegative().optional(),
    experiment: z.string().optional(),
    variant: z.string().optional(),
    segmentId: z.string().optional(),
    rolloutPercentage: z.number().min(0).max(100).optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// ============================================================================
// API MANAGEMENT SCHEMAS
// ============================================================================

export const ApiRateLimitRuleSchema = z
  .object({
    path: z.string().optional(),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).optional(),
    rpm: z.number().positive().optional(),
    rph: z.number().positive().optional(),
    rpd: z.number().positive().optional(),
    burst: z.number().positive().optional(),
    windowSize: z.number().positive().optional(),
    description: z.string().optional(),
  })
  .strict();

export const ApiTokenRateLimitSchema = z
  .object({
    rpm: z.number().positive().optional(),
    rph: z.number().positive().optional(),
    rpd: z.number().positive().optional(),
    burst: z.number().positive().optional(),
  })
  .strict();

export const RateLimitViolationMetadataSchema = z
  .object({
    requestId: z.string().optional(),
    responseTime: z.number().nonnegative().optional(),
    severity: z.enum(["low", "medium", "high"]).optional(),
    windowStart: z.string().optional(),
    windowEnd: z.string().optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const ApiUsageMetadataSchema = z
  .object({
    requestId: z.string().optional(),
    traceId: z.string().optional(),
    spanId: z.string().optional(),
    sessionId: z.string().optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const ApiUsageStatusBreakdownSchema = z
  .object({
    "2xx": z.number().nonnegative().optional(),
    "3xx": z.number().nonnegative().optional(),
    "4xx": z.number().nonnegative().optional(),
    "5xx": z.number().nonnegative().optional(),
  })
  .strict();

export const ApiEndpointStatsSchema = z
  .object({
    requests: z.number().nonnegative(),
    errors: z.number().nonnegative(),
    avgResponseTime: z.number().nonnegative(),
    maxResponseTime: z.number().nonnegative().optional(),
    minResponseTime: z.number().nonnegative().optional(),
  })
  .strict();

export const ApiUsageEndpointBreakdownSchema = z.record(z.string(), ApiEndpointStatsSchema);

// ============================================================================
// MCP SERVER SCHEMAS
// ============================================================================

export const McpOAuthConfigSchema = z
  .object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    authUrl: z.string().url().optional(),
    tokenUrl: z.string().url().optional(),
    scope: z.string().optional(),
    redirectUri: z.string().url().optional(),
  })
  .strict();

export const McpAuthConfigSchema = z
  .object({
    apiKey: z.string().optional(),
    bearerToken: z.string().optional(),
    oauth: McpOAuthConfigSchema.optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const McpServerCapabilitiesSchema = z
  .object({
    tools: z
      .object({
        listChanged: z.boolean().optional(),
        progress: z.boolean().optional(),
        cancellation: z.boolean().optional(),
      })
      .optional(),
    resources: z
      .object({
        subscribe: z.boolean().optional(),
        listChanged: z.boolean().optional(),
        templates: z.boolean().optional(),
      })
      .optional(),
    prompts: z
      .object({
        listChanged: z.boolean().optional(),
        arguments: z.boolean().optional(),
      })
      .optional(),
    logging: z
      .object({
        level: z.enum(["debug", "info", "warn", "error"]).optional(),
        structured: z.boolean().optional(),
      })
      .optional(),
    experimental: z.record(z.string(), z.unknown()).optional(),
    sampling: z
      .object({
        enabled: z.boolean().optional(),
        rate: z.number().min(0).max(1).optional(),
      })
      .optional(),
  })
  .strict();

export const McpServerSettingsSchema = z
  .object({
    timeout: z.number().positive().optional(),
    retryPolicy: z
      .object({
        maxRetries: z.number().nonnegative().optional(),
        backoffMs: z.number().positive().optional(),
        exponential: z.boolean().optional(),
        maxBackoffMs: z.number().positive().optional(),
        jitter: z.boolean().optional(),
      })
      .optional(),
    rateLimit: z
      .object({
        rpm: z.number().positive().optional(),
        burst: z.number().positive().optional(),
        window: z.number().positive().optional(),
      })
      .optional(),
    caching: z
      .object({
        enabled: z.boolean().optional(),
        ttlSeconds: z.number().positive().optional(),
        maxSize: z.number().positive().optional(),
        strategy: z.enum(["lru", "lfu", "ttl"]).optional(),
      })
      .optional(),
    logging: z
      .object({
        enabled: z.boolean().optional(),
        level: z.enum(["debug", "info", "warn", "error"]).optional(),
        structured: z.boolean().optional(),
        destination: z.enum(["console", "file", "remote"]).optional(),
      })
      .optional(),
    healthCheck: z
      .object({
        enabled: z.boolean().optional(),
        intervalSeconds: z.number().positive().optional(),
        timeoutMs: z.number().positive().optional(),
        retries: z.number().nonnegative().optional(),
      })
      .optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const McpToolInputSchemaSchema = z
  .object({
    type: z.string().min(1),
    properties: z.record(z.string(), z.unknown()).optional(),
    required: z.array(z.string()).optional(),
    additionalProperties: z.boolean().optional(),
    description: z.string().optional(),
  })
  .strict();

export const McpResourceAnnotationsSchema = z
  .object({
    audience: z.array(z.string()).optional(),
    priority: z.number().optional(),
    tags: z.array(z.string()).optional(),
    cacheable: z.boolean().optional(),
    sensitive: z.boolean().optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const McpPromptArgumentSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.string().optional(),
    required: z.boolean().optional(),
    default: z.unknown().optional(),
    enum: z.array(z.unknown()).optional(),
    pattern: z.string().optional(),
  })
  .strict();

export const McpHealthMetricsSchema = z
  .object({
    cpu: z.number().min(0).max(100).optional(),
    memory: z.number().min(0).max(100).optional(),
    uptime: z.number().nonnegative().optional(),
    version: z.string().optional(),
    requestsPerMinute: z.number().nonnegative().optional(),
    errorRate: z.number().min(0).max(100).optional(),
    responseTime: z.number().nonnegative().optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// ============================================================================
// AUDIT & LOGGING SCHEMAS
// ============================================================================

export const AuditLogChangesSchema = z
  .object({
    before: z.record(z.string(), z.unknown()).optional(),
    after: z.record(z.string(), z.unknown()).optional(),
    fields: z.array(z.string()).optional(),
    changeType: z.enum(["create", "update", "delete", "restore"]).optional(),
    changeReason: z.string().optional(),
  })
  .strict();

export const AuditLogMetadataSchema = z
  .object({
    location: LocationInfoSchema.optional(),
    device: DeviceInfoSchema.optional(),
    requestId: z.string().optional(),
    traceId: z.string().optional(),
    spanId: z.string().optional(),
    correlationId: z.string().optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const SystemEventDataSchema = z
  .object({
    component: z.string().optional(),
    version: z.string().optional(),
    environment: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    affectedServices: z.array(z.string()).optional(),
    metrics: z.record(z.string(), z.unknown()).optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const SecurityEventDetailsSchema = z
  .object({
    failedAttempts: z.number().nonnegative().optional(),
    timeWindow: z.string().optional(),
    patterns: z.array(z.string()).optional(),
    riskScore: z.number().min(0).max(10).optional(),
    threatType: z.string().optional(),
    mitigationActions: z.array(z.string()).optional(),
    geolocation: LocationInfoSchema.optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// ============================================================================
// SYSTEM CONFIGURATION SCHEMAS
// ============================================================================

export const SystemConfigValidationSchemaSchema: z.ZodType<{
  type?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  required?: boolean;
  format?: string;
  items?: unknown;
}> = z.lazy(() =>
  z
    .object({
      type: z.string().optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      minLength: z.number().nonnegative().optional(),
      maxLength: z.number().nonnegative().optional(),
      pattern: z.string().optional(),
      enum: z.array(z.unknown()).optional(),
      required: z.boolean().optional(),
      format: z.string().optional(),
      items: SystemConfigValidationSchemaSchema.optional(),
    })
    .strict(),
);

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validates JSON field data against its schema
 */
export function validateJsonField<T>(data: unknown, schema: z.ZodSchema<T>, fieldName: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error(`Invalid JSON data for field ${fieldName}: ${error}`);
  }
}

/**
 * Safely parses and validates JSON field data
 */
export function safeValidateJsonField<T>(data: unknown, schema: z.ZodSchema<T>, fallback?: T): T | null {
  try {
    return schema.parse(data);
  } catch {
    return fallback ?? null;
  }
}

// ============================================================================
// SCHEMA REGISTRY FOR RUNTIME VALIDATION
// ============================================================================

export const JSON_FIELD_SCHEMAS = {
  // User & Auth
  "user.preferences": UserPreferencesSchema,
  "user.backup_codes": TwoFactorBackupCodesSchema,
  "session.device_info": SessionDeviceInfoSchema,
  "two_factor_auth.backup_codes": TwoFactorBackupCodesSchema,

  // Tenant
  "tenant.features": TenantFeaturesSchema,
  "tenant.settings": TenantSettingsSchema,
  "tenant_member.permissions": TenantMemberPermissionsSchema,
  "tenant_usage.usage_details": TenantUsageDetailsSchema,

  // Feature Flags
  "feature_flag.targeting_rules": z.array(FeatureFlagTargetingRuleSchema),
  "feature_flag.environments": FeatureFlagEnvironmentsSchema,
  "feature_flag_evaluation.metadata": FeatureFlagEvaluationMetadataSchema,

  // API Management
  "rate_limit_config.rules": z.array(ApiRateLimitRuleSchema),
  "api_token.rate_limit": ApiTokenRateLimitSchema,
  "rate_limit_violation.metadata": RateLimitViolationMetadataSchema,
  "api_usage.metadata": ApiUsageMetadataSchema,
  "api_usage_stats.status_breakdown": ApiUsageStatusBreakdownSchema,
  "api_usage_stats.endpoint_breakdown": ApiUsageEndpointBreakdownSchema,

  // MCP Server
  "mcp_server.auth_config": McpAuthConfigSchema,
  "mcp_server.capabilities": McpServerCapabilitiesSchema,
  "mcp_server.settings": McpServerSettingsSchema,
  "mcp_tool.input_schema": McpToolInputSchemaSchema,
  "mcp_resource.annotations": McpResourceAnnotationsSchema,
  "mcp_prompt.arguments": z.array(McpPromptArgumentSchema),
  "mcp_server_health_check.metrics": McpHealthMetricsSchema,

  // Audit & Logging
  "audit_log.changes": AuditLogChangesSchema,
  "audit_log.metadata": AuditLogMetadataSchema,
  "system_event.data": SystemEventDataSchema,
  "security_event.details": SecurityEventDetailsSchema,

  // System Config
  "system_config.validation_schema": SystemConfigValidationSchemaSchema,
} as const;

export type JsonFieldSchemas = typeof JSON_FIELD_SCHEMAS;
export type JsonFieldName = keyof JsonFieldSchemas;
