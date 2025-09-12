"""
Main FastAPI application for MCP Registry Gateway.

Provides REST API endpoints for MCP server management, request routing,
and system administration with comprehensive monitoring and security.
"""

import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from ..core.config import get_settings
from ..core.exceptions import (
    MCPGatewayError,
    NoCompatibleServerError,
    ProxyError,
    ServerUnavailableError,
)
from ..db.database import close_database, create_tables, startup_database
from ..db.models import ServerStatus, TransportType
from ..middleware.metrics import get_metrics_data
from ..routing.router import get_router
from ..services.proxy import get_proxy_service
from ..services.registry import get_registry_service


logger = logging.getLogger(__name__)


# Request/Response Models


class ServerRegistrationRequest(BaseModel):
    """Request model for server registration."""

    name: str = Field(..., description="Server name (unique within tenant)")
    endpoint_url: str = Field(..., description="Server endpoint URL")
    transport_type: TransportType = Field(..., description="Transport protocol type")
    version: str = Field(default="1.0.0", description="Server version")
    description: str | None = Field(None, description="Server description")
    capabilities: dict[str, Any] | None = Field(None, description="Server capabilities")
    tags: list[str] | None = Field(None, description="Server tags")
    auto_discover: bool = Field(default=True, description="Auto-discover capabilities")


class ServerResponse(BaseModel):
    """Response model for server information."""

    id: str
    name: str
    endpoint_url: str
    transport_type: TransportType
    version: str
    description: str | None
    capabilities: dict[str, Any]
    tags: list[str]
    health_status: ServerStatus
    last_health_check: str | None
    tenant_id: str | None
    created_at: str
    updated_at: str


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    timestamp: str
    version: str
    components: dict[str, Any]


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    message: str
    details: dict[str, Any] | None = None


class MCPProxyRequest(BaseModel):
    """MCP proxy request model."""

    # JSON-RPC fields
    jsonrpc: str = Field(default="2.0", description="JSON-RPC version")
    id: str | int | None = Field(None, description="Request ID")
    method: str = Field(..., description="MCP method name")
    params: dict[str, Any] | list[Any] | None = Field(
        None, description="Method parameters"
    )

    # Routing preferences
    required_tools: list[str] | None = Field(
        None, description="Required tool capabilities"
    )
    required_resources: list[str] | None = Field(
        None, description="Required resource capabilities"
    )
    preferred_servers: list[str] | None = Field(
        None, description="Preferred server IDs"
    )
    timeout: float = Field(default=30.0, description="Request timeout in seconds")


class MCPProxyResponse(BaseModel):
    """MCP proxy response model."""

    # JSON-RPC response
    jsonrpc: str = Field(default="2.0")
    id: str | int | None = None
    result: dict[str, Any] | None = None
    error: dict[str, Any] | None = None

    # Metadata
    server_id: str = Field(..., description="Server that handled the request")
    response_time_ms: float = Field(..., description="Response time in milliseconds")
    success: bool = Field(..., description="Whether request was successful")


# Application Lifespan Management


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting MCP Registry Gateway")

    # Initialize database connections
    await startup_database()

    # Create database tables
    await create_tables()

    # Initialize services
    await get_registry_service()
    await get_router()
    await get_proxy_service()

    # Initialize FastMCP server if enabled
    fastmcp_server = None
    if settings.fastmcp.enabled:
        try:
            from ..fastmcp_server import get_fastmcp_server

            fastmcp_server = await get_fastmcp_server()
            logger.info("FastMCP server initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize FastMCP server: {e}")
            # Continue without FastMCP if initialization fails
            fastmcp_server = None

    logger.info("MCP Registry Gateway started successfully")

    try:
        yield
    finally:
        logger.info("Shutting down MCP Registry Gateway")

        # Shutdown FastMCP server if it was initialized
        if fastmcp_server:
            try:
                await fastmcp_server.shutdown()
                logger.info("FastMCP server shutdown complete")
            except Exception as e:
                logger.error(f"Error shutting down FastMCP server: {e}")

        # Shutdown services
        proxy = await get_proxy_service()
        await proxy.shutdown()

        router = await get_router()
        await router.shutdown()

        registry = await get_registry_service()
        await registry.shutdown()

        # Close database connections
        await close_database()

        logger.info("MCP Registry Gateway shutdown complete")


