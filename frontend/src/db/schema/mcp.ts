/**
 * MCP (Model Context Protocol) server and resource management schema
 *
 * Handles MCP server registration, tools, resources, prompts,
 * and their relationships within the registry system.
 */

import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, json, uuid, integer, index, unique, decimal } from "drizzle-orm/pg-core";

// MCP Server registry
export const mcpServer = pgTable(
  "mcp_server",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    version: text("version").notNull(),

    // Server connection details
    endpointUrl: text("endpoint_url").notNull(),
    transportType: text("transport_type", {
      enum: ["http", "websocket", "stdio", "sse"],
    }).notNull(),

    // Authentication and security
    authType: text("auth_type", {
      enum: ["none", "bearer", "api_key", "oauth", "custom"],
    })
      .default("none")
      .notNull(),
    authConfig: json("auth_config").$type<{
      apiKey?: string;
      bearerToken?: string;
      oauth?: {
        clientId?: string;
        clientSecret?: string;
        scope?: string;
      };
      custom?: Record<string, unknown>;
    }>(),

    // Server status and health
    status: text("status", {
      enum: ["active", "inactive", "error", "maintenance"],
    })
      .default("inactive")
      .notNull(),
    healthStatus: text("health_status", {
      enum: ["healthy", "unhealthy", "unknown"],
    })
      .default("unknown")
      .notNull(),
    lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
    healthCheckInterval: integer("health_check_interval").default(300), // seconds

    // Server capabilities and configuration
    capabilities: json("capabilities")
      .$type<{
        tools?: {
          listChanged?: boolean;
          progress?: boolean;
        };
        resources?: {
          subscribe?: boolean;
          listChanged?: boolean;
        };
        prompts?: {
          listChanged?: boolean;
        };
        logging?: {
          level?: string;
        };
        experimental?: Record<string, unknown>;
      }>()
      .default({}),

    // Server metadata and organization
    tags: json("tags").$type<string[]>().default([]),
    category: text("category"), // e.g., "ai", "data", "productivity"

    // Multi-tenancy and ownership
    tenantId: text("tenant_id"), // null for global/public servers
    ownerId: text("owner_id").notNull(), // References user.id
    isPublic: boolean("is_public").default(false),

    // Usage and performance metrics
    requestCount: integer("request_count").default(0),
    errorCount: integer("error_count").default(0),
    avgResponseTime: decimal("avg_response_time", { precision: 10, scale: 3 }),
    uptime: decimal("uptime", { precision: 5, scale: 2 }).default("100.00"),

    // Configuration and settings
    settings: json("settings")
      .$type<{
        timeout?: number; // milliseconds
        retryPolicy?: {
          maxRetries?: number;
          backoffMs?: number;
          exponential?: boolean;
        };
        rateLimit?: {
          rpm?: number; // requests per minute
          burst?: number;
        };
        caching?: {
          enabled?: boolean;
          ttlSeconds?: number;
        };
        logging?: {
          enabled?: boolean;
          level?: "debug" | "info" | "warn" | "error";
        };
      }>()
      .default({}),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => ({
    nameIdx: index("mcp_server_name_idx").on(table.name),
    statusIdx: index("mcp_server_status_idx").on(table.status),
    healthIdx: index("mcp_server_health_idx").on(table.healthStatus),
    tenantIdx: index("mcp_server_tenant_idx").on(table.tenantId),
    ownerIdx: index("mcp_server_owner_idx").on(table.ownerId),
    publicIdx: index("mcp_server_public_idx").on(table.isPublic),
    categoryIdx: index("mcp_server_category_idx").on(table.category),
    lastUsedIdx: index("mcp_server_last_used_idx").on(table.lastUsedAt),

    // Performance indexes from backend optimization guide
    tenantStatusIdx: index("idx_mcp_servers_tenant_status").on(table.tenantId, table.healthStatus),
    endpointTransportIdx: index("idx_mcp_servers_endpoint_transport").on(table.endpointUrl, table.transportType),
    healthCheckTimeIdx: index("idx_mcp_servers_health_check_time").on(table.lastHealthCheck),
    performanceIdx: index("idx_mcp_servers_performance").on(table.avgResponseTime, table.uptime),

    // Composite index for server discovery optimization
    discoveryCompositeIdx: index("idx_servers_discovery_composite").on(table.healthStatus, table.transportType, table.avgResponseTime),
  }),
);

