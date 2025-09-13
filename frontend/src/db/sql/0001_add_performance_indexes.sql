-- Performance Indexes Migration
-- This migration adds all the critical performance indexes identified in the backend database scripts
-- Expected performance improvements: 40-90% for common queries

-- ============================================================================
-- MCP Server Indexes
-- ============================================================================

-- Index for server discovery by tenant and health status
CREATE INDEX IF NOT EXISTS idx_mcp_servers_tenant_status ON mcp_servers (tenant_id, health_status);

-- Index for server endpoint and transport type lookups
CREATE INDEX IF NOT EXISTS idx_mcp_servers_endpoint_transport ON mcp_servers (endpoint_url, transport_type);

-- Partial index for servers with health check data
CREATE INDEX IF NOT EXISTS idx_mcp_servers_health_check_time ON mcp_servers (last_health_check)
WHERE
    last_health_check IS NOT NULL;

-- Partial index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_mcp_servers_performance ON mcp_servers (
    avg_response_time,
    success_rate
)
WHERE
    health_status IN ('HEALTHY', 'DEGRADED');

-- ============================================================================
-- MCP Tools Indexes
-- ============================================================================

-- Index for tool discovery by name and server
CREATE INDEX IF NOT EXISTS idx_mcp_tools_name_server ON mcp_tools (name, server_id);

-- Partial index for tools with usage statistics
CREATE INDEX IF NOT EXISTS idx_mcp_tools_usage_stats ON mcp_tools (total_calls, success_count)
WHERE
    total_calls > 0;

-- ============================================================================
-- MCP Resources Indexes
-- ============================================================================

-- Index for resource discovery by URI and server
CREATE INDEX IF NOT EXISTS idx_mcp_resources_uri_server ON mcp_resources (uri_template, server_id);

-- Partial index for resources with MIME types
CREATE INDEX IF NOT EXISTS idx_mcp_resources_mime_type ON mcp_resources (mime_type)
WHERE
    mime_type IS NOT NULL;

-- ============================================================================
-- Server Metrics Indexes
-- ============================================================================

-- Time-series index for metrics analysis
CREATE INDEX IF NOT EXISTS idx_server_metrics_server_time ON server_metrics (server_id, collected_at DESC);

-- Partial index for performance indicators
CREATE INDEX IF NOT EXISTS idx_server_metrics_performance ON server_metrics (
    cpu_usage,
    memory_usage,
    error_rate
)
WHERE
    error_rate > 0;

-- ============================================================================
-- User Management Indexes
-- ============================================================================

-- Index for user lookups by tenant and role
CREATE INDEX IF NOT EXISTS idx_user_tenant_role ON "user" (tenant_id, role, is_active);

-- Partial index for auth provider information
CREATE INDEX IF NOT EXISTS idx_user_auth_provider ON "user" (auth_provider)
WHERE
    auth_provider IS NOT NULL;

-- ============================================================================
-- Session Management Indexes
-- ============================================================================

-- Index for active session lookups
CREATE INDEX IF NOT EXISTS idx_session_user_active ON session (
    user_id,
    is_active,
    expires_at
);

-- Partial index for active sessions by activity time
CREATE INDEX IF NOT EXISTS idx_sessions_activity_time ON sessions (last_activity DESC)
WHERE
    is_active = true;

-- ============================================================================
-- API Token Indexes
-- ============================================================================

-- Index for API token lookups by tenant
CREATE INDEX IF NOT EXISTS idx_api_token_tenant_active ON api_token (tenant_id, is_active);

-- Partial index for active tokens by expiration
CREATE INDEX IF NOT EXISTS idx_api_token_expiration ON api_token (expires_at)
WHERE
    is_active = true
    AND expires_at IS NOT NULL;

-- Partial index for token usage tracking
CREATE INDEX IF NOT EXISTS idx_api_token_usage ON api_token (last_used_at, usage_count)
WHERE
    is_active = true
    AND usage_count > 0;

-- ============================================================================
-- Enhanced API Keys Indexes
-- ============================================================================

-- Index for enhanced API key lookups
CREATE INDEX IF NOT EXISTS idx_enhanced_api_keys_hash ON enhanced_api_keys (key_hash, is_active);

-- Index for tenant-based lookups
CREATE INDEX IF NOT EXISTS idx_enhanced_api_keys_tenant ON enhanced_api_keys (tenant_id, is_active);

-- ============================================================================
-- Audit Log Indexes
-- ============================================================================

-- Index for audit log queries by tenant and time
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_time ON audit_log (tenant_id, timestamp DESC);

-- Index for audit log action and resource lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_action_resource ON audit_log (action, resource_type);

-- Partial index for user-specific audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_success ON audit_log (user_id, success)
WHERE
    user_id IS NOT NULL;

