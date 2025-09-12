"""
Database models for MCP Registry Gateway.

SQLModel-based models for registry data, authentication, and monitoring.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field, Relationship, SQLModel


class TransportType(str, Enum):
    """Supported MCP transport types."""

    HTTP = "http"
    WEBSOCKET = "websocket"
    STDIO = "stdio"
    SSE = "sse"


class ServerStatus(str, Enum):
    """MCP server health status."""

    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"
    MAINTENANCE = "maintenance"


class TenantStatus(str, Enum):
    """Tenant account status."""

    ACTIVE = "active"
    SUSPENDED = "suspended"
    DISABLED = "disabled"


class UserRole(str, Enum):
    """User roles for authorization."""

    ADMIN = "admin"
    USER = "user"
    SERVICE = "service"
    READONLY = "readonly"


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


def utc_now() -> datetime:
    """Get current UTC datetime (timezone-naive for PostgreSQL)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# Base Models


class TimestampedModel(SQLModel):
    """Base model with timestamp fields."""

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(
        default_factory=utc_now, sa_column_kwargs={"onupdate": utc_now}
    )


class UUIDModel(TimestampedModel):
    """Base model with UUID primary key and timestamps."""

    id: str = Field(default_factory=generate_uuid, primary_key=True)


# Registry Models


class Tenant(UUIDModel, table=True):
    """Tenant model for multi-tenancy support."""

    __tablename__ = "tenants"

    name: str = Field(max_length=255, index=True)
    description: str | None = None
    status: TenantStatus = Field(default=TenantStatus.ACTIVE)
    settings: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    servers: list["MCPServer"] = Relationship(back_populates="tenant")
    users: list["User"] = Relationship(back_populates="tenant")


class User(UUIDModel, table=True):
    """User model for authentication and authorization."""

    __tablename__ = "users"

    username: str = Field(max_length=255, unique=True, index=True)
    email: str = Field(max_length=255, unique=True, index=True)
    full_name: str | None = Field(max_length=255)
    role: UserRole = Field(default=UserRole.USER)
    is_active: bool = Field(default=True)

    # External auth provider info
    auth_provider: str | None = Field(max_length=50)  # azure, github, etc.
    auth_provider_id: str | None = Field(max_length=255)

    # Tenant relationship
    tenant_id: str | None = Field(foreign_key="tenants.id")
    tenant: Tenant | None = Relationship(back_populates="users")

    # Additional metadata
    user_metadata: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)


class MCPServer(UUIDModel, table=True):
    """MCP server registry model."""

    __tablename__ = "mcp_servers"

    # Basic server info
    name: str = Field(max_length=255, index=True)
    description: str | None = None
    version: str = Field(max_length=50)

    # Connection details
    endpoint_url: str = Field(max_length=500, index=True)
    transport_type: TransportType

    # Capabilities and metadata
    capabilities: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)
    tags: list[str] = Field(default_factory=list, sa_type=JSON)

    # Health and monitoring
    health_status: ServerStatus = Field(default=ServerStatus.UNKNOWN)
    last_health_check: datetime | None = None
    health_metadata: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)

    # Performance metrics (cached)
    avg_response_time: float | None = None
    success_rate: float | None = None
    active_connections: int | None = None

    # Tenant relationship
    tenant_id: str | None = Field(foreign_key="tenants.id")
    tenant: Tenant | None = Relationship(back_populates="servers")

    # Relationships
    tools: list["ServerTool"] = Relationship(back_populates="server")
    resources: list["ServerResource"] = Relationship(back_populates="server")
    metrics: list["ServerMetric"] = Relationship(back_populates="server")


class ServerTool(UUIDModel, table=True):
    """MCP server tool registry."""

    __tablename__ = "server_tools"

    server_id: str = Field(foreign_key="mcp_servers.id", index=True)
    server: MCPServer = Relationship(back_populates="tools")

    name: str = Field(max_length=255, index=True)
    description: str | None = None
    tool_schema: dict[str, Any] = Field(sa_type=JSON)
    tags: list[str] = Field(default_factory=list, sa_type=JSON)

    # Usage statistics (cached)
    total_calls: int = Field(default=0)
    success_count: int = Field(default=0)
    error_count: int = Field(default=0)
    avg_execution_time: float | None = None


