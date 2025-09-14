/**
 * Simplified view creation utility
 *
 * Instead of parsing complex SQL, we define views as an array of objects
 * This makes it easier to handle errors and debug issues
 */

import { Pool } from "pg";
import { createLogger } from "../lib/logger";
import { getSSLConfig } from "./ssl-config";

const logger = createLogger("db-views");

// Define all views with their SQL and dependencies
const views = [
  {
    name: "v_server_overview",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW v_server_overview AS
      SELECT
          ms.id,
          ms.name,
          ms.endpoint_url,
          ms.transport_type,
          ms.status,
          ms.health_status,
          ms.last_health_check,
          ms.avg_response_time,
          CASE
              WHEN (ms.request_count + ms.error_count) > 0
              THEN ROUND((ms.request_count::numeric / (ms.request_count + ms.error_count)::numeric) * 100, 2)
              ELSE 100.00
          END as success_rate,
          ms.uptime,
          ms.request_count,
          t.name as tenant_name,
          t.status as tenant_status,
          COUNT(DISTINCT mt.id) as tool_count,
          COUNT(DISTINCT mr.id) as resource_count
      FROM
          mcp_server ms
          LEFT JOIN tenant t ON ms.tenant_id = t.id
          LEFT JOIN mcp_tool mt ON ms.id = mt.server_id
          LEFT JOIN mcp_resource mr ON ms.id = mr.server_id
      GROUP BY
          ms.id,
          ms.name,
          ms.endpoint_url,
          ms.transport_type,
          ms.status,
          ms.health_status,
          ms.last_health_check,
          ms.avg_response_time,
          ms.uptime,
          ms.request_count,
          ms.error_count,
          t.name,
          t.status
    `,
  },
  {
    name: "v_active_sessions",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW v_active_sessions AS
      SELECT
          s.id as session_id,
          s.user_id,
          u.email as user_email,
          u.name as user_name,
          u.role as user_role,
          t.name as tenant_name,
          s.created_at as session_start,
          s.expires_at as session_expires,
          s.last_activity_at,
          s.ip_address,
          s.user_agent,
          s.impersonated_by,
          EXTRACT(
              EPOCH
              FROM (s.expires_at - NOW())
          ) / 60 as minutes_until_expiry
      FROM session s
          JOIN "user" u ON s.user_id = u.id
          LEFT JOIN tenant t ON u.tenant_id = t.id
      WHERE
          s.expires_at > NOW()
          AND s.is_revoked = false
      ORDER BY s.created_at DESC
    `,
  },
  {
    name: "v_api_usage_stats",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW v_api_usage_stats AS
      SELECT
          DATE_TRUNC ('hour', au.requested_at) as hour_bucket,
          au.path,
          au.method,
          COUNT(*) as request_count,
          AVG(au.response_time) as avg_response_time,
          MIN(au.response_time) as min_response_time,
          MAX(au.response_time) as max_response_time,
          PERCENTILE_CONT (0.5) WITHIN GROUP (
              ORDER BY au.response_time
          ) as median_response_time,
          PERCENTILE_CONT (0.95) WITHIN GROUP (
              ORDER BY au.response_time
          ) as p95_response_time,
          PERCENTILE_CONT (0.99) WITHIN GROUP (
              ORDER BY au.response_time
          ) as p99_response_time,
          COUNT(*) FILTER (
              WHERE
                  au.status_code >= 200
                  AND au.status_code < 300
          ) as success_count,
          COUNT(*) FILTER (
              WHERE
                  au.status_code >= 400
                  AND au.status_code < 500
          ) as client_error_count,
          COUNT(*) FILTER (
              WHERE
                  au.status_code >= 500
          ) as server_error_count,
          COUNT(DISTINCT au.user_id) as unique_users,
          COUNT(DISTINCT au.ip_address) as unique_ips
      FROM api_usage au
      WHERE
          au.requested_at > NOW() - INTERVAL '24 hours'
      GROUP BY
          DATE_TRUNC ('hour', au.requested_at),
          au.path,
          au.method
      ORDER BY hour_bucket DESC, request_count DESC
    `,
  },
  {
    name: "v_tool_performance",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW v_tool_performance AS
      SELECT
          mt.id as tool_id,
          mt.name as tool_name,
          mt.description,
          ms.name as server_name,
          ms.health_status as server_health,
          mt.call_count as total_calls,
          CASE
              WHEN mt.call_count > mt.error_count
              THEN mt.call_count - mt.error_count
              ELSE 0
          END as success_count,
          mt.error_count,
          CASE
              WHEN mt.call_count > 0 THEN
                  ROUND(((mt.call_count - mt.error_count)::numeric / mt.call_count::numeric) * 100, 2)
              ELSE 0
          END as success_rate,
          mt.avg_execution_time,
          mt.last_used_at as last_used,
          mt.created_at,
          mt.tags as tags
      FROM mcp_tool mt
      JOIN mcp_server ms ON mt.server_id = ms.id
      WHERE mt.call_count > 0
      ORDER BY mt.call_count DESC
    `,
  },
  {
    name: "v_tenant_activity",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW v_tenant_activity AS
      SELECT
          t.id as tenant_id,
          t.name as tenant_name,
          t.status as tenant_status,
          t.plan_type,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT s.id) as active_sessions,
          COUNT(DISTINCT ms.id) as server_count,
          COUNT(DISTINCT ms.id) FILTER (
              WHERE
                  ms.status = 'active'
          ) as active_servers,
          COUNT(DISTINCT at.id) as api_token_count,
          COALESCE(
              SUM(aus.total_requests),
              0
          ) as total_api_calls_today,
          COALESCE(AVG(ms.avg_response_time), 0) as avg_response_time,
          MAX(u.last_login_at) as last_user_activity,
          t.created_at as tenant_created,
          t.updated_at as tenant_updated
      FROM
          tenant t
          LEFT JOIN "user" u ON t.id = u.tenant_id
          LEFT JOIN session s ON u.id = s.user_id
          AND s.expires_at > NOW()
          AND s.is_revoked = false
          LEFT JOIN mcp_server ms ON t.id = ms.tenant_id
          LEFT JOIN api_token at ON t.id = at.tenant_id
          AND at.is_active = true
          LEFT JOIN api_usage_stats aus ON t.id = aus.tenant_id
          AND aus.period_type = 'day'
          AND aus.period_start = CURRENT_DATE
      GROUP BY
          t.id,
          t.name,
          t.status,
          t.plan_type,
          t.created_at,
          t.updated_at
      ORDER BY total_api_calls_today DESC
    `,
  },
  {
    name: "v_security_audit",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW v_security_audit AS
      SELECT
          al.id as audit_id,
          al.occurred_at as timestamp,
          al.event_type,
          al.action,
          al.actor_id as user_id,
          u.email as user_email,
          u.role as user_role,
          al.resource_type,
          al.resource_id,
          al.success,
          al.error_message,
          al.actor_ip as ip_address,
          al.actor_user_agent as user_agent,
          al.risk_level,
          t.name as tenant_name,
          al.metadata
      FROM audit_log al
          LEFT JOIN "user" u ON al.actor_id = u.id
          LEFT JOIN tenant t ON al.tenant_id = t.id
      WHERE
          al.occurred_at > NOW() - INTERVAL '7 days'
      ORDER BY al.occurred_at DESC
    `,
  },
  {
    name: "v_rate_limit_status",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW v_rate_limit_status AS
      SELECT
          rlc.id as config_id,
          rlc.name as limit_name,
          rlc.scope,
          rlc.rules::text as rules,
          rlc.priority,
          rlc.is_active,
          COUNT(rlv.id) as violation_count_24h,
          MAX(rlv.violated_at) as last_violation,
          CASE
              WHEN COUNT(rlv.id) > 10 THEN 'HIGH'
              WHEN COUNT(rlv.id) > 5 THEN 'MEDIUM'
              WHEN COUNT(rlv.id) > 0 THEN 'LOW'
              ELSE 'NONE'
          END as violation_severity
      FROM
          rate_limit_config rlc
          LEFT JOIN rate_limit_violation rlv ON (
              rlv.rule_id = rlc.id
              AND rlv.violated_at > NOW() - INTERVAL '24 hours'
          )
      WHERE
          rlc.is_active = true
      GROUP BY
          rlc.id,
          rlc.name,
          rlc.scope,
          rlc.rules::text,
          rlc.priority,
          rlc.is_active
      ORDER BY violation_count_24h DESC
    `,
  },
  {
    name: "v_system_health_dashboard",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW v_system_health_dashboard AS
      WITH server_health AS (
          SELECT
              COUNT(*) as total_servers,
              COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_servers,
              COUNT(*) FILTER (WHERE health_status = 'unhealthy') as unhealthy_servers,
              AVG(avg_response_time) as avg_response_time
          FROM mcp_server
          WHERE status = 'active'
      ),
      api_metrics AS (
          SELECT
              COUNT(*) as requests_24h,
              AVG(response_time) as avg_api_response,
              COUNT(*) FILTER (WHERE status_code >= 400) as errors_24h
          FROM api_usage
          WHERE requested_at > NOW() - INTERVAL '24 hours'
      ),
      session_metrics AS (
          SELECT
              COUNT(*) as active_sessions,
              COUNT(DISTINCT user_id) as unique_users
          FROM session
          WHERE expires_at > NOW() AND is_revoked = false
      ),
      tenant_metrics AS (
          SELECT
              COUNT(*) as total_tenants,
              COUNT(*) FILTER (WHERE status = 'active') as active_tenants
          FROM tenant
      )
      SELECT
          sh.total_servers,
          sh.healthy_servers,
          sh.unhealthy_servers,
          ROUND(sh.avg_response_time::numeric, 2) as avg_server_response_ms,
          am.requests_24h,
          ROUND(am.avg_api_response::numeric, 2) as avg_api_response_ms,
          am.errors_24h,
          ROUND((am.errors_24h::numeric / NULLIF(am.requests_24h, 0)::numeric) * 100, 2) as error_rate_percent,
          sm.active_sessions,
          sm.unique_users,
          tm.total_tenants,
          tm.active_tenants,
          NOW() as dashboard_generated_at
      FROM server_health sh
      CROSS JOIN api_metrics am
      CROSS JOIN session_metrics sm
      CROSS JOIN tenant_metrics tm
    `,
  },
  {
    name: "mv_daily_usage_summary",
    type: "MATERIALIZED VIEW",
    sql: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_usage_summary AS
      SELECT
          DATE(au.requested_at) as usage_date,
          t.id as tenant_id,
          t.name as tenant_name,
          COUNT(*) as total_requests,
          COUNT(DISTINCT au.user_id) as unique_users,
          COUNT(DISTINCT au.path) as unique_endpoints,
          AVG(au.response_time) as avg_response_time,
          PERCENTILE_CONT (0.5) WITHIN GROUP (
              ORDER BY au.response_time
          ) as median_response_time,
          PERCENTILE_CONT (0.95) WITHIN GROUP (
              ORDER BY au.response_time
          ) as p95_response_time,
          COUNT(*) FILTER (
              WHERE
                  au.status_code >= 200
                  AND au.status_code < 300
          ) as success_count,
          COUNT(*) FILTER (
              WHERE
                  au.status_code >= 400
          ) as error_count,
          SUM(au.response_size) as total_bytes_served
      FROM api_usage au
          LEFT JOIN "user" u ON au.user_id = u.id
          LEFT JOIN tenant t ON u.tenant_id = t.id
      WHERE
          au.requested_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY
          DATE(au.requested_at),
          t.id,
          t.name
      ORDER BY usage_date DESC, total_requests DESC
    `,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_mv_daily_usage_date ON mv_daily_usage_summary (usage_date DESC)",
      "CREATE INDEX IF NOT EXISTS idx_mv_daily_usage_tenant ON mv_daily_usage_summary (tenant_id, usage_date DESC)",
    ],
  },
  {
    name: "mv_server_performance_metrics",
    type: "MATERIALIZED VIEW",
    sql: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_server_performance_metrics AS
      SELECT
          ms.id as server_id,
          ms.name as server_name,
          ms.endpoint_url,
          ms.health_status,
          DATE_TRUNC ('hour', sm.timestamp) as hour_bucket,
          COUNT(*) as metric_count,
          AVG(sm.response_time_ms) as avg_response_time,
          MIN(sm.response_time_ms) as min_response_time,
          MAX(sm.response_time_ms) as max_response_time,
          AVG(sm.requests_per_second) as avg_rps,
          AVG(sm.error_rate) as avg_error_rate,
          AVG(sm.cpu_usage) as avg_cpu_usage,
          AVG(sm.memory_usage_mb) as avg_memory_mb
      FROM
          mcp_server ms
          JOIN server_metrics sm ON ms.id = sm.server_id
      WHERE
          sm.timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY
          ms.id,
          ms.name,
          ms.endpoint_url,
          ms.health_status,
          DATE_TRUNC ('hour', sm.timestamp)
      ORDER BY hour_bucket DESC, server_name
    `,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_mv_server_perf_server ON mv_server_performance_metrics (server_id, hour_bucket DESC)",
      "CREATE INDEX IF NOT EXISTS idx_mv_server_perf_time ON mv_server_performance_metrics (hour_bucket DESC)",
    ],
  },
  {
    name: "database_size_summary",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW database_size_summary AS
      SELECT
          pg_database_size(current_database()) as total_size_bytes,
          pg_size_pretty(pg_database_size(current_database())) as total_size_pretty,
          (SELECT COUNT(*) FROM pg_stat_user_tables) as table_count,
          (SELECT COUNT(*) FROM pg_stat_user_indexes) as index_count,
          (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') as view_count,
          (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as function_count,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
          NOW() as checked_at
    `,
  },
  {
    name: "index_usage_summary",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW index_usage_summary AS
      SELECT
          schemaname,
          relname as tablename,
          indexrelname as indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched,
          CASE
              WHEN idx_scan = 0 THEN 'Unused'
              WHEN idx_scan < 10 THEN 'Rarely Used'
              WHEN idx_scan < 100 THEN 'Occasionally Used'
              ELSE 'Frequently Used'
          END as usage_category,
          pg_relation_size(indexrelid) as size_bytes
      FROM pg_stat_user_indexes
      ORDER BY idx_scan, pg_relation_size(indexrelid) DESC
    `,
  },
  {
    name: "performance_monitoring",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW performance_monitoring AS
      SELECT
          'database' as component,
          pg_database_size(current_database()) as metric_value,
          'Database Size (bytes)' as metric_name,
          pg_size_pretty(pg_database_size(current_database())) as metric_display,
          NOW() as timestamp
      UNION ALL
      SELECT
          'connections' as component,
          COUNT(*)::bigint as metric_value,
          'Active Connections' as metric_name,
          COUNT(*)::text || ' connections' as metric_display,
          NOW() as timestamp
      FROM pg_stat_activity
      WHERE state = 'active'
      UNION ALL
      SELECT
          'tables' as component,
          COUNT(*)::bigint as metric_value,
          'Total Tables' as metric_name,
          COUNT(*)::text || ' tables' as metric_display,
          NOW() as timestamp
      FROM pg_stat_user_tables
      UNION ALL
      SELECT
          'indexes' as component,
          COUNT(*)::bigint as metric_value,
          'Total Indexes' as metric_name,
          COUNT(*)::text || ' indexes' as metric_display,
          NOW() as timestamp
      FROM pg_stat_user_indexes
    `,
  },
  {
    name: "performance_alert_status",
    type: "VIEW",
    sql: `
      CREATE OR REPLACE VIEW performance_alert_status AS
      SELECT
          pa.id as alert_id,
          pa.name as alert_name,
          pa.description,
          pa.server_id,
          ms.name as server_name,
          pa.metric_name,
          pa.threshold_value,
          pa.comparison_operator,
          pa.duration_minutes,
          pa.is_active,
          pa.is_triggered,
          pa.last_triggered,
          pa.trigger_count as trigger_count_total,
          CASE
              WHEN pa.is_triggered AND pa.threshold_value >= 1000 THEN 'Active - Critical'
              WHEN pa.is_triggered AND pa.threshold_value >= 500 THEN 'Active - Warning'
              WHEN pa.is_triggered THEN 'Active - Info'
              WHEN pa.is_active AND NOT pa.is_triggered THEN 'Monitoring'
              ELSE 'Inactive'
          END as alert_status,
          CASE
              WHEN pa.threshold_value >= 1000 THEN 'CRITICAL'
              WHEN pa.threshold_value >= 500 THEN 'WARNING'
              ELSE 'INFO'
          END as severity,
          CASE
              WHEN pa.last_triggered IS NOT NULL THEN
                  EXTRACT(EPOCH FROM (NOW() - pa.last_triggered)) / 60
              ELSE NULL
          END as minutes_since_last_trigger,
          pa.created_at,
          pa.updated_at
      FROM
          performance_alerts pa
          LEFT JOIN mcp_server ms ON pa.server_id = ms.id
      ORDER BY
          pa.is_triggered DESC,
          pa.threshold_value DESC,
          pa.last_triggered DESC
    `,
  },
];

/**
 * Create all views in the database
 */
export async function createViews(): Promise<{
  success: boolean;
  created: string[];
  failed: string[];
  errors: Record<string, string>;
}> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig(),
  });

  const created: string[] = [];
  const failed: string[] = [];
  const errors: Record<string, string> = {};

  try {
    const client = await pool.connect();

    for (const view of views) {
      try {
        logger.info(`Creating ${view.type}: ${view.name}...`);

        // Create the view
        await client.query(view.sql);

        // Create indexes if specified (for materialized views)
        if (view.indexes) {
          for (const indexSql of view.indexes) {
            try {
              await client.query(indexSql);
            } catch (indexError) {
              const errorMessage = indexError instanceof Error ? indexError.message : String(indexError);
              // Log but don't fail if index already exists
              if (!errorMessage.includes("already exists")) {
                logger.warn(`   ⚠️  Failed to create index for ${view.name}: ${errorMessage}`);
              }
            }
          }
        }

        created.push(view.name);
        logger.info(`   ✅ Created ${view.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push(view.name);
        errors[view.name] = errorMessage;
        logger.error(`   ❌ Failed to create ${view.name}: ${errorMessage}`);
      }
    }

    client.release();

    const success = failed.length === 0;

    if (success) {
      logger.info(`✅ Successfully created all ${created.length} views`);
    } else {
      logger.warn(`⚠️  Created ${created.length} views, ${failed.length} failed`);
      logger.warn(`   Failed views: ${failed.join(", ")}`);
    }

    return { success, created, failed, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to connect to database: ${errorMessage}`);
    return { success: false, created, failed, errors };
  } finally {
    await pool.end();
  }
}

/**
 * Drop all views
 */
export async function dropViews(): Promise<boolean> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig(),
  });

  try {
    const client = await pool.connect();

    // Drop in reverse order to handle dependencies
    for (let i = views.length - 1; i >= 0; i--) {
      const view = views[i];
      try {
        const dropStatement =
          view.type === "MATERIALIZED VIEW"
            ? `DROP MATERIALIZED VIEW IF EXISTS ${view.name} CASCADE`
            : `DROP VIEW IF EXISTS ${view.name} CASCADE`;

        await client.query(dropStatement);
        logger.info(`   ✅ Dropped ${view.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`   ⚠️  Failed to drop ${view.name}: ${errorMessage}`);
      }
    }

    client.release();
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to drop views: ${errorMessage}`);
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Refresh materialized views
 */
export async function refreshMaterializedViews(): Promise<boolean> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig(),
  });

  try {
    const client = await pool.connect();

    const materializedViews = views.filter((v) => v.type === "MATERIALIZED VIEW");

    for (const view of materializedViews) {
      try {
        await client.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view.name}`);
        logger.info(`   ✅ Refreshed ${view.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`   ⚠️  Failed to refresh ${view.name}: ${errorMessage}`);
      }
    }

    client.release();
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to refresh materialized views: ${errorMessage}`);
    return false;
  } finally {
    await pool.end();
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case "create":
      createViews()
        .then((result) => process.exit(result.success ? 0 : 1))
        .catch((error) => {
          logger.error("Error creating views", error);
          process.exit(1);
        });
      break;

    case "drop":
      dropViews()
        .then((success) => process.exit(success ? 0 : 1))
        .catch((error) => {
          logger.error("Error dropping views", error);
          process.exit(1);
        });
      break;

    case "refresh":
      refreshMaterializedViews()
        .then((success) => process.exit(success ? 0 : 1))
        .catch((error) => {
          logger.error("Error refreshing views", error);
          process.exit(1);
        });
      break;

    default:
      // eslint-disable-next-line no-console
      console.log("Usage: tsx setup-views.ts [create|drop|refresh]");
      process.exit(0);
  }
}
