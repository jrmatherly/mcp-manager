/**
 * Test-specific database connection
 *
 * This file provides database connection for tests using dotenv
 * instead of T3 env to avoid client/server environment conflicts.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { schema } from "../../src/db/schema";

// Create PostgreSQL connection pool for tests
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Smaller pool for tests
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  // Tests typically run against local database without SSL
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Create Drizzle database instance for tests
export const testDb = drizzle(testPool, { schema });

// Export schema for use in tests
export { schema as testSchema };

// Export sql for use in tests
export { sql };

// Export types
export type TestDatabase = typeof testDb;

// Export connection pool for test utilities
export { testPool };

// Test connection helper
export async function verifyTestDatabaseConnection(): Promise<boolean> {
  try {
    const result = await testDb.execute(sql`SELECT 1 as test`);
    return Array.isArray(result.rows) && result.rows.length === 1;
  } catch (error) {
    console.error("Test database connection failed:", error);
    return false;
  }
}