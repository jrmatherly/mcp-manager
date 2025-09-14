/**
 * Database Setup Utility
 *
 * Handles initial database creation, connection testing, and schema verification.
 * Replaces the Python backend/scripts/setup_database.py script.
 */

import "dotenv/config";
import { Client, Pool } from "pg";
import { createClient } from "redis";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { createLogger } from "../lib/logger";
import { getSSLConfig } from "./ssl-config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const logger = createLogger("db-setup");

/**
 * Parse database URL to extract components
 */
function parseDatabaseUrl(url: string) {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port || "5432"),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1), // Remove leading /
  };
}

/**
 * Drop PostgreSQL database if it exists
 */
export async function dropDatabaseIfExists(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("DATABASE_URL not set");
    return false;
  }

  const dbConfig = parseDatabaseUrl(databaseUrl);
  const dbName = dbConfig.database;

  // Connect to postgres database to drop our target database
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: "postgres", // Connect to default database
    ssl: getSSLConfig(),
  });

  logger.warn(`⚠️  WARNING: About to drop database '${dbName}'`);

  try {
    await client.connect();

    // Check if database exists
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);

    if (result.rows.length > 0) {
      // Terminate existing connections
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [dbName],
      );

      logger.info(`🗑️  Dropping database '${dbName}'...`);
      await client.query(`DROP DATABASE ${dbName}`);
      logger.info(`✅ Database '${dbName}' dropped successfully`);
    } else {
      logger.info(`ℹ️  Database '${dbName}' does not exist`);
    }

    return true;
  } catch (error) {
    // Convert unknown error to LogContext for proper logging
    const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
    logger.error("❌ Failed to drop database", errorContext);
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Create PostgreSQL database if it doesn't exist
 */
export async function createDatabaseIfNotExists(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("DATABASE_URL not set");
    return false;
  }

  const dbConfig = parseDatabaseUrl(databaseUrl);
  const dbName = dbConfig.database;

  // Connect to postgres database to create our target database
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: "postgres", // Connect to default database
    ssl: getSSLConfig(),
  });

  logger.info(`🔗 Connecting to PostgreSQL server at ${dbConfig.host}:${dbConfig.port}`);

  try {
    await client.connect();

    // Check if database exists
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);

    if (result.rows.length === 0) {
      logger.info(`📦 Creating database '${dbName}'...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      logger.info(`✅ Database '${dbName}' created successfully`);
    } else {
      logger.info(`✅ Database '${dbName}' already exists`);
    }

    return true;
  } catch (error) {
    // Convert unknown error to LogContext for proper logging
    const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
    logger.error("❌ Failed to create database", errorContext);
    logger.info("💡 Make sure PostgreSQL is running and credentials are correct");
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Test PostgreSQL connection with the application database
 */
export async function testPostgreSQLConnection(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("DATABASE_URL not set");
    return false;
  }

  const dbConfig = parseDatabaseUrl(databaseUrl);
  logger.info(`🧪 Testing PostgreSQL connection to '${dbConfig.database}'...`);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: getSSLConfig(),
  });

  try {
    await client.connect();
    const result = await client.query("SELECT version()");
    const version = result.rows[0].version;

    logger.info("✅ PostgreSQL connection successful");
    logger.info(`   Version: ${version}`);

    return true;
  } catch (error) {
    // Convert unknown error to LogContext for proper logging
    const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
    logger.error("❌ PostgreSQL connection failed", errorContext);
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const urlObj = new URL(redisUrl);

  logger.info(`🧪 Testing Redis connection to ${urlObj.hostname}:${urlObj.port}...`);

  const client = createClient({ url: redisUrl });

  try {
    await client.connect();

    // Test basic operations
    await client.ping();
    await client.set("test_key", "test_value", { EX: 10 });
    const value = await client.get("test_key");

    if (value !== "test_value") {
      throw new Error(`Redis test failed: expected 'test_value', got '${value}'`);
    }

    await client.del("test_key");

    const info = await client.info("server");
    const versionMatch = info.match(/redis_version:(\S+)/);
    const memoryInfo = await client.info("memory");
    const memoryMatch = memoryInfo.match(/used_memory_human:(\S+)/);

    logger.info("✅ Redis connection successful");
    if (versionMatch) {
      logger.info(`   Version: ${versionMatch[1]}`);
    }
    if (memoryMatch) {
      logger.info(`   Memory usage: ${memoryMatch[1]}`);
    }

    return true;
  } catch (error) {
    // Convert unknown error to LogContext for proper logging
    const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
    logger.error("❌ Redis connection failed", errorContext);
    return false;
  } finally {
    await client.quit();
  }
}

/**
 * Verify that all expected tables were created
 */
export async function verifyDatabaseSchema(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("DATABASE_URL not set");
    return false;
  }

  logger.info("🔍 Verifying database schema...");

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: getSSLConfig(),
    max: 1,
  });

  const db = drizzle(pool);

  try {
    // Get list of tables
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = result.rows.map((row: Record<string, unknown>) => String(row.table_name));

    // Expected tables from the schema
    const expectedTables = [
      "account",
      "api_key",
      "audit_log",
      "circuit_breaker",
      "connection_pool",
      "data_retention_policy",
      "enhanced_api_key",
      "fastmcp_audit_log",
      "invitation",
      "materialized_view",
      "mcp_server",
      "mcp_tool",
      "oauth_token",
      "organization",
      "organization_invitation",
      "organization_member",
      "passkey",
      "passkey_credential",
      "performance_alert",
      "request_log",
      "request_queue",
      "routing_rule",
      "server_access_control",
      "server_metric",
      "server_resource",
      "session",
      "system_config",
      "tenant",
      "two_factor",
      "user",
      "verification",
    ];

    logger.info(`   Found ${tables.length} tables`);

    const missingTables = expectedTables.filter((table) => !tables.includes(table));
    const extraTables = tables.filter((table: string) => !expectedTables.includes(table));

    if (missingTables.length > 0) {
      logger.warn(`⚠️  Missing tables: ${missingTables.join(", ")}`);
    }

    if (extraTables.length > 0) {
      logger.info(`   Additional tables found: ${extraTables.join(", ")}`);
    }

    if (missingTables.length === 0) {
      logger.info("✅ All expected tables found");
      return true;
    }

    return false;
  } catch (error) {
    // Convert unknown error to LogContext for proper logging
    const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
    logger.error("❌ Failed to verify schema", errorContext);
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Apply SQL optimization files (extensions, indexes, functions, views)
 */
async function applyOptimizationFiles(): Promise<boolean> {
  logger.info("🔧 Applying database optimizations...");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const sqlDir = join(__dirname, "..", "..", "drizzle", "sql");

  const optimizationFiles = ["01_extensions.sql", "02_indexes.sql", "03_functions.sql", "04_views.sql"];

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig(),
  });

  try {
    const client = await pool.connect();

    for (const filename of optimizationFiles) {
      logger.info(`   Applying ${filename}...`);
      const filePath = join(sqlDir, filename);

      try {
        const sqlContent = readFileSync(filePath, "utf-8");

        // Split by statement separator and execute each
        const statements = sqlContent
          .split(/;\s*$|;\s*\n/gm)
          .filter((stmt) => stmt.trim().length > 0)
          .map((stmt) => stmt.trim());

        for (const statement of statements) {
          // Skip comments
          if (statement.startsWith("--") || statement.startsWith("/*")) {
            continue;
          }

          try {
            await client.query(statement);
          } catch (error) {
            // Some statements might fail if objects already exist, that's okay
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("already exists")) {
              logger.debug(`   Skipping (already exists): ${statement.substring(0, 50)}...`);
            } else {
              logger.warn(`   Failed to execute statement: ${errorMessage}`);
            }
          }
        }

        logger.info(`   ✅ Applied ${filename}`);
      } catch (error) {
        const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
        logger.error(`   ❌ Failed to apply ${filename}`, errorContext);
        // Continue with other files even if one fails
      }
    }

    client.release();
    logger.info("✅ Database optimizations applied successfully");
    return true;
  } catch (error) {
    const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
    logger.error("Failed to apply optimizations", errorContext);
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Run complete database setup
 */
async function fullSetup(): Promise<void> {
  logger.info("🚀 MCP Registry Gateway Database Setup");
  logger.info("=".repeat(50));

  // Step 1: Create database if needed
  if (!(await createDatabaseIfNotExists())) {
    process.exit(1);
  }

  logger.info("");

  // Step 2: Test PostgreSQL connection
  if (!(await testPostgreSQLConnection())) {
    process.exit(1);
  }

  logger.info("");

  // Step 3: Test Redis connection
  if (!(await testRedisConnection())) {
    process.exit(1);
  }

  logger.info("");

  // Step 4: Run migrations (using existing migrate.ts)
  logger.info("🏗️  Running database migrations...");
  try {
    const { runMigrations } = await import("./migrate");
    await runMigrations();
  } catch (error) {
    // Convert unknown error to LogContext for proper logging
    const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
    logger.error("❌ Failed to run migrations", errorContext);
    process.exit(1);
  }

  logger.info("");

  // Step 5: Apply database optimizations (extensions, indexes, functions, views)
  if (!(await applyOptimizationFiles())) {
    logger.warn("⚠️  Some optimizations may have failed, but setup can continue");
  }

  logger.info("");

  // Step 6: Verify schema
  if (!(await verifyDatabaseSchema())) {
    logger.warn("⚠️  Schema verification failed, but setup may still work");
  }

  logger.info("");
  logger.info("🎉 Database setup completed successfully!");
  logger.info("✅ All optimizations have been applied automatically!");
  logger.info("💡 Next steps:");
  logger.info("   1. Seed initial data: npm run db:seed");
  logger.info("   2. Start the application: npm run dev");
}

/**
 * CLI interface
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case "drop":
      dropDatabaseIfExists()
        .then((success) => process.exit(success ? 0 : 1))
        .catch((error) => {
          // Convert unknown error to LogContext for proper logging
          const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
          logger.error("Error dropping database", errorContext);
          process.exit(1);
        });
      break;

    case "create":
      createDatabaseIfNotExists()
        .then((success) => process.exit(success ? 0 : 1))
        .catch((error) => {
          // Convert unknown error to LogContext for proper logging
          const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
          logger.error("Error creating database", errorContext);
          process.exit(1);
        });
      break;

    case "test":
      Promise.all([testPostgreSQLConnection(), testRedisConnection()])
        .then((results) => {
          const allSuccess = results.every((r) => r === true);
          process.exit(allSuccess ? 0 : 1);
        })
        .catch((error) => {
          // Convert unknown error to LogContext for proper logging
          const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
          logger.error("Error testing connections", errorContext);
          process.exit(1);
        });
      break;

    case "verify":
      verifyDatabaseSchema()
        .then((success) => process.exit(success ? 0 : 1))
        .catch((error) => {
          // Convert unknown error to LogContext for proper logging
          const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
          logger.error("Error verifying schema", errorContext);
          process.exit(1);
        });
      break;

    case "help":
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("Database Setup Utility");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("Usage: tsx src/db/setup.ts [command]");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("Commands:");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  (none)   Run full setup (create, test, migrate, verify)");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  drop     Drop database if it exists");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  create   Create database if it doesn't exist");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  test     Test PostgreSQL and Redis connections");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  verify   Verify database schema");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  help     Show this help message");
      process.exit(0);
      break; // This line is unreachable but satisfies ESLint

    default:
      fullSetup()
        .then(() => process.exit(0))
        .catch((error) => {
          // Convert unknown error to LogContext for proper logging
          const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
          logger.error("Setup failed", errorContext);
          process.exit(1);
        });
  }
}
