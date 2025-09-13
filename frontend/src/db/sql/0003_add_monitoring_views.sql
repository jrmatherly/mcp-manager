-- Monitoring Views Migration
-- This migration adds database monitoring and maintenance views

-- ============================================================================
-- Database Size Summary View
-- ============================================================================

CREATE OR REPLACE VIEW database_size_summary AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    ROUND(
        (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename))::numeric /
        NULLIF(pg_total_relation_size(schemaname||'.'||tablename)::numeric, 0) * 100,
        2
    ) AS index_percentage,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = pgt.schemaname AND tablename = pgt.tablename) AS index_count
FROM pg_tables pgt
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW database_size_summary IS 'Shows table sizes, data sizes, and index sizes for all public tables';

-- ============================================================================
-- Index Usage Summary View
-- ============================================================================

CREATE OR REPLACE VIEW index_usage_summary AS
WITH index_stats AS (
    SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_relation_size(indexrelid) as index_size,
        CASE
            WHEN idx_scan = 0 THEN 'Unused'
            WHEN idx_scan < 100 THEN 'Low usage'
            ELSE 'Active'
        END as usage_category
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(index_size) as index_size,
    usage_category,
    ROUND(
        (idx_tup_fetch::numeric / NULLIF(idx_scan::numeric, 0)),
        2
    ) as avg_tuples_per_scan
FROM index_stats
ORDER BY
    CASE usage_category
        WHEN 'Unused' THEN 1
        WHEN 'Low usage' THEN 2
        ELSE 3
    END,
    index_size DESC;

COMMENT ON VIEW index_usage_summary IS 'Tracks index usage statistics and categorizes indexes by usage level';

-- ============================================================================
-- Performance Monitoring View
-- ============================================================================

CREATE OR REPLACE VIEW performance_monitoring AS
WITH server_health AS (
    SELECT
        'server_health' as metric_category,
        jsonb_build_object(
            'total_servers', COUNT(*),
            'healthy_servers', COUNT(*) FILTER (WHERE health_status = 'HEALTHY'),
            'unhealthy_servers', COUNT(*) FILTER (WHERE health_status = 'UNHEALTHY'),
            'degraded_servers', COUNT(*) FILTER (WHERE health_status = 'DEGRADED'),
            'avg_response_time', ROUND(AVG(avg_response_time)::numeric, 2),
            'avg_success_rate', ROUND(AVG(success_rate)::numeric, 2)
        ) as metrics
    FROM mcp_servers
    WHERE deleted_at IS NULL
),
recent_requests AS (
    SELECT
        'recent_requests' as metric_category,
        jsonb_build_object(
            'total_requests_1h', COUNT(*),
            'successful_requests_1h', COUNT(*) FILTER (WHERE status_code < 400),
            'error_requests_1h', COUNT(*) FILTER (WHERE status_code >= 400),
            'avg_duration_ms', ROUND(AVG(duration_ms)::numeric, 2),
            'p95_duration_ms', ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2),
            'p99_duration_ms', ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2),
            'unique_users', COUNT(DISTINCT user_id),
            'unique_tenants', COUNT(DISTINCT tenant_id)
        ) as metrics
    FROM request_logs
    WHERE request_time > NOW() - INTERVAL '1 hour'
),
active_sessions AS (
    SELECT
        'active_sessions' as metric_category,
        jsonb_build_object(
            'total_sessions', COUNT(*),
            'active_sessions', COUNT(*) FILTER (WHERE is_active = true),
            'sessions_expiring_soon', COUNT(*) FILTER (WHERE is_active = true AND expires_at < NOW() + INTERVAL '1 hour'),
            'unique_users', COUNT(DISTINCT user_id)
        ) as metrics
    FROM session
    WHERE expires_at > NOW()
),
api_usage AS (
    SELECT
        'api_usage' as metric_category,
        jsonb_build_object(
            'active_tokens', COUNT(*),
            'tokens_used_today', COUNT(*) FILTER (WHERE last_used_at > CURRENT_DATE),
            'high_usage_tokens', COUNT(*) FILTER (WHERE usage_count > 1000),
            'expiring_soon', COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '7 days' AND is_active = true)
        ) as metrics
    FROM api_token
    WHERE is_active = true
),
circuit_breakers AS (
    SELECT
        'circuit_breakers' as metric_category,
        jsonb_build_object(
            'total_breakers', COUNT(*),
            'open_breakers', COUNT(*) FILTER (WHERE state = 'OPEN'),
            'half_open_breakers', COUNT(*) FILTER (WHERE state = 'HALF_OPEN'),
            'closed_breakers', COUNT(*) FILTER (WHERE state = 'CLOSED'),
            'high_failure_breakers', COUNT(*) FILTER (WHERE failure_count > failure_threshold)
        ) as metrics
    FROM circuit_breakers
),
connection_pools AS (
    SELECT
        'connection_pools' as metric_category,
        jsonb_build_object(
            'total_pools', COUNT(*),
            'total_active_connections', SUM(active_connections),
            'total_idle_connections', SUM(idle_connections),
            'avg_utilization', ROUND(AVG(active_connections::numeric / NULLIF(max_connections::numeric, 0) * 100), 2),
            'pools_over_80_percent', COUNT(*) FILTER (WHERE active_connections::numeric / NULLIF(max_connections::numeric, 0) > 0.8)
        ) as metrics
    FROM connection_pools
)
SELECT
    metric_category,
    metrics,
    NOW() as snapshot_time
