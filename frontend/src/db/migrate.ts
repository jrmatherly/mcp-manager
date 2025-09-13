/**
 * Database migration utility for Drizzle ORM
 *
 * Handles database migrations and provides utilities for
 * development and production environments.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { join } from "path";
import { dbLogger } from "../lib/logger";

// Create connection for migrations
const migrationPool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 1, // Single connection for migrations
});

const migrationDb = drizzle(migrationPool);

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
  if (process.env.NODE_ENV === "production") {
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
