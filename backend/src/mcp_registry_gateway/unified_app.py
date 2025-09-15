"""
Unified Single-Server Application Factory.

Implements the unified architecture combining FastAPI and FastMCP servers
into a single process with path-based routing and unified lifespan management.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the existing FastAPI routes and handlers
from .api.main import (
    HealthResponse,
    ServerResponse,
    cancel_proxy_request,
    discover_resources,
    discover_tools,
    general_error_handler,
    get_active_requests,
    get_prometheus_metrics,
    get_router_metrics,
    get_server,
    get_system_stats,
    list_servers,
    mcp_error_handler,
    readiness_check,
    register_server,
    unregister_server,
)
from .api.main import (
    health_check as api_health_check,
)
from .api.mcp_routes import add_mcp_routes
from .api.schema_config import (
    configure_sqlmodel_schema_exclusions,
    create_safe_openapi_schema,
)
from .core.config import get_settings
from .core.exceptions import MCPGatewayError
from .db.database import close_database, startup_database
from .middleware.path_auth import add_path_based_auth_middleware
from .routing.router import get_router
from .services.proxy import get_proxy_service
from .services.registry import get_registry_service


logger = logging.getLogger(__name__)


@asynccontextmanager
async def unified_lifespan(app: FastAPI):
    """
    Unified lifespan manager for both FastAPI and FastMCP servers.

    Manages database connections, services, and FastMCP server lifecycle
    in a single coordinated process.
    """
    logger.info("Starting MCP Registry Gateway (Unified Architecture)")

    # Initialize database connections (no table creation - handled by frontend)
    logger.info("Initializing database connections...")
    await startup_database()
    # NOTE: Database tables are managed by the frontend, not created here

    # Configure SQLModel schema exclusions to prevent circular references
    logger.info("Configuring schema exclusions to prevent circular references...")
    configure_sqlmodel_schema_exclusions()

    # Initialize core services
    logger.info("Initializing core services...")
    await get_registry_service()
    await get_router()
    await get_proxy_service()

    # Initialize FastMCP server if enabled (will be integrated via routing)
    fastmcp_server = None
    if app.state.settings.fastmcp.enabled:
        try:
            logger.info("Initializing FastMCP server...")
            from .fastmcp_server import get_fastmcp_server

            # Get the FastMCP gateway server instance
            fastmcp_gateway_server = await get_fastmcp_server()
            fastmcp_server = fastmcp_gateway_server.get_server()

            # Store reference for use by MCP routes and cleanup
            app.state.fastmcp_server = fastmcp_server
            app.state.fastmcp_gateway_server = fastmcp_gateway_server

            logger.info("FastMCP server initialized successfully")
            logger.info("FastMCP will be accessible at /mcp/* endpoints")

        except Exception as e:
            logger.error(f"Failed to initialize FastMCP server: {e}")
            logger.warning("Continuing without FastMCP server")
            fastmcp_server = None
    else:
        logger.info("FastMCP server disabled in configuration")

    logger.info("MCP Registry Gateway unified server started successfully")

    try:
        yield
    finally:
        logger.info("Shutting down MCP Registry Gateway (Unified Architecture)")

        # Shutdown FastMCP server if it was initialized
        if hasattr(app.state, "fastmcp_gateway_server"):
            try:
                await app.state.fastmcp_gateway_server.shutdown()
                logger.info("FastMCP server shutdown complete")
            except Exception as e:
                logger.error(f"Error shutting down FastMCP server: {e}")

        # Shutdown core services
        try:
            proxy = await get_proxy_service()
            await proxy.shutdown()

            router = await get_router()
            await router.shutdown()

            registry = await get_registry_service()
            await registry.shutdown()

        except Exception as e:
            logger.error(f"Error shutting down services: {e}")

        # Close database connections
        try:
            await close_database()
            logger.info("Database connections closed")
        except Exception as e:
            logger.error(f"Error closing database connections: {e}")

        logger.info("MCP Registry Gateway shutdown complete")


def create_unified_app() -> FastAPI:
    """
    Create the unified FastAPI application with FastMCP integration.

    This factory function creates a single FastAPI application that includes:
    - REST API endpoints at /api/v1/*
    - MCP operations at /mcp/* (with Azure OAuth authentication)
    - Unified lifespan management
    - Single process deployment

    Returns:
        FastAPI: The unified application instance
    """
    settings = get_settings()

    # Create FastAPI application with unified lifespan
    app = FastAPI(
        title="MCP Registry Gateway",
        description="Unified Enterprise MCP Registry, Gateway, and Proxy System",
        version=settings.app_version,
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        openapi_url=settings.openapi_url,
        lifespan=unified_lifespan,
    )

    # Store settings in app state for lifespan access
    app.state.settings = settings

    # CORS Configuration
    if settings.security.enable_cors:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.security.cors_origins,
            allow_credentials=settings.security.cors_credentials,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Path-based Authentication Middleware
    # This must be added after CORS but before route handlers
    auth_enabled = settings.fastmcp.enabled and bool(settings.fastmcp.azure_tenant_id)
    add_path_based_auth_middleware(
        app,
        enable_auth=auth_enabled,
        protected_paths={"/mcp/"},  # Only MCP endpoints require auth
        public_paths={
            "/",
            "/health",
            "/ready",
            "/metrics",
            "/docs",
            "/redoc",
            "/openapi.json",
        },
    )

    # Exception Handlers
    app.add_exception_handler(MCPGatewayError, mcp_error_handler)
    app.add_exception_handler(Exception, general_error_handler)

    # Root endpoint with unified architecture information
    @app.get("/")
    async def root():
        """API root endpoint for unified architecture."""
        return {
            "name": "MCP Registry Gateway",
            "version": settings.app_version,
            "description": "Unified Enterprise MCP Registry, Gateway, and Proxy System",
            "architecture": "unified_single_server",
            "docs_url": settings.docs_url,
            "health_url": "/health",
            "api_base": "/api/v1",
            "mcp_endpoints": {
                "authenticated": "/mcp" if settings.fastmcp.enabled else None,
                "tools": "/mcp/tools" if settings.fastmcp.enabled else None,
                "resources": "/mcp/resources" if settings.fastmcp.enabled else None,
            },
            "proxy_endpoints": {
                "advanced": "/mcp/proxy",
                "simple": "/mcp",
            },
            "authentication": {
                "enabled": settings.fastmcp.enabled
                and bool(settings.fastmcp.azure_tenant_id),
                "provider": "azure_oauth" if settings.fastmcp.azure_tenant_id else None,
                "oauth_login": "/mcp/oauth/login" if settings.fastmcp.enabled else None,
            },
        }

    # Health and Status Endpoints (unified)
    app.add_api_route(
        "/health", api_health_check, methods=["GET"], response_model=HealthResponse
    )
    app.add_api_route("/ready", readiness_check, methods=["GET"])

    # REST API endpoints at /api/v1/*
    # Server Management
    app.add_api_route(
        "/api/v1/servers",
        register_server,
        methods=["POST"],
        response_model=ServerResponse,
        status_code=201,
    )
    app.add_api_route(
        "/api/v1/servers/{server_id}",
        unregister_server,
        methods=["DELETE"],
        status_code=204,
    )
    app.add_api_route(
        "/api/v1/servers/{server_id}",
        get_server,
        methods=["GET"],
        response_model=ServerResponse,
    )
    app.add_api_route(
        "/api/v1/servers",
        list_servers,
        methods=["GET"],
        response_model=list[ServerResponse],
    )

    # Discovery endpoints
    app.add_api_route("/api/v1/discovery/tools", discover_tools, methods=["GET"])
    app.add_api_route(
        "/api/v1/discovery/resources", discover_resources, methods=["GET"]
    )

    # Router and metrics endpoints
    app.add_api_route("/api/v1/router/metrics", get_router_metrics, methods=["GET"])
    app.add_api_route("/metrics", get_prometheus_metrics, methods=["GET"])

    # Administrative endpoints
    app.add_api_route("/api/v1/admin/stats", get_system_stats, methods=["GET"])

    # Proxy management endpoints
    app.add_api_route(
        "/api/v1/proxy/active-requests", get_active_requests, methods=["GET"]
    )
    app.add_api_route(
        "/api/v1/proxy/requests/{request_id}",
        cancel_proxy_request,
        methods=["DELETE"],
    )

    # Add MCP-specific routes (authenticated endpoints at /mcp/*)
    add_mcp_routes(app)

    # Configure custom OpenAPI schema generation to prevent circular references
    def custom_openapi():
        return create_safe_openapi_schema(app)

    app.openapi = custom_openapi

    # Add safe schema endpoint for frontend consumption
    @app.get("/api/docs/backend-schema")
    async def get_backend_schema():
        """
        Get backend OpenAPI schema with circular reference prevention.

        This endpoint provides a safe schema that can be consumed by the frontend
        without causing recursion issues in Scalar or other documentation tools.
        """
        try:
            safe_schema = create_safe_openapi_schema(app)
            return safe_schema
        except Exception as e:
            logger.error(f"Failed to generate safe backend schema: {e}")
            # Return a minimal fallback schema
            return {
                "openapi": "3.1.0",
                "info": {
                    "title": "MCP Registry Gateway - Backend API",
                    "version": settings.app_version,
                    "description": "Backend API endpoints (schema generation failed)",
                },
                "paths": {},
                "components": {"schemas": {}},
                "tags": [{"name": "Backend", "description": "Backend API endpoints"}],
            }

    # No legacy endpoints needed - this is a greenfield project

    logger.info("Unified FastAPI application created successfully")
    logger.info(
        f"FastMCP integration: {'enabled' if settings.fastmcp.enabled else 'disabled'}"
    )
    logger.info(
        f"Authentication: {'enabled' if settings.fastmcp.azure_tenant_id else 'disabled'}"
    )
    logger.info("MCP endpoints available at /mcp/* with authentication")
    logger.info(
        "Custom OpenAPI schema generation enabled to prevent circular references"
    )

    return app


# Create the unified app instance
app = create_unified_app()