# FastAPI Application

settings = get_settings()

app = FastAPI(
    title="MCP Registry Gateway",
    description="Enterprise MCP Registry, Gateway, and Proxy System",
    version="0.1.0",
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
    openapi_url=settings.openapi_url,
    lifespan=lifespan,
)

# CORS Configuration
if settings.security.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.security.cors_origins,
        allow_credentials=settings.security.cors_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Mount FastMCP server if enabled
if settings.fastmcp.enabled:
    logger.info("FastMCP integration enabled - will be available at startup")
    # Note: FastMCP mounting will be handled in the lifespan manager
    # This ensures proper initialization order


# Exception Handlers


@app.exception_handler(MCPGatewayError)
async def mcp_error_handler(_request, exc: MCPGatewayError):
    """Handle MCP Gateway specific errors."""
    logger.error(f"MCP Gateway error: {exc}")
    return JSONResponse(
        status_code=400,
        content=exc.to_dict(),
    )


@app.exception_handler(Exception)
async def general_error_handler(_request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An internal server error occurred",
            "details": {"type": type(exc).__name__} if settings.is_debug else None,
        },
    )


# Health and Status Endpoints


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns system health status and component information.
    """
    from datetime import datetime, timezone

    # Check database health
    from ..db.database import get_database

    db = await get_database()
    db_health = await db.health_check()

    # Check services health
    try:
        _registry = await get_registry_service()
        registry_health = "healthy"
    except Exception:
        registry_health = "unhealthy"

    try:
        _router = await get_router()
        router_health = "healthy"
    except Exception:
        router_health = "unhealthy"

    # Determine overall status
    overall_status = "healthy"
    postgres_status = db_health.get("postgres", {}).get("status", "unknown")
    redis_status = db_health.get("redis", {}).get("status", "unknown")

    if (
        postgres_status not in ["healthy", "connected"]
        or redis_status not in ["healthy", "connected"]
        or registry_health != "healthy"
        or router_health != "healthy"
    ):
        overall_status = "degraded"

    return HealthResponse(
        status=overall_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
        version=settings.app_version,
        components={
            "database": {
                "status": "healthy"
                if postgres_status == "healthy" and redis_status == "healthy"
                else "unhealthy"
            },
            "registry": {"status": registry_health},
            "router": {"status": router_health},
        },
    )


@app.get("/ready")
async def readiness_check():
    """
    Readiness check endpoint.

    Returns 200 if service is ready to accept requests.
    """
    return {"status": "ready"}


# Server Management Endpoints


@app.post("/api/v1/servers", response_model=ServerResponse, status_code=201)
async def register_server(
    request: ServerRegistrationRequest,
    tenant_id: str | None = None,  # In production, extract from auth context
):
    """
    Register a new MCP server.

    Registers a server in the registry and starts health monitoring.
    """
    try:
        registry = await get_registry_service()

        server = await registry.register_server(
            name=request.name,
            endpoint_url=request.endpoint_url,
            transport_type=request.transport_type,
            version=request.version,
            description=request.description,
            capabilities=request.capabilities,
            tags=request.tags,
            tenant_id=tenant_id,
            auto_discover=request.auto_discover,
        )

        return ServerResponse(
            id=server.id,
            name=server.name,
            endpoint_url=server.endpoint_url,
            transport_type=server.transport_type,
            version=server.version,
            description=server.description,
            capabilities=server.capabilities,
            tags=server.tags,
            health_status=server.health_status,
            last_health_check=server.last_health_check.isoformat()
            if server.last_health_check
            else None,
            tenant_id=server.tenant_id,
            created_at=server.created_at.isoformat(),
            updated_at=server.updated_at.isoformat(),
        )

    except Exception as e:
        logger.error(f"Failed to register server: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Server registration failed: {e}",
        )


@app.delete("/api/v1/servers/{server_id}", status_code=204)
async def unregister_server(
    server_id: str,
    tenant_id: str | None = None,  # In production, extract from auth context
):
    """
    Unregister an MCP server.

    Removes server from registry and stops health monitoring.
    """
    try:
        registry = await get_registry_service()

        success = await registry.unregister_server(server_id, tenant_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Server not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unregister server: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server unregistration failed: {e}",
        )


@app.get("/api/v1/servers/{server_id}", response_model=ServerResponse)
async def get_server(
    server_id: str,
    tenant_id: str | None = None,  # In production, extract from auth context
    include_tools: bool = False,
    include_resources: bool = False,
):
    """
    Get server information by ID.

    Returns detailed server information including optional tools and resources.
    """
    try:
        registry = await get_registry_service()

        server = await registry.get_server(
            server_id,
            tenant_id=tenant_id,
            include_tools=include_tools,
            include_resources=include_resources,
        )

        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Server not found"
            )

        return ServerResponse(
            id=server.id,
            name=server.name,
            endpoint_url=server.endpoint_url,
            transport_type=server.transport_type,
            version=server.version,
            description=server.description,
            capabilities=server.capabilities,
            tags=server.tags,
            health_status=server.health_status,
            last_health_check=server.last_health_check.isoformat()
            if server.last_health_check
            else None,
            tenant_id=server.tenant_id,
            created_at=server.created_at.isoformat(),
            updated_at=server.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get server: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve server: {e}",
        )


@app.get("/api/v1/servers", response_model=list[ServerResponse])
async def list_servers(
    tenant_id: str | None = None,  # In production, extract from auth context
    health_status: ServerStatus | None = None,
    tags: str | None = None,  # Comma-separated tags
    limit: int | None = None,
    include_tools: bool = False,
    include_resources: bool = False,
):
    """
    List servers with optional filtering.

    Returns list of servers matching the specified criteria.
    """
    try:
        registry = await get_registry_service()

        # Parse tags
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",")]

        servers = await registry.find_servers(
            tags=tag_list if tag_list else None,
            health_status=health_status,
            tenant_id=tenant_id,
            limit=limit,
            include_tools=include_tools,
            include_resources=include_resources,
        )

        return [
            ServerResponse(
                id=server.id,
                name=server.name,
                endpoint_url=server.endpoint_url,
                transport_type=server.transport_type,
                version=server.version,
                description=server.description,
                capabilities=server.capabilities,
                tags=server.tags,
                health_status=server.health_status,
                last_health_check=server.last_health_check.isoformat()
                if server.last_health_check
                else None,
                tenant_id=server.tenant_id,
                created_at=server.created_at.isoformat(),
                updated_at=server.updated_at.isoformat(),
            )
            for server in servers
        ]

    except Exception as e:
        logger.error(f"Failed to list servers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list servers: {e}",
        )


# Server Discovery Endpoints


@app.get("/api/v1/discovery/tools")
async def discover_tools(
    tools: str,  # Comma-separated tool names
    tenant_id: str | None = None,
):
    """
    Discover servers that provide specified tools.

    Returns list of servers that have all the specified tools.
    """
    try:
        registry = await get_registry_service()

        tool_list = [tool.strip() for tool in tools.split(",")]

        servers = await registry.find_servers(
            tools=tool_list,
            tenant_id=tenant_id,
            # Don't filter by health status for discovery - include all servers
            include_tools=True,
        )

        return {
            "tools": tool_list,
            "servers": [
                {
                    "id": server.id,
                    "name": server.name,
                    "endpoint_url": server.endpoint_url,
                    "health_status": server.health_status.value,
                    "tools": [
                        {"name": tool.name, "description": tool.description}
                        for tool in server.tools
                        if tool.name in tool_list
                    ],
                }
                for server in servers
            ],
        }

    except Exception as e:
        logger.error(f"Failed to discover tools: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tool discovery failed: {e}",
        )


@app.get("/api/v1/discovery/resources")
async def discover_resources(
    resources: str,  # Comma-separated resource patterns
    tenant_id: str | None = None,
):
    """
    Discover servers that provide specified resources.

    Returns list of servers that have resources matching the patterns.
    """
    try:
        registry = await get_registry_service()

        resource_list = [resource.strip() for resource in resources.split(",")]

        servers = await registry.find_servers(
            resources=resource_list,
            tenant_id=tenant_id,
            # Don't filter by health status for discovery - include all servers
            include_resources=True,
        )

        return {
            "resources": resource_list,
            "servers": [
                {
                    "id": server.id,
                    "name": server.name,
                    "endpoint_url": server.endpoint_url,
                    "health_status": server.health_status.value,
                    "resources": [
                        {
                            "uri_template": resource.uri_template,
                            "name": resource.name,
                            "description": resource.description,
                            "mime_type": resource.mime_type,
                        }
                        for resource in server.resources
                    ],
                }
                for server in servers
            ],
        }

    except Exception as e:
        logger.error(f"Failed to discover resources: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resource discovery failed: {e}",
        )


# Router Management Endpoints


@app.get("/api/v1/router/metrics")
async def get_router_metrics(
    tenant_id: str | None = None,
):
    """
    Get router performance metrics.

    Returns metrics for all servers being managed by the router.
    """
    try:
        router = await get_router()
        registry = await get_registry_service()

        # Get all servers for the tenant
        servers = await registry.find_servers(tenant_id=tenant_id)

        metrics = {}
        for server in servers:
            server_metrics = router.get_server_metrics(server.id)
            metrics[server.id] = {
                "server_name": server.name,
                **server_metrics,
            }

        return {"metrics": metrics}

    except Exception as e:
        logger.error(f"Failed to get router metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get metrics: {e}",
        )


@app.get("/metrics")
async def get_prometheus_metrics() -> Response:
    """
    Get Prometheus metrics for monitoring and observability.

    Returns metrics in Prometheus exposition format for scraping by
    monitoring systems. Includes authentication events, user activity,
    system performance, and error tracking.
    """
    try:
        metrics_data = get_metrics_data()
        return Response(
            content=metrics_data,
            media_type="text/plain; version=0.0.4; charset=utf-8",
        )
    except Exception as e:
        logger.error(f"Failed to get Prometheus metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve metrics",
        )


# Administrative Endpoints


@app.get("/api/v1/admin/stats")
async def get_system_stats():
    """
    Get system statistics for monitoring.

    Returns overall system statistics and health information.
    """
    try:
        registry = await get_registry_service()

        # Get server counts by status
        all_servers = await registry.find_servers(limit=1000)

        stats = {
            "total_servers": len(all_servers),
            "servers_by_status": {},
            "servers_by_transport": {},
        }

        for server in all_servers:
            # Count by status
            status_key = server.health_status.value
            stats["servers_by_status"][status_key] = (
                stats["servers_by_status"].get(status_key, 0) + 1
            )

            # Count by transport
            transport_key = server.transport_type.value
            stats["servers_by_transport"][transport_key] = (
                stats["servers_by_transport"].get(transport_key, 0) + 1
            )

        return stats

    except Exception as e:
        logger.error(f"Failed to get system stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system stats: {e}",
        )


# MCP Proxy Endpoints - The Core Gateway Functionality


@app.post("/mcp/proxy", response_model=MCPProxyResponse)
async def proxy_mcp_request(
    request: MCPProxyRequest,
    http_request: Request,
    tenant_id: str | None = None,  # In production, extract from auth context
    user_id: str | None = None,  # In production, extract from auth context
):
    """
    Proxy an MCP request to an appropriate server.

    This is the core gateway functionality that routes MCP requests to
    registered servers based on capabilities and load balancing.
    """
    try:
        proxy = await get_proxy_service()

        # Extract client info
        client_ip = http_request.client.host if http_request.client else None
        user_agent = http_request.headers.get("user-agent")

        # Build request data
        request_data = {
            "jsonrpc": request.jsonrpc,
            "id": request.id,
            "method": request.method,
            "params": request.params,
        }

        # Proxy the request
        mcp_response = await proxy.proxy_request(
            request_data=request_data,
            tenant_id=tenant_id,
            user_id=user_id,
            client_ip=client_ip,
            user_agent=user_agent,
            required_tools=request.required_tools,
            required_resources=request.required_resources,
            preferred_servers=request.preferred_servers,
            timeout=request.timeout,
        )

        # Build response
        response = MCPProxyResponse(
            jsonrpc="2.0",
            id=mcp_response.request_id,
            server_id=mcp_response.server_id,
            response_time_ms=mcp_response.response_time * 1000,
            success=mcp_response.success,
        )

        # Set result or error based on success
        if mcp_response.success:
            response.result = mcp_response.data.get("result")
        else:
            response.error = mcp_response.data.get(
                "error",
                {
                    "code": -32603,
                    "message": "Internal error",
                    "data": {"error": mcp_response.error},
                },
            )

        return response

    except NoCompatibleServerError as e:
        logger.error(f"No compatible server found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No compatible servers found for this request",
        )

    except ServerUnavailableError as e:
        logger.error(f"No available servers: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No available servers at this time",
        )

    except ProxyError as e:
        logger.error(f"Proxy error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Proxy error: {e}",
        )

    except Exception as e:
        logger.error(f"Unexpected error in proxy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while proxying the request",
        )


@app.post("/mcp")
async def proxy_mcp_request_simple(
    request_body: dict[str, Any],
    http_request: Request,
    tenant_id: str | None = None,
    user_id: str | None = None,
):
    """
    Simple MCP proxy endpoint for standard JSON-RPC requests.

    This endpoint accepts raw JSON-RPC requests and proxies them
    without additional routing preferences.
    """
    try:
        # Validate basic JSON-RPC structure
        if not request_body.get("jsonrpc"):
            request_body["jsonrpc"] = "2.0"

        if "method" not in request_body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required 'method' field",
            )

        proxy = await get_proxy_service()

        # Extract client info
        client_ip = http_request.client.host if http_request.client else None
        user_agent = http_request.headers.get("user-agent")

        # Proxy the request
        mcp_response = await proxy.proxy_request(
            request_data=request_body,
            tenant_id=tenant_id,
            user_id=user_id,
            client_ip=client_ip,
            user_agent=user_agent,
            timeout=30.0,  # Default timeout
        )

        # Return the raw response data (standard JSON-RPC response)
        return mcp_response.data

    except NoCompatibleServerError as e:
        logger.error(f"No compatible server found: {e}")
        return {
            "jsonrpc": "2.0",
            "id": request_body.get("id"),
            "error": {
                "code": -32601,
                "message": "Method not found",
                "data": {"details": "No compatible servers found for this method"},
            },
        }

    except ServerUnavailableError as e:
        logger.error(f"No available servers: {e}")
        return {
            "jsonrpc": "2.0",
            "id": request_body.get("id"),
            "error": {
                "code": -32603,
                "message": "Internal error",
                "data": {"details": "No available servers at this time"},
            },
        }

    except ProxyError as e:
        logger.error(f"Proxy error: {e}")
        return {
            "jsonrpc": "2.0",
            "id": request_body.get("id"),
            "error": {
                "code": -32603,
                "message": "Internal error",
                "data": {"details": str(e)},
            },
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Unexpected error in simple proxy: {e}", exc_info=True)
        return {
            "jsonrpc": "2.0",
            "id": request_body.get("id"),
            "error": {
                "code": -32603,
                "message": "Internal error",
                "data": {"details": "An unexpected error occurred"},
            },
        }


# Proxy Management Endpoints


@app.get("/api/v1/proxy/active-requests")
async def get_active_requests():
    """
    Get currently active proxy requests.

    Returns information about requests currently being processed.
    """
    try:
        proxy = await get_proxy_service()
        active_requests = proxy.get_active_requests()

        return {
            "active_request_count": len(active_requests),
            "requests": [
                {
                    "request_id": req_id,
                    "method": req_info["method"],
                    "start_time": req_info["start_time"],
                    "duration_seconds": time.time() - req_info["start_time"],
                    "tenant_id": req_info.get("tenant_id"),
                    "user_id": req_info.get("user_id"),
                }
                for req_id, req_info in active_requests.items()
            ],
        }

    except Exception as e:
        logger.error(f"Failed to get active requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active requests: {e}",
        )


@app.delete("/api/v1/proxy/requests/{request_id}")
async def cancel_proxy_request(request_id: str):
    """
    Cancel an active proxy request.

    Attempts to cancel a request that is currently being processed.
    """
    try:
        proxy = await get_proxy_service()
        success = await proxy.cancel_request(request_id)

        if success:
            return {"message": f"Request {request_id} cancelled successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Request {request_id} not found or already completed",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel request {request_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel request: {e}",
        )


# Root endpoint
@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "MCP Registry Gateway",
        "version": settings.app_version,
        "description": "Enterprise MCP Registry, Gateway, and Proxy System",
        "docs_url": settings.docs_url,
        "health_url": "/health",
        "api_base": "/api/v1",
        "proxy_endpoints": {
            "advanced": "/mcp/proxy",
            "simple": "/mcp",
        },
    }
