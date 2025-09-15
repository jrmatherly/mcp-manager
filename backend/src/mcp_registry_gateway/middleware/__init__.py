"""
FastMCP middleware components for the MCP Registry Gateway.

This module provides middleware for authentication, authorization, audit logging,
and rate limiting in the FastMCP server integration.
"""

from .audit import AuditLoggingMiddleware

# Direct imports of middleware components
from .auth_middleware import AuthenticationMiddleware, AuthorizationMiddleware
from .base import BaseMiddleware
from .error_handling import ErrorHandlingMiddleware
from .metrics import MetricsMiddleware, get_metrics_data, get_metrics_middleware
from .rate_limit import (
    AdvancedRateLimitMiddleware,
    RateLimitMiddleware,
    get_advanced_rate_limit_middleware,
    initialize_rate_limiting,
    shutdown_rate_limiting,
)
from .tool_access import ToolAccessControlMiddleware


__all__ = [
    "AdvancedRateLimitMiddleware",
    "AuditLoggingMiddleware",
    "AuthenticationMiddleware",
    "AuthorizationMiddleware",
    "BaseMiddleware",
    "ErrorHandlingMiddleware",
    "MetricsMiddleware",
    "RateLimitMiddleware",
    "ToolAccessControlMiddleware",
    "get_advanced_rate_limit_middleware",
    "get_metrics_data",
    "get_metrics_middleware",
    "initialize_rate_limiting",
    "shutdown_rate_limiting",
]
