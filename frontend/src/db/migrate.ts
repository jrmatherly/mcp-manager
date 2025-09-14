/**
 * Database migration utility for Drizzle ORM
 *
 * Handles database migrations and provides utilities for
 * development and production environments.
 */

import { env } from "../env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { join } from "path";
import { dbLogger } from "../lib/logger";
import { getSSLConfig } from "./ssl-config";

// Create connection for migrations
const migrationPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 1, // Single connection for migrations
  // Parse SSL configuration from DATABASE_URL sslmode parameter
  ssl: getSSLConfig(),
});

const migrationDb = drizzle(migrationPool);

/**
 * Execute SQL with idempotent error handling
 * Handles "already exists" and "duplicate" errors gracefully
 */
export async function executeIdempotent(sql: string, description?: string): Promise<void> {
  try {
    await migrationDb.execute(sql);
    if (description) {
      dbLogger.info(`✅ ${description}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle common idempotent cases
    if (
      errorMessage.includes("already exists") ||
      errorMessage.includes("duplicate key") ||
      errorMessage.includes("already defined") ||
      errorMessage.includes("relation") && errorMessage.includes("already exists")
    ) {
      if (description) {
        dbLogger.info(`⏭️  ${description} (already exists)`);
      }
      return; // Skip silently
    }

    // Re-throw unexpected errors
    if (description) {
      dbLogger.logError(error, `Failed to ${description}`);
    }
    throw error;
  }
}

/**
 * Run pending migrations
 */
export async function runMigrations() {
  dbLogger.info("Running migrations");

  try {
    await migrate(migrationDb, {
      migrationsFolder: join(process.cwd(), "drizzle"),
    });

    dbLogger.info("Migrations completed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if it's an idempotent error (already applied)
    if (
      errorMessage.includes("already exists") ||
      errorMessage.includes("duplicate key")
    ) {
      dbLogger.info("⏭️  All migrations already applied");
      return;
    }

    dbLogger.logError(error, "Migration failed");
    throw error;
  } finally {
    await migrationPool.end();
  }
}

/**
 * Reset database (development only)
 * WARNING: This will drop all data!
 */
export async function resetDatabase() {
  if (env.NODE_ENV === "production") {
    throw new Error("Database reset is not allowed in production!");
  }

  dbLogger.warn("Resetting database");

  try {
    // Drop all tables (cascading)
    await migrationDb.execute(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);

    dbLogger.info("Database reset completed");
  } catch (error) {
    dbLogger.logError(error, "Database reset failed");
    throw error;
  } finally {
    await migrationPool.end();
  }
}

/**
 * Seed database with initial data
 */
export async function seedDatabase() {
  dbLogger.info("Seeding database");

  try {
    // Import seed data functions
    const { seedInitialData } = await import("./seed");

    await seedInitialData(migrationDb);

    dbLogger.info("Database seeding completed");
  } catch (error) {
    dbLogger.logError(error, "Database seeding failed");
    throw error;
  } finally {
    await migrationPool.end();
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case "migrate":
      await runMigrations();
      break;
    case "reset":
      await resetDatabase();
      break;
    case "seed":
      await seedDatabase();
      break;
    case "reset-and-seed":
      await resetDatabase();
      await runMigrations();
      await seedDatabase();
      break;
    default:
      dbLogger.info("Usage: tsx src/db/migrate.ts <command>");
      dbLogger.info("Commands:");
      dbLogger.info("  migrate       - Run pending migrations");
      dbLogger.info("  reset         - Reset database (development only)");
      dbLogger.info("  seed          - Seed database with initial data");
      dbLogger.info("  reset-and-seed - Reset, migrate, and seed database");
  }
}
