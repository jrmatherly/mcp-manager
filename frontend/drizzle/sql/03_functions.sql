-- ============================================================================
-- Database Functions for MCP Registry Gateway
-- ============================================================================
-- Performance monitoring and analytics functions for operational insights.
-- All functions use the correct singular table names matching the schema.
--
-- Execution: psql -d your_database -f 03_functions.sql
-- ============================================================================

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
        COUNT(*) FILTER (WHERE ms.health_status = 'healthy') as healthy_servers,
        COUNT(*) FILTER (WHERE ms.health_status = 'unhealthy') as unhealthy_servers,
        COUNT(*) FILTER (WHERE ms.health_status = 'unknown') as degraded_servers,
        ROUND(AVG(ms.avg_response_time), 2) as avg_response_time
    FROM mcp_server ms
    WHERE ms.status != 'inactive';
END;
$$;

COMMENT ON FUNCTION get_server_health_summary () IS 'Returns aggregated health statistics for all active MCP servers';

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
    WHERE ms.status = 'active'
    ORDER BY performance_score DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_server_performance_ranking (integer) IS 'Returns top performing servers based on composite score';

-- ============================================================================
-- Request Performance Summary Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_request_performance_summary(p_hours integer DEFAULT 24)
RETURNS TABLE(
    total_requests bigint,
    successful_requests bigint,
    error_requests bigint,
    avg_duration_ms numeric,
    p95_duration_ms numeric,
    p99_duration_ms numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH request_stats AS (
        SELECT
            status_code,
            response_time::numeric as duration_ms
        FROM api_usage
        WHERE requested_at > NOW() - (p_hours || ' hours')::interval
        AND status_code IS NOT NULL
        AND response_time IS NOT NULL
    )
    SELECT
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
        COUNT(*) FILTER (WHERE status_code >= 400) as error_requests,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_duration_ms,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2) as p95_duration_ms,
        ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2) as p99_duration_ms
    FROM request_stats;
END;
$$;

COMMENT ON FUNCTION get_request_performance_summary (integer) IS 'Returns request performance metrics for specified time window';

-- ============================================================================
-- Tenant Usage Summary Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_usage_summary(p_tenant_id text)
RETURNS TABLE(
    total_servers bigint,
    active_servers bigint,
    total_tools bigint,
    total_resources bigint,
    total_api_calls bigint,
    avg_response_time numeric,
    total_users bigint,
    active_sessions bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM mcp_server WHERE tenant_id = p_tenant_id) as total_servers,
        (SELECT COUNT(*) FROM mcp_server WHERE tenant_id = p_tenant_id AND status = 'active') as active_servers,
        (SELECT COUNT(*) FROM mcp_tool mt
         JOIN mcp_server ms ON mt.server_id = ms.id
         WHERE ms.tenant_id = p_tenant_id) as total_tools,
        (SELECT COUNT(*) FROM mcp_resource mr
         JOIN mcp_server ms ON mr.server_id = ms.id
         WHERE ms.tenant_id = p_tenant_id) as total_resources,
        (SELECT SUM(daily_request_count) FROM api_usage_stats WHERE tenant_id = p_tenant_id) as total_api_calls,
        (SELECT ROUND(AVG(ms.avg_response_time), 2) FROM mcp_server ms WHERE ms.tenant_id = p_tenant_id) as avg_response_time,
        (SELECT COUNT(*) FROM "user" WHERE tenant_id = p_tenant_id) as total_users,
        (SELECT COUNT(*) FROM session s
         JOIN "user" u ON s.user_id = u.id
         WHERE u.tenant_id = p_tenant_id AND s.expires_at > NOW()) as active_sessions;
END;
$$;

COMMENT ON FUNCTION get_tenant_usage_summary (text) IS 'Returns comprehensive usage statistics for a specific tenant';

