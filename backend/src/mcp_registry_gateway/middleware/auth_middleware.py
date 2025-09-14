"""
Authentication and Authorization Middleware for FastMCP Server.

This module provides middleware for verifying authentication status
and enforcing role-based access control in the FastMCP pipeline.
"""

import logging
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

from ..auth.api_key_validator import api_key_validator
from ..auth.utils import get_user_context_from_context, get_user_context_from_token
from ..core.exceptions import (
    FastMCPAuthenticationError,
    FastMCPAuthorizationError,
    FastMCPMiddlewareError,
)
from .base import BaseMiddleware


logger = logging.getLogger(__name__)


class AuthenticationMiddleware(BaseMiddleware):
    """Verify and log authentication status for all requests."""

    def __init__(self, require_auth: bool = False):
        """
        Initialize authentication middleware.

        Args:
            require_auth: Whether to require authentication for all requests
        """
        super().__init__()
        self.require_auth = require_auth

    async def on_request(self, context: MiddlewareContext, call_next: CallNext) -> Any:
        """Verify authentication for all requests."""

        # Dual authentication system:
        # 1. OAuth Proxy handles OAuth token validation
        # 2. This middleware adds API key validation from Better-Auth

        user_authenticated = False
        user_id = "anonymous"
        tenant_id = None
        user_context = None
        auth_method = None

        # First, check for API key authentication
        api_key = None
        if hasattr(context, "request") and context.request:
            # Check both x-api-key and Authorization Bearer headers
            api_key = context.request.headers.get("x-api-key")
            if not api_key:
                auth_header = context.request.headers.get("authorization", "")
                if auth_header.startswith("Bearer mcp_"):  # Better-Auth API keys start with mcp_
                    api_key = auth_header[7:]  # Remove "Bearer " prefix

        if api_key:
            try:
                # Validate API key using Better-Auth tables
                api_key_context = await api_key_validator.validate_api_key(api_key)
                if api_key_context:
                    user_authenticated = True
                    user_id = api_key_context["user_id"]
                    user_context = api_key_context
                    auth_method = "api_key"
                    self.logger.info(
                        f"Authenticated via API key: {user_id} ({api_key_context['email']}, key: {api_key_context['api_key_name']})"
                    )
            except Exception as e:
                self.logger.warning(f"API key validation failed: {e}")
                # Continue to OAuth validation

        # If not authenticated via API key, try OAuth
        if not user_authenticated:
            try:
                # Try enhanced OAuth authentication pattern
                user_context = get_user_context_from_token()
                user_authenticated = True
                user_id = user_context.user_id
                tenant_id = user_context.tenant_id
                auth_method = "oauth"
                self.logger.info(
                    f"Authenticated via OAuth: {user_id} ({user_context.email}, tenant: {tenant_id})"
                )
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
                            user_authenticated = True
                            user_id = token.claims.get("sub", "unknown")
                            tenant_id = token.claims.get("tid")
                            auth_method = "oauth_legacy"
                            self.logger.info(
                                f"Authenticated via OAuth (legacy): {user_id} (tenant: {tenant_id})"
                            )
                        else:
                            self.logger.warning(
                                f"Unauthenticated request to {getattr(context, 'method', 'unknown')}"
                            )
                    else:
                        self.logger.warning(
                            f"No authentication context for {getattr(context, 'method', 'unknown')}"
                        )
                except Exception as e:
                    self.logger.error(f"Error extracting authentication context: {e}")
                    if self.require_auth:
                        raise FastMCPAuthenticationError(
                            "Authentication extraction failed",
                            auth_method="oauth_proxy",
                            operation="authentication_middleware",
                        ) from e

        # Store authentication method in context for downstream use
        if user_authenticated and auth_method:
            context.auth_method = auth_method
            context.user_context = user_context

        # Enforce authentication requirement if configured
        if self.require_auth and not user_authenticated:
            self.logger.error("Authentication required but not provided")
            raise FastMCPAuthenticationError(
                "Authentication required (OAuth or API key)",
                auth_method="dual_auth",
                operation="authentication_middleware",
            )

        return await call_next(context)


