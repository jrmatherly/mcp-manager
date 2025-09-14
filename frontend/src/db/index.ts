import { env } from "../env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "./schema";
import { getSSLConfig } from "./ssl-config";

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Maximum pool size
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if no connection available
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  // Parse SSL configuration from DATABASE_URL sslmode parameter
  ssl: getSSLConfig(),
});

// Create Drizzle database instance with connection pool and full schema
export const db = drizzle(pool, { schema });

// Export schema for use elsewhere
export { schema };

// Export types
export type Database = typeof db;

// Export connection pool for advanced use cases
export { pool };
