"""
MCP-specific routes for the unified architecture.

Provides MCP endpoints that integrate with the FastMCP server
while maintaining the path-based authentication requirements.
"""

import logging
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)


class MCPRequest(BaseModel):
    """MCP JSON-RPC request model."""

    jsonrpc: str = Field(default="2.0", description="JSON-RPC version")
    id: str | int | None = Field(None, description="Request ID")
    method: str = Field(..., description="MCP method name")
    params: dict[str, Any] | None = Field(None, description="Method parameters")


class MCPResponse(BaseModel):
    """MCP JSON-RPC response model."""

    jsonrpc: str = Field(default="2.0")
    id: str | int | None = None
    result: dict[str, Any] | None = None
    error: dict[str, Any] | None = None


class MCPHealthResponse(BaseModel):
    """Health check response for MCP endpoints."""

    status: str
    fastmcp_enabled: bool
    authentication_enabled: bool
    timestamp: str


async def get_fastmcp_server(request: Request):
    """
    Dependency to get the FastMCP server from app state.

    Args:
        request: FastAPI request object

    Returns:
        FastMCP server instance

    Raises:
        HTTPException: If FastMCP server is not available
    """
    if not hasattr(request.app.state, "fastmcp_server"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FastMCP server not available",
        )

    fastmcp_server = request.app.state.fastmcp_server
    if not fastmcp_server:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FastMCP server not initialized",
        )

    return fastmcp_server


