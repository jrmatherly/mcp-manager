"""
MCP server registry models.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from .base import ServerStatus, TransportType, UUIDModel, utc_now
from .tenant import Tenant


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
