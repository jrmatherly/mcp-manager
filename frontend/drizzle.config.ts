import { env } from "./src/env"; // Validate environment variables at build time
import { defineConfig } from "drizzle-kit";
import { getSSLConfig } from "./src/db/ssl-config";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
    // Parse SSL configuration from DATABASE_URL sslmode parameter
    ssl: getSSLConfig(),
  },
  // Enable introspection for better development experience
  introspect: {
    casing: "preserve",
  },
  // Migration configuration
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
  // Enable verbose logging for debugging
  verbose: true,
  // Strict mode for better type safety
  strict: true,
});