class ServerResource(UUIDModel, table=True):
    """MCP server resource registry."""

    __tablename__ = "server_resources"

    server_id: str = Field(foreign_key="mcp_servers.id", index=True)
    server: MCPServer = Relationship(back_populates="resources")

    uri_template: str = Field(max_length=500, index=True)
    name: str | None = Field(max_length=255)
    description: str | None = None
    mime_type: str | None = Field(max_length=100)

    # Usage statistics (cached)
    total_accesses: int = Field(default=0)
    avg_size_bytes: int | None = None


class ServerMetric(UUIDModel, table=True):
    """Server performance metrics over time."""

    __tablename__ = "server_metrics"

    server_id: str = Field(foreign_key="mcp_servers.id", index=True)
    server: MCPServer = Relationship(back_populates="metrics")

    # Time-series data
    timestamp: datetime = Field(default_factory=utc_now, index=True)

    # Performance metrics
    response_time_ms: float | None = None
    requests_per_second: float | None = None
    error_rate: float | None = None
    cpu_usage: float | None = None
    memory_usage_mb: float | None = None

    # Connection metrics
    active_connections: int | None = None
    connection_pool_size: int | None = None

    # Custom metrics
    custom_metrics: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)


# Session and Authentication Models


class Session(UUIDModel, table=True):
    """User session model."""

    __tablename__ = "sessions"

    user_id: str = Field(foreign_key="users.id", index=True)
    session_token: str = Field(max_length=255, unique=True, index=True)

    # Session metadata
    ip_address: str | None = Field(max_length=45)  # IPv6 max length
    user_agent: str | None = Field(max_length=500)

    # Expiration
    expires_at: datetime

    # Session data
    session_data: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)

    # State
    is_active: bool = Field(default=True)
    last_activity: datetime = Field(default_factory=utc_now)


class APIKey(UUIDModel, table=True):
    """API key model for service authentication."""

    __tablename__ = "api_keys"

    name: str = Field(max_length=255)
    key_hash: str = Field(max_length=255, unique=True, index=True)
    key_prefix: str = Field(max_length=20, index=True)  # For identification

    # Ownership
    user_id: str | None = Field(foreign_key="users.id")
    tenant_id: str | None = Field(foreign_key="tenants.id")

    # Permissions and scope
    permissions: list[str] = Field(default_factory=list, sa_type=JSON)
    scopes: list[str] = Field(default_factory=list, sa_type=JSON)

    # State
    is_active: bool = Field(default=True)
    expires_at: datetime | None = None
    last_used: datetime | None = None

    # Usage statistics
    total_requests: int = Field(default=0)

    # Metadata
    api_key_metadata: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)


# Routing and Load Balancing Models


class RoutingRule(UUIDModel, table=True):
    """Custom routing rules for request routing."""

    __tablename__ = "routing_rules"

    name: str = Field(max_length=255)
    description: str | None = None

    # Rule conditions
    conditions: dict[str, Any] = Field(sa_type=JSON)

    # Target configuration
    target_servers: list[str] = Field(sa_type=JSON)  # Server IDs
    load_balancing_strategy: str = Field(default="round_robin", max_length=50)

    # Rule metadata
    priority: int = Field(default=100)  # Lower number = higher priority
    is_active: bool = Field(default=True)

    # Tenant relationship
    tenant_id: str | None = Field(foreign_key="tenants.id")


# Audit and Logging Models


class AuditLog(UUIDModel, table=True):
    """Audit log for tracking system activities."""

    __tablename__ = "audit_logs"

    # Who
    user_id: str | None = Field(foreign_key="users.id")
    tenant_id: str | None = Field(foreign_key="tenants.id")
    service_name: str | None = Field(max_length=100)

    # What
    action: str = Field(max_length=100, index=True)
    resource_type: str = Field(max_length=100, index=True)
    resource_id: str | None = Field(max_length=255, index=True)

    # When
    timestamp: datetime = Field(default_factory=utc_now, index=True)

    # Details
    details: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)

    # Request context
    request_id: str | None = Field(max_length=255, index=True)
    ip_address: str | None = Field(max_length=45)
    user_agent: str | None = Field(max_length=500)

    # Result
    success: bool = Field(default=True)
    error_message: str | None = None