class AuthorizationMiddleware(BaseMiddleware):
    """Role-based access control for tools and resources."""

    def __init__(self, tool_permissions: dict[str, list[str]] | None = None):
        """
        Initialize authorization middleware.

        Args:
            tool_permissions: Dict mapping tool names to required roles
                            e.g., {"register_server": ["admin"], "list_servers": ["user", "admin"]}
        """
        super().__init__()
        self.tool_permissions = tool_permissions or {}

    async def on_call_tool(
        self, context: MiddlewareContext, call_next: CallNext
    ) -> Any:
        """Check tool access permissions."""

        tool_name = getattr(context, "tool_name", None)
        if not tool_name:
            self.logger.warning("Tool call without name parameter")
            return await call_next(context)

        required_roles = self.tool_permissions.get(tool_name, [])

        if required_roles:
            try:
                # Try enhanced authentication pattern first
                user_context = get_user_context_from_token()
                user_roles = user_context.roles
                user_id = user_context.user_id

                # Check if user has any required role
                if not any(role in user_roles for role in required_roles):
                    self.logger.warning(
                        f"Access denied: user {user_id} ({user_context.email}) lacks roles {required_roles} for tool {tool_name}"
                    )
                    raise FastMCPAuthorizationError(
                        f"Access denied: {tool_name} requires roles {required_roles}",
                        required_roles=required_roles,
                        user_roles=user_roles,
                        operation=f"tool:{tool_name}",
                    )

                self.logger.info(
                    f"Access granted: user {user_id} ({user_context.email}) has required role for tool {tool_name}"
                )

            except FastMCPAuthorizationError:
                # Re-raise authorization errors
                raise
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
                            user_roles = token.claims.get("roles", [])
                            user_id = token.claims.get("sub", "unknown")

                            # Check if user has any required role
                            if not any(role in user_roles for role in required_roles):
                                self.logger.warning(
                                    f"Access denied: user {user_id} lacks roles {required_roles} for tool {tool_name} [legacy]"
                                )
                                raise FastMCPAuthorizationError(
                                    f"Access denied: {tool_name} requires roles {required_roles}",
                                    required_roles=required_roles,
                                    user_roles=user_roles,
                                    operation=f"tool:{tool_name}",
                                )

                            self.logger.info(
                                f"Access granted: user {user_id} has required role for tool {tool_name} [legacy]"
                            )
                        else:
                            raise FastMCPAuthenticationError(
                                f"Authentication required for tool {tool_name}",
                                auth_method="oauth_proxy",
                                operation=f"tool:{tool_name}",
                            )
                    else:
                        raise FastMCPAuthenticationError(
                            f"Authentication required for tool {tool_name}",
                            auth_method="oauth_proxy",
                            operation=f"tool:{tool_name}",
                        )
                except (FastMCPAuthenticationError, FastMCPAuthorizationError):
                    # Re-raise our custom exceptions
                    raise
                except Exception as e:
                    self.logger.error(
                        f"Error during authorization check for tool {tool_name}: {e}"
                    )
                    raise FastMCPMiddlewareError(
                        f"Authorization check failed for tool {tool_name}",
                        middleware_name="AuthorizationMiddleware",
                        operation=f"tool_authorization:{tool_name}",
                    ) from e

        return await call_next(context)

    async def on_read_resource(
        self, context: MiddlewareContext, call_next: CallNext
    ) -> Any:
        """Check resource access permissions."""

        resource_uri = getattr(context, "resource_uri", "")

        # Check if resource requires admin access
        if resource_uri.startswith("config://"):
            try:
                # Try enhanced authentication pattern first
                user_context = get_user_context_from_token()
                user_roles = user_context.roles

                if "admin" not in user_roles:
                    raise FastMCPAuthorizationError(
                        "Admin access required for configuration resources",
                        required_roles=["admin"],
                        user_roles=user_roles,
                        operation=f"resource:{resource_uri}",
                    )

                self.logger.info(
                    f"Admin access granted for resource {resource_uri} to user {user_context.user_id} ({user_context.email})"
                )

            except FastMCPAuthorizationError:
                # Re-raise authorization errors
                raise
            except Exception:
                # Fall back to legacy context extraction
                try:
                    user_context_legacy = get_user_context_from_context(
                        context.fastmcp_context
                        if hasattr(context, "fastmcp_context")
                        else None
                    )
                    if user_context_legacy:
                        user_roles = user_context_legacy.roles
                        if "admin" not in user_roles:
                            raise FastMCPAuthorizationError(
                                "Admin access required for configuration resources",
                                required_roles=["admin"],
                                user_roles=user_roles,
                                operation=f"resource:{resource_uri}",
                            )

                        self.logger.info(
                            f"Admin access granted for resource {resource_uri} to user {user_context_legacy.user_id} [legacy]"
                        )
                    else:
                        raise FastMCPAuthenticationError(
                            "Authentication required for configuration resources",
                            auth_method="oauth_proxy",
                            operation=f"resource:{resource_uri}",
                        )
                except (FastMCPAuthenticationError, FastMCPAuthorizationError):
                    # Re-raise our custom exceptions
                    raise
                except Exception as e:
                    self.logger.error(
                        f"Error during resource authorization check for {resource_uri}: {e}"
                    )
                    raise FastMCPMiddlewareError(
                        f"Resource authorization check failed for {resource_uri}",
                        middleware_name="AuthorizationMiddleware",
                        operation=f"resource_authorization:{resource_uri}",
                    ) from e

        return await call_next(context)
