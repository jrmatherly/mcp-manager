"""
MCP Registry Gateway - Enterprise MCP Registry, Gateway, and Proxy System.

A comprehensive system for managing Model Context Protocol (MCP) servers with:
- Centralized service registry and discovery
- Intelligent request routing and load balancing
- Enterprise authentication and authorization
- Multi-tenancy and horizontal scalability
- Comprehensive monitoring and analytics

Built on FastMCP 2.0 for production-ready MCP deployments.
"""

__version__ = "0.1.0"
__author__ = "Jason Matherly"
__email__ = "jason@matherly.net"

# Core exports
from .core.config import Settings, get_settings
from .core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    MCPGatewayError,
    RegistryError,
    RoutingError,
)


__all__ = [
    "AuthenticationError",
    "AuthorizationError",
    "MCPGatewayError",
    "RegistryError",
    "RoutingError",
    "Settings",
    "__author__",
    "__email__",
    "__version__",
    "get_settings",
]
