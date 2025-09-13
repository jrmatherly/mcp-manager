import { z } from "zod";

// Transport types enum
export const transportTypes = ["http", "websocket", "stdio", "sse"] as const;
export const authTypes = ["none", "bearer", "api_key", "oauth", "custom"] as const;
export const serverStatus = ["active", "inactive", "error", "maintenance"] as const;
export const healthStatus = ["healthy", "unhealthy", "unknown"] as const;

// Base server configuration schema
export const mcpServerConfigSchema = z.object({
  name: z.string().min(1, "Server name is required").max(100, "Server name too long"),
  description: z.string().optional(),
  version: z.string().min(1, "Server version is required").max(50, "Version too long"),

  // Connection details
  endpointUrl: z.string().url({ message: "Invalid endpoint URL" }),
  transportType: z.enum(transportTypes),

  // Authentication
  authType: z.enum(authTypes).default("none"),
  authConfig: z
    .object({
      apiKey: z.string().optional(),
      bearerToken: z.string().optional(),
      oauth: z
        .object({
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          scope: z.string().optional(),
        })
        .optional(),
      custom: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),

  // Server metadata
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  isPublic: z.boolean().default(false),

  // Configuration settings
  settings: z
    .object({
      timeout: z.number().min(1000).max(300000).optional(), // 1s - 5min
      retryPolicy: z
        .object({
          maxRetries: z.number().min(0).max(10).optional(),
          backoffMs: z.number().min(100).max(60000).optional(),
          exponential: z.boolean().optional(),
        })
        .optional(),
      rateLimit: z
        .object({
          rpm: z.number().min(1).max(10000).optional(),
          burst: z.number().min(1).max(1000).optional(),
        })
        .optional(),
      caching: z
        .object({
          enabled: z.boolean().optional(),
          ttlSeconds: z.number().min(60).max(86400).optional(), // 1min - 24h
        })
        .optional(),
      logging: z
        .object({
          enabled: z.boolean().optional(),
          level: z.enum(["debug", "info", "warn", "error"]).optional(),
        })
        .optional(),
    })
    .optional(),

  // Health check configuration
  healthCheckInterval: z.number().min(60).max(3600).default(300), // 1min - 1hour
});

// Server creation schema (POST)
export const createServerSchema = mcpServerConfigSchema;

// Server update schema (PUT)
export const updateServerSchema = mcpServerConfigSchema.partial();

// Server query parameters schema
export const serverQuerySchema = z.object({
  status: z.enum([...serverStatus, "all"]).optional(),
  transportType: z.enum([...transportTypes, "all"]).optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(["name", "createdAt", "updatedAt", "lastUsedAt", "requestCount"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Health check request schema
export const healthCheckSchema = z.object({
  timeout: z.number().min(1000).max(30000).default(5000),
});

// Server response schema (for documentation)
export const serverResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  version: z.string(),
  endpointUrl: z.string(),
  transportType: z.enum(transportTypes),
  authType: z.enum(authTypes),
  authConfig: z
    .object({
      apiKey: z.string().optional(),
      bearerToken: z.string().optional(),
      oauth: z
        .object({
          clientId: z.string().optional(),
          clientSecret: z.string().optional(),
          scope: z.string().optional(),
        })
        .optional(),
      custom: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  status: z.enum(serverStatus),
  healthStatus: z.enum(healthStatus),
  lastHealthCheck: z.string().datetime({ offset: true }).nullable(),
  healthCheckInterval: z.number(),
  capabilities: z.record(z.string(), z.unknown()),
  tags: z.array(z.string()),
  category: z.string().nullable(),
  tenantId: z.string().nullable(),
  ownerId: z.string(),
  isPublic: z.boolean(),
  requestCount: z.number(),
  errorCount: z.number(),
  avgResponseTime: z.string().nullable(),
  uptime: z.string(),
  settings: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  lastUsedAt: z.string().datetime({ offset: true }).nullable(),
});

// API response schemas
export const serverListResponseSchema = z.object({
  servers: z.array(serverResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export const healthCheckResponseSchema = z.object({
  status: z.enum(["healthy", "unhealthy", "timeout", "error"]),
  responseTime: z.number().nullable(),
  errorMessage: z.string().nullable(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  checkedAt: z.string().datetime({ offset: true }),
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

// Type exports
export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>;
export type CreateServerRequest = z.infer<typeof createServerSchema>;
export type UpdateServerRequest = z.infer<typeof updateServerSchema>;
export type ServerQuery = z.infer<typeof serverQuerySchema>;
export type HealthCheckRequest = z.infer<typeof healthCheckSchema>;
export type ServerResponse = z.infer<typeof serverResponseSchema>;
export type ServerListResponse = z.infer<typeof serverListResponseSchema>;
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
