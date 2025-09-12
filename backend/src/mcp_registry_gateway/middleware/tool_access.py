"""
Tool Access Control Middleware for FastMCP Server.

This middleware enforces role-based access control for MCP tools based on
user authentication context and configured permissions.
"""

import logging
from typing import Any

from fastmcp.server.middleware import CallNext, Middleware, MiddlewareContext


logger = logging.getLogger(__name__)


class ToolAccessControlMiddleware(Middleware):
    """Control tool access based on user roles and tenant isolation."""

    def __init__(self, tool_permissions: dict[str, list[str]]):
        """
        Initialize the tool access control middleware.

        Args:
            tool_permissions: Dictionary mapping tool names to required roles.
                             Empty list means public access.
        """
        self.tool_permissions = tool_permissions

    async def on_call_tool(
        self, context: MiddlewareContext, call_next: CallNext
    ) -> Any:
        """
        Enforce access control for tool calls.

        Args:
            context: FastMCP middleware context
            call_next: The next middleware/handler in the chain

        Returns:
            The tool response or raises an access denied error
        """
        # Get tool name from context
        tool_name = getattr(context, "tool_name", None)

        if not tool_name:
            logger.warning("Tool call without name parameter")
            raise ValueError("Tool name required")

        # Check if tool requires specific permissions
        required_roles = self.tool_permissions.get(tool_name, [])

        if required_roles:  # Tool requires authentication and specific roles
            # Check if user is authenticated (auth would be set by OAuth proxy)
            # Access authentication context through FastMCP context
            auth_context = None
            if (
                hasattr(context, "fastmcp_context")
                and context.fastmcp_context
                and hasattr(context.fastmcp_context, "auth")
                and context.fastmcp_context.auth
            ):
                token = context.fastmcp_context.auth.token
                if token and hasattr(token, "claims"):
                    auth_context = token.claims

            if not auth_context:
                logger.warning(f"Unauthenticated access attempt to tool: {tool_name}")
                raise PermissionError(f"Authentication required for tool: {tool_name}")

            # Extract user roles from auth context
            user_roles = auth_context.get("roles", [])
            user_id = auth_context.get("sub")

            # Special handling for server_owner role - check if user owns the resource
            if "server_owner" in required_roles and "server_owner" not in user_roles:
                # For server management operations, check if user owns the server
                server_id = getattr(context, "server_id", None)
                if server_id and await self._is_server_owner(user_id, server_id):
                    user_roles.append("server_owner")

            # Check if user has any required role
            if not any(role in user_roles for role in required_roles):
                logger.warning(
                    f"Access denied: user {user_id} with roles {user_roles} "
                    f"attempted to access {tool_name} requiring {required_roles}"
                )
                raise PermissionError(
                    f"Access denied: {tool_name} requires roles {required_roles}"
                )

            logger.debug(f"Access granted: {user_id} -> {tool_name}")

        # Continue to next middleware/handler
        return await call_next(context)

    async def _is_server_owner(self, user_id: str, server_id: str) -> bool:
        """
        Check if user owns the specified server.

        Args:
            user_id: User identifier from auth context
            server_id: Server identifier to check ownership

        Returns:
            bool: True if user owns the server, False otherwise
        """
        try:
            # Import here to avoid circular imports
            from ..services.registry import get_registry_service

            registry = await get_registry_service()
            server = await registry.get_server(server_id)

            if server and hasattr(server, "registered_by"):
                return server.registered_by == user_id

        except Exception as e:
            logger.error(f"Error checking server ownership: {e}")

        return False
