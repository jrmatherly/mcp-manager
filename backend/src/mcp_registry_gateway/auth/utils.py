"""
Enhanced authentication utilities for FastMCP server integration.

Provides helper functions for extracting user context using modern
FastMCP patterns with dependency injection and enhanced error handling.
"""

import logging
from typing import Any


try:
    from fastmcp import Context
    from fastmcp.exceptions import AuthenticationError, ToolError
    from fastmcp.server.dependencies import get_access_token
except ImportError:
    # Fallback for environments without FastMCP
    get_access_token = None
    Context = None
    ToolError = Exception
    AuthenticationError = Exception

from .context import AuthContext, UserContext


logger = logging.getLogger(__name__)


def extract_user_context(auth_data: Any) -> UserContext | None:
    """
    Extract user context from FastMCP auth data.

    Args:
        auth_data: Authentication data from FastMCP context

    Returns:
        UserContext instance or None if not authenticated
    """
    if not auth_data or not hasattr(auth_data, "claims"):
        return None

    claims = auth_data.claims
    user_id = claims.get("sub")

    if not user_id:
        logger.warning("No user ID found in auth claims")
        return None

    return UserContext(
        user_id=user_id,
        tenant_id=claims.get("tid"),
        roles=claims.get("roles", []),
        claims=claims,
    )


def create_auth_context(auth_data: Any) -> AuthContext:
    """
    Create authentication context from FastMCP auth data.

    Args:
        auth_data: Authentication data from FastMCP context

    Returns:
        AuthContext instance
    """
    user_context = extract_user_context(auth_data)
    return AuthContext(user_context)


def has_required_roles(user_roles: list[str], required_roles: list[str]) -> bool:
    """
    Check if user has any of the required roles.

    Args:
        user_roles: List of user's roles
        required_roles: List of required roles

    Returns:
        True if user has at least one required role
    """
    if not required_roles:  # No roles required
        return True

    return any(role in user_roles for role in required_roles)


def check_tenant_access(
    user_tenant: str | None,
    requested_tenant: str | None,
    user_roles: list[str],
) -> bool:
    """
    Check if user can access resources from requested tenant.

    Args:
        user_tenant: User's tenant ID
        requested_tenant: Requested tenant ID (None for all)
        user_roles: User's roles

    Returns:
        True if access is allowed
    """
    # Admin can access any tenant
    if "admin" in user_roles:
        return True

    # If no specific tenant requested, use user's tenant
    if not requested_tenant:
        return True

    # User can only access their own tenant
    return user_tenant == requested_tenant


def get_user_context_from_token() -> UserContext:
    """
    Get user context using enhanced FastMCP dependency injection pattern.

    This is the recommended way to access user context in FastMCP 2.12.0+.
    Uses get_access_token() for automatic token validation and null safety.

    Returns:
        UserContext instance with user information

    Raises:
        AuthenticationError: If no valid authentication token is available
        ToolError: If token claims are invalid or missing required fields
    """
    if get_access_token is None:
        raise AuthenticationError("FastMCP dependency injection not available")

    try:
        # Use FastMCP dependency injection for enhanced token access
        token = get_access_token()

        if not token or not hasattr(token, "claims"):
            raise AuthenticationError("No valid authentication token available")

        claims = token.claims
        user_id = claims.get("sub")

        if not user_id:
            raise ToolError("Invalid token: missing user ID (sub claim)")

        # Extract additional user information with fallbacks
        email = claims.get("email", claims.get("preferred_username", ""))
        # Note: name is available but not used in UserContext creation
        tenant_id = claims.get("tid")
        roles = claims.get("roles", [])

        # Ensure roles is a list
        if not isinstance(roles, list):
            roles = [roles] if roles else []

        logger.info(
            f"Authenticated user: {user_id} (email: {email}, tenant: {tenant_id})"
        )

        return UserContext(
            user_id=user_id,
            tenant_id=tenant_id,
            roles=roles,
            claims=claims,
        )

    except Exception as e:
        if isinstance(e, AuthenticationError | ToolError):
            raise

        logger.error(f"Failed to extract user context from token: {e}")
        raise AuthenticationError(f"Authentication failed: {e!s}") from e


def get_user_context_from_context(ctx: Any) -> UserContext | None:
    """
    Get user context from FastMCP Context (legacy pattern for backward compatibility).

    This method provides backward compatibility for existing code that uses
    direct context access. New code should use get_user_context_from_token().

    Args:
        ctx: FastMCP Context object

    Returns:
        UserContext instance or None if not authenticated
    """
    try:
        if not ctx or not hasattr(ctx, "auth") or not ctx.auth:
            return None

        token = ctx.auth.token if hasattr(ctx.auth, "token") else None
        if not token:
            return None

        return extract_user_context(token)

    except Exception as e:
        logger.warning(f"Failed to extract user context from context: {e}")
        return None


def require_authentication() -> UserContext:
    """
    Require valid authentication and return user context.

    This is a convenience function that combines authentication requirement
    with user context extraction using the enhanced pattern.

    Returns:
        UserContext instance

    Raises:
        AuthenticationError: If authentication is not available or invalid
    """
    return get_user_context_from_token()
