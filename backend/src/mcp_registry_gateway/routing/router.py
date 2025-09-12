"""
MCP Request Router.

Intelligent routing and load balancing for MCP requests with
circuit breaker pattern, health monitoring, and multiple routing strategies.
"""

import asyncio
import logging
import random
import time
from enum import Enum
from typing import Any

from ..core.exceptions import (
    NoCompatibleServerError,
    ServerUnavailableError,
)
from ..db.models import MCPServer, ServerStatus
from ..services.registry import get_registry_service


logger = logging.getLogger(__name__)


class LoadBalancingStrategy(str, Enum):
    """Load balancing strategies."""

    ROUND_ROBIN = "round_robin"
    WEIGHTED = "weighted"
    LEAST_CONNECTIONS = "least_connections"
    RANDOM = "random"
    CONSISTENT_HASH = "consistent_hash"


class CircuitBreakerState(str, Enum):
    """Circuit breaker states."""

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class MCPRequest:
    """MCP request model for routing."""

    def __init__(
        self,
        method: str,
        params: dict[str, Any] | None = None,
        tools: list[str] | None = None,
        resources: list[str] | None = None,
        tenant_id: str | None = None,
        user_id: str | None = None,
        preferences: dict[str, Any] | None = None,
    ):
        self.method = method
        self.params = params or {}
        self.tools = tools or []
        self.resources = resources or []
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.preferences = preferences or {}
        self.request_id = f"mcp_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"


class CircuitBreaker:
    """Circuit breaker for individual servers."""

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 3,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold

        self.failure_count = 0
        self.success_count = 0
        self.state = CircuitBreakerState.CLOSED
        self.next_attempt = 0.0

    def can_execute(self) -> bool:
        """Check if request can be executed."""
        current_time = time.time()

        if self.state == CircuitBreakerState.CLOSED:
            return True
        elif self.state == CircuitBreakerState.OPEN:
            if current_time >= self.next_attempt:
                self.state = CircuitBreakerState.HALF_OPEN
                self.success_count = 0
                return True
            return False
        elif self.state == CircuitBreakerState.HALF_OPEN:
            return True

        return False

    def record_success(self) -> None:
        """Record successful request."""
        self.failure_count = 0

        if self.state == CircuitBreakerState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitBreakerState.CLOSED

    def record_failure(self) -> None:
        """Record failed request."""
        self.failure_count += 1

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN
            self.next_attempt = time.time() + self.recovery_timeout


class ServerMetrics:
    """Server performance metrics for load balancing."""

    def __init__(self, server_id: str):
        self.server_id = server_id
        self.active_connections = 0
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.avg_response_time = 0.0
        self.last_update = time.time()
        self._response_times: list[float] = []

    def record_request(self, response_time: float, success: bool) -> None:
        """Record request metrics."""
        self.total_requests += 1
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1

        # Update response time with sliding window
        self._response_times.append(response_time)
        if len(self._response_times) > 100:  # Keep last 100 response times
            self._response_times.pop(0)

        self.avg_response_time = sum(self._response_times) / len(self._response_times)
        self.last_update = time.time()

    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        if self.total_requests == 0:
            return 1.0
        return self.successful_requests / self.total_requests

    @property
    def error_rate(self) -> float:
        """Calculate error rate."""
        return 1.0 - self.success_rate

    def get_score(
        self,
        health_weight: float = 0.3,
        latency_weight: float = 0.4,
        capacity_weight: float = 0.3,
    ) -> float:
        """Calculate server score for load balancing."""
        # Health score (success rate)
        health_score = self.success_rate

        # Latency score (inverse of response time, normalized)
        if self.avg_response_time > 0:
            latency_score = 1.0 / (
                1.0 + self.avg_response_time / 100.0
            )  # Normalize to 100ms
        else:
            latency_score = 1.0

        # Capacity score (inverse of active connections)
        capacity_score = 1.0 / (
            1.0 + self.active_connections / 10.0
        )  # Normalize to 10 connections

        # Weighted combined score
        total_score = (
            health_weight * health_score
            + latency_weight * latency_score
            + capacity_weight * capacity_score
        )

        return total_score


