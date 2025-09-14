/**
 * Centralized Database Type Definitions
 *
 * This file contains all TypeScript type definitions for JSON fields
 * and complex data structures used throughout the database schema.
 * These types replace 'any' types and provide proper type safety.
 */

// ============================================================================
// CORE UTILITY TYPES
// ============================================================================

/** Generic record type for flexible object structures */
export type GenericRecord = Record<string, unknown>;

/** Geographic location information */
export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/** Device and browser information */
export interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  type?: "desktop" | "mobile" | "tablet";
  isMobile?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
}

/** HTTP request/response context */
export interface HttpContext {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  statusCode?: number;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
}

// ============================================================================
// AUTHENTICATION & USER TYPES
// ============================================================================

/** API key permissions for different resources */
export interface ApiKeyPermissions {
  servers?: ("read" | "write" | "admin")[];
  registry?: ("read" | "write" | "admin")[];
  admin?: ("read" | "write" | "full")[];
}

/** API key metadata configuration */
export interface ApiKeyMetadata {
  name?: string;
  description?: string;
  lastUsed?: string;
  permissions?: ApiKeyPermissions;
  owner?: string;
  environment?: "development" | "staging" | "production";
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  allowedIps?: string[];
  custom?: GenericRecord;
}

/** User preferences configuration */
export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  notifications?: boolean;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: "12h" | "24h";
}

/** Session device information */
export interface SessionDeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  isMobile?: boolean;
}

// ============================================================================
// TENANT & MULTI-TENANCY TYPES
// ============================================================================

/** Tenant feature flags configuration */
export interface TenantFeatures {
  customDomain?: boolean;
  sso?: boolean;
  advancedAnalytics?: boolean;
  prioritySupport?: boolean;
  apiAccess?: boolean;
  webhooks?: boolean;
  auditLogs?: boolean;
  multiRegion?: boolean;
}

/** Password policy configuration */
export interface PasswordPolicy {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
  preventCommon?: boolean;
  preventReuse?: number; // Number of previous passwords to check
}

/** Rate limiting configuration */
export interface RateLimitConfig {
  api?: number; // requests per minute
  login?: number; // attempts per hour
  registration?: number; // attempts per day
  passwordReset?: number; // attempts per hour
}

/** Branding configuration */
export interface BrandingConfig {
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string;
}

/** Comprehensive tenant settings */
export interface TenantSettings {
  allowUserRegistration?: boolean;
  requireEmailVerification?: boolean;
  allowGoogleAuth?: boolean;
  allowGithubAuth?: boolean;
  sessionTimeout?: number; // minutes
  passwordPolicy?: PasswordPolicy;
  rateLimits?: RateLimitConfig;
  branding?: BrandingConfig;
  defaultUserRole?: "user" | "server_owner";
  maintenanceMode?: boolean;
  customDomainVerified?: boolean;
}

/** Tenant member permissions */
export interface TenantMemberPermissions {
  servers?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    manage?: boolean;
  };
  users?: {
    read?: boolean;
    write?: boolean;
    invite?: boolean;
    remove?: boolean;
  };
  billing?: {
    read?: boolean;
    write?: boolean;
  };
  settings?: {
    read?: boolean;
    write?: boolean;
  };
  audit?: {
    read?: boolean;
  };
}

/** Tenant usage breakdown details */
export interface TenantUsageDetails {
  apiCallsByEndpoint?: Record<string, number>;
  apiCallsByStatus?: Record<string, number>;
  storageByType?: Record<string, number>;
  serversByType?: Record<string, number>;
  serversByStatus?: Record<string, number>;
  errorsByType?: Record<string, number>;
}

// ============================================================================
// FEATURE FLAG TYPES
// ============================================================================

/** Feature flag targeting condition */
export interface FeatureFlagCondition {
  attribute: string; // user.role, tenant.planType, etc.
  operator: "equals" | "not_equals" | "in" | "not_in" | "contains" | "starts_with" | "ends_with";
  value: unknown;
}