class RequestLog(UUIDModel, table=True):
    """Request log for API gateway requests."""

    __tablename__ = "request_logs"

    # Request identification
    request_id: str = Field(max_length=255, unique=True, index=True)

    # Source
    user_id: str | None = Field(foreign_key="users.id")
    tenant_id: str | None = Field(foreign_key="tenants.id")
    ip_address: str | None = Field(max_length=45, index=True)

    # Request details
    method: str = Field(max_length=10)
    path: str = Field(max_length=500, index=True)
    query_params: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)
    headers: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)

    # Target server
    target_server_id: str | None = Field(foreign_key="mcp_servers.id")

    # Timing
    request_time: datetime = Field(default_factory=utc_now, index=True)
    response_time: datetime | None = None
    duration_ms: float | None = None

    # Response details
    status_code: int | None = None
    response_size_bytes: int | None = None

    # Error information
    error_type: str | None = Field(max_length=100)
    error_message: str | None = None

    # Additional metadata
    request_metadata: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)


class FastMCPAuditLog(UUIDModel, table=True):
    """Audit log specifically for FastMCP server operations."""

    __tablename__ = "fastmcp_audit_log"

    # User and tenant context
    user_id: str = Field(max_length=255, index=True)
    tenant_id: str | None = Field(max_length=255, index=True)
    user_roles: list[str] = Field(default_factory=list, sa_type=JSON)

    # MCP request details
    method: str = Field(max_length=100, index=True)
    params: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)
    request_id: str | None = Field(max_length=255, index=True)
    jsonrpc_version: str = Field(default="2.0", max_length=10)

    # Execution details
    success: bool = Field(index=True)
    duration_ms: int
    error_code: int | None = None
    error_message: str | None = None

    # Timestamp
    timestamp: datetime = Field(default_factory=utc_now, index=True)


# Configuration Models


class SystemConfig(UUIDModel, table=True):
    """System-wide configuration settings."""

    __tablename__ = "system_configs"

    key: str = Field(max_length=255, unique=True, index=True)
    value: dict[str, Any] = Field(sa_type=JSON)
    description: str | None = None

    # Metadata
    category: str = Field(max_length=100, index=True)
    is_sensitive: bool = Field(default=False)
    is_runtime_configurable: bool = Field(default=True)

    # Versioning
    version: int = Field(default=1)

    # Tenant-specific override
    tenant_id: str | None = Field(foreign_key="tenants.id")


# Circuit Breaker and Load Balancing Models


