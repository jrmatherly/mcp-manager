/**
 * Better-Auth compatible API Key schema
 *
 * This schema follows the exact requirements from Better-Auth's apiKey plugin
 * as documented in the official Better-Auth documentation.
 */

import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

/**
 * API Key table for Better-Auth plugin
 * Table name: apiKey (as expected by Better-Auth)
 *
 * This table follows the exact schema requirements from Better-Auth's API Key plugin.
 * Reference: https://www.better-auth.com/docs/plugins/api-key#schema
 */
export const apiKey = pgTable("apiKey", {
  // Primary key
  id: text("id").primaryKey(),

  // API key identification fields
  name: text("name"), // Optional name for the API key
  start: text("start"), // Starting characters of the API key for UI display
  prefix: text("prefix"), // API key prefix (e.g., "mcp_")

  // The hashed API key
  key: text("key").notNull(), // The hashed API key itself

  // User association
  userId: text("userId").notNull(), // The ID of the user associated with the API key

  // Refill mechanism for rate limiting
  refillInterval: integer("refillInterval"), // Interval to refill the key in milliseconds
  refillAmount: integer("refillAmount"), // Amount to refill the remaining count
  lastRefillAt: timestamp("lastRefillAt", { withTimezone: true }), // Date/time when key was last refilled

  // Status and configuration
  enabled: boolean("enabled").default(true).notNull(), // Whether the API key is enabled

  // Rate limiting configuration
  rateLimitEnabled: boolean("rateLimitEnabled").default(true).notNull(), // Whether rate limiting is enabled
  rateLimitTimeWindow: integer("rateLimitTimeWindow"), // Time window in milliseconds for rate limit
  rateLimitMax: integer("rateLimitMax"), // Maximum requests allowed within time window
  requestCount: integer("requestCount").default(0).notNull(), // Number of requests made within rate limit window

  // Usage tracking
  remaining: integer("remaining"), // Number of requests remaining (null = unlimited)
  lastRequest: timestamp("lastRequest", { withTimezone: true }), // Date/time of last request made

  // Expiration
  expiresAt: timestamp("expiresAt", { withTimezone: true }), // Date/time when the key expires

  // Timestamps
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),

  // Permissions (stored as text, can be JSON string)
  permissions: text("permissions"), // Permissions of the key

  // Metadata (stored as text, can be JSON string)
  metadata: text("metadata"), // Additional metadata as JSON text
});

// Export the type for TypeScript usage
export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;