// MCP Tools provided by servers
export const mcpTool = pgTable(
  "mcp_tool",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id, { onDelete: "cascade" }),

    // Tool identification
    name: text("name").notNull(),
    description: text("description"),

    // Tool schema and configuration
    inputSchema: json("input_schema").$type<{
      type: string;
      properties?: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    }>(),

    // Tool metadata
    tags: json("tags").$type<string[]>().default([]),
    category: text("category"),

    // Usage tracking
    callCount: integer("call_count").default(0),
    errorCount: integer("error_count").default(0),
    avgExecutionTime: decimal("avg_execution_time", { precision: 10, scale: 3 }),

    // Tool status
    isActive: boolean("is_active").default(true),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => ({
    serverToolIdx: unique("mcp_tool_server_name_unique").on(table.serverId, table.name),
    serverIdx: index("mcp_tool_server_idx").on(table.serverId),
    nameIdx: index("mcp_tool_name_idx").on(table.name),
    categoryIdx: index("mcp_tool_category_idx").on(table.category),
    activeIdx: index("mcp_tool_active_idx").on(table.isActive),

    // Performance indexes from backend optimization guide
    nameServerIdx: index("idx_mcp_tools_name_server").on(table.name, table.serverId),
    usageStatsIdx: index("idx_mcp_tools_usage_stats").on(table.callCount, table.errorCount),

    // Composite index for tool discovery with performance metrics
    discoveryPerformanceIdx: index("idx_tools_discovery_performance").on(
      table.name,
      table.callCount,
      table.avgExecutionTime,
      table.serverId,
    ),
  }),
);

// MCP Resources provided by servers
export const mcpResource = pgTable(
  "mcp_resource",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id, { onDelete: "cascade" }),

    // Resource identification
    uri: text("uri").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    // Resource metadata
    mimeType: text("mime_type"),
    size: integer("size"), // bytes
    annotations: json("annotations").$type<{
      audience?: string[];
      priority?: number;
      custom?: Record<string, unknown>;
    }>(),

    // Resource content metadata
    contentType: text("content_type", {
      enum: ["text", "binary", "json", "xml", "image", "video", "audio", "other"],
    }).default("text"),

    // Access and usage tracking
    accessCount: integer("access_count").default(0),
    isActive: boolean("is_active").default(true),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  },
  (table) => ({
    serverResourceIdx: unique("mcp_resource_server_uri_unique").on(table.serverId, table.uri),
    serverIdx: index("mcp_resource_server_idx").on(table.serverId),
    uriIdx: index("mcp_resource_uri_idx").on(table.uri),
    nameIdx: index("mcp_resource_name_idx").on(table.name),
    mimeTypeIdx: index("mcp_resource_mime_type_idx").on(table.mimeType),
    activeIdx: index("mcp_resource_active_idx").on(table.isActive),

    // Performance indexes from backend optimization guide
    uriServerIdx: index("idx_mcp_resources_uri_server").on(table.uri, table.serverId),
  }),
);

// MCP Prompts provided by servers
export const mcpPrompt = pgTable(
  "mcp_prompt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id, { onDelete: "cascade" }),

    // Prompt identification
    name: text("name").notNull(),
    description: text("description"),

    // Prompt content and configuration
    template: text("template").notNull(),
    arguments: json("arguments")
      .$type<
        Array<{
          name: string;
          description?: string;
          type?: string;
          required?: boolean;
          default?: unknown;
        }>
      >()
      .default([]),

    // Prompt metadata
    tags: json("tags").$type<string[]>().default([]),
    category: text("category"),

    // Usage tracking
    useCount: integer("use_count").default(0),

    // Prompt status
    isActive: boolean("is_active").default(true),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => ({
    serverPromptIdx: unique("mcp_prompt_server_name_unique").on(table.serverId, table.name),
    serverIdx: index("mcp_prompt_server_idx").on(table.serverId),
    nameIdx: index("mcp_prompt_name_idx").on(table.name),
    categoryIdx: index("mcp_prompt_category_idx").on(table.category),
    activeIdx: index("mcp_prompt_active_idx").on(table.isActive),
  }),
);