class CircuitBreakerState(str, Enum):
    """Circuit breaker states for fault tolerance."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, blocking requests
    HALF_OPEN = "half_open"  # Testing recovery


class LoadBalancingAlgorithm(str, Enum):
    """Load balancing algorithms."""

    ROUND_ROBIN = "round_robin"
    WEIGHTED = "weighted"
    LEAST_CONNECTIONS = "least_connections"
    RANDOM = "random"
    CONSISTENT_HASH = "consistent_hash"


class CircuitBreaker(UUIDModel, table=True):
    """Circuit breaker state tracking for fault tolerance."""

    __tablename__ = "circuit_breakers"

    # Target identification
    server_id: str = Field(foreign_key="mcp_servers.id", index=True)
    service_name: str = Field(max_length=255, index=True)

    # Circuit breaker state
    state: CircuitBreakerState = Field(default=CircuitBreakerState.CLOSED, index=True)
    failure_count: int = Field(default=0)
    success_count: int = Field(default=0)

    # Thresholds and timing
    failure_threshold: int = Field(default=5)
    success_threshold: int = Field(default=2)  # For half-open -> closed
    timeout_ms: int = Field(default=60000)  # Open -> half-open timeout

    # State timing
    last_failure_time: datetime | None = None
    last_success_time: datetime | None = None
    last_state_change: datetime = Field(default_factory=utc_now, index=True)

    # Statistics
    total_requests: int = Field(default=0)
    total_failures: int = Field(default=0)
    total_timeouts: int = Field(default=0)


class ConnectionPool(UUIDModel, table=True):
    """Connection pool management and monitoring."""

    __tablename__ = "connection_pools"

    # Pool identification
    server_id: str = Field(foreign_key="mcp_servers.id", index=True)
    pool_name: str = Field(max_length=255, index=True)
    transport_type: TransportType

    # Pool configuration
    max_size: int = Field(default=10)
    min_size: int = Field(default=2)
    timeout_ms: int = Field(default=30000)
    idle_timeout_ms: int = Field(default=300000)  # 5 minutes

    # Current state
    active_connections: int = Field(default=0)
    idle_connections: int = Field(default=0)
    pending_requests: int = Field(default=0)

    # Health status
    is_healthy: bool = Field(default=True, index=True)
    last_health_check: datetime | None = None

    # Statistics
    total_connections_created: int = Field(default=0)
    total_connections_closed: int = Field(default=0)
    connection_errors: int = Field(default=0)
    avg_connection_time_ms: float | None = None


class RequestQueue(UUIDModel, table=True):
    """Request queue management for load balancing."""

    __tablename__ = "request_queues"

    # Queue identification
    server_id: str = Field(foreign_key="mcp_servers.id", index=True)
    queue_name: str = Field(max_length=255, index=True)

    # Queue configuration
    max_size: int = Field(default=1000)
    processing_timeout_ms: int = Field(default=60000)
    priority_levels: int = Field(default=3)

    # Current state
    current_size: int = Field(default=0, index=True)
    processing_count: int = Field(default=0)

    # Queue health
    is_accepting_requests: bool = Field(default=True, index=True)
    last_processed: datetime | None = None

    # Statistics
    total_enqueued: int = Field(default=0)
    total_processed: int = Field(default=0)
    total_timeouts: int = Field(default=0)
    total_errors: int = Field(default=0)
    avg_processing_time_ms: float | None = None
    avg_wait_time_ms: float | None = None


# Enhanced API Key Model with Better Security


class APIKeyScope(str, Enum):
    """API key permission scopes."""

    READ = "read"  # Read-only access
    WRITE = "write"  # Write access
    ADMIN = "admin"  # Administrative access
    PROXY = "proxy"  # MCP proxy access
    METRICS = "metrics"  # Metrics and monitoring
    HEALTH = "health"  # Health check access


class EnhancedAPIKey(UUIDModel, table=True):
    """Enhanced API key model with better security and access control."""

    __tablename__ = "enhanced_api_keys"

    # Basic information
    name: str = Field(max_length=255, index=True)
    description: str | None = None

    # Key security
    key_hash: str = Field(max_length=255, unique=True, index=True)
    key_prefix: str = Field(max_length=20, index=True)  # For identification
    salt: str = Field(max_length=255)  # For additional security

    # Ownership and tenancy
    user_id: str | None = Field(foreign_key="users.id", index=True)
    tenant_id: str | None = Field(foreign_key="tenants.id", index=True)

    # Permissions and scopes
    scopes: list[APIKeyScope] = Field(default_factory=list, sa_type=JSON)
    allowed_servers: list[str] = Field(default_factory=list, sa_type=JSON)  # Server IDs
    allowed_methods: list[str] = Field(
        default_factory=list, sa_type=JSON
    )  # MCP methods

    # Access restrictions
    ip_whitelist: list[str] = Field(default_factory=list, sa_type=JSON)
    rate_limit_per_hour: int = Field(default=1000)
    rate_limit_per_day: int = Field(default=10000)

    # State and expiration
    is_active: bool = Field(default=True, index=True)
    expires_at: datetime | None = Field(index=True)
    last_used: datetime | None = Field(index=True)

    # Usage tracking
    total_requests: int = Field(default=0)
    total_errors: int = Field(default=0)
    last_success: datetime | None = None
    last_error: datetime | None = None

    # Security events
    failed_attempts: int = Field(default=0)
    last_failed_attempt: datetime | None = None
    is_locked: bool = Field(default=False, index=True)
    locked_until: datetime | None = None


class ServerAccessControl(UUIDModel, table=True):
    """Server-level access control and permissions."""

    __tablename__ = "server_access_control"

    # Target server
    server_id: str = Field(foreign_key="mcp_servers.id", index=True)

    # Access subject (user, tenant, or API key)
    user_id: str | None = Field(foreign_key="users.id", index=True)
    tenant_id: str | None = Field(foreign_key="tenants.id", index=True)
    api_key_id: str | None = Field(foreign_key="enhanced_api_keys.id", index=True)

    # Permissions
    can_read: bool = Field(default=True)
    can_write: bool = Field(default=False)
    can_admin: bool = Field(default=False)
    can_proxy: bool = Field(default=True)

    # Method-level permissions
    allowed_methods: list[str] = Field(default_factory=list, sa_type=JSON)
    denied_methods: list[str] = Field(default_factory=list, sa_type=JSON)

    # Time-based restrictions
    access_start_time: datetime | None = None
    access_end_time: datetime | None = None
    allowed_days: list[int] = Field(default_factory=list, sa_type=JSON)  # 0=Monday
    allowed_hours: list[int] = Field(default_factory=list, sa_type=JSON)  # 0-23

    # State
    is_active: bool = Field(default=True, index=True)

    # Usage tracking
    last_access: datetime | None = None
    access_count: int = Field(default=0)


# Data Retention and Optimization Models


class DataRetentionPolicy(UUIDModel, table=True):
    """Data retention policies for automatic cleanup."""

    __tablename__ = "data_retention_policies"

    # Policy identification
    name: str = Field(max_length=255, unique=True, index=True)
    description: str | None = None

    # Target data
    table_name: str = Field(max_length=100, index=True)
    date_column: str = Field(max_length=100)  # Column to check for age

    # Retention rules
    retention_days: int = Field(gt=0)  # Days to keep data
    batch_size: int = Field(default=1000, gt=0)  # Records per deletion batch

    # Conditions (JSON where clause)
    conditions: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)

    # Schedule
    is_active: bool = Field(default=True, index=True)
    last_run: datetime | None = Field(index=True)
    next_run: datetime | None = Field(index=True)

    # Statistics
    total_deleted: int = Field(default=0)
    last_deleted_count: int = Field(default=0)
    avg_execution_time_ms: float | None = None


class MaterializedView(UUIDModel, table=True):
    """Materialized view definitions for performance optimization."""

    __tablename__ = "materialized_views"

    # View identification
    name: str = Field(max_length=255, unique=True, index=True)
    description: str | None = None

    # View definition
    query: str  # SQL query for the view
    indexes: list[str] = Field(default_factory=list, sa_type=JSON)  # Index definitions

    # Refresh strategy
    refresh_strategy: str = Field(
        default="manual", max_length=50
    )  # manual, scheduled, triggered
    refresh_interval_minutes: int | None = None  # For scheduled refresh
    refresh_triggers: list[str] = Field(
        default_factory=list, sa_type=JSON
    )  # Table names that trigger refresh

    # State
    is_active: bool = Field(default=True, index=True)
    last_refreshed: datetime | None = Field(index=True)
    next_refresh: datetime | None = Field(index=True)

    # Statistics
    refresh_count: int = Field(default=0)
    avg_refresh_time_ms: float | None = None
    row_count: int | None = None
    size_bytes: int | None = None


# Performance Monitoring and Alerting


class PerformanceAlert(UUIDModel, table=True):
    """Performance alerts and thresholds."""

    __tablename__ = "performance_alerts"

    # Alert identification
    name: str = Field(max_length=255, index=True)
    description: str | None = None

    # Alert target
    server_id: str | None = Field(foreign_key="mcp_servers.id", index=True)
    metric_name: str = Field(max_length=100, index=True)

    # Alert conditions
    threshold_value: float
    comparison_operator: str = Field(max_length=10)  # >, <, >=, <=, ==
    duration_minutes: int = Field(default=5)  # How long condition must persist

    # Alert state
    is_active: bool = Field(default=True, index=True)
    is_triggered: bool = Field(default=False, index=True)
    first_triggered: datetime | None = None
    last_triggered: datetime | None = None
    trigger_count: int = Field(default=0)

    # Notification settings
    notification_channels: list[str] = Field(default_factory=list, sa_type=JSON)
    cooldown_minutes: int = Field(default=60)  # Minimum time between notifications
    last_notification: datetime | None = None


# Export all models for alembic migration detection
__all__ = [
    "APIKey",
    "APIKeyScope",
    "AuditLog",
    "CircuitBreaker",
    "CircuitBreakerState",
    "ConnectionPool",
    "DataRetentionPolicy",
    "EnhancedAPIKey",
    "FastMCPAuditLog",
    "LoadBalancingAlgorithm",
    "MCPServer",
    "MaterializedView",
    "PerformanceAlert",
    "RequestLog",
    "RequestQueue",
    "RoutingRule",
    "ServerAccessControl",
    "ServerMetric",
    "ServerResource",
    "ServerStatus",
    "ServerTool",
    "Session",
    "SystemConfig",
    "Tenant",
    "TenantStatus",
    "TransportType",
    "User",
    "UserRole",
]
