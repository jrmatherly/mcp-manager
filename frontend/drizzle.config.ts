import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    // Configure SSL connection or disable it based on environment variable
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  },
  // Enable introspection for better development experience
  introspect: {
    casing: "preserve",
  },
  // Migration configuration
  migrations: {
    prefix: "timestamp",
    table: "drizzle_migrations",
    schema: "public",
  },
  // Enable verbose logging for debugging
  verbose: true,
  // Strict mode for better type safety
  strict: true,
});