async def check_authentication(request: Request) -> dict[str, Any]:
    """
    Check authentication status from request state.

    Args:
        request: FastAPI request object

    Returns:
        Dict containing user information

    Raises:
        HTTPException: If not authenticated
    """
    # Authentication is handled by path-based middleware
    # This just extracts the user info from request state
    if not getattr(request.state, "authenticated", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for MCP endpoints",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return getattr(request.state, "user_info", {})


def add_mcp_routes(app: FastAPI) -> None:
    """
    Add MCP-specific routes to the FastAPI application.

    Args:
        app: FastAPI application instance
    """

    @app.get("/mcp/health", response_model=MCPHealthResponse)
    async def mcp_health_check(request: Request) -> MCPHealthResponse:
        """
        Health check endpoint for MCP services.

        Returns the health status of the MCP integration.
        """
        from datetime import datetime, timezone

        fastmcp_enabled = hasattr(request.app.state, "fastmcp_server")
        fastmcp_available = (
            fastmcp_enabled and request.app.state.fastmcp_server is not None
        )

        # Get authentication status from settings
        from ..core.config import get_settings

        settings = get_settings()
        auth_enabled = bool(settings.fastmcp.azure_tenant_id)

        status_value = "healthy" if fastmcp_available else "degraded"

        return MCPHealthResponse(
            status=status_value,
            fastmcp_enabled=fastmcp_enabled,
            authentication_enabled=auth_enabled,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    @app.get("/mcp/oauth/login")
    async def oauth_login(request: Request):
        """
        Initiate OAuth login flow.

        Redirects to the FastMCP OAuth login endpoint.
        """
        fastmcp_server = await get_fastmcp_server(request)

        # Check if FastMCP server has OAuth capabilities
        if not hasattr(fastmcp_server, "auth") or not fastmcp_server.auth:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="OAuth authentication not configured",
            )

        # Construct OAuth login URL
        # Note: This would typically redirect to the OAuth provider
        # The actual implementation depends on FastMCP OAuth integration
        base_url = str(request.base_url).rstrip("/")
        oauth_url = f"{base_url}/mcp/oauth/authorize"

        return RedirectResponse(url=oauth_url, status_code=302)

    @app.post("/mcp/oauth/callback")
    async def oauth_callback(request: Request):
        """
        Handle OAuth callback.

        Processes the OAuth authorization code and returns tokens.
        """
        _fastmcp_server = await get_fastmcp_server(request)

        # Extract authorization code from request
        form_data = await request.form()
        code = form_data.get("code")
        state = form_data.get("state")

        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing authorization code",
            )

        # Process OAuth callback (implementation depends on FastMCP OAuth integration)
        # This is a placeholder - actual implementation would handle token exchange

        return JSONResponse(
            {
                "status": "success",
                "message": "OAuth callback processed",
                "code": code,
                "state": state,
            }
        )

    @app.post("/mcp/tools/{tool_name}", response_model=MCPResponse)
    async def call_mcp_tool(
        tool_name: str,
        _request: Request,
        mcp_request: MCPRequest,
        _fastmcp_server=Depends(get_fastmcp_server),
        user_info: dict[str, Any] = Depends(check_authentication),
    ) -> MCPResponse:
        """
        Call a specific MCP tool through the FastMCP server.

        Args:
            tool_name: Name of the MCP tool to call
            request: FastAPI request object
            mcp_request: MCP JSON-RPC request
            fastmcp_server: FastMCP server instance
            user_info: Authenticated user information

        Returns:
            MCP JSON-RPC response
        """
        logger.info(f"User {user_info.get('sub', 'unknown')} calling tool: {tool_name}")

        # Update request with tool name
        mcp_request.method = tool_name

        try:
            # Call the FastMCP server tool
            # Note: This is a simplified integration - actual implementation
            # would need to handle FastMCP's context and execution model

            # For now, we'll use the existing proxy logic
            from ..services.proxy import get_proxy_service

            proxy = await get_proxy_service()
            result = await proxy.proxy_request(
                request_data={
                    "jsonrpc": mcp_request.jsonrpc,
                    "id": mcp_request.id,
                    "method": mcp_request.method,
                    "params": mcp_request.params or {},
                },
                tenant_id=user_info.get("tid"),
                user_id=user_info.get("sub"),
                timeout=30.0,
            )

            if result.success:
                return MCPResponse(
                    jsonrpc="2.0",
                    id=mcp_request.id,
                    result=result.data.get("result"),
                )
            else:
                return MCPResponse(
                    jsonrpc="2.0",
                    id=mcp_request.id,
                    error=result.data.get(
                        "error",
                        {
                            "code": -32603,
                            "message": "Internal error",
                            "data": {"details": result.error},
                        },
                    ),
                )

        except Exception as e:
            logger.error(f"Error calling MCP tool {tool_name}: {e}")
            return MCPResponse(
                jsonrpc="2.0",
                id=mcp_request.id,
                error={
                    "code": -32603,
                    "message": "Internal error",
                    "data": {"details": str(e)},
                },
            )

    @app.post("/mcp", response_model=MCPResponse)
    async def mcp_jsonrpc(
        _request: Request,
        mcp_request: MCPRequest,
        _fastmcp_server=Depends(get_fastmcp_server),
        user_info: dict[str, Any] = Depends(check_authentication),
    ) -> MCPResponse:
        """
        General MCP JSON-RPC endpoint.

        Handles any MCP method through JSON-RPC protocol.

        Args:
            request: FastAPI request object
            mcp_request: MCP JSON-RPC request
            fastmcp_server: FastMCP server instance
            user_info: Authenticated user information

        Returns:
            MCP JSON-RPC response
        """
        logger.info(
            f"User {user_info.get('sub', 'unknown')} calling MCP method: {mcp_request.method}"
        )

        try:
            # Proxy the request through the existing proxy service
            from ..services.proxy import get_proxy_service

            proxy = await get_proxy_service()
            result = await proxy.proxy_request(
                request_data={
                    "jsonrpc": mcp_request.jsonrpc,
                    "id": mcp_request.id,
                    "method": mcp_request.method,
                    "params": mcp_request.params or {},
                },
                tenant_id=user_info.get("tid"),
                user_id=user_info.get("sub"),
                timeout=30.0,
            )

            # Return the raw MCP response
            return MCPResponse(
                jsonrpc="2.0",
                id=mcp_request.id,
                result=result.data.get("result") if result.success else None,
                error=result.data.get("error") if not result.success else None,
            )

        except Exception as e:
            logger.error(f"Error processing MCP request {mcp_request.method}: {e}")
            return MCPResponse(
                jsonrpc="2.0",
                id=mcp_request.id,
                error={
                    "code": -32603,
                    "message": "Internal error",
                    "data": {"details": str(e)},
                },
            )

    @app.get("/mcp/tools")
    async def list_mcp_tools(
        _request: Request,
        _fastmcp_server=Depends(get_fastmcp_server),
        user_info: dict[str, Any] = Depends(check_authentication),
    ) -> dict[str, Any]:
        """
        List available MCP tools.

        Returns:
            Dict containing available tools and their descriptions
        """
        logger.info(
            f"User {user_info.get('sub', 'unknown')} listing available MCP tools"
        )

        # This would typically introspect the FastMCP server for available tools
        # For now, return a static list based on our known tools
        tools = [
            {
                "name": "list_servers",
                "description": "List registered MCP servers with authentication context",
                "parameters": {"tenant_filter": {"type": "string", "optional": True}},
            },
            {
                "name": "register_server",
                "description": "Register a new MCP server (admin only)",
                "parameters": {
                    "name": {"type": "string", "required": True},
                    "endpoint_url": {"type": "string", "required": True},
                    "transport_type": {"type": "string", "default": "http"},
                    "capabilities": {"type": "string", "default": ""},
                    "description": {"type": "string", "optional": True},
                },
            },
            {
                "name": "proxy_request",
                "description": "Proxy MCP request with authentication context",
                "parameters": {
                    "method": {"type": "string", "required": True},
                    "params": {"type": "object", "optional": True},
                    "server_id": {"type": "string", "optional": True},
                },
            },
            {
                "name": "health_check",
                "description": "Comprehensive health check with authentication status",
                "parameters": {},
            },
        ]

        return {
            "tools": tools,
            "count": len(tools),
            "user_context": {
                "user_id": user_info.get("sub"),
                "tenant_id": user_info.get("tid"),
                "authenticated": True,
            },
        }

    @app.get("/mcp/resources")
    async def list_mcp_resources(
        _request: Request,
        _fastmcp_server=Depends(get_fastmcp_server),
        user_info: dict[str, Any] = Depends(check_authentication),
    ) -> dict[str, Any]:
        """
        List available MCP resources.

        Returns:
            Dict containing available resources and their descriptions
        """
        logger.info(
            f"User {user_info.get('sub', 'unknown')} listing available MCP resources"
        )

        # This would typically introspect the FastMCP server for available resources
        # For now, return a static list based on our known resources
        resources = [
            {
                "uri": "config://server",
                "name": "Server Configuration",
                "description": "Server configuration access (admin only)",
                "mime_type": "application/json",
                "permissions": ["admin"],
            },
        ]

        return {
            "resources": resources,
            "count": len(resources),
            "user_context": {
                "user_id": user_info.get("sub"),
                "tenant_id": user_info.get("tid"),
                "authenticated": True,
            },
        }

    logger.info("MCP routes added to FastAPI application")
