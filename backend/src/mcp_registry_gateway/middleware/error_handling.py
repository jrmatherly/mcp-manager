"""
Error Handling Middleware for FastMCP Server.

This middleware provides comprehensive error handling, logging, and statistics
tracking for all MCP operations.
"""

import logging
import traceback
from collections import defaultdict
from typing import Any

from fastmcp.server.middleware import CallNext, MiddlewareContext


try:
    from fastmcp.exceptions import (
        AuthenticationError as FastMCPAuthError,
    )
    from fastmcp.exceptions import (
        AuthorizationError as FastMCPAuthzError,
    )
    from fastmcp.exceptions import (
        ToolError as FastMCPToolError,
    )

    FASTMCP_AVAILABLE = True
except ImportError:
    # Fallback for environments without FastMCP exceptions
    FastMCPToolError = Exception
    FastMCPAuthError = Exception
    FastMCPAuthzError = Exception
    FASTMCP_AVAILABLE = False

from ..auth.utils import get_user_context_from_token
from ..core.exceptions import (
    FastMCPAuthenticationError,
    FastMCPAuthorizationError,
    FastMCPToolError,
    MCPGatewayError,
)
from .base import BaseMiddleware


logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseMiddleware):
    """Comprehensive error handling and logging for all MCP operations."""

    def __init__(self, include_traceback: bool = False, track_error_stats: bool = True):
        """
        Initialize error handling middleware.

        Args:
            include_traceback: Whether to include full traceback in error logs
            track_error_stats: Whether to track error statistics
        """
        super().__init__()
        self.include_traceback = include_traceback
        self.track_error_stats = track_error_stats
        self.error_counts: dict[str, int] = defaultdict(int)

    async def on_message(self, context: MiddlewareContext, call_next: CallNext) -> Any:
        """Handle and log all errors."""

        try:
            return await call_next(context)

        except Exception as error:
            # Track error statistics
            if self.track_error_stats:
                method = getattr(context, "method", "unknown")
                error_key = f"{type(error).__name__}:{method}"
                self.error_counts[error_key] += 1

            # Extract user context for error logging
            user_context = self._extract_user_context(context)

            # Create comprehensive error log
            error_log = {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "method": getattr(context, "method", "unknown"),
                "source": getattr(context, "source", "unknown"),
                "user_context": user_context,
            }

            if self.track_error_stats:
                error_log["error_count"] = self.error_counts[error_key]

            if self.include_traceback:
                error_log["traceback"] = traceback.format_exc()

            # Log error with appropriate level based on enhanced categorization
            error_category = self._categorize_error(error)
            if error_category == "authentication":
                self.logger.info(f"Authentication error: {error_log}")
            elif error_category == "authorization":
                self.logger.warning(f"Authorization error: {error_log}")
            elif error_category == "tool_error":
                self.logger.warning(f"Tool execution error: {error_log}")
            elif error_category == "validation":
                self.logger.warning(f"Validation error: {error_log}")
            elif error_category == "permission":
                self.logger.warning(f"Permission error: {error_log}")
            elif error_category == "system":
                self.logger.error(f"System error in {error_log['method']}: {error_log}")
            else:
                self.logger.error(
                    f"Unhandled error in {error_log['method']}: {error_log}"
                )

            # Re-raise error for proper MCP error handling
            raise

    def _extract_user_context(self, context: MiddlewareContext) -> dict[str, Any]:
        """Extract user context for error logging using enhanced patterns."""

        try:
            # Try enhanced authentication pattern first
            user_context = get_user_context_from_token()
            return {
                "user_id": user_context.user_id,
                "user_email": user_context.email,
                "tenant_id": user_context.tenant_id,
                "roles": user_context.roles,
                "auth_method": "enhanced_token_access",
            }
        except Exception:
            # Fall back to legacy context extraction
            try:
                if (
                    hasattr(context, "fastmcp_context")
                    and context.fastmcp_context
                    and hasattr(context.fastmcp_context, "auth")
                    and context.fastmcp_context.auth
                ):
                    token = context.fastmcp_context.auth.token
                    if token and hasattr(token, "claims"):
                        claims = token.claims
                        return {
                            "user_id": claims.get("sub"),
                            "user_email": claims.get(
                                "email", claims.get("preferred_username", "")
                            ),
                            "tenant_id": claims.get("tid"),
                            "roles": claims.get("roles", []),
                            "auth_method": "legacy_context_access",
                        }
            except Exception:
                pass

        return {
            "user_id": "anonymous",
            "user_email": "",
            "tenant_id": None,
            "roles": [],
            "auth_method": "none",
        }

    def get_error_statistics(self) -> dict[str, int]:
        """Get current error statistics."""
        return dict(self.error_counts)

    def reset_error_statistics(self) -> None:
        """Reset error statistics."""
        self.error_counts.clear()

    def _categorize_error(self, error: Exception) -> str:
        """
        Categorize error for appropriate logging and handling.

        Returns error category string for enhanced error processing.
        """
        # FastMCP-specific exceptions (if available)
        if FASTMCP_AVAILABLE:
            if isinstance(error, FastMCPAuthError):
                return "authentication"
            if isinstance(error, FastMCPAuthzError):
                return "authorization"
            if isinstance(error, FastMCPToolError):
                return "tool_error"

        # Our custom FastMCP-compatible exceptions
        if isinstance(error, FastMCPAuthenticationError):
            return "authentication"
        if isinstance(error, FastMCPAuthorizationError):
            return "authorization"
        if isinstance(error, FastMCPToolError):
            return "tool_error"

        # Standard Python and other exceptions
        if isinstance(error, PermissionError):
            return "permission"
        if isinstance(error, ValueError) and "validation" in str(error).lower():
            return "validation"
        if hasattr(error, "code") and error.code == -32002:  # Auth required
            return "authentication"
        if isinstance(error, ConnectionError | TimeoutError):
            return "system"
        if isinstance(error, MCPGatewayError):
            # Determine category based on error type
            error_type = type(error).__name__.lower()
            if "auth" in error_type:
                return "authentication"
            if "permission" in error_type or "authorization" in error_type:
                return "authorization"
            if "validation" in error_type:
                return "validation"
            return "system"

        return "unknown"
