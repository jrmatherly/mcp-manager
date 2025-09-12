"""
FastMCP middleware components for the MCP Registry Gateway.

This module provides middleware for authentication, authorization, audit logging,
and rate limiting in the FastMCP server integration.
"""

from .audit import AuditLoggingMiddleware
from .base import BaseMiddleware
from .metrics import MetricsMiddleware, get_metrics_data, get_metrics_middleware
from .rate_limit import (
    AdvancedRateLimitMiddleware,
    RateLimitMiddleware,
    get_advanced_rate_limit_middleware,
    initialize_rate_limiting,
    shutdown_rate_limiting,
)
from .tool_access import ToolAccessControlMiddleware


# Import new middleware components when they exist
try:
    from .auth_middleware import AuthenticationMiddleware, AuthorizationMiddleware
    from .error_handling import ErrorHandlingMiddleware

    _has_new_middleware = True
except ImportError:
    _has_new_middleware = False


__all__ = [
    "AdvancedRateLimitMiddleware",
    "AuditLoggingMiddleware",
    "BaseMiddleware",
    "MetricsMiddleware",
    "RateLimitMiddleware",
    "ToolAccessControlMiddleware",
    "get_advanced_rate_limit_middleware",
    "get_metrics_data",
    "get_metrics_middleware",
    "initialize_rate_limiting",
    "shutdown_rate_limiting",
]

if _has_new_middleware:
    __all__.extend(
        [
            "AuthenticationMiddleware",
            "AuthorizationMiddleware",
            "ErrorHandlingMiddleware",
        ]
    )