-- ============================================================================
-- API Usage Trending Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_api_usage_trending(
    p_days integer DEFAULT 7,
    p_granularity text DEFAULT 'hour'
)
RETURNS TABLE(
    time_bucket timestamp,
    total_requests bigint,
    unique_users bigint,
    avg_response_time numeric,
    error_rate numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate granularity parameter
    IF p_granularity NOT IN ('hour', 'day', 'week') THEN
        RAISE EXCEPTION 'Invalid granularity. Must be hour, day, or week';
    END IF;

    RETURN QUERY
    SELECT
        date_trunc(p_granularity, au.requested_at) as time_bucket,
        COUNT(*) as total_requests,
        COUNT(DISTINCT au.user_id) as unique_users,
        ROUND(AVG(au.response_time)::numeric, 2) as avg_response_time,
        ROUND((COUNT(*) FILTER (WHERE au.status_code >= 400)::numeric / COUNT(*)::numeric) * 100, 2) as error_rate
    FROM api_usage au
    WHERE au.requested_at > NOW() - (p_days || ' days')::interval
    GROUP BY date_trunc(p_granularity, au.requested_at)
    ORDER BY time_bucket DESC;
END;
$$;

COMMENT ON FUNCTION get_api_usage_trending (integer, text) IS 'Returns API usage trends over time with configurable granularity';

-- ============================================================================
-- Tool Usage Analytics Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tool_usage_analytics(p_server_id text DEFAULT NULL)
RETURNS TABLE(
    tool_id text,
    tool_name text,
    server_name text,
    total_calls bigint,
    success_rate numeric,
    avg_execution_time numeric,
    last_used timestamp
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mt.id as tool_id,
        mt.name as tool_name,
        ms.name as server_name,
        mt.total_calls::bigint,
        CASE
            WHEN mt.total_calls > 0 THEN
                ROUND((mt.success_count::numeric / mt.total_calls::numeric) * 100, 2)
            ELSE 0
        END as success_rate,
        mt.avg_execution_time,
        mt.last_used
    FROM mcp_tool mt
    JOIN mcp_server ms ON mt.server_id = ms.id
    WHERE (p_server_id IS NULL OR mt.server_id = p_server_id)
        AND mt.total_calls > 0
    ORDER BY mt.total_calls DESC;
END;
$$;

COMMENT ON FUNCTION get_tool_usage_analytics (text) IS 'Returns detailed analytics for tool usage, optionally filtered by server';

-- ============================================================================
-- System Health Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_system_health()
RETURNS TABLE(
    component text,
    status text,
    details jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY

    -- Check database connectivity
    SELECT
        'database'::text as component,
        'healthy'::text as status,
        jsonb_build_object(
            'connections', (SELECT count(*) FROM pg_stat_activity),
            'database_size', pg_database_size(current_database()),
            'uptime', NOW() - pg_postmaster_start_time()
        ) as details

    UNION ALL

    -- Check server health
    SELECT
        'mcp_servers'::text as component,
        CASE
            WHEN COUNT(*) FILTER (WHERE health_status = 'unhealthy') > 0 THEN 'degraded'
            ELSE 'healthy'
        END as status,
        jsonb_build_object(
            'total', COUNT(*),
            'healthy', COUNT(*) FILTER (WHERE health_status = 'healthy'),
            'unhealthy', COUNT(*) FILTER (WHERE health_status = 'unhealthy'),
            'unknown', COUNT(*) FILTER (WHERE health_status = 'unknown')
        ) as details
    FROM mcp_server
    WHERE status = 'active'

    UNION ALL

    -- Check API performance
    SELECT
        'api_performance'::text as component,
        CASE
            WHEN AVG(response_time) > 1000 THEN 'degraded'
            WHEN AVG(response_time) > 2000 THEN 'unhealthy'
            ELSE 'healthy'
        END as status,
        jsonb_build_object(
            'avg_response_time', ROUND(AVG(response_time)::numeric, 2),
            'total_requests_24h', COUNT(*),
            'error_rate', ROUND((COUNT(*) FILTER (WHERE status_code >= 400)::numeric / COUNT(*)::numeric) * 100, 2)
        ) as details
    FROM api_usage
    WHERE requested_at > NOW() - INTERVAL '24 hours'

    UNION ALL

    -- Check active sessions
    SELECT
        'sessions'::text as component,
        'healthy'::text as status,
        jsonb_build_object(
            'active_sessions', COUNT(*),
            'expiring_soon', COUNT(*) FILTER (WHERE expires_at < NOW() + INTERVAL '1 hour')
        ) as details
    FROM session
    WHERE expires_at > NOW() AND is_revoked = false;
END;
$$;

COMMENT ON FUNCTION check_system_health () IS 'Performs comprehensive system health check across all components';

-- ============================================================================
-- Cleanup Expired Data Function
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE(
    table_name text,
    rows_deleted bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted bigint;
BEGIN
    -- Clean expired sessions
    DELETE FROM session WHERE expires_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN QUERY SELECT 'session'::text, v_deleted;

    -- Clean expired API tokens
    DELETE FROM api_token WHERE expires_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN QUERY SELECT 'api_token'::text, v_deleted;

    -- Clean old audit logs (keep 90 days)
    DELETE FROM audit_log WHERE timestamp < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN QUERY SELECT 'audit_log'::text, v_deleted;

    -- Clean old API usage data (keep 30 days of detailed data)
    DELETE FROM api_usage WHERE requested_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN QUERY SELECT 'api_usage'::text, v_deleted;

    -- Clean old server metrics (keep 7 days of detailed metrics)
    DELETE FROM server_metrics WHERE timestamp < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN QUERY SELECT 'server_metrics'::text, v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_data () IS 'Removes expired data from various tables for maintenance';

-- ============================================================================
-- API Usage Statistics Function (Daily aggregation)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_api_usage_statistics(p_days integer DEFAULT 7)
RETURNS TABLE(
    date timestamp,
    total_calls bigint,
    unique_tenants bigint,
    unique_users bigint,
    avg_response_time numeric,
    error_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        date_trunc('day', au.requested_at) as date,
        COUNT(*) as total_calls,
        COUNT(DISTINCT u.tenant_id) as unique_tenants,
        COUNT(DISTINCT au.user_id) as unique_users,
        ROUND(AVG(au.response_time)::numeric, 2) as avg_response_time,
        COUNT(*) FILTER (WHERE au.status_code >= 400) as error_count
    FROM api_usage au
    LEFT JOIN "user" u ON au.user_id = u.id
    WHERE au.requested_at > NOW() - (p_days || ' days')::interval
    GROUP BY date_trunc('day', au.requested_at)
    ORDER BY date DESC;
END;
$$;

COMMENT ON FUNCTION get_api_usage_statistics (integer) IS 'Returns daily API usage statistics with tenant and user aggregation';

-- ============================================================================
-- Circuit Breaker Status Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_circuit_breaker_status()
RETURNS TABLE(
    server_id text,
    server_name text,
    service_name varchar(255),
    state text,
    failure_count integer,
    success_count integer,
    last_state_change timestamp,
    time_in_current_state interval
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cb.server_id,
        ms.name as server_name,
        cb.service_name,
        cb.state::text,
        cb.failure_count,
        cb.success_count,
        cb.last_state_change,
        NOW() - cb.last_state_change as time_in_current_state
    FROM circuit_breakers cb
    LEFT JOIN mcp_server ms ON cb.server_id = ms.id
    -- No is_active field in the schema, so we return all circuit breakers
    ORDER BY cb.state DESC, cb.last_state_change DESC;
END;
$$;

COMMENT ON FUNCTION get_circuit_breaker_status () IS 'Returns current status of all circuit breakers';

-- ============================================================================
-- Connection Pool Statistics Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_connection_pool_stats()
RETURNS TABLE(
    server_id text,
    server_name text,
    pool_name varchar(255),
    active_connections integer,
    idle_connections integer,
    total_connections integer,
    utilization_percentage numeric,
    avg_wait_time_ms numeric,
    last_used timestamp
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.server_id,
        ms.name as server_name,
        cp.pool_name,
        cp.active_connections,
        cp.idle_connections,
        -- Calculate total connections from active + idle
        (cp.active_connections + cp.idle_connections) as total_connections,
        CASE
            WHEN cp.max_size > 0 THEN
                ROUND(((cp.active_connections + cp.idle_connections)::numeric / cp.max_size::numeric) * 100, 2)
            ELSE 0
        END as utilization_percentage,
        -- Use avg_connection_time_ms instead of avg_wait_time_ms (which doesn't exist)
        ROUND(COALESCE(cp.avg_connection_time_ms, 0)::numeric, 2) as avg_wait_time_ms,
        -- Use last_health_check as a proxy for last_used (which doesn't exist)
        cp.last_health_check as last_used
    FROM connection_pools cp
    LEFT JOIN mcp_server ms ON cp.server_id = ms.id
    WHERE cp.is_healthy = true
    ORDER BY utilization_percentage DESC, cp.last_health_check DESC;
END;
$$;

COMMENT ON FUNCTION get_connection_pool_stats () IS 'Returns connection pool statistics with utilization metrics';

-- ============================================================================
-- FUNCTION PERMISSIONS
-- ============================================================================

-- Grant execute permissions to application role (adjust as needed)
-- GRANT EXECUTE ON FUNCTION get_server_health_summary() TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_server_performance_ranking(integer) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_request_performance_summary(integer) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_tenant_usage_summary(text) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_api_usage_trending(integer, text) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_api_usage_statistics(integer) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_tool_usage_analytics(text) TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_circuit_breaker_status() TO your_app_role;
-- GRANT EXECUTE ON FUNCTION get_connection_pool_stats() TO your_app_role;
-- GRANT EXECUTE ON FUNCTION check_system_health() TO your_app_role;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_data() TO your_app_role;