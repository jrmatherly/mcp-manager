-- Database Functions Migration
-- This migration adds performance monitoring and analytics functions

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
        COUNT(*) FILTER (WHERE health_status = 'HEALTHY') as healthy_servers,
        COUNT(*) FILTER (WHERE health_status = 'UNHEALTHY') as unhealthy_servers,
        COUNT(*) FILTER (WHERE health_status = 'DEGRADED') as degraded_servers,
        ROUND(AVG(avg_response_time)::numeric, 2) as avg_response_time
    FROM mcp_servers
    WHERE deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION get_server_health_summary () IS 'Returns aggregated health statistics for all MCP servers';

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
            duration_ms
        FROM request_logs
        WHERE request_time > NOW() - (p_hours || ' hours')::interval
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

COMMENT ON FUNCTION get_request_performance_summary (integer) IS 'Returns request performance metrics for the specified time window (default 24 hours)';

-- ============================================================================
-- Tenant Usage Summary Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_usage_summary(p_tenant_id text, p_hours integer DEFAULT 24)
RETURNS TABLE(
    total_requests bigint,
    unique_users bigint,
    unique_servers bigint,
    avg_duration_ms numeric,
    error_rate numeric,
    total_data_transferred bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH tenant_stats AS (
        SELECT
            rl.user_id,
            rl.target_server_id,
            rl.status_code,
            rl.duration_ms,
            rl.response_size
        FROM request_logs rl
        WHERE rl.tenant_id = p_tenant_id
          AND rl.request_time > NOW() - (p_hours || ' hours')::interval
    )
    SELECT
        COUNT(*) as total_requests,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT target_server_id) as unique_servers,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_duration_ms,
        ROUND((COUNT(*) FILTER (WHERE status_code >= 400)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2) as error_rate,
        COALESCE(SUM(response_size), 0) as total_data_transferred
    FROM tenant_stats;
END;
$$;

COMMENT ON FUNCTION get_tenant_usage_summary (text, integer) IS 'Returns usage analytics for a specific tenant over the specified time window';

-- ============================================================================
-- API Usage Statistics Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_api_usage_statistics(p_days integer DEFAULT 7)
RETURNS TABLE(
    date date,
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
        DATE(request_time) as date,
        COUNT(*) as total_calls,
        COUNT(DISTINCT tenant_id) as unique_tenants,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_response_time,
        COUNT(*) FILTER (WHERE status_code >= 400) as error_count
    FROM request_logs
    WHERE request_time > CURRENT_DATE - (p_days || ' days')::interval
    GROUP BY DATE(request_time)
    ORDER BY date DESC;
END;
$$;

COMMENT ON FUNCTION get_api_usage_statistics (integer) IS 'Returns daily API usage statistics for the specified number of days';

-- ============================================================================
-- Server Performance Ranking Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_server_performance_ranking(p_limit integer DEFAULT 10)
RETURNS TABLE(
    server_id text,
    server_name text,
    health_status text,
    avg_response_time numeric,
    success_rate numeric,
    total_requests bigint,
    performance_score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH server_stats AS (
        SELECT
            ms.id as server_id,
            ms.name as server_name,
            ms.health_status,
            ms.avg_response_time,
            ms.success_rate,
            COUNT(rl.id) as total_requests
        FROM mcp_servers ms
        LEFT JOIN request_logs rl ON rl.target_server_id = ms.id
            AND rl.request_time > NOW() - INTERVAL '24 hours'
        WHERE ms.deleted_at IS NULL
        GROUP BY ms.id, ms.name, ms.health_status, ms.avg_response_time, ms.success_rate
    )
    SELECT
        server_id,
        server_name,
        health_status,
        ROUND(avg_response_time::numeric, 2) as avg_response_time,
        ROUND(success_rate::numeric, 2) as success_rate,
        total_requests,
        ROUND(
            (COALESCE(success_rate, 0) * 0.5 +
             (1 - LEAST(COALESCE(avg_response_time, 1000) / 1000, 1)) * 0.3 +
             LEAST(total_requests::numeric / 1000, 1) * 0.2)::numeric * 100,
            2
        ) as performance_score
    FROM server_stats
    ORDER BY performance_score DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_server_performance_ranking (integer) IS 'Returns top performing servers based on a composite performance score';

-- ============================================================================
-- Audit Trail Search Function
-- ============================================================================

CREATE OR REPLACE FUNCTION search_audit_trail(
    p_tenant_id text DEFAULT NULL,
    p_user_id text DEFAULT NULL,
    p_action text DEFAULT NULL,
    p_resource_type text DEFAULT NULL,
    p_start_date timestamp DEFAULT NOW() - INTERVAL '7 days',
    p_end_date timestamp DEFAULT NOW(),
    p_limit integer DEFAULT 100
)
RETURNS TABLE(
    audit_id text,
    timestamp timestamp,
    user_id text,
    action text,
    resource_type text,
    resource_id text,
    success boolean,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id as audit_id,
        al.timestamp,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.success,
        al.metadata
    FROM audit_log al
    WHERE (p_tenant_id IS NULL OR al.tenant_id = p_tenant_id)
      AND (p_user_id IS NULL OR al.user_id = p_user_id)
      AND (p_action IS NULL OR al.action = p_action)
      AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
      AND al.timestamp BETWEEN p_start_date AND p_end_date
    ORDER BY al.timestamp DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_audit_trail IS 'Flexible audit trail search with multiple filter options';

-- ============================================================================
-- Circuit Breaker Status Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_circuit_breaker_status()
RETURNS TABLE(
    server_id text,
    server_name text,
    service_name text,
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
        cb.state,
        cb.failure_count,
        cb.success_count,
        cb.last_state_change,
        NOW() - cb.last_state_change as time_in_current_state
    FROM circuit_breakers cb
    LEFT JOIN mcp_servers ms ON ms.id = cb.server_id
    ORDER BY
        CASE cb.state
            WHEN 'OPEN' THEN 1
            WHEN 'HALF_OPEN' THEN 2
            ELSE 3
        END,
        cb.failure_count DESC;
END;
$$;

COMMENT ON FUNCTION get_circuit_breaker_status () IS 'Returns current status of all circuit breakers with server information';

-- ============================================================================
-- Connection Pool Statistics Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_connection_pool_stats()
RETURNS TABLE(
    server_id text,
    server_name text,
    pool_name text,
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
        cp.active_connections + cp.idle_connections as total_connections,
        ROUND(
            (cp.active_connections::numeric / NULLIF(cp.max_connections::numeric, 0)) * 100,
            2
        ) as utilization_percentage,
        cp.avg_wait_time_ms,
        cp.last_used
    FROM connection_pools cp
    LEFT JOIN mcp_servers ms ON ms.id = cp.server_id
    ORDER BY utilization_percentage DESC;
END;
$$;

COMMENT ON FUNCTION get_connection_pool_stats () IS 'Returns connection pool statistics for monitoring and optimization';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant execute permissions to the application role (adjust role name as needed)
-- GRANT EXECUTE ON FUNCTION get_server_health_summary() TO mcp_user;
-- GRANT EXECUTE ON FUNCTION get_request_performance_summary(integer) TO mcp_user;
-- GRANT EXECUTE ON FUNCTION get_tenant_usage_summary(text, integer) TO mcp_user;
-- GRANT EXECUTE ON FUNCTION get_api_usage_statistics(integer) TO mcp_user;
-- GRANT EXECUTE ON FUNCTION get_server_performance_ranking(integer) TO mcp_user;
-- GRANT EXECUTE ON FUNCTION search_audit_trail(text, text, text, text, timestamp, timestamp, integer) TO mcp_user;
-- GRANT EXECUTE ON FUNCTION get_circuit_breaker_status() TO mcp_user;
-- GRANT EXECUTE ON FUNCTION get_connection_pool_stats() TO mcp_user;