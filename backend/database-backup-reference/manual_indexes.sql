-- Manual Database Index Creation for MCP Registry Gateway
--
-- This file contains SQL commands for manually creating essential database indexes
-- Run these commands directly in your PostgreSQL database for immediate performance improvements
--
-- Usage:
--   psql -h localhost -U mcp_user -d mcp_registry -f manual_indexes.sql
--
-- Note: CONCURRENTLY creates indexes without blocking table access (recommended for production)

-- ============================================================================
-- ESSENTIAL INDEXES FOR EXISTING QUERIES
-- ============================================================================

-- MCP Servers Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_servers_tenant_status ON mcp_servers (tenant_id, health_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_servers_endpoint_transport ON mcp_servers (endpoint_url, transport_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_servers_health_check_time ON mcp_servers (last_health_check)
WHERE
    last_health_check IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_servers_performance ON mcp_servers (
    avg_response_time,
    success_rate
)
WHERE
    avg_response_time IS NOT NULL;

-- Server Tools Discovery Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_tools_name_server ON server_tools (name, server_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_tools_usage_stats ON server_tools (total_calls, success_count)
WHERE
    total_calls > 0;

-- Server Resources Discovery Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_resources_uri_server ON server_resources (uri_template, server_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_resources_mime_type ON server_resources (mime_type)
WHERE
    mime_type IS NOT NULL;

-- Server Metrics Time-Series Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_metrics_server_time ON server_metrics (server_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_server_metrics_performance ON server_metrics (response_time_ms, error_rate)
WHERE
    response_time_ms IS NOT NULL;

-- ============================================================================
-- USER AND SESSION INDEXES
-- ============================================================================

-- User Management Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_role ON users (tenant_id, role, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_auth_provider ON users (
    auth_provider,
    auth_provider_id
)
WHERE
    auth_provider IS NOT NULL;

-- Session Management Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_active ON sessions (
    user_id,
    is_active,
    expires_at
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_activity_time ON sessions (last_activity DESC)
WHERE
    is_active = true;

-- ============================================================================
-- API KEY AND SECURITY INDEXES
-- ============================================================================

-- API Key Management Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_tenant_active ON api_keys (tenant_id, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_expiration ON api_keys (expires_at)
WHERE
    expires_at IS NOT NULL
    AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_usage ON api_keys (
    last_used DESC,
    total_requests
)
WHERE
    is_active = true;

-- ============================================================================
-- AUDIT AND REQUEST LOG INDEXES
-- ============================================================================

-- Audit Log Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_time ON audit_logs (tenant_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_resource ON audit_logs (
    action,
    resource_type,
    resource_id
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_success ON audit_logs (
    user_id,
    success,
    timestamp DESC
)
WHERE
    user_id IS NOT NULL;

-- Request Log Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_logs_tenant_time ON request_logs (tenant_id, request_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_logs_server_performance ON request_logs (
    target_server_id,
    duration_ms,
    status_code
)
WHERE
    target_server_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_logs_ip_path ON request_logs (ip_address, path)
WHERE
    ip_address IS NOT NULL;

-- FastMCP Audit Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fastmcp_audit_user_time ON fastmcp_audit_log (user_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fastmcp_audit_method_success ON fastmcp_audit_log (
    method,
    success,
    timestamp DESC
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fastmcp_audit_tenant_performance ON fastmcp_audit_log (
    tenant_id,
    duration_ms,
    timestamp DESC
)
WHERE
    tenant_id IS NOT NULL;

-- ============================================================================
-- SYSTEM CONFIGURATION INDEXES
-- ============================================================================

-- Routing Rules Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routing_rules_tenant_active ON routing_rules (
    tenant_id,
    is_active,
    priority
);

-- System Config Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_configs_category_tenant ON system_configs (category, tenant_id);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Server Discovery Composite Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_servers_discovery_composite ON mcp_servers (
    health_status,
    transport_type,
    avg_response_time
)
WHERE
    health_status IN ('healthy', 'degraded');

-- Tool Discovery with Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_discovery_performance ON server_tools (
    name,
    success_count,
    avg_execution_time,
    server_id
)
WHERE
    total_calls > 0;

-- Request Routing Optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_routing_composite ON request_logs (
    path,
    method,
    target_server_id,
    duration_ms,
    request_time DESC
)
WHERE
    status_code < 400;

-- Security Access Patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_access_composite ON audit_logs (
    user_id,
    action,
    resource_type,
    success,
    timestamp DESC
)
WHERE
    user_id IS NOT NULL;

-- Tenant Resource Utilization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_utilization_composite 
    ON request_logs (tenant_id, request_time::date, status_code) 
    WHERE tenant_id IS NOT NULL;

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
        COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_servers,
        COUNT(*) FILTER (WHERE health_status = 'unhealthy') as unhealthy_servers,
        COUNT(*) FILTER (WHERE health_status = 'degraded') as degraded_servers,
        ROUND(AVG(avg_response_time)::numeric, 2) as avg_response_time
    FROM mcp_servers;
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
    WHERE tenant_id = p_tenant_id
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
        'mcp_servers',
        'server_tools',
        'server_resources',
        'server_metrics',
        'users',
        'sessions',
        'api_keys',
        'audit_logs',
        'request_logs',
        'fastmcp_audit_log',
        'routing_rules',
        'system_configs',
        'tenants'
    )
ORDER BY s.idx_tup_read DESC;

-- Performance Monitoring View


CREATE OR REPLACE VIEW performance_monitoring AS
SELECT 
    'servers' as component,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_count,
    ROUND(AVG(avg_response_time), 2) as avg_response_time,
    ROUND(AVG(success_rate), 2) as avg_success_rate
FROM mcp_servers

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
-- UPDATE TABLE STATISTICS
-- ============================================================================

-- Analyze all tables to update query planner statistics
ANALYZE mcp_servers;

ANALYZE server_tools;

ANALYZE server_resources;

ANALYZE server_metrics;

ANALYZE users;

ANALYZE sessions;

ANALYZE api_keys;

ANALYZE audit_logs;

ANALYZE request_logs;

ANALYZE fastmcp_audit_log;

ANALYZE routing_rules;

ANALYZE system_configs;

ANALYZE tenants;

-- ============================================================================
-- QUERY EXAMPLES FOR TESTING PERFORMANCE
-- ============================================================================

-- Test server discovery query
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM mcp_servers
-- WHERE health_status = 'healthy'
--   AND transport_type = 'http'
-- ORDER BY avg_response_time
-- LIMIT 10;

-- Test tool discovery query
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT st.*, ms.name as server_name
-- FROM server_tools st
-- JOIN mcp_servers ms ON st.server_id = ms.id
-- WHERE st.name = 'list_files'
--   AND ms.health_status = 'healthy'
-- ORDER BY st.success_count DESC;

-- Test audit log query
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM audit_logs
-- WHERE tenant_id = 'tenant-123'
--   AND timestamp > NOW() - INTERVAL '24 hours'
-- ORDER BY timestamp DESC
-- LIMIT 100;