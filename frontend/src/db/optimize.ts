/* eslint-disable no-console */
/**
 * Database Optimization Utility
 *
 * Provides utilities for managing database performance optimizations,
 * running maintenance tasks, and monitoring database health.
 *
 * Note: Console statements are intentionally used for CLI output.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { dbLogger } from "../lib/logger";
import {
  updateTableStatistics,
  getSystemHealthScore,
  getDatabaseSizeSummary,
  getIndexUsageSummary,
  getPerformanceMonitoring,
} from "./analytics";

// ============================================================================
// Optimization Tasks
// ============================================================================

/**
 * Run table statistics update for all critical tables
 */
export async function runTableAnalyze(): Promise<void> {
  dbLogger.info("Running ANALYZE on all critical tables");

  try {
    await updateTableStatistics();
    dbLogger.info("Table statistics updated successfully");
  } catch (error) {
    dbLogger.logError(error, "Failed to update table statistics");
    throw error;
  }
}

/**
 * Check for unused indexes that can be dropped
 */
interface IndexUsage {
  indexname: string;
  tablename: string;
  usage_category: string;
}

export async function identifyUnusedIndexes(): Promise<IndexUsage[]> {
  dbLogger.info("Identifying unused indexes");

  try {
    const indexUsage = (await getIndexUsageSummary()) as unknown as IndexUsage[];
    const unusedIndexes = indexUsage.filter((idx) => idx.usage_category === "Unused");

    if (unusedIndexes.length > 0) {
      dbLogger.warn(`Found ${unusedIndexes.length} unused indexes`);
      unusedIndexes.forEach((idx) => {
        dbLogger.info(`Unused index: ${idx.indexname} on ${idx.tablename}`);
      });
    } else {
      dbLogger.info("No unused indexes found");
    }

    return unusedIndexes;
  } catch (error) {
    dbLogger.logError(error, "Failed to identify unused indexes");
    throw error;
  }
}

/**
 * Check database size and growth patterns
 */
export async function checkDatabaseSize(): Promise<void> {
  dbLogger.info("Checking database size and usage");

  try {
    const sizeData = (await getDatabaseSizeSummary()) as Array<{
      tablename: string;
      total_size: string;
      table_size: string;
      indexes_size: string;
    }>;

    dbLogger.info("Database size summary:");
    sizeData.forEach((table) => {
      dbLogger.info(`${table.tablename}: ${table.total_size} (data: ${table.table_size}, indexes: ${table.indexes_size})`);
    });
  } catch (error) {
    dbLogger.logError(error, "Failed to check database size");
    throw error;
  }
}

/**
 * Run database maintenance tasks
 */
export async function runMaintenance(): Promise<void> {
  dbLogger.info("Running database maintenance tasks");

  try {
    // Run VACUUM ANALYZE on critical tables
    const criticalTables = ["request_logs", "audit_log", "fastmcp_audit_log", "server_metrics", "mcp_server", "user", "session"];

    for (const table of criticalTables) {
      dbLogger.info(`Running VACUUM ANALYZE on ${table}`);
      await db.execute(sql.raw(`VACUUM ANALYZE "${table}"`));
    }

    // Update table statistics
    await runTableAnalyze();

    dbLogger.info("Database maintenance completed successfully");
  } catch (error) {
    dbLogger.logError(error, "Database maintenance failed");
    throw error;
  }
}

/**
 * Check for slow queries and performance issues
 */
export async function checkSlowQueries(): Promise<void> {
  dbLogger.info("Checking for slow queries");

  try {
    // Check if pg_stat_statements is available
    const statStatementsCheck = await db.execute(sql`SELECT COUNT(*) as count FROM pg_extension WHERE extname = 'pg_stat_statements'`);

    if (statStatementsCheck.rows[0]?.count === "0") {
      dbLogger.warn("pg_stat_statements extension not available - cannot check slow queries");
      return;
    }

    // Get slow queries
    const slowQueries = await db.execute(sql`
      SELECT
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements
      WHERE calls > 10
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `);

    if (slowQueries.rows.length > 0) {
      dbLogger.warn("Found slow queries:");
      const queries = slowQueries.rows as Array<{ mean_exec_time: number; calls: number; hit_percent?: number; query: string }>;
      queries.forEach((query, index) => {
        dbLogger.warn(
          `${index + 1}. Avg time: ${Math.round(query.mean_exec_time)}ms, ` +
            `Calls: ${query.calls}, Hit rate: ${Math.round(query.hit_percent || 0)}%`,
        );
        dbLogger.warn(`   Query: ${query.query.substring(0, 100)}...`);
      });
    } else {
      dbLogger.info("No problematic slow queries found");
    }
  } catch (error) {
    dbLogger.logError(error, "Failed to check slow queries");
    // Don't throw - this is not critical
  }
}

