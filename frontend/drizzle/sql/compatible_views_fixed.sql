-- Fixed Compatible Monitoring Views for Current Schema
-- These views use the correct column names from the existing tables

-- ============================================================================
-- Database Size Summary View (Already works correctly)
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

-- ============================================================================
-- Index Usage Summary View (Already works correctly)
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

-- ============================================================================
-- Server Health Dashboard View (Already works correctly)
-- ============================================================================

CREATE OR REPLACE VIEW server_health_dashboard AS
SELECT
    ms.id as server_id,
    ms.name as server_name,
    ms.health_status,
    ms.status,
    ms.avg_response_time,
    ms.uptime,
    ms.request_count,
    ms.error_count,
    ROUND(
        CASE
            WHEN ms.request_count > 0
            THEN ((ms.request_count - ms.error_count)::numeric / ms.request_count::numeric) * 100
            ELSE 100
        END, 2
    ) as success_rate,
    ms.last_health_check,
    ms.last_used_at,
    CASE
        WHEN ms.status = 'inactive' THEN 'Inactive'
        WHEN ms.health_status = 'healthy' AND ms.uptime > 95 THEN 'Excellent'
        WHEN ms.health_status = 'healthy' THEN 'Good'
        WHEN ms.health_status = 'degraded' THEN 'Degraded'
        WHEN ms.health_status = 'unhealthy' THEN 'Problematic'
        ELSE 'Unknown'
    END as overall_status,
    (SELECT COUNT(*) FROM mcp_tool mt WHERE mt.server_id = ms.id) as tool_count,
    ms.tenant_id,
    t.name as tenant_name,
    ms.created_at,
    ms.updated_at
FROM mcp_server ms
LEFT JOIN tenant t ON t.id = ms.tenant_id
ORDER BY
    CASE ms.health_status
        WHEN 'unhealthy' THEN 1
        WHEN 'degraded' THEN 2
        WHEN 'unknown' THEN 3
        WHEN 'healthy' THEN 4
        ELSE 5
    END,
    ms.name;

-- ============================================================================
-- Tenant Activity Summary View (Fixed column references)
-- ============================================================================

CREATE OR REPLACE VIEW tenant_activity_summary AS
SELECT
    t.id as tenant_id,
    t.name as tenant_name,
    t.plan_type as tenant_plan,  -- Fixed: use plan_type instead of plan
    (SELECT COUNT(*) FROM "user" u WHERE u.tenant_id = t.id) as total_users,
    (SELECT COUNT(*) FROM "user" u WHERE u.tenant_id = t.id AND u.is_active = true) as active_users,
    (SELECT COUNT(*) FROM mcp_server ms WHERE ms.tenant_id = t.id) as total_servers,
    (SELECT COUNT(*) FROM mcp_server ms WHERE ms.tenant_id = t.id AND ms.status = 'active') as active_servers,
    (SELECT COUNT(*) FROM mcp_server ms WHERE ms.tenant_id = t.id AND ms.health_status = 'healthy') as healthy_servers,
    (SELECT COUNT(*) FROM api_token at WHERE at.tenant_id = t.id AND at.is_active = true) as active_api_tokens,
    (SELECT COALESCE(SUM(ms.request_count), 0) FROM mcp_server ms WHERE ms.tenant_id = t.id) as total_requests,
    (SELECT COUNT(*) FROM audit_log al WHERE al.tenant_id = t.id AND al.created_at > NOW() - INTERVAL '24 hours') as audit_events_24h,  -- Fixed: use created_at
    (SELECT COUNT(*) FROM session s JOIN "user" u ON u.id = s.user_id WHERE u.tenant_id = t.id AND NOT s.is_revoked AND s.expires_at > NOW()) as active_sessions,
    t.created_at,
    t.updated_at
FROM tenant t
ORDER BY total_requests DESC;

-- ============================================================================
-- Server Tool Performance View (Already works correctly)
-- ============================================================================