-- ============================================================================
-- Request Log Indexes
-- ============================================================================

-- Index for request log time-series queries
CREATE INDEX IF NOT EXISTS idx_request_logs_tenant_time ON request_logs (tenant_id, request_time DESC);

-- Partial index for server performance analysis
CREATE INDEX IF NOT EXISTS idx_request_logs_server_performance ON request_logs (target_server_id, duration_ms)
WHERE
    status_code < 400;

-- Partial index for IP and path analysis
CREATE INDEX IF NOT EXISTS idx_request_logs_ip_path ON request_logs (ip_address, path)
WHERE
    status_code >= 400;

-- ============================================================================
-- FastMCP Audit Log Indexes
-- ============================================================================

-- Index for FastMCP audit by user and time
CREATE INDEX IF NOT EXISTS idx_fastmcp_audit_log_user_time ON fastmcp_audit_log (user_id, timestamp DESC);

-- Index for method and success analysis
CREATE INDEX IF NOT EXISTS idx_fastmcp_audit_log_method_success ON fastmcp_audit_log (method, success);

-- Partial index for tenant performance analysis
CREATE INDEX IF NOT EXISTS idx_fastmcp_audit_log_tenant_performance ON fastmcp_audit_log (tenant_id, response_time_ms)
WHERE
    response_time_ms IS NOT NULL;

-- ============================================================================
-- System Configuration Indexes
-- ============================================================================

-- Index for system config lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key_namespace ON system_config (key, namespace);

-- Index for tenant-specific configs
CREATE INDEX IF NOT EXISTS idx_system_config_tenant ON system_config (tenant_id, is_active)
WHERE
    tenant_id IS NOT NULL;

-- ============================================================================
-- Composite Indexes for Complex Queries
-- ============================================================================

-- Composite index for server discovery optimization
CREATE INDEX IF NOT EXISTS idx_servers_discovery_composite ON mcp_servers (
    health_status,
    transport_type,
    avg_response_time
)
WHERE
    health_status IN ('HEALTHY', 'DEGRADED');

-- Composite index for tool discovery with performance metrics
CREATE INDEX IF NOT EXISTS idx_tools_discovery_performance ON mcp_tools (
    name,
    success_count,
    avg_execution_time,
    server_id
)
WHERE
    total_calls > 0;

-- Composite index for request routing optimization
CREATE INDEX IF NOT EXISTS idx_request_routing_composite ON request_logs (
    path,
    method,
    target_server_id,
    duration_ms,
    request_time DESC
)
WHERE
    status_code < 400;

-- Composite index for security access patterns
CREATE INDEX IF NOT EXISTS idx_security_access_composite ON audit_log (
    user_id,
    action,
    resource_type,
    success,
    timestamp DESC
)
WHERE
    user_id IS NOT NULL;

-- Composite index for tenant utilization tracking
CREATE INDEX IF NOT EXISTS idx_tenant_utilization_composite ON request_logs (
    tenant_id,
    DATE(request_time),
    status_code
);

-- ============================================================================
-- Additional Backend Compatibility Indexes
-- ============================================================================

-- Circuit breaker state lookups
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_server_state ON circuit_breakers (
    server_id,
    state,
    last_state_change
);

-- Connection pool monitoring
CREATE INDEX IF NOT EXISTS idx_connection_pools_server_active ON connection_pools (
    server_id,
    active_connections,
    last_used
);

-- Request queue management
CREATE INDEX IF NOT EXISTS idx_request_queues_server_priority ON request_queues (
    server_id,
    priority DESC,
    created_at
);

-- Server access control lookups
CREATE INDEX IF NOT EXISTS idx_server_access_control_lookup ON server_access_control (server_id, user_id, tenant_id);

-- Performance alert tracking
CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity_time ON performance_alerts (severity, created_at DESC)
WHERE
    resolved_at IS NULL;

-- Data retention policy execution
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_next_run ON data_retention_policies (next_run_at, is_active)
WHERE
    is_active = true;

-- ============================================================================
-- Statistics Update
-- ============================================================================

-- Update table statistics for the query planner
ANALYZE mcp_servers;

ANALYZE mcp_tools;

ANALYZE mcp_resources;

ANALYZE mcp_prompts;

ANALYZE server_metrics;

ANALYZE "user";

ANALYZE session;

ANALYZE sessions;

ANALYZE api_token;

ANALYZE enhanced_api_keys;

ANALYZE audit_log;

ANALYZE request_logs;

ANALYZE fastmcp_audit_log;

ANALYZE system_config;

ANALYZE tenant;

ANALYZE tenant_member;

ANALYZE circuit_breakers;

ANALYZE connection_pools;

ANALYZE request_queues;

ANALYZE server_access_control;

ANALYZE performance_alerts;

ANALYZE data_retention_policies;