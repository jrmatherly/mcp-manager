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
 * Split SQL statements while preserving dollar-quoted strings
 * This handles PostgreSQL's dollar-quoted strings ($$...$$) correctly
 */
function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = "";
  let inDollarQuote = false;
  let dollarQuoteTag = "";

  const lines = sql.split("\n");

  for (const line of lines) {
    // Check for dollar quote start/end
    const dollarQuoteMatch = line.match(/\$([^$]*)\$/);
    if (dollarQuoteMatch) {
      if (!inDollarQuote) {
        inDollarQuote = true;
        dollarQuoteTag = dollarQuoteMatch[0];
      } else if (line.includes(dollarQuoteTag)) {
        inDollarQuote = false;
        dollarQuoteTag = "";
      }
    }

    currentStatement += line + "\n";

    // Only split on semicolon if not inside dollar quotes
    if (!inDollarQuote && line.trim().endsWith(";")) {
      const trimmed = currentStatement.trim();
      if (trimmed && !trimmed.startsWith("--")) {
        statements.push(trimmed);
      }
      currentStatement = "";
    }
  }

  // Add any remaining statement
  const trimmed = currentStatement.trim();
  if (trimmed && !trimmed.startsWith("--")) {
    statements.push(trimmed);
  }

  return statements;
}

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
 * Verify that all expected views were created
 */
