-- Compatible Database Functions for Current Schema
-- These functions work with the existing table structure

-- ============================================================================
-- Server Health Summary Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_server_health_summary()
RETURNS TABLE(
    total_servers bigint,
    healthy_servers bigint,
    unhealthy_servers bigint,
    degraded_servers bigint,
    avg_response_time numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_servers,
        COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_servers,
        COUNT(*) FILTER (WHERE health_status = 'unhealthy') as unhealthy_servers,
        COUNT(*) FILTER (WHERE health_status IN ('degraded', 'unknown')) as degraded_servers,
        ROUND(AVG(avg_response_time), 2) as avg_response_time
    FROM mcp_server;
END;
$$;

-- ============================================================================
-- Server Performance Ranking Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_server_performance_ranking(p_limit integer DEFAULT 10)
RETURNS TABLE(
    server_id text,
    server_name text,
    health_status text,
    avg_response_time numeric,
    uptime numeric,
    total_requests bigint,
    performance_score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ms.id as server_id,
        ms.name as server_name,
        ms.health_status::text,
        ROUND(COALESCE(ms.avg_response_time, 0), 2) as avg_response_time,
        ROUND(COALESCE(ms.uptime, 0), 2) as uptime,
        ms.request_count::bigint as total_requests,
        ROUND(
            (COALESCE(ms.uptime, 0) * 0.5 +
             (1 - LEAST(COALESCE(ms.avg_response_time, 1000) / 1000, 1)) * 0.3 +
             LEAST(ms.request_count / 1000, 1) * 0.2) * 100,
            2
        ) as performance_score
    FROM mcp_server ms
    WHERE ms.status != 'inactive'
    ORDER BY performance_score DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- Tenant Usage Summary Function (using existing tables)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_usage_summary(p_tenant_id text)
RETURNS TABLE(
    total_servers bigint,
    active_servers bigint,
    healthy_servers bigint,
    total_tools bigint,
    total_requests bigint,
    avg_response_time numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(ms.*) as total_servers,
        COUNT(ms.*) FILTER (WHERE ms.status = 'active') as active_servers,
        COUNT(ms.*) FILTER (WHERE ms.health_status = 'healthy') as healthy_servers,
        COALESCE(SUM(
            (SELECT COUNT(*) FROM mcp_tool mt WHERE mt.server_id = ms.id)
        ), 0) as total_tools,
        COALESCE(SUM(ms.request_count), 0)::bigint as total_requests,
        ROUND(AVG(ms.avg_response_time), 2) as avg_response_time
    FROM mcp_server ms
    WHERE ms.tenant_id = p_tenant_id;
END;
$$;

-- ============================================================================
-- API Usage Statistics Function (using existing data)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_api_usage_statistics(p_days integer DEFAULT 7)
RETURNS TABLE(
    date date,
    total_servers bigint,
    healthy_servers bigint,
    total_tools bigint,
    total_requests bigint,
    avg_response_time numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CURRENT_DATE as date,
        COUNT(ms.*) as total_servers,
        COUNT(ms.*) FILTER (WHERE ms.health_status = 'healthy') as healthy_servers,
        (SELECT COUNT(*) FROM mcp_tool) as total_tools,
        COALESCE(SUM(ms.request_count), 0)::bigint as total_requests,
        ROUND(AVG(ms.avg_response_time), 2) as avg_response_time
    FROM mcp_server ms
    WHERE ms.created_at > CURRENT_DATE - (p_days || ' days')::interval;
END;
$$;

-- ============================================================================
-- Active Sessions Summary Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_session_summary()
RETURNS TABLE(
    total_sessions bigint,
    active_sessions bigint,
    sessions_expiring_soon bigint,
    unique_users bigint,
    avg_session_duration interval
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE NOT is_revoked AND expires_at > NOW()) as active_sessions,
        COUNT(*) FILTER (WHERE NOT is_revoked AND expires_at < NOW() + INTERVAL '1 hour' AND expires_at > NOW()) as sessions_expiring_soon,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(CASE
            WHEN last_activity_at IS NOT NULL AND last_activity_at > created_at
            THEN last_activity_at - created_at
            ELSE expires_at - created_at
        END) as avg_session_duration
    FROM session
    WHERE created_at > NOW() - INTERVAL '24 hours';
END;
$$;

-- ============================================================================
-- System Health Overview Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_system_health_overview()
RETURNS TABLE(
    metric_name text,
    metric_value text,
    status text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH health_metrics AS (
        SELECT 'Total Servers' as metric_name, COUNT(*)::text as metric_value,
               CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END as status
        FROM mcp_server
        UNION ALL
        SELECT 'Healthy Servers', COUNT(*)::text,
               CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'critical' END
        FROM mcp_server WHERE health_status = 'healthy'
        UNION ALL
        SELECT 'Active Sessions', COUNT(*)::text,
               CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END
        FROM session WHERE NOT is_revoked AND expires_at > NOW()
        UNION ALL
        SELECT 'Total Tools', COUNT(*)::text,
               CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END
        FROM mcp_tool
        UNION ALL
        SELECT 'Active Tenants', COUNT(*)::text,
               CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END
        FROM tenant
        UNION ALL
        SELECT 'Recent Errors', COUNT(*)::text,
               CASE WHEN COUNT(*) = 0 THEN 'healthy'
                    WHEN COUNT(*) < 10 THEN 'warning'
                    ELSE 'critical' END
        FROM error_log WHERE occurred_at > NOW() - INTERVAL '1 hour'
    )
    SELECT * FROM health_metrics;
END;
$$;

-- ============================================================================
-- Tool Usage Summary Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tool_usage_summary()
RETURNS TABLE(
    server_name text,
    tool_name text,
    total_calls bigint,
    error_count bigint,
    success_rate numeric,
    avg_execution_time numeric,
    last_used_at timestamp with time zone,
    usage_category text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ms.name as server_name,
        mt.name as tool_name,
        mt.call_count::bigint as total_calls,
        mt.error_count::bigint as error_count,
        ROUND(
            CASE
                WHEN mt.call_count > 0
                THEN ((mt.call_count - mt.error_count)::numeric / mt.call_count::numeric) * 100
                ELSE 0
            END, 2
        ) as success_rate,
        ROUND(COALESCE(mt.avg_execution_time, 0), 2) as avg_execution_time,
        mt.last_used_at,
        CASE
            WHEN mt.call_count = 0 THEN 'Never used'
            WHEN mt.last_used_at IS NULL OR mt.last_used_at < NOW() - INTERVAL '30 days' THEN 'Inactive'
            WHEN mt.call_count > 0 AND (mt.error_count::numeric / mt.call_count::numeric) > 0.1 THEN 'Problematic'
            WHEN mt.call_count > 100 THEN 'High usage'
            ELSE 'Normal'
        END as usage_category
    FROM mcp_tool mt
    JOIN mcp_server ms ON ms.id = mt.server_id
    ORDER BY mt.call_count DESC;
END;
$$;