/** Feature flag targeting rule */
export interface FeatureFlagTargetingRule {
  conditions: FeatureFlagCondition[];
  value: unknown;
  percentage?: number; // 0-100
  description?: string;
}

/** Feature flag environment configurations */
export interface FeatureFlagEnvironments {
  development?: unknown;
  staging?: unknown;
  production?: unknown;
  testing?: unknown;
}

/** Feature flag evaluation metadata */
export interface FeatureFlagEvaluationMetadata {
  ruleIndex?: number;
  experiment?: string;
  variant?: string;
  segmentId?: string;
  rolloutPercentage?: number;
  custom?: GenericRecord;
}

// ============================================================================
// AUDIT & LOGGING TYPES
// ============================================================================

/** Audit log change tracking */
export interface AuditLogChanges {
  before?: GenericRecord;
  after?: GenericRecord;
  fields?: string[];
  changeType?: "create" | "update" | "delete" | "restore";
  changeReason?: string;
}

/** Audit log metadata */
export interface AuditLogMetadata {
  location?: LocationInfo;
  device?: DeviceInfo;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  custom?: GenericRecord;
}

/** Error log HTTP context */
export interface ErrorLogHttpContext {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  query?: GenericRecord;
  body?: unknown;
  statusCode?: number;
  responseTime?: number;
}

/** System event data */
export interface SystemEventData {
  component?: string;
  version?: string;
  environment?: string;
  severity?: "low" | "medium" | "high" | "critical";
  affectedServices?: string[];
  metrics?: GenericRecord;
  custom?: GenericRecord;
}

/** Security event details */
export interface SecurityEventDetails {
  failedAttempts?: number;
  timeWindow?: string;
  patterns?: string[];
  riskScore?: number;
  threatType?: string;
  mitigationActions?: string[];
  geolocation?: LocationInfo;
  custom?: GenericRecord;
}

// ============================================================================
// API MANAGEMENT TYPES
// ============================================================================

/** API rate limiting rules */
export interface ApiRateLimitRule {
  path?: string; // API path pattern (e.g., "/api/servers/*")
  method?: string; // HTTP method
  rpm?: number; // requests per minute
  rph?: number; // requests per hour
  rpd?: number; // requests per day
  burst?: number; // burst capacity
  windowSize?: number; // sliding window size in seconds
  description?: string;
}

/** API token rate limiting override */
export interface ApiTokenRateLimit {
  rpm?: number; // requests per minute
  rph?: number; // requests per hour
  rpd?: number; // requests per day
  burst?: number; // burst capacity
}

/** Rate limit violation metadata */
export interface RateLimitViolationMetadata {
  requestId?: string;
  responseTime?: number;
  severity?: "low" | "medium" | "high";
  windowStart?: string;
  windowEnd?: string;
  custom?: GenericRecord;
}

/** API usage metadata */
export interface ApiUsageMetadata {
  requestId?: string;
  traceId?: string;
  spanId?: string;
  sessionId?: string;
  custom?: GenericRecord;
}

/** API usage status breakdown */
export interface ApiUsageStatusBreakdown {
  "2xx"?: number;
  "3xx"?: number;
  "4xx"?: number;
  "5xx"?: number;
}

/** API usage endpoint statistics */
export interface ApiEndpointStats {
  requests: number;
  errors: number;
  avgResponseTime: number;
  maxResponseTime?: number;
  minResponseTime?: number;
}

/** API usage endpoint breakdown */
export interface ApiUsageEndpointBreakdown {
  [endpoint: string]: ApiEndpointStats;
}

// ============================================================================
// MCP SERVER TYPES
// ============================================================================

/** OAuth configuration for MCP servers */
export interface McpOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  authUrl?: string;
  tokenUrl?: string;
  scope?: string;
  redirectUri?: string;
}

/** MCP server authentication configuration */
export interface McpAuthConfig {
  apiKey?: string;
  bearerToken?: string;
  oauth?: McpOAuthConfig;
  custom?: GenericRecord;
}

