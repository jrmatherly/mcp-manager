"""
System configuration and monitoring models.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field

from .base import CircuitBreakerState, TransportType, UUIDModel, utc_now


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


# Export all models defined in this module
__all__ = [
    "CircuitBreaker",
    "ConnectionPool",
    "DataRetentionPolicy",
    "MaterializedView",
    "PerformanceAlert",
    "RequestQueue",
    "SystemConfig",
]