// Server dependencies and relationships
export const mcpServerDependency = pgTable(
  "mcp_server_dependency",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id, { onDelete: "cascade" }),
    dependsOnServerId: text("depends_on_server_id")
      .notNull()
      .references(() => mcpServer.id, { onDelete: "cascade" }),

    // Dependency configuration
    dependencyType: text("dependency_type", {
      enum: ["required", "optional", "fallback"],
    })
      .default("required")
      .notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    serverDependencyIdx: unique("mcp_server_dependency_unique").on(table.serverId, table.dependsOnServerId),
    serverIdx: index("mcp_server_dependency_server_idx").on(table.serverId),
    dependsOnIdx: index("mcp_server_dependency_depends_on_idx").on(table.dependsOnServerId),
  }),
);

// Server health check history
export const mcpServerHealthCheck = pgTable(
  "mcp_server_health_check",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: text("server_id")
      .notNull()
      .references(() => mcpServer.id, { onDelete: "cascade" }),

    // Health check results
    status: text("status", {
      enum: ["healthy", "unhealthy", "timeout", "error"],
    }).notNull(),
    responseTime: integer("response_time"), // milliseconds
    errorMessage: text("error_message"),

    // Additional health metrics
    metrics: json("metrics").$type<{
      cpu?: number;
      memory?: number;
      uptime?: number;
      version?: string;
      custom?: Record<string, unknown>;
    }>(),

    // Timestamp
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => ({
    serverIdx: index("mcp_server_health_check_server_idx").on(table.serverId),
    statusIdx: index("mcp_server_health_check_status_idx").on(table.status),
    checkedAtIdx: index("mcp_server_health_check_checked_at_idx").on(table.checkedAt),
  }),
);

// Relations
export const mcpServerRelations = relations(mcpServer, ({ many }) => ({
  tools: many(mcpTool),
  resources: many(mcpResource),
  prompts: many(mcpPrompt),
  dependencies: many(mcpServerDependency, {
    relationName: "serverDependencies",
  }),
  dependents: many(mcpServerDependency, {
    relationName: "serverDependents",
  }),
  healthChecks: many(mcpServerHealthCheck),
  // tenant relation defined in schema/index.ts to avoid circular imports
}));

export const mcpToolRelations = relations(mcpTool, ({ one }) => ({
  server: one(mcpServer, {
    fields: [mcpTool.serverId],
    references: [mcpServer.id],
  }),
}));

export const mcpResourceRelations = relations(mcpResource, ({ one }) => ({
  server: one(mcpServer, {
    fields: [mcpResource.serverId],
    references: [mcpServer.id],
  }),
}));

export const mcpPromptRelations = relations(mcpPrompt, ({ one }) => ({
  server: one(mcpServer, {
    fields: [mcpPrompt.serverId],
    references: [mcpServer.id],
  }),
}));

export const mcpServerDependencyRelations = relations(mcpServerDependency, ({ one }) => ({
  server: one(mcpServer, {
    fields: [mcpServerDependency.serverId],
    references: [mcpServer.id],
    relationName: "serverDependencies",
  }),
  dependsOnServer: one(mcpServer, {
    fields: [mcpServerDependency.dependsOnServerId],
    references: [mcpServer.id],
    relationName: "serverDependents",
  }),
}));

export const mcpServerHealthCheckRelations = relations(mcpServerHealthCheck, ({ one }) => ({
  server: one(mcpServer, {
    fields: [mcpServerHealthCheck.serverId],
    references: [mcpServer.id],
  }),
}));

// Note: tenant relation is handled in schema/index.ts to avoid circular imports