FROM (
    SELECT * FROM server_health
    UNION ALL
    SELECT * FROM recent_requests
    UNION ALL
    SELECT * FROM active_sessions
    UNION ALL
    SELECT * FROM api_usage
    UNION ALL
    SELECT * FROM circuit_breakers
    UNION ALL
    SELECT * FROM connection_pools
) combined_metrics;

COMMENT ON VIEW performance_monitoring IS 'Real-time performance overview combining multiple system metrics';

-- ============================================================================
-- Tenant Activity Summary View
-- ============================================================================

CREATE OR REPLACE VIEW tenant_activity_summary AS
SELECT
    t.id as tenant_id,
    t.name as tenant_name,
    t.plan as tenant_plan,
    (
        SELECT COUNT(*)
        FROM "user" u
        WHERE
            u.tenant_id = t.id
    ) as total_users,
    (
        SELECT COUNT(*)
        FROM "user" u
        WHERE
            u.tenant_id = t.id
            AND u.is_active = true
    ) as active_users,
    (
        SELECT COUNT(*)
        FROM mcp_servers ms
        WHERE
            ms.tenant_id = t.id
    ) as total_servers,
    (
        SELECT COUNT(*)
        FROM api_token at
        WHERE
            at.tenant_id = t.id
            AND at.is_active = true
    ) as active_api_tokens,
    (
        SELECT COUNT(*)
        FROM request_logs rl
        WHERE
            rl.tenant_id = t.id
            AND rl.request_time > NOW() - INTERVAL '24 hours'
    ) as requests_24h,
    (
        SELECT COUNT(*)
        FROM audit_log al
        WHERE
            al.tenant_id = t.id
            AND al.timestamp > NOW() - INTERVAL '24 hours'
    ) as audit_events_24h,
    t.created_at,
    t.updated_at
FROM tenant t
ORDER BY requests_24h DESC;

COMMENT ON VIEW tenant_activity_summary IS 'Summary of tenant activity and resource usage';

-- ============================================================================
-- Server Tool Performance View
-- ============================================================================

CREATE OR REPLACE VIEW server_tool_performance AS
SELECT
    ms.id as server_id,
    ms.name as server_name,
    mt.id as tool_id,
    mt.name as tool_name,
    mt.description,
    mt.total_calls,
    mt.success_count,
    mt.error_count,
    ROUND(
        (mt.success_count::numeric / NULLIF(mt.total_calls::numeric, 0)) * 100,
        2
    ) as success_rate,
    mt.avg_execution_time,
    mt.last_called_at,
    CASE
        WHEN mt.total_calls = 0 THEN 'Never used'
        WHEN mt.last_called_at < NOW() - INTERVAL '30 days' THEN 'Inactive'
        WHEN mt.error_count::numeric / NULLIF(mt.total_calls::numeric, 0) > 0.1 THEN 'Problematic'
        ELSE 'Healthy'
    END as tool_status
FROM mcp_tools mt
JOIN mcp_servers ms ON ms.id = mt.server_id
WHERE ms.deleted_at IS NULL
ORDER BY mt.total_calls DESC;

COMMENT ON VIEW server_tool_performance IS 'Performance metrics and status for all server tools';

-- ============================================================================
-- Recent Errors View
-- ============================================================================

CREATE OR REPLACE VIEW recent_errors AS
SELECT
    el.id as error_id,
    el.timestamp,
    el.level,
    el.message,
    el.error_code,
    el.user_id,
    u.email as user_email,
    el.tenant_id,
    t.name as tenant_name,
    el.request_id,
    el.stack_trace,
    el.metadata
FROM error_log el
    LEFT JOIN "user" u ON u.id = el.user_id
    LEFT JOIN tenant t ON t.id = el.tenant_id
WHERE
    el.timestamp > NOW() - INTERVAL '24 hours'
ORDER BY el.timestamp DESC
LIMIT 100;

COMMENT ON VIEW recent_errors IS 'Recent errors with user and tenant information';