class MCPRouter:
    """
    MCP request router with intelligent load balancing.

    Features:
    - Multiple load balancing strategies
    - Circuit breaker pattern for fault tolerance
    - Real-time server health monitoring
    - Request routing based on capabilities
    - Performance metrics tracking
    """

    def __init__(
        self,
        strategy: LoadBalancingStrategy = LoadBalancingStrategy.WEIGHTED,
        circuit_breaker_enabled: bool = True,
        health_check_interval: int = 30,
    ):
        self.strategy = strategy
        self.circuit_breaker_enabled = circuit_breaker_enabled
        self.health_check_interval = health_check_interval

        # State tracking
        self._circuit_breakers: dict[str, CircuitBreaker] = {}
        self._server_metrics: dict[str, ServerMetrics] = {}
        self._round_robin_index = 0
        self._consistent_hash_ring: dict[int, str] = {}

        # Background tasks
        self._health_check_task: asyncio.Task | None = None
        self._cleanup_task: asyncio.Task | None = None

    async def initialize(self) -> None:
        """Initialize the router."""
        # Start background tasks
        self._health_check_task = asyncio.create_task(self._health_check_loop())
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

        logger.info("MCP Router initialized")

    async def shutdown(self) -> None:
        """Shutdown the router."""
        # Cancel background tasks
        if self._health_check_task:
            self._health_check_task.cancel()
        if self._cleanup_task:
            self._cleanup_task.cancel()

        # Wait for tasks to complete
        if self._health_check_task or self._cleanup_task:
            await asyncio.gather(
                self._health_check_task, self._cleanup_task, return_exceptions=True
            )

        logger.info("MCP Router shutdown")

    async def route_request(
        self,
        request: MCPRequest,
        exclude_servers: set[str] | None = None,
    ) -> MCPServer:
        """
        Route MCP request to appropriate server.

        Args:
            request: MCP request to route
            exclude_servers: Set of server IDs to exclude

        Returns:
            MCPServer: Selected server for the request

        Raises:
            NoCompatibleServerError: If no compatible server found
            ServerUnavailableError: If all servers are unavailable
        """
        # Get compatible servers
        compatible_servers = await self._find_compatible_servers(request)

        if not compatible_servers:
            raise NoCompatibleServerError(
                "No compatible servers found for request",
                required_tools=request.tools,
                required_resources=request.resources,
                tenant_id=request.tenant_id,
            )

        # Filter out excluded servers
        if exclude_servers:
            compatible_servers = [
                server
                for server in compatible_servers
                if server.id not in exclude_servers
            ]

        # Filter out unhealthy servers and those with open circuit breakers
        available_servers = []
        for server in compatible_servers:
            # Check circuit breaker
            if self.circuit_breaker_enabled:
                circuit_breaker = self._get_circuit_breaker(server.id)
                if not circuit_breaker.can_execute():
                    logger.debug(f"Circuit breaker open for server {server.id}")
                    continue

            # Check health status
            if server.health_status != ServerStatus.HEALTHY:
                logger.debug(
                    f"Server {server.id} is not healthy: {server.health_status}"
                )
                continue

            available_servers.append(server)

        if not available_servers:
            raise ServerUnavailableError(
                "No available servers found for request",
                context={
                    "compatible_servers": [s.id for s in compatible_servers],
                    "circuit_breakers_open": [
                        s.id
                        for s in compatible_servers
                        if not self._get_circuit_breaker(s.id).can_execute()
                    ],
                },
            )

        # Select server using load balancing strategy
        selected_server = await self._select_server(available_servers, request)

        logger.info(
            f"Routed request {request.request_id} to server {selected_server.id} "
            f"({selected_server.name}) using {self.strategy} strategy"
        )

        return selected_server

    async def record_request_result(
        self,
        server_id: str,
        response_time: float,
        success: bool,
        error: Exception | None = None,
    ) -> None:
        """
        Record request result for metrics and circuit breaker.

        Args:
            server_id: Server ID that handled the request
            response_time: Request response time in seconds
            success: Whether request was successful
            error: Optional error that occurred
        """
        # Update metrics
        metrics = self._get_server_metrics(server_id)
        metrics.record_request(response_time * 1000, success)  # Convert to milliseconds

        # Update circuit breaker
        if self.circuit_breaker_enabled:
            circuit_breaker = self._get_circuit_breaker(server_id)
            if success:
                circuit_breaker.record_success()
            else:
                circuit_breaker.record_failure()
                logger.warning(
                    f"Request failed for server {server_id}: {error}, "
                    f"failure count: {circuit_breaker.failure_count}"
                )

    def increment_connection_count(self, server_id: str) -> None:
        """Increment active connection count for server."""
        metrics = self._get_server_metrics(server_id)
        metrics.active_connections += 1

    def decrement_connection_count(self, server_id: str) -> None:
        """Decrement active connection count for server."""
        metrics = self._get_server_metrics(server_id)
        metrics.active_connections = max(0, metrics.active_connections - 1)

    def get_server_metrics(self, server_id: str) -> dict[str, Any]:
        """Get server metrics for monitoring."""
        metrics = self._get_server_metrics(server_id)
        circuit_breaker = self._get_circuit_breaker(server_id)

        return {
            "server_id": server_id,
            "active_connections": metrics.active_connections,
            "total_requests": metrics.total_requests,
            "success_rate": metrics.success_rate,
            "error_rate": metrics.error_rate,
            "avg_response_time_ms": metrics.avg_response_time,
            "circuit_breaker_state": circuit_breaker.state.value,
            "failure_count": circuit_breaker.failure_count,
            "last_update": metrics.last_update,
        }

    async def _find_compatible_servers(self, request: MCPRequest) -> list[MCPServer]:
        """Find servers compatible with the request."""
        registry = await get_registry_service()

        # For general MCP methods like tools/list, resources/list, or method calls
        # without specific tool requirements, find all healthy servers
        if (
            not request.tools
            and not request.resources
            and request.method in ["tools/list", "resources/list", "ping", "initialize"]
        ):
            # If it's a general MCP method, any server should be able to handle it
            return await registry.find_servers(
                tenant_id=request.tenant_id,
                health_status=None,  # We'll filter by health later
                include_tools=True,
                include_resources=True,
            )

        return await registry.find_servers(
            tools=request.tools if request.tools else None,
            resources=request.resources if request.resources else None,
            tenant_id=request.tenant_id,
            health_status=None,  # We'll filter by health later
            include_tools=True,
            include_resources=True,
        )

    async def _select_server(
        self, servers: list[MCPServer], request: MCPRequest
    ) -> MCPServer:
        """Select server using configured load balancing strategy."""
        if len(servers) == 1:
            return servers[0]

        if self.strategy == LoadBalancingStrategy.ROUND_ROBIN:
            return await self._select_round_robin(servers)
        elif self.strategy == LoadBalancingStrategy.WEIGHTED:
            return await self._select_weighted(servers)
        elif self.strategy == LoadBalancingStrategy.LEAST_CONNECTIONS:
            return await self._select_least_connections(servers)
        elif self.strategy == LoadBalancingStrategy.RANDOM:
            return await self._select_random(servers)
        elif self.strategy == LoadBalancingStrategy.CONSISTENT_HASH:
            return await self._select_consistent_hash(servers, request)
        else:
            # Default to random
            return await self._select_random(servers)

    async def _select_round_robin(self, servers: list[MCPServer]) -> MCPServer:
        """Round robin server selection."""
        server = servers[self._round_robin_index % len(servers)]
        self._round_robin_index = (self._round_robin_index + 1) % len(servers)
        return server

    async def _select_weighted(self, servers: list[MCPServer]) -> MCPServer:
        """Weighted server selection based on performance metrics."""
        server_scores = []
        for server in servers:
            metrics = self._get_server_metrics(server.id)
            score = metrics.get_score()
            server_scores.append((server, score))

        # Sort by score (highest first) and select randomly from top performers
        server_scores.sort(key=lambda x: x[1], reverse=True)

        # Use weighted random selection from top 50% performers
        top_count = max(1, len(server_scores) // 2)
        top_servers = server_scores[:top_count]

        # Weight by score
        total_weight = sum(score for _, score in top_servers)
        if total_weight == 0:
            return random.choice(servers)

        rand = random.uniform(0, total_weight)
        current_weight = 0

        for server, score in top_servers:
            current_weight += score
            if rand <= current_weight:
                return server

        # Fallback
        return top_servers[0][0]

    async def _select_least_connections(self, servers: list[MCPServer]) -> MCPServer:
        """Select server with least active connections."""
        min_connections = float("inf")
        best_servers = []

        for server in servers:
            metrics = self._get_server_metrics(server.id)
            if metrics.active_connections < min_connections:
                min_connections = metrics.active_connections
                best_servers = [server]
            elif metrics.active_connections == min_connections:
                best_servers.append(server)

        # If multiple servers have same connection count, use weighted selection
        if len(best_servers) > 1:
            return await self._select_weighted(best_servers)

        return best_servers[0]

    async def _select_random(self, servers: list[MCPServer]) -> MCPServer:
        """Random server selection."""
        return random.choice(servers)

    async def _select_consistent_hash(
        self, servers: list[MCPServer], request: MCPRequest
    ) -> MCPServer:
        """Consistent hash server selection."""
        # Use tenant_id + user_id for consistent hashing
        hash_key = f"{request.tenant_id or 'default'}:{request.user_id or 'anonymous'}"
        hash_value = hash(hash_key) % (2**32)

        # Build hash ring if not exists or servers changed
        server_ids = {s.id for s in servers}
        if (
            not self._consistent_hash_ring
            or set(self._consistent_hash_ring.values()) != server_ids
        ):
            self._build_hash_ring(servers)

        # Find server for hash value
        ring_keys = sorted(self._consistent_hash_ring.keys())
        for ring_key in ring_keys:
            if hash_value <= ring_key:
                server_id = self._consistent_hash_ring[ring_key]
                return next(s for s in servers if s.id == server_id)

        # Wrap around to first server
        server_id = self._consistent_hash_ring[ring_keys[0]]
        return next(s for s in servers if s.id == server_id)

    def _build_hash_ring(self, servers: list[MCPServer]) -> None:
        """Build consistent hash ring."""
        self._consistent_hash_ring.clear()

        # Add multiple points per server for better distribution
        points_per_server = 100
        for server in servers:
            for i in range(points_per_server):
                key = f"{server.id}:{i}"
                hash_value = hash(key) % (2**32)
                self._consistent_hash_ring[hash_value] = server.id

    def _get_circuit_breaker(self, server_id: str) -> CircuitBreaker:
        """Get circuit breaker for server."""
        if server_id not in self._circuit_breakers:
            self._circuit_breakers[server_id] = CircuitBreaker()
        return self._circuit_breakers[server_id]

    def _get_server_metrics(self, server_id: str) -> ServerMetrics:
        """Get metrics for server."""
        if server_id not in self._server_metrics:
            self._server_metrics[server_id] = ServerMetrics(server_id)
        return self._server_metrics[server_id]

    async def _health_check_loop(self) -> None:
        """Background task for periodic health checks."""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self._update_server_health()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(60)  # Wait longer on error

    async def _update_server_health(self) -> None:
        """Update server health information."""
        try:
            _registry = await get_registry_service()
            # Registry service handles health checks automatically
            # This is just a placeholder for additional health logic if needed
        except Exception as e:
            logger.error(f"Failed to update server health: {e}")

    async def _cleanup_loop(self) -> None:
        """Background task for periodic cleanup."""
        while True:
            try:
                await asyncio.sleep(300)  # Cleanup every 5 minutes
                await self._cleanup_stale_metrics()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")

    async def _cleanup_stale_metrics(self) -> None:
        """Clean up stale metrics and circuit breakers."""
        current_time = time.time()
        stale_threshold = 3600  # 1 hour

        # Get current server IDs from registry
        try:
            registry = await get_registry_service()
            servers = await registry.find_servers(limit=1000)  # Get all servers
            active_server_ids = {s.id for s in servers}

            # Remove metrics for non-existent servers
            stale_metrics = []
            for server_id, metrics in self._server_metrics.items():
                if (
                    server_id not in active_server_ids
                    or current_time - metrics.last_update > stale_threshold
                ):
                    stale_metrics.append(server_id)

            for server_id in stale_metrics:
                self._server_metrics.pop(server_id, None)
                self._circuit_breakers.pop(server_id, None)
                logger.debug(f"Cleaned up stale metrics for server {server_id}")

        except Exception as e:
            logger.error(f"Error cleaning up stale metrics: {e}")


# Global router instance
_router: MCPRouter | None = None


async def get_router() -> MCPRouter:
    """Get router singleton."""
    global _router

    if _router is None:
        _router = MCPRouter()
        await _router.initialize()

    return _router
