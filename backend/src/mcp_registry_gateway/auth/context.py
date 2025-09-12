"""
Authentication context classes for FastMCP server.

Provides FastMCPBaseModel-based data structures for managing user authentication state
and permissions throughout the request lifecycle with enhanced type safety.
"""

from typing import Any

from fastmcp.utilities.types import FastMCPBaseModel


class UserContext(FastMCPBaseModel):
    """User authentication context extracted from OAuth claims."""

    user_id: str
    tenant_id: str | None = None
    roles: list[str] = []
    claims: dict[str, Any] = {}

    @property
    def email(self) -> str:
        """Get user email from claims."""
        return self.claims.get("email", self.claims.get("preferred_username", ""))

    @property
    def name(self) -> str:
        """Get user display name from claims."""
        return self.claims.get("name", self.claims.get("given_name", self.email))

    @property
    def display_name(self) -> str:
        """Get user display name, preferring name over email."""
        return self.name or self.email

    @classmethod
    def from_token(cls, token: Any) -> "UserContext":
        """
        Create UserContext from token with enhanced claim extraction.

        Args:
            token: Authentication token with claims

        Returns:
            UserContext instance

        Raises:
            ValueError: If token is invalid or missing required claims
        """
        if not token or not hasattr(token, "claims"):
            raise ValueError("Invalid token: missing claims")

        claims = token.claims
        user_id = claims.get("sub")

        if not user_id:
            raise ValueError("Invalid token: missing user ID (sub claim)")

        tenant_id = claims.get("tid")
        roles = claims.get("roles", [])

        # Ensure roles is a list
        if not isinstance(roles, list):
            roles = [roles] if roles else []

        return cls(
            user_id=user_id,
            tenant_id=tenant_id,
            roles=roles,
            claims=claims,
        )

    def has_role(self, role: str) -> bool:
        """Check if user has a specific role."""
        return role in self.roles

    def has_any_role(self, roles: list[str]) -> bool:
        """Check if user has any of the specified roles."""
        return any(role in self.roles for role in roles)

    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.has_role("admin")

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return self.model_dump()


class AuthContext(FastMCPBaseModel):
    """Authentication context for FastMCP requests."""

    user: UserContext | None = None
    authenticated: bool = False

    def __init__(self, user: UserContext | None = None, **data: Any) -> None:
        """Initialize authentication context."""
        super().__init__(user=user, authenticated=user is not None, **data)

    @property
    def user_id(self) -> str:
        """Get user ID or 'anonymous' if not authenticated."""
        return self.user.user_id if self.user else "anonymous"

    @property
    def tenant_id(self) -> str | None:
        """Get tenant ID if available."""
        return self.user.tenant_id if self.user else None

    @property
    def roles(self) -> list[str]:
        """Get user roles or empty list if not authenticated."""
        return self.user.roles if self.user else []

    def has_role(self, role: str) -> bool:
        """Check if authenticated user has specific role."""
        return self.user.has_role(role) if self.user else False

    def has_any_role(self, roles: list[str]) -> bool:
        """Check if authenticated user has any of the specified roles."""
        return self.user.has_any_role(roles) if self.user else False

    def is_admin(self) -> bool:
        """Check if authenticated user is admin."""
        return self.user.is_admin() if self.user else False