export async function verifyDatabaseViews(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("DATABASE_URL not set");
    return false;
  }

  logger.info("🔍 Verifying database views...");

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: getSSLConfig(),
    max: 1,
  });

  const db = drizzle(pool);

  try {
    // Get list of views (both regular and materialized)
    const viewResult = await db.execute(sql`
      SELECT
        table_name as view_name,
        'view' as view_type
      FROM information_schema.views
      WHERE table_schema = 'public'
      UNION ALL
      SELECT
        schemaname || '.' || matviewname as view_name,
        'materialized_view' as view_type
      FROM pg_matviews
      WHERE schemaname = 'public'
      ORDER BY view_name
    `);

    const views = viewResult.rows.map((row: Record<string, unknown>) => ({
      name: String(row.view_name).replace("public.", ""),
      type: String(row.view_type),
    }));

    // Expected views from 04_views.sql
    const expectedViews = [
      "v_server_overview",
      "v_active_sessions",
      "v_api_usage_stats",
      "v_tool_performance",
      "v_tenant_activity",
      "v_security_audit",
      "v_rate_limit_status",
      "v_system_health_dashboard",
      "mv_daily_usage_summary",
      "mv_server_performance_metrics",
    ];

    logger.info(`   Found ${views.length} views`);

    const foundViewNames = views.map((v) => v.name);
    const missingViews = expectedViews.filter((view) => !foundViewNames.includes(view));
    const extraViews = foundViewNames.filter((view) => !expectedViews.includes(view));

    if (missingViews.length > 0) {
      logger.warn(`⚠️  Missing views: ${missingViews.join(", ")}`);
    }

    if (extraViews.length > 0) {
      logger.info(`   Additional views found: ${extraViews.join(", ")}`);
    }

    // Log view details
    views.forEach((view) => {
      const symbol = view.type === "materialized_view" ? "📊" : "👁️";
      logger.info(`   ${symbol} ${view.name} (${view.type})`);
    });

    if (missingViews.length === 0) {
      logger.info("✅ All expected views found");
      return true;
    }

    logger.warn(`❌ ${missingViews.length} views missing out of ${expectedViews.length} expected`);
    return false;
  } catch (error) {
    // Convert unknown error to LogContext for proper logging
    const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
    logger.error("❌ Failed to verify views", errorContext);
    return false;
  } finally {
    await pool.end();
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
    // Get list of tables (excluding views)
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = result.rows.map((row: Record<string, unknown>) => String(row.table_name));

    // Expected tables from the schema files
    // This list should match exactly what's defined in src/db/schema/*.ts
    const expectedTables = [
      // From auth.ts
      "account",
      "session",
      "two_factor_auth",
      "user",
      "user_permission",
      "verification",

      // From better-auth-api-key.ts
      "apiKey", // Note: camelCase in schema, not snake_case

      // From tenant.ts
      "tenant",
      "tenant_invitation",
      "tenant_member",
      "tenant_usage",

      // From mcp.ts
      "mcp_prompt",
      "mcp_resource",
      "mcp_server",
      "mcp_server_dependency",
      "mcp_server_health_check",
      "mcp_tool",

      // From api.ts
      "api_token",
      "api_usage",
      "api_usage_stats",
      "rate_limit_config",
      "rate_limit_violation",

      // From audit.ts
      "audit_log",
      "error_log",
      "security_event",
      "system_event",

      // From admin.ts
      "announcement_acknowledgment",
      "feature_flag",
      "feature_flag_evaluation",
      "maintenance_window",
      "system_announcement",
      "system_config",

      // From backend-compat.ts
      "circuit_breakers",
      "connection_pools",
      "data_retention_policies",
      "enhanced_api_keys",
      "fastmcp_audit_log",
      "materialized_views",
      "performance_alerts",
      "request_logs",
      "request_queues",
      "server_access_control",
      "server_metrics",
      "sessions", // Note: different from "session" above
    ];

    logger.info(`   Found ${tables.length} tables (excluding views)`);

    const missingTables = expectedTables.filter((table) => !tables.includes(table));
    const extraTables = tables.filter((table: string) => !expectedTables.includes(table));

    if (missingTables.length > 0) {
      logger.warn(`⚠️  Missing expected tables: ${missingTables.join(", ")}`);
    }

    if (extraTables.length > 0) {
      logger.info(`   Unexpected tables found: ${extraTables.join(", ")}`);
      logger.info(`   💡 If these are legitimate tables, please add them to expectedTables in setup.ts`);
    }

    if (missingTables.length === 0) {
      logger.info("✅ All expected tables found");
      if (extraTables.length === 0) {
        logger.info("✅ No unexpected tables found");
      }
      return true;
    }

    logger.warn(`❌ ${missingTables.length} expected tables missing out of ${expectedTables.length} total`);
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
 * Apply SQL optimization files (extensions, indexes, functions)
 */
async function applyOptimizationFiles(): Promise<boolean> {
  logger.info("🔧 Applying database optimizations...");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const sqlDir = join(__dirname, "..", "..", "drizzle", "sql");

  // Note: Views are now handled separately in setup-views.ts
  const optimizationFiles = ["01_extensions.sql", "02_indexes.sql", "03_functions.sql"];

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

        // Try bulk execution first
        try {
          await client.query(sqlContent);
          logger.info(`   ✅ Applied ${filename}`);
        } catch {
          // If bulk fails, try statement by statement
          const statements = splitSQLStatements(sqlContent);
          let successCount = 0;
          let skipCount = 0;

          for (const statement of statements) {
            // Skip empty statements and comments
            if (!statement.trim() || statement.trim().startsWith("--")) {
              continue;
            }

            try {
              await client.query(statement);
              successCount++;
            } catch (statementError) {
              const errorMessage = statementError instanceof Error ? statementError.message : String(statementError);
              if (errorMessage.includes("already exists") || errorMessage.includes("duplicate key")) {
                skipCount++;
              } else {
                logger.debug(`   Failed statement: ${errorMessage}`);
              }
            }
          }

          if (successCount > 0 || skipCount > 0) {
            logger.info(`   ✅ Applied ${filename} (${successCount} new, ${skipCount} existing)`);
          } else {
            logger.info(`   ✅ Applied ${filename}`);
          }
        }
      } catch (error) {
        const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
        logger.error(`   ❌ Failed to apply ${filename}`, errorContext);
        // Continue with other files even if one fails
      }
    }

    client.release();

    // Now create views using the new simplified approach
    logger.info("   Creating database views...");
    const { createViews } = await import("./setup-views");
    const viewResult = await createViews();

    if (viewResult.success) {
      logger.info("✅ Database optimizations and views applied successfully");
    } else {
      logger.warn("✅ Database optimizations applied, but some views failed");
      if (viewResult.failed.length > 0) {
        logger.warn(`   Failed views: ${viewResult.failed.join(", ")}`);
      }
    }

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
  const schemaOk = await verifyDatabaseSchema();
  if (!schemaOk) {
    logger.warn("⚠️  Schema verification failed, but setup may still work");
  }

  logger.info("");

  // Step 7: Verify views
  const viewsOk = await verifyDatabaseViews();
  if (!viewsOk) {
    logger.warn("⚠️  View verification failed - some analytics features may not work properly");
    logger.info("💡 You can manually retry view creation with: npm run db:optimize");
  }

  logger.info("");

  const overallSuccess = schemaOk && viewsOk;
  if (overallSuccess) {
    logger.info("🎉 Database setup completed successfully!");
    logger.info("✅ All optimizations and views have been applied automatically!");
  } else {
    logger.warn("⚠️  Database setup completed with some issues");
    logger.info("📊 Tables: " + (schemaOk ? "✅ OK" : "❌ Issues"));
    logger.info("👁️  Views: " + (viewsOk ? "✅ OK" : "❌ Issues"));
  }

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

    case "verify-views":
      verifyDatabaseViews()
        .then((success) => process.exit(success ? 0 : 1))
        .catch((error) => {
          // Convert unknown error to LogContext for proper logging
          const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
          logger.error("Error verifying views", errorContext);
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
      console.log("  (none)        Run full setup (create, test, migrate, optimize, verify)");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  drop          Drop database if it exists");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  create        Create database if it doesn't exist");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  test          Test PostgreSQL and Redis connections");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  verify        Verify database schema (tables)");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  verify-views  Verify database views");
      // eslint-disable-next-line no-console -- CLI help output requires console
      console.log("  help          Show this help message");
      process.exit(0);
    // eslint-disable-next-line no-fallthrough
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