CREATE OR REPLACE VIEW server_tool_performance AS
SELECT
    ms.id as server_id,
    ms.name as server_name,
    mt.id as tool_id,
    mt.name as tool_name,
    mt.description,
    mt.call_count as total_calls,
    mt.call_count - mt.error_count as success_count,
    mt.error_count,
    ROUND(
        CASE
            WHEN mt.call_count > 0
            THEN ((mt.call_count - mt.error_count)::numeric / mt.call_count::numeric) * 100
            ELSE 0
        END, 2
    ) as success_rate,
    mt.avg_execution_time,
    mt.last_used_at as last_called_at,
    CASE
        WHEN mt.call_count = 0 THEN 'Never used'
        WHEN mt.last_used_at IS NULL OR mt.last_used_at < NOW() - INTERVAL '30 days' THEN 'Inactive'
        WHEN mt.call_count > 0 AND (mt.error_count::numeric / NULLIF(mt.call_count::numeric, 0)) > 0.1 THEN 'Problematic'
        WHEN mt.call_count > 100 THEN 'High usage'
        ELSE 'Normal'
    END as tool_status,
    ms.tenant_id,
    t.name as tenant_name
FROM mcp_tool mt
JOIN mcp_server ms ON ms.id = mt.server_id
LEFT JOIN tenant t ON t.id = ms.tenant_id
ORDER BY mt.call_count DESC;

-- ============================================================================
-- Recent Errors View (Fixed column references)
-- ============================================================================

CREATE OR REPLACE VIEW recent_errors AS
SELECT
    el.id as error_id,
    el.last_seen as timestamp,  -- Fixed: use last_seen instead of occurred_at
    el.level,
    el.message,
    el.type as error_code,
    el.user_id,
    u.email as user_email,
    el.tenant_id,
    t.name as tenant_name,
    el.request_id,
    el.stack_trace,
    el.metadata,
    el.occurrence_count,
    el.first_seen,
    CASE
        WHEN el.level = 'critical' THEN 1
        WHEN el.level = 'error' THEN 2
        WHEN el.level = 'warning' THEN 3
        ELSE 4
    END as priority_order
FROM error_log el
LEFT JOIN "user" u ON u.id = el.user_id
LEFT JOIN tenant t ON t.id = el.tenant_id
WHERE el.last_seen > NOW() - INTERVAL '24 hours'  -- Fixed: use last_seen
ORDER BY priority_order, el.last_seen DESC
LIMIT 100;

-- ============================================================================
-- Security Events Dashboard View (Fixed column references)
-- ============================================================================

CREATE OR REPLACE VIEW security_events_dashboard AS
WITH recent_events AS (
    SELECT
        se.id,
        se.detected_at as timestamp,  -- Fixed: use detected_at instead of occurred_at
        se.type as event_type,
        se.severity,
        se.user_id,
        u.email as user_email,
        se.tenant_id,
        t.name as tenant_name,
        se.source_ip as ip_address,  -- Fixed: use source_ip instead of ip_address
        se.user_agent,
        CASE WHEN se.resolved_at IS NOT NULL THEN true ELSE false END as success,  -- Fixed: derive success from resolved_at
        se.details as metadata  -- Fixed: use details instead of metadata
    FROM security_event se
    LEFT JOIN "user" u ON u.id = se.user_id
    LEFT JOIN tenant t ON t.id = se.tenant_id
    WHERE se.detected_at > NOW() - INTERVAL '24 hours'  -- Fixed: use detected_at
)
SELECT
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(*) FILTER (WHERE success = true) as successful_events,
    COUNT(*) FILTER (WHERE success = false) as failed_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT tenant_id) as unique_tenants,
    COUNT(DISTINCT ip_address) as unique_ips,
    array_agg(DISTINCT ip_address) FILTER (WHERE success = false) as failed_ips,
    MAX(timestamp) as last_occurrence
FROM recent_events
GROUP BY event_type, severity
ORDER BY event_count DESC;

-- ============================================================================
-- System Performance Overview View (Fixed column references)
-- ============================================================================

