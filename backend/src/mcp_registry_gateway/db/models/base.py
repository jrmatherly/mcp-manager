"""
Base models and common enums for MCP Registry Gateway.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


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


class APIKeyScope(str, Enum):
    """API key permission scopes."""

    READ = "read"  # Read-only access
    WRITE = "write"  # Write access
    ADMIN = "admin"  # Administrative access
    PROXY = "proxy"  # MCP proxy access
    METRICS = "metrics"  # Metrics and monitoring
    HEALTH = "health"  # Health check access


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
