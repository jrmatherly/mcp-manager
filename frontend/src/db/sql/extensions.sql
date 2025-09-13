-- PostgreSQL Extensions and Database Functions for Backend Compatibility
--
-- This file contains the database extensions and functions required by the
-- Python backend that are not automatically handled by Drizzle migrations.
--
-- Run this file after running Drizzle migrations to ensure full compatibility.

-- ============================================================================
-- POSTGRESQL EXTENSIONS
-- ============================================================================

-- Enable UUID generation functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions (for enhanced security)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable additional text search capabilities (if needed)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to generate UUIDs (compatible with backend UUID generation)
CREATE OR REPLACE FUNCTION generate_uuid()
RETURNS uuid AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Function to get current UTC timestamp (timezone-naive for PostgreSQL)
CREATE OR REPLACE FUNCTION utc_now()
RETURNS timestamp AS $$
BEGIN
    RETURN (NOW() AT TIME ZONE 'UTC');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Server Health Summary Function
CREATE OR REPLACE FUNCTION get_server_health_summary()
RETURNS TABLE(
    total_servers bigint,
    healthy_servers bigint,
    unhealthy_servers bigint,
    degraded_servers bigint,
    avg_response_time numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_servers,
        COUNT(*) FILTER (WHERE health = 'healthy') as healthy_servers,
        COUNT(*) FILTER (WHERE health = 'unhealthy') as unhealthy_servers,
        COUNT(*) FILTER (WHERE health = 'degraded') as degraded_servers,
        ROUND(AVG(response_time)::numeric, 2) as avg_response_time
    FROM mcp_server;
END;
$$ LANGUAGE plpgsql;

-- Request Performance Summary Function
CREATE OR REPLACE FUNCTION get_request_performance_summary(
    p_hours integer DEFAULT 24
)
RETURNS TABLE(
    total_requests bigint,
    successful_requests bigint,
    error_requests bigint,
    avg_duration_ms numeric,
    p95_duration_ms numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
        COUNT(*) FILTER (WHERE status_code >= 400) as error_requests,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_duration_ms,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2) as p95_duration_ms
    FROM request_logs
    WHERE request_time > NOW() - INTERVAL '1 hour' * p_hours
      AND duration_ms IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Tenant Usage Summary Function
CREATE OR REPLACE FUNCTION get_tenant_usage_summary(
    p_tenant_id text,
    p_hours integer DEFAULT 24
)
RETURNS TABLE(
    total_requests bigint,
    unique_users bigint,
    avg_duration_ms numeric,
    error_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_requests,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_duration_ms,
        ROUND((COUNT(*) FILTER (WHERE status_code >= 400)::numeric / COUNT(*)::numeric * 100), 2) as error_rate
    FROM request_logs
    WHERE tenant_id = p_tenant_id::uuid
      AND request_time > NOW() - INTERVAL '1 hour' * p_hours;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MAINTENANCE AND MONITORING VIEWS
-- ============================================================================

-- Database Size Summary View
CREATE OR REPLACE VIEW database_size_summary AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty (
        pg_total_relation_size (
            schemaname || '.' || tablename
        )
    ) as table_size,
    pg_size_pretty (
        pg_relation_size (
            schemaname || '.' || tablename
        )
    ) as data_size,
    pg_size_pretty (
        pg_total_relation_size (
            schemaname || '.' || tablename
        ) - pg_relation_size (
            schemaname || '.' || tablename
        )
    ) as index_size
FROM pg_tables
WHERE
    schemaname = 'public'
ORDER BY pg_total_relation_size (
        schemaname || '.' || tablename
    ) DESC;

-- Index Usage Summary View
CREATE OR REPLACE VIEW index_usage_summary AS
SELECT
    i.indexrelname as index_name,
    t.relname as table_name,
    s.idx_tup_read as index_reads,
    s.idx_tup_fetch as index_fetches,
    pg_size_pretty (
        pg_relation_size (i.indexrelid)
    ) as index_size,
    CASE
        WHEN s.idx_tup_read = 0 THEN 'Unused'
        WHEN s.idx_tup_read < 1000 THEN 'Low usage'
        ELSE 'Active'
    END as usage_category
FROM
    pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    JOIN pg_class t ON i.indrelid = t.oid
WHERE
    t.relname IN (
        'mcp_server',
        'mcp_tool',
        'mcp_resource',
        'server_metrics',
        'user',
        'session',
        'api_token',
        'audit_log',
        'request_logs',
        'fastmcp_audit_log',
        'tenant',
        'circuit_breakers',
        'connection_pools',
        'request_queues',
        'enhanced_api_keys',
        'server_access_control',
        'performance_alerts'
    )
ORDER BY s.idx_tup_read DESC;

-- Performance Monitoring View

CREATE OR REPLACE VIEW performance_monitoring AS
SELECT
    'servers' as component,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE health = 'healthy') as healthy_count,
    ROUND(AVG(response_time), 2) as avg_response_time,
    ROUND(AVG(CASE WHEN success_rate IS NOT NULL THEN success_rate ELSE 100 END), 2) as avg_success_rate
FROM mcp_server

UNION ALL

SELECT
    'recent_requests' as component,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status_code < 400) as healthy_count,
    ROUND(AVG(duration_ms), 2) as avg_response_time,
    ROUND((COUNT(*) FILTER (WHERE status_code < 400)::float / COUNT(*) * 100), 2) as avg_success_rate