CREATE OR REPLACE VIEW system_performance_overview AS
WITH server_stats AS (
    SELECT
        COUNT(*) as total_servers,
        COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_servers,
        COUNT(*) FILTER (WHERE health_status = 'unhealthy') as unhealthy_servers,
        COUNT(*) FILTER (WHERE health_status = 'unknown') as unknown_servers,
        COUNT(*) FILTER (WHERE status = 'active') as active_servers,
        ROUND(AVG(avg_response_time), 2) as avg_response_time,
        ROUND(AVG(uptime), 2) as avg_uptime,
        SUM(request_count) as total_requests,
        SUM(error_count) as total_errors
    FROM mcp_server
),
session_stats AS (
    SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE NOT is_revoked AND expires_at > NOW()) as active_sessions,
        COUNT(*) FILTER (WHERE NOT is_revoked AND expires_at < NOW() + INTERVAL '1 hour' AND expires_at > NOW()) as sessions_expiring_soon,
        COUNT(DISTINCT user_id) as unique_users_with_sessions
    FROM session
    WHERE created_at > NOW() - INTERVAL '24 hours'
),
tool_stats AS (
    SELECT
        COUNT(*) as total_tools,
        COUNT(*) FILTER (WHERE call_count > 0) as used_tools,
        COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '24 hours') as recently_used_tools,
        SUM(call_count) as total_tool_calls,
        SUM(error_count) as total_tool_errors
    FROM mcp_tool
),
user_stats AS (
    SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h
    FROM "user"
),
error_stats AS (
    SELECT
        COUNT(*) as total_errors_24h,
        COUNT(*) FILTER (WHERE level = 'critical') as critical_errors_24h,
        COUNT(*) FILTER (WHERE level = 'error') as errors_24h,
        COUNT(*) FILTER (WHERE level = 'warning') as warnings_24h
    FROM error_log
    WHERE last_seen > NOW() - INTERVAL '24 hours'  -- Fixed: use last_seen instead of occurred_at
)
SELECT
    'Server Health' as category,
    jsonb_build_object(
        'total_servers', ss.total_servers,
        'healthy_servers', ss.healthy_servers,
        'unhealthy_servers', ss.unhealthy_servers,
        'unknown_servers', ss.unknown_servers,
        'active_servers', ss.active_servers,
        'avg_response_time', ss.avg_response_time,
        'avg_uptime', ss.avg_uptime,
        'total_requests', ss.total_requests,
        'total_errors', ss.total_errors,
        'success_rate', ROUND(
            CASE
                WHEN ss.total_requests > 0
                THEN ((ss.total_requests - ss.total_errors)::numeric / ss.total_requests::numeric) * 100
                ELSE 100
            END, 2
        )
    ) as metrics,
    NOW() as snapshot_time
FROM server_stats ss
UNION ALL
SELECT
    'User Activity' as category,
    jsonb_build_object(
        'total_sessions', sess.total_sessions,
        'active_sessions', sess.active_sessions,
        'sessions_expiring_soon', sess.sessions_expiring_soon,
        'unique_users_with_sessions', sess.unique_users_with_sessions,
        'total_users', us.total_users,
        'active_users', us.active_users,
        'new_users_24h', us.new_users_24h
    ) as metrics,
    NOW() as snapshot_time
FROM session_stats sess, user_stats us
UNION ALL
SELECT
    'Tool Usage' as category,
    jsonb_build_object(
        'total_tools', ts.total_tools,
        'used_tools', ts.used_tools,
        'recently_used_tools', ts.recently_used_tools,
        'total_tool_calls', ts.total_tool_calls,
        'total_tool_errors', ts.total_tool_errors,
        'tool_success_rate', ROUND(
            CASE
                WHEN ts.total_tool_calls > 0
                THEN ((ts.total_tool_calls - ts.total_tool_errors)::numeric / ts.total_tool_calls::numeric) * 100
                ELSE 100
            END, 2
        )
    ) as metrics,
    NOW() as snapshot_time
FROM tool_stats ts
UNION ALL
SELECT
    'Error Summary' as category,
    jsonb_build_object(
        'total_errors_24h', es.total_errors_24h,
        'critical_errors_24h', es.critical_errors_24h,
        'errors_24h', es.errors_24h,
        'warnings_24h', es.warnings_24h
    ) as metrics,
    NOW() as snapshot_time
FROM error_stats es;