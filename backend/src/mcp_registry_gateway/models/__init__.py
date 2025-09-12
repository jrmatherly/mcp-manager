"""
FastMCP models package for structured response types.

This package provides FastMCPBaseModel-based response classes for all
FastMCP tools and resources, improving type safety and performance.
"""

from .responses import (
    AuthenticationStatusInfo,
    HealthCheckResponse,
    ProxyRequestResponse,
    ResourceInfo,
    ServerInfo,
    ServerListResponse,
    ServerRegistrationResponse,
    ToolInfo,
    UserContextInfo,
)


__all__ = [
    "AuthenticationStatusInfo",
    "HealthCheckResponse",
    "ProxyRequestResponse",
    "ResourceInfo",
    "ServerInfo",
    "ServerListResponse",
    "ServerRegistrationResponse",
    "ToolInfo",
    "UserContextInfo",
]