FROM request_logs
WHERE request_time > NOW() - INTERVAL '1 hour';

-- ============================================================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = utc_now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at columns
-- Note: This will be applied to tables that have updated_at columns

-- ============================================================================
-- DATA CLEANUP AND MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to cleanup old request logs
CREATE OR REPLACE FUNCTION cleanup_old_request_logs(
    retention_days integer DEFAULT 30
)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM request_logs
    WHERE request_time < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
    retention_days integer DEFAULT 90
)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM audit_log
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old error logs
CREATE OR REPLACE FUNCTION cleanup_old_error_logs(
    retention_days integer DEFAULT 60
)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM error_log
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ANALYTICS AND REPORTING FUNCTIONS
-- ============================================================================

-- Function to get server usage statistics
CREATE OR REPLACE FUNCTION get_server_usage_stats(
    p_server_id uuid,
    p_days integer DEFAULT 7
)
RETURNS TABLE(
    date date,
    total_requests bigint,
    avg_response_time numeric,
    error_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        request_time::date as date,
        COUNT(*) as total_requests,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_response_time,
        ROUND((COUNT(*) FILTER (WHERE status_code >= 400)::numeric / COUNT(*)::numeric * 100), 2) as error_rate
    FROM request_logs
    WHERE target_server_id = p_server_id
      AND request_time > NOW() - INTERVAL '1 day' * p_days
    GROUP BY request_time::date
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant resource utilization
CREATE OR REPLACE FUNCTION get_tenant_resource_utilization(
    p_tenant_id uuid,
    p_days integer DEFAULT 30
)
RETURNS TABLE(
    date date,
    total_requests bigint,
    total_servers bigint,
    total_api_calls bigint,
    avg_response_time numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.request_time::date as date,
        COUNT(r.*) as total_requests,
        COUNT(DISTINCT r.target_server_id) as total_servers,
        COALESCE(SUM(u.requests), 0) as total_api_calls,
        ROUND(AVG(r.duration_ms)::numeric, 2) as avg_response_time
    FROM request_logs r
    LEFT JOIN api_usage u ON r.tenant_id = u.tenant_id AND r.request_time::date = u.created_at::date
    WHERE r.tenant_id = p_tenant_id
      AND r.request_time > NOW() - INTERVAL '1 day' * p_days
    GROUP BY r.request_time::date
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL extensions and functions have been successfully installed.';
    RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto, unaccent';
    RAISE NOTICE 'Functions: Health monitoring, performance analytics, data cleanup';
    RAISE NOTICE 'Views: Database size, index usage, performance monitoring';
    RAISE NOTICE 'Backend compatibility functions are now available.';
END
$$;