/**
 * Monitor connection usage
 */
export async function checkConnectionUsage(): Promise<void> {
  dbLogger.info("Checking database connection usage");

  try {
    const connections = await db.execute(sql`
      SELECT
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
    `);

    const conn = connections.rows[0];
    dbLogger.info(
      `Connections - Total: ${conn.total_connections}, ` +
        `Active: ${conn.active_connections}, ` +
        `Idle: ${conn.idle_connections}, ` +
        `Idle in transaction: ${conn.idle_in_transaction}`,
    );

    // Check for long-running transactions
    const longTransactions = await db.execute(sql`
      SELECT
        pid,
        now() - pg_stat_activity.query_start AS duration,
        query,
        state
      FROM pg_stat_activity
      WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
        AND state <> 'idle'
        AND pid <> pg_backend_pid()
      ORDER BY duration DESC
    `);

    if (longTransactions.rows.length > 0) {
      dbLogger.warn(`Found ${longTransactions.rows.length} long-running transactions`);
      const transactions = longTransactions.rows as Array<{ pid: number; duration: string; state: string; query: string }>;
      transactions.forEach((txn) => {
        dbLogger.warn(`PID ${txn.pid}: Running for ${txn.duration}, ` + `State: ${txn.state}, Query: ${txn.query.substring(0, 100)}...`);
      });
    }
  } catch (error) {
    dbLogger.logError(error, "Failed to check connection usage");
    throw error;
  }
}

/**
 * Full database health check
 */
export async function runHealthCheck(): Promise<void> {
  dbLogger.info("Running comprehensive database health check");

  try {
    // Get system health score
    const healthScore = await getSystemHealthScore();
    dbLogger.info(`System health score: ${healthScore.score}/100 (${healthScore.status})`);

    // Check database size
    await checkDatabaseSize();

    // Check connection usage
    await checkConnectionUsage();

    // Check for unused indexes
    await identifyUnusedIndexes();

    // Check slow queries
    await checkSlowQueries();

    // Get performance monitoring overview
    await getPerformanceMonitoring();
    dbLogger.info("Performance monitoring data retrieved successfully");

    dbLogger.info("Database health check completed");
  } catch (error) {
    dbLogger.logError(error, "Database health check failed");
    throw error;
  }
}

/**
 * Apply recommended optimizations
 */
export async function applyOptimizations(): Promise<void> {
  dbLogger.info("Applying recommended database optimizations");

  try {
    // Run maintenance tasks
    await runMaintenance();

    // Additional PostgreSQL optimizations
    dbLogger.info("Applying PostgreSQL-specific optimizations");

    // Set work_mem for better sort/hash operations (session-level)
    await db.execute(sql`SET work_mem = '64MB'`);

    // Set maintenance_work_mem for better maintenance operations
    await db.execute(sql`SET maintenance_work_mem = '256MB'`);

    // Enable track_io_timing for better monitoring
    await db.execute(sql`SET track_io_timing = on`);

    dbLogger.info("Database optimizations applied successfully");
  } catch (error) {
    dbLogger.logError(error, "Failed to apply optimizations");
    throw error;
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case "health-check":
        await runHealthCheck();
        break;

      case "maintenance":
        await runMaintenance();
        break;

      case "analyze":
        await runTableAnalyze();
        break;

      case "unused-indexes":
        await identifyUnusedIndexes();
        break;

      case "slow-queries":
        await checkSlowQueries();
        break;

      case "connections":
        await checkConnectionUsage();
        break;

      case "size":
        await checkDatabaseSize();
        break;

      case "optimize":
        await applyOptimizations();
        break;

      case "system-health": {
        const health = await getSystemHealthScore();
        console.log(JSON.stringify(health, null, 2));
        break;
      }

      default:
        console.log("Database Optimization Utility");
        console.log("");
        console.log("Usage: tsx src/db/optimize.ts <command>");
        console.log("");
        console.log("Commands:");
        console.log("  health-check    - Run comprehensive database health check");
        console.log("  maintenance     - Run maintenance tasks (VACUUM, ANALYZE)");
        console.log("  analyze         - Update table statistics");
        console.log("  unused-indexes  - Identify unused indexes");
        console.log("  slow-queries    - Check for slow queries");
        console.log("  connections     - Monitor connection usage");
        console.log("  size            - Check database size and growth");
        console.log("  optimize        - Apply recommended optimizations");
        console.log("  system-health   - Get system health score (JSON output)");
        break;
    }
  } catch (error) {
    dbLogger.logError(error, `Command '${command}' failed`);
    process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