/** MCP server tool capabilities */
export interface McpToolCapabilities {
  listChanged?: boolean;
  progress?: boolean;
  cancellation?: boolean;
}

/** MCP server resource capabilities */
export interface McpResourceCapabilities {
  subscribe?: boolean;
  listChanged?: boolean;
  templates?: boolean;
}

/** MCP server prompt capabilities */
export interface McpPromptCapabilities {
  listChanged?: boolean;
  arguments?: boolean;
}

/** MCP server logging capabilities */
export interface McpLoggingCapabilities {
  level?: "debug" | "info" | "warn" | "error";
  structured?: boolean;
}

/** MCP server capabilities configuration */
export interface McpServerCapabilities {
  tools?: McpToolCapabilities;
  resources?: McpResourceCapabilities;
  prompts?: McpPromptCapabilities;
  logging?: McpLoggingCapabilities;
  experimental?: GenericRecord;
  sampling?: {
    enabled?: boolean;
    rate?: number;
  };
}

/** MCP server retry policy */
export interface McpRetryPolicy {
  maxRetries?: number;
  backoffMs?: number;
  exponential?: boolean;
  maxBackoffMs?: number;
  jitter?: boolean;
}

/** MCP server rate limiting */
export interface McpServerRateLimit {
  rpm?: number; // requests per minute
  burst?: number;
  window?: number; // seconds
}

/** MCP server caching configuration */
export interface McpCachingConfig {
  enabled?: boolean;
  ttlSeconds?: number;
  maxSize?: number; // max cached items
  strategy?: "lru" | "lfu" | "ttl";
}

/** MCP server logging configuration */
export interface McpLoggingConfig {
  enabled?: boolean;
  level?: "debug" | "info" | "warn" | "error";
  structured?: boolean;
  destination?: "console" | "file" | "remote";
}

/** MCP server settings */
export interface McpServerSettings {
  timeout?: number; // milliseconds
  retryPolicy?: McpRetryPolicy;
  rateLimit?: McpServerRateLimit;
  caching?: McpCachingConfig;
  logging?: McpLoggingConfig;
  healthCheck?: {
    enabled?: boolean;
    intervalSeconds?: number;
    timeoutMs?: number;
    retries?: number;
  };
  custom?: GenericRecord;
}

/** MCP tool input schema */
export interface McpToolInputSchema {
  type: string;
  properties?: GenericRecord;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
}

/** MCP resource annotations */
export interface McpResourceAnnotations {
  audience?: string[];
  priority?: number;
  tags?: string[];
  cacheable?: boolean;
  sensitive?: boolean;
  custom?: GenericRecord;
}

/** MCP prompt argument definition */
export interface McpPromptArgument {
  name: string;
  description?: string;
  type?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  pattern?: string;
}

/** MCP server health check metrics */
export interface McpHealthMetrics {
  cpu?: number; // percentage
  memory?: number; // percentage
  uptime?: number; // seconds
  version?: string;
  requestsPerMinute?: number;
  errorRate?: number; // percentage
  responseTime?: number; // milliseconds
  custom?: GenericRecord;
}

// ============================================================================
// SYSTEM CONFIGURATION TYPES
// ============================================================================

/** System configuration validation schema */
export interface SystemConfigValidationSchema {
  type?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  required?: boolean;
  format?: string;
  items?: SystemConfigValidationSchema;
}

// ============================================================================
// TYPE EXPORTS FOR DATABASE OPERATIONS
// ============================================================================

/** Database connection type for seed operations */
export type DatabaseConnection = {
  insert: (table: unknown) => {
    values: (values: unknown) => {
      onConflictDoNothing: () => Promise<unknown>;
    };
  };
  // Add other database operation types as needed
};

// Re-export commonly used types for convenience
export type { GenericRecord as JsonRecord, LocationInfo as Location, DeviceInfo as Device };