-- ============================================================================
-- API Endpoint Usage View
-- ============================================================================

CREATE OR REPLACE VIEW api_endpoint_usage AS
WITH endpoint_stats AS (
    SELECT
        path,
        method,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE status_code < 400) as successful_calls,
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500) as client_errors,
        COUNT(*) FILTER (WHERE status_code >= 500) as server_errors,
        AVG(duration_ms) as avg_duration_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_duration_ms,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT tenant_id) as unique_tenants
    FROM request_logs
    WHERE request_time > NOW() - INTERVAL '24 hours'
    GROUP BY path, method
)
SELECT
    path,
    method,
    total_calls,
    successful_calls,
    client_errors,
    server_errors,
    ROUND((successful_calls::numeric / NULLIF(total_calls::numeric, 0)) * 100, 2) as success_rate,
    ROUND(avg_duration_ms::numeric, 2) as avg_duration_ms,
    ROUND(p95_duration_ms::numeric, 2) as p95_duration_ms,
    ROUND(p99_duration_ms::numeric, 2) as p99_duration_ms,
    unique_users,
    unique_tenants
FROM endpoint_stats
ORDER BY total_calls DESC;

COMMENT ON VIEW api_endpoint_usage IS 'API endpoint usage statistics for the last 24 hours';

-- ============================================================================
-- Security Events Dashboard View
-- ============================================================================

CREATE OR REPLACE VIEW security_events_dashboard AS
WITH
    recent_events AS (
        SELECT
            se.id,
            se.timestamp,
            se.event_type,
            se.severity,
            se.user_id,
            u.email as user_email,
            se.tenant_id,
            t.name as tenant_name,
            se.ip_address,
            se.user_agent,
            se.success,
            se.metadata
        FROM
            security_event se
            LEFT JOIN "user" u ON u.id = se.user_id
            LEFT JOIN tenant t ON t.id = se.tenant_id
        WHERE
            se.timestamp > NOW() - INTERVAL '24 hours'
    )
SELECT
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(*) FILTER (
        WHERE
            success = true
    ) as successful_events,
    COUNT(*) FILTER (
        WHERE
            success = false
    ) as failed_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT tenant_id) as unique_tenants,
    COUNT(DISTINCT ip_address) as unique_ips,
    array_agg (DISTINCT ip_address) FILTER (
        WHERE
            success = false
    ) as failed_ips
FROM recent_events
GROUP BY
    event_type,
    severity
ORDER BY event_count DESC;

COMMENT ON VIEW security_events_dashboard IS 'Security event summary for monitoring and alerting';

-- ============================================================================
-- Performance Alert Status View
-- ============================================================================

CREATE OR REPLACE VIEW performance_alert_status AS
SELECT
    pa.id as alert_id,
    pa.alert_type,
    pa.severity,
    pa.threshold_value,
    pa.actual_value,
    pa.server_id,
    ms.name as server_name,
    pa.created_at,
    pa.resolved_at,
    CASE
        WHEN pa.resolved_at IS NOT NULL THEN 'Resolved'
        WHEN pa.severity = 'CRITICAL' THEN 'Critical - Active'
        WHEN pa.severity = 'HIGH' THEN 'High - Active'
        WHEN pa.severity = 'MEDIUM' THEN 'Medium - Active'
        ELSE 'Low - Active'
    END as alert_status,
    CASE
        WHEN pa.resolved_at IS NOT NULL THEN pa.resolved_at - pa.created_at
        ELSE NOW() - pa.created_at
    END as duration
FROM
    performance_alerts pa
    LEFT JOIN mcp_servers ms ON ms.id = pa.server_id
WHERE
    pa.created_at > NOW() - INTERVAL '7 days'
ORDER BY
    CASE
        WHEN pa.resolved_at IS NULL THEN 0
        ELSE 1
    END,
    CASE pa.severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        ELSE 4
    END,
    pa.created_at DESC;

COMMENT ON VIEW performance_alert_status IS 'Current and recent performance alerts with resolution status';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant select permissions to the application role (adjust role name as needed)
-- GRANT SELECT ON database_size_summary TO mcp_user;
-- GRANT SELECT ON index_usage_summary TO mcp_user;
-- GRANT SELECT ON performance_monitoring TO mcp_user;
-- GRANT SELECT ON tenant_activity_summary TO mcp_user;
-- GRANT SELECT ON server_tool_performance TO mcp_user;
-- GRANT SELECT ON recent_errors TO mcp_user;
-- GRANT SELECT ON api_endpoint_usage TO mcp_user;
-- GRANT SELECT ON security_events_dashboard TO mcp_user;
-- GRANT SELECT ON performance_alert_status TO mcp_user;