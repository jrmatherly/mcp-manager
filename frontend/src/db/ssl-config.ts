/**
 * SSL Configuration Utility for PostgreSQL Connections
 *
 * This utility parses SSL configuration from DATABASE_URL connection strings
 * to ensure consistent SSL behavior across all database connections.
 *
 * The node-postgres library doesn't automatically parse `sslmode` from URLs,
 * so this utility extracts and interprets SSL parameters manually.
 *
 * SSL Configuration Priority (highest to lowest):
 * 1. DB_SSL environment variable → explicit override (highest priority)
 * 2. sslmode parameter in DATABASE_URL → standard PostgreSQL SSL modes
 * 3. Default → SSL disabled for local development
 */

import { env } from "../env";

/**
 * Parse SSL configuration from a PostgreSQL connection string
 *
 * @param connectionString - PostgreSQL connection URL
 * @returns SSL configuration for pg Pool or false to disable SSL
 */
export function parseSSLConfig(connectionString: string): boolean | object {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");

    // Priority 1: If DB_SSL environment variable is set, use it (highest priority)
    if (env.DB_SSL !== undefined) {
      return env.DB_SSL;
    }

    // Priority 2: Default SSL configuration based on sslmode parameter
    switch (sslMode) {
      case "disable":
        return false;
      case "require":
      case "prefer":
        return { rejectUnauthorized: false }; // For development/self-signed certs
      case "verify-ca":
      case "verify-full":
        return true; // Full SSL verification
      case "allow":
      case null:
      case undefined:
      default:
        // Default to no SSL for local development
        return false;
    }
  } catch (error) {
    // Use process.stderr.write for error output instead of console
    process.stderr.write(`Warning: Failed to parse SSL config from DATABASE_URL: ${error}\n`);
    // Fallback to DB_SSL environment variable or disable SSL
    if (env.DB_SSL !== undefined) {
      return env.DB_SSL;
    }
    return false;
  }
}

/**
 * Get SSL configuration for the current environment
 *
 * @returns SSL configuration based on current DATABASE_URL
 */
export function getSSLConfig(): boolean | object {
  const connectionString = env.DATABASE_URL;
  return parseSSLConfig(connectionString);
}
