"""
FastMCP response models for structured tool responses.

This module provides FastMCPBaseModel-based response classes that improve
type safety, performance, and framework integration for all FastMCP tools.
"""

from typing import Any

from fastmcp.utilities.types import FastMCPBaseModel


class ToolInfo(FastMCPBaseModel):
    """Information about a server tool."""

    name: str
    description: str


class ResourceInfo(FastMCPBaseModel):
    """Information about a server resource."""

    uri: str
    name: str


class ServerInfo(FastMCPBaseModel):
    """Information about a registered MCP server."""

    id: str
    name: str
    endpoint_url: str
    transport_type: str
    health_status: str
    capabilities: dict[str, Any]
    tags: dict[str, Any]
    created_at: str
    tools: list[ToolInfo] | None = None
    resources: list[ResourceInfo] | None = None


class UserContextInfo(FastMCPBaseModel):
    """User context information for responses."""

    user_id: str
    tenant_id: str | None = None
    can_see_all: bool = False
    authenticated: bool = True
    email: str | None = None
    roles: list[str] = []


class ServerListResponse(FastMCPBaseModel):
    """Response for list_servers tool."""

    servers: list[ServerInfo]
    count: int
    user_context: UserContextInfo


class ServerRegistrationResponse(FastMCPBaseModel):
    """Response for register_server tool."""

    success: bool
    server_id: str | None = None
    message: str
    server: ServerInfo | None = None
    user_context: UserContextInfo


class ProxyRequestResponse(FastMCPBaseModel):
    """Response for proxy_request tool."""

    success: bool
    response: dict[str, Any] | None = None
    error: str | None = None
    server_id: str | None = None
    method: str | None = None
    execution_time_ms: float | None = None
    user_context: UserContextInfo


class AuthenticationStatusInfo(FastMCPBaseModel):
    """Authentication status information."""

    enabled: bool
    provider: str
    user_authenticated: bool
    user_id: str
    user_email: str | None = None
    enhanced_auth_pattern: bool = True


class ServiceHealthInfo(FastMCPBaseModel):
    """Health information for a service component."""

    status: str
    version: str | None = None
    details: dict[str, Any] = {}


class HealthCheckResponse(FastMCPBaseModel):
    """Response for health_check tool."""

    status: str
    authentication: AuthenticationStatusInfo
    services: dict[str, ServiceHealthInfo | dict[str, Any]]
    timestamp: str | None = None
    user_context: UserContextInfo | None = None


class ConfigurationResponse(FastMCPBaseModel):
    """Response for configuration resource."""

    configuration: dict[str, Any]
    masked_secrets: bool = True
    timestamp: str
    user_context: UserContextInfo
