import "dotenv/config"; // Load environment variables (drizzle-kit runs outside Next.js runtime)
import { defineConfig } from "drizzle-kit";

// Parse SSL configuration directly from process.env since drizzle-kit runs outside Next.js
function getSSLConfigForDrizzle(): boolean | object {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }

    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get("sslmode");

    // Priority 1: If DB_SSL environment variable is set, use it (highest priority)
    if (process.env.DB_SSL !== undefined) {
      return process.env.DB_SSL === "true";
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
    if (process.env.DB_SSL !== undefined) {
      return process.env.DB_SSL === "true";
    }
    return false;
  }
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    // Parse SSL configuration from DATABASE_URL sslmode parameter
    ssl: getSSLConfigForDrizzle(),
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
