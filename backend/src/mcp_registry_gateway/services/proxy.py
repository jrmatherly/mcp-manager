"""
MCP Request Proxy Service.

Handles proxying of MCP requests to registered servers with intelligent
routing, error handling, connection management, and comprehensive monitoring.
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Any

import httpx
import websockets

from ..core.exceptions import (
    NoCompatibleServerError,
    ProxyError,
    ServerUnavailableError,
)
from ..db.database import get_database
from ..db.models import (
    MCPServer,
    RequestLog,
    ServerMetric,
    TransportType,
)
from ..routing.router import MCPRequest, get_router


logger = logging.getLogger(__name__)


class MCPResponse:
    """MCP response wrapper with metadata."""

    def __init__(
        self,
        data: dict[str, Any],
        server_id: str,
        response_time: float,
        success: bool = True,
        error: str | None = None,
    ):
        self.data = data
        self.server_id = server_id
        self.response_time = response_time
        self.success = success
        self.error = error
        self.request_id = data.get("id", "unknown")


class ConnectionManager:
    """Manages HTTP and WebSocket connections to MCP servers."""

    def __init__(self):
        self._http_clients: dict[str, httpx.AsyncClient] = {}
        self._websocket_connections: dict[str, websockets.WebSocketServerProtocol] = {}
        self._connection_locks: dict[str, asyncio.Lock] = {}

    async def get_http_client(self, server_id: str) -> httpx.AsyncClient:
        """Get or create HTTP client for server."""
        if server_id not in self._http_clients:
            if server_id not in self._connection_locks:
                self._connection_locks[server_id] = asyncio.Lock()

            async with self._connection_locks[server_id]:
                if server_id not in self._http_clients:
                    self._http_clients[server_id] = httpx.AsyncClient(
                        timeout=httpx.Timeout(30.0),
                        limits=httpx.Limits(
                            max_connections=50, max_keepalive_connections=10
                        ),
                        headers={"Content-Type": "application/json"},
                    )

        return self._http_clients[server_id]

    async def close_connection(self, server_id: str) -> None:
        """Close connection for a specific server."""
        # Close HTTP client
        if server_id in self._http_clients:
            client = self._http_clients.pop(server_id)
            await client.aclose()

        # Close WebSocket connection
        if server_id in self._websocket_connections:
            ws = self._websocket_connections.pop(server_id)
            await ws.close()

        # Remove lock
        self._connection_locks.pop(server_id, None)

    async def close_all(self) -> None:
        """Close all connections."""
        # Close all HTTP clients
        for client in self._http_clients.values():
            await client.aclose()
        self._http_clients.clear()

        # Close all WebSocket connections
        for ws in self._websocket_connections.values():
            await ws.close()
        self._websocket_connections.clear()

        self._connection_locks.clear()


class MCPProxyService:
    """
    MCP request proxy service with intelligent routing and monitoring.

    Features:
    - Automatic server discovery and routing
    - HTTP and WebSocket transport support
    - Request/response logging and metrics
    - Circuit breaker pattern for fault tolerance
    - Connection pooling and management
    - Comprehensive error handling
    """

    def __init__(self):
        self._connection_manager = ConnectionManager()
        self._active_requests: dict[str, dict[str, Any]] = {}
        self._request_lock = asyncio.Lock()

    async def initialize(self) -> None:
        """Initialize the proxy service."""
        logger.info("MCP Proxy Service initialized")

    async def shutdown(self) -> None:
        """Shutdown the proxy service."""
        await self._connection_manager.close_all()
        logger.info("MCP Proxy Service shutdown")

    async def proxy_request(
        self,
        request_data: dict[str, Any],
        tenant_id: str | None = None,
        user_id: str | None = None,
        client_ip: str | None = None,
        user_agent: str | None = None,
        required_tools: list[str] | None = None,
        required_resources: list[str] | None = None,
        preferred_servers: list[str] | None = None,
        timeout: float = 30.0,
    ) -> MCPResponse:
        """
        Proxy an MCP request to an appropriate server.

        Args:
            request_data: JSON-RPC request data
            tenant_id: Optional tenant ID for multi-tenancy
            user_id: Optional user ID for logging
            client_ip: Client IP for logging
            user_agent: Client user agent
            required_tools: Required tool capabilities
            required_resources: Required resource capabilities
            preferred_servers: Preferred server IDs
            timeout: Request timeout in seconds

        Returns:
            MCPResponse: Response with metadata

        Raises:
            ProxyError: If proxying fails
            NoCompatibleServerError: If no compatible server found
            ServerUnavailableError: If all servers are unavailable
        """
        request_id = request_data.get("id", str(uuid.uuid4()))
        method = request_data.get("method", "unknown")
        start_time = time.time()

        # Create MCP request for routing
        mcp_request = MCPRequest(
            method=method,
            params=request_data.get("params", {}),
            tools=required_tools or [],
            resources=required_resources or [],
            tenant_id=tenant_id,
            user_id=user_id,
            preferences={"preferred_servers": preferred_servers or []},
        )
        mcp_request.request_id = request_id

        try:
            # Track active request
            async with self._request_lock:
                self._active_requests[request_id] = {
                    "start_time": start_time,
                    "method": method,
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                }

            # Route request to appropriate server
            router = await get_router()
            selected_server = await router.route_request(mcp_request)

            logger.info(
                f"Proxying request {request_id} ({method}) to server "
                f"{selected_server.id} ({selected_server.name})"
            )

            # Update connection count
            router.increment_connection_count(selected_server.id)

            try:
                # Proxy request based on transport type
                if selected_server.transport_type == TransportType.HTTP:
                    response = await self._proxy_http_request(
                        request_data, selected_server, timeout
                    )
                elif selected_server.transport_type == TransportType.WEBSOCKET:
                    response = await self._proxy_websocket_request(
                        request_data, selected_server, timeout
                    )
                else:
                    raise ProxyError(
                        f"Unsupported transport type: {selected_server.transport_type}",
                        server_id=selected_server.id,
                        transport_type=selected_server.transport_type.value,
                    )

                response_time = time.time() - start_time

                # Record successful request
                await router.record_request_result(
                    selected_server.id, response_time, True
                )

                # Log request
                await self._log_request(
                    request_id=request_id,
                    method=method,
                    server=selected_server,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    client_ip=client_ip,
                    user_agent=user_agent,
                    response_time=response_time,
                    success=True,
                    status_code=200,
                    request_data=request_data,
                    response_data=response.data,
                )

                # Update server metrics
                await self._update_server_metrics(
                    selected_server.id, response_time, True
                )

                return response

            except Exception as e:
                response_time = time.time() - start_time

                # Record failed request
                await router.record_request_result(
                    selected_server.id, response_time, False, e
                )

                # Log failed request
                await self._log_request(
                    request_id=request_id,
                    method=method,
                    server=selected_server,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    client_ip=client_ip,
                    user_agent=user_agent,
                    response_time=response_time,
                    success=False,
                    error_message=str(e),
                    request_data=request_data,
                )

                # Update server metrics
                await self._update_server_metrics(
                    selected_server.id, response_time, False
                )

                raise

            finally:
                # Update connection count
                router.decrement_connection_count(selected_server.id)

        except (NoCompatibleServerError, ServerUnavailableError):
            # These are routing errors, not proxy errors
            response_time = time.time() - start_time

            await self._log_request(
                request_id=request_id,
                method=method,
                tenant_id=tenant_id,
                user_id=user_id,
                client_ip=client_ip,
                user_agent=user_agent,
                response_time=response_time,
                success=False,
                error_message="No compatible servers available",
                request_data=request_data,
            )

            raise

        except Exception as e:
            logger.error(f"Proxy request {request_id} failed: {e}")
            raise ProxyError(
                message=f"Request proxying failed: {e}",
                request_id=request_id,
                method=method,
            )

        finally:
            # Remove from active requests
            async with self._request_lock:
                self._active_requests.pop(request_id, None)

    async def _proxy_http_request(
        self,
        request_data: dict[str, Any],
        server: MCPServer,
        timeout: float,
    ) -> MCPResponse:
        """Proxy HTTP request to MCP server."""
        start_time = time.time()

        try:
            client = await self._connection_manager.get_http_client(server.id)

            response = await client.post(
                f"{server.endpoint_url}/mcp",
                json=request_data,
                timeout=timeout,
            )

            if response.status_code == 200:
                response_data = response.json()
                response_time = time.time() - start_time

                return MCPResponse(
                    data=response_data,
                    server_id=server.id,
                    response_time=response_time,
                    success=True,
                )
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                response_time = time.time() - start_time

                return MCPResponse(
                    data={
                        "jsonrpc": "2.0",
                        "id": request_data.get("id"),
                        "error": {
                            "code": -32603,
                            "message": "Internal error",
                            "data": {"server_error": error_msg},
                        },
                    },
                    server_id=server.id,
                    response_time=response_time,
                    success=False,
                    error=error_msg,
                )

        except httpx.TimeoutException:
            response_time = time.time() - start_time
            error_msg = f"Request timeout after {timeout}s"

            return MCPResponse(
                data={
                    "jsonrpc": "2.0",
                    "id": request_data.get("id"),
                    "error": {
                        "code": -32603,
                        "message": "Request timeout",
                        "data": {"timeout": timeout},
                    },
                },
                server_id=server.id,
                response_time=response_time,
                success=False,
                error=error_msg,
            )

        except Exception as e:
            response_time = time.time() - start_time
            error_msg = f"HTTP request failed: {e}"

            logger.error(f"HTTP request to {server.endpoint_url} failed: {e}")

            return MCPResponse(
                data={
                    "jsonrpc": "2.0",
                    "id": request_data.get("id"),
                    "error": {
                        "code": -32603,
                        "message": "Internal error",
                        "data": {"error": str(e)},
                    },
                },
                server_id=server.id,
                response_time=response_time,
                success=False,
                error=error_msg,
            )

    async def _proxy_websocket_request(
        self,
        request_data: dict[str, Any],
        server: MCPServer,
        timeout: float,
    ) -> MCPResponse:
        """Proxy WebSocket request to MCP server."""
        start_time = time.time()

        try:
            # WebSocket URL
            ws_url = server.endpoint_url.replace("http://", "ws://").replace(
                "https://", "wss://"
            )

            async with websockets.connect(
                ws_url,
                ping_interval=None,  # Disable ping for simplicity
            ) as websocket:
                # Send request
                await websocket.send(json.dumps(request_data))

                # Wait for response
                response_text = await asyncio.wait_for(
                    websocket.recv(), timeout=timeout
                )

                response_data = json.loads(response_text)
                response_time = time.time() - start_time

                return MCPResponse(
                    data=response_data,
                    server_id=server.id,
                    response_time=response_time,
                    success=True,
                )

        except asyncio.TimeoutError:
            response_time = time.time() - start_time
            error_msg = f"WebSocket timeout after {timeout}s"

            return MCPResponse(
                data={
                    "jsonrpc": "2.0",
                    "id": request_data.get("id"),
                    "error": {
                        "code": -32603,
                        "message": "Request timeout",
                        "data": {"timeout": timeout},
                    },
                },
                server_id=server.id,
                response_time=response_time,
                success=False,
                error=error_msg,
            )

        except Exception as e:
            response_time = time.time() - start_time
            error_msg = f"WebSocket request failed: {e}"

            logger.error(f"WebSocket request to {ws_url} failed: {e}")

            return MCPResponse(
                data={
                    "jsonrpc": "2.0",
                    "id": request_data.get("id"),
                    "error": {
                        "code": -32603,
                        "message": "Internal error",
                        "data": {"error": str(e)},
                    },
                },
                server_id=server.id,
                response_time=response_time,
                success=False,
                error=error_msg,
            )

    async def _log_request(
        self,
        request_id: str,
        method: str,
        tenant_id: str | None = None,
        user_id: str | None = None,
        client_ip: str | None = None,
        user_agent: str | None = None,
        server: MCPServer | None = None,
        response_time: float | None = None,
        success: bool = True,
        status_code: int | None = None,
        error_message: str | None = None,
        request_data: dict[str, Any] | None = None,
        response_data: dict[str, Any] | None = None,
    ) -> None:
        """Log request details to database."""
        try:
            db_manager = await get_database()

            async with db_manager.get_session() as session:
                request_log = RequestLog(
                    request_id=request_id,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    ip_address=client_ip,
                    method="POST",  # All MCP requests are POST
                    path="/mcp/proxy",  # Virtual path for proxied requests
                    query_params={},
                    headers={"User-Agent": user_agent} if user_agent else {},
                    target_server_id=server.id if server else None,
                    duration_ms=response_time * 1000 if response_time else None,
                    status_code=status_code,
                    error_message=error_message,
                    request_metadata={
                        "mcp_method": method,
                        "mcp_request": request_data,
                        "mcp_response": response_data,
                        "success": success,
                    },
                )

                session.add(request_log)
                await session.commit()

        except Exception as e:
            logger.error(f"Failed to log request {request_id}: {e}")

    async def _update_server_metrics(
        self,
        server_id: str,
        response_time: float,
        success: bool,
    ) -> None:
        """Update server performance metrics."""
        try:
            db_manager = await get_database()

            async with db_manager.get_session() as session:
                metric = ServerMetric(
                    server_id=server_id,
                    response_time_ms=response_time * 1000,
                    error_rate=0.0 if success else 1.0,
                    custom_metrics={
                        "success": success,
                        "timestamp": time.time(),
                    },
                )

                session.add(metric)
                await session.commit()

        except Exception as e:
            logger.error(f"Failed to update metrics for server {server_id}: {e}")

    def get_active_requests(self) -> dict[str, dict[str, Any]]:
        """Get currently active requests."""
        return dict(self._active_requests)

    async def cancel_request(self, request_id: str) -> bool:
        """Cancel an active request."""
        async with self._request_lock:
            if request_id in self._active_requests:
                # In a full implementation, you would cancel the actual HTTP/WS request
                # For now, we just remove it from tracking
                self._active_requests.pop(request_id)
                logger.info(f"Cancelled request {request_id}")
                return True
            return False


# Global proxy service instance
_proxy_service: MCPProxyService | None = None


async def get_proxy_service() -> MCPProxyService:
    """Get proxy service singleton."""
    global _proxy_service

    if _proxy_service is None:
        _proxy_service = MCPProxyService()
        await _proxy_service.initialize()

    return _proxy_service
