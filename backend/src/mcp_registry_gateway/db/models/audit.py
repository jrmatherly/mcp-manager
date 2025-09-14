"""
Audit logging models for MCP Registry Gateway.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field

from .base import UUIDModel, utc_now


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
