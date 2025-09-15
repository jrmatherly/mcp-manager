"""
FastMCP server implementation for MCP Registry Gateway.

This module provides a FastMCP server with Azure OAuth Proxy authentication,
using the corrected architecture for Azure AD integration.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Any

from fastmcp import Context, FastMCP

from .auth.azure_oauth_proxy import create_azure_oauth_proxy
from .auth.utils import get_user_context_from_context, get_user_context_from_token
from .core.config import get_settings
from .core.exceptions import (
    FastMCPAuthenticationError,
    FastMCPAuthorizationError,
)
from .db.database import get_database

# Import middleware components
from .middleware import (
    AuditLoggingMiddleware,
    AuthenticationMiddleware,
    AuthorizationMiddleware,
    ErrorHandlingMiddleware,
    ToolAccessControlMiddleware,
    get_metrics_middleware,
)
from .middleware.rate_limit import get_advanced_rate_limit_middleware
from .middleware.tracing import DistributedTracingMiddleware
from .models.responses import (
    AuthenticationStatusInfo,
    ConfigurationResponse,
    HealthCheckResponse,
    ProxyRequestResponse,
    ResourceInfo,
    ServerInfo,
    ServerListResponse,
    ServerRegistrationResponse,
    ServiceHealthInfo,
    ToolInfo,
    UserContextInfo,
)
from .services.proxy import get_proxy_service
from .services.registry import get_registry_service


logger = logging.getLogger(__name__)


class MCPRegistryGatewayServer:
    """FastMCP server for the MCP Registry Gateway with Azure OAuth authentication."""

    def __init__(self):
        """Initialize the FastMCP server with corrected Azure OAuth Proxy authentication."""
        self.settings = get_settings()
        self.mcp_server: FastMCP | None = None
        self.auth_provider = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize the FastMCP server components using corrected architecture."""
        if self._initialized:
            return

        logger.info(
            "Initializing FastMCP Registry Gateway Server with corrected OAuth Proxy"
        )

        # Setup authentication first if Azure credentials are provided
        if self._has_azure_credentials():
            self._setup_authentication()
        else:
            logger.warning(
                "Azure OAuth credentials not configured. "
                "FastMCP server will run without authentication."
            )

        # Create FastMCP server with OAuth Proxy authentication
        self.mcp_server = FastMCP(
            name="MCP Registry Gateway",
            version=self.settings.app_version,
            auth=self.auth_provider,  # OAuth Proxy handles all authentication
        )

        # Setup middleware pipeline BEFORE registering tools/resources
        await self._setup_middleware()

        # Register tools and resources
        self._register_tools()
        self._register_resources()

        self._initialized = True
        logger.info(
            "FastMCP Registry Gateway Server initialized successfully with OAuth Proxy"
        )

    def _has_azure_credentials(self) -> bool:
        """Check if Azure OAuth credentials are configured."""
        return all(
            [
                self.settings.fastmcp.azure_tenant_id,
                self.settings.fastmcp.azure_client_id,
                self.settings.fastmcp.azure_client_secret,
            ]
        )

    def _setup_authentication(self) -> None:
        """Configure Azure OAuth Proxy authentication using corrected pattern."""
        try:
            logger.info("Setting up Azure OAuth Proxy authentication")
            self.auth_provider = create_azure_oauth_proxy(self.settings.fastmcp)
            logger.info("Azure OAuth Proxy authentication configured successfully")
        except Exception as e:
            logger.error(f"Failed to setup Azure OAuth authentication: {e}")
            raise RuntimeError(f"OAuth Proxy initialization failed: {e}") from e

    async def _setup_middleware(self) -> None:
        """Configure comprehensive middleware pipeline."""
        logger.info("Setting up FastMCP middleware pipeline")

        try:
            # Get database manager for middleware that need it
            db_manager = await get_database()

            # 1. Error handling (first - catches all errors)
            if hasattr(self.mcp_server, "add_middleware"):
                self.mcp_server.add_middleware(
                    ErrorHandlingMiddleware(
                        include_traceback=self.settings.debug,
                        track_error_stats=True,
                    )
                )
                logger.debug("Added ErrorHandlingMiddleware")

                # 2. Distributed Tracing (if enabled)
                if self.settings.monitoring.enable_tracing:
                    tracing_middleware = DistributedTracingMiddleware(self.settings)
                    await tracing_middleware.startup()
                    self.mcp_server.add_middleware(tracing_middleware)
                    logger.debug(
                        "Added DistributedTracingMiddleware with Azure integration"
                    )

                # 3. Metrics collection (captures all activity)
                self.mcp_server.add_middleware(get_metrics_middleware())
                logger.debug("Added MetricsMiddleware")

                # 3. Authentication verification (if enabled)
                if self.settings.fastmcp.enable_auth_middleware:
                    self.mcp_server.add_middleware(
                        AuthenticationMiddleware(
                            require_auth=False
                        )  # OAuth Proxy handles enforcement
                    )
                    logger.debug("Added AuthenticationMiddleware")

                # 4. Rate limiting (if enabled)
                if self.settings.fastmcp.enable_rate_limiting:
                    advanced_rate_limiter = get_advanced_rate_limit_middleware()
                    await advanced_rate_limiter.initialize()
                    self.mcp_server.add_middleware(advanced_rate_limiter)
                    logger.debug(
                        "Added AdvancedRateLimitMiddleware with per-tenant fairness"
                    )

                # 4. Authorization (role-based access control)
                tool_permissions = {
                    "register_server": ["admin"],
                    "delete_server": ["admin"],  # If we add this tool
                    "proxy_request": ["user", "admin"],
                    "list_servers": [],  # Public access
                    "health_check": [],  # Public access
                }

                if self.settings.fastmcp.enable_tool_access_control:
                    # Use the existing ToolAccessControlMiddleware
                    self.mcp_server.add_middleware(
                        ToolAccessControlMiddleware(tool_permissions)
                    )
                    logger.debug("Added ToolAccessControlMiddleware")
                else:
                    # Use new AuthorizationMiddleware
                    self.mcp_server.add_middleware(
                        AuthorizationMiddleware(tool_permissions)
                    )
                    logger.debug("Added AuthorizationMiddleware")

                # 6. Audit logging (last - logs everything)
                if self.settings.fastmcp.enable_audit_logging:
                    self.mcp_server.add_middleware(
                        AuditLoggingMiddleware(log_to_db=True, db_manager=db_manager)
                    )
                    logger.debug("Added AuditLoggingMiddleware")

                logger.info("FastMCP middleware pipeline configured successfully")
            else:
                logger.warning(
                    "FastMCP server does not support middleware - continuing without middleware"
                )

        except Exception as e:
            logger.error(f"Failed to setup middleware pipeline: {e}")
            # Continue without middleware rather than failing
            logger.warning("Continuing without middleware pipeline")

    def _register_tools(self) -> None:
        """Register MCP tools with authentication context."""
        logger.info("Registering FastMCP tools")

        @self.mcp_server.tool()
        async def list_servers(
            ctx: Context, tenant_filter: str | None = None
        ) -> ServerListResponse:
            """List registered MCP servers (authenticated)."""

            # Use enhanced token access pattern with fallback for backward compatibility
            try:
                # Try enhanced pattern first
                user_context = get_user_context_from_token()
                user_id = user_context.user_id
                tenant_id = user_context.tenant_id
                user_roles = user_context.roles
                user_email = user_context.email
                logger.info(f"User {user_id} ({user_email}) listing servers")
            except Exception:
                # Fallback to legacy pattern for backward compatibility
                user_context = get_user_context_from_context(ctx)
                if user_context:
                    user_id = user_context.user_id
                    tenant_id = user_context.tenant_id
                    user_roles = user_context.roles
                    user_email = user_context.email
                    logger.info(f"User {user_id} listing servers (legacy auth)")
                else:
                    # Unauthenticated access (if auth is optional)
                    user_id = "anonymous"
                    tenant_id = None
                    user_roles = []
                    user_email = None
                    logger.info("Anonymous user listing servers")

            # Apply tenant filtering based on user context
            if (
                tenant_filter
                and tenant_filter != tenant_id
                and "admin" not in user_roles
            ):
                raise PermissionError("Cannot access servers from different tenant")

            registry = await get_registry_service()
            servers = await registry.find_servers(
                tenant_id=tenant_filter or tenant_id,
                include_tools=True,
                include_resources=True,
            )

            # Convert to structured response models
            server_list = []
            for server in servers:
                # Convert tools
                tools = None
                if hasattr(server, "tools") and server.tools:
                    tools = [
                        ToolInfo(name=tool.name, description=tool.description)
                        for tool in server.tools
                    ]

                # Convert resources
                resources = None
                if hasattr(server, "resources") and server.resources:
                    resources = [
                        ResourceInfo(uri=resource.uri_template, name=resource.name)
                        for resource in server.resources
                    ]

                server_info = ServerInfo(
                    id=server.id,
                    name=server.name,
                    endpoint_url=server.endpoint_url,
                    transport_type=server.transport_type.value,
                    health_status=server.health_status.value,
                    capabilities=server.capabilities,
                    tags=server.tags,
                    created_at=server.created_at.isoformat(),
                    tools=tools,
                    resources=resources,
                )
                server_list.append(server_info)

            # Create user context info
            user_context_info = UserContextInfo(
                user_id=user_id,
                tenant_id=tenant_id,
                can_see_all="admin" in user_roles,
                authenticated=user_id != "anonymous",
                email=user_email,
                roles=user_roles,
            )

            return ServerListResponse(
                servers=server_list,
                count=len(server_list),
                user_context=user_context_info,
            )

        @self.mcp_server.tool()
        async def register_server(
            ctx: Context,
            name: str,
            endpoint_url: str,
            transport_type: str = "http",
            capabilities: str = "",
            description: str | None = None,
        ) -> ServerRegistrationResponse:
            """Register new MCP server (admin only)."""

            # Use enhanced authentication pattern with proper error handling
            try:
                user_context = get_user_context_from_token()
                user_id = user_context.user_id
                tenant_id = user_context.tenant_id
                user_roles = user_context.roles
                user_email = user_context.email
            except Exception as e:
                logger.error(f"Authentication failed for register_server: {e}")
                raise FastMCPAuthenticationError(
                    "Authentication required to register servers",
                    auth_method="oauth_proxy",
                    operation="register_server",
                ) from e

            # Check admin privileges with enhanced error handling
            if "admin" not in user_roles:
                raise FastMCPAuthorizationError(
                    "Admin role required to register servers",
                    required_roles=["admin"],
                    user_roles=user_roles,
                    operation="register_server",
                )

            # Parse capabilities
            capability_list = [
                cap.strip() for cap in capabilities.split(",") if cap.strip()
            ]

            # Parse transport type
            from .db.models import TransportType

            try:
                transport = TransportType(transport_type.lower())
            except ValueError:
                transport = TransportType.HTTP

            try:
                # Register server with user context
                registry = await get_registry_service()
                server = await registry.register_server(
                    name=name,
                    endpoint_url=endpoint_url,
                    transport_type=transport,
                    description=description,
                    capabilities={"tools": capability_list}
                    if capability_list
                    else None,
                    tenant_id=tenant_id,
                    # Store registered_by if the model supports it
                    auto_discover=True,
                )

                await ctx.info(f"Server '{name}' registered successfully")

                # Create server info response
                server_info = ServerInfo(
                    id=server.id,
                    name=server.name,
                    endpoint_url=server.endpoint_url,
                    transport_type=server.transport_type.value,
                    health_status=server.health_status.value,
                    capabilities=server.capabilities,
                    tags=server.tags,
                    created_at=server.created_at.isoformat(),
                )

                # Create user context info
                user_context_info = UserContextInfo(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    can_see_all="admin" in user_roles,
                    authenticated=True,
                    email=user_email,
                    roles=user_roles,
                )

                return ServerRegistrationResponse(
                    success=True,
                    server_id=server.id,
                    message=f"Server '{name}' registered successfully",
                    server=server_info,
                    user_context=user_context_info,
                )

            except Exception as e:
                logger.error(f"Failed to register server '{name}': {e}")

                # Create user context info for error response
                user_context_info = UserContextInfo(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    can_see_all="admin" in user_roles,
                    authenticated=True,
                    email=user_email,
                    roles=user_roles,
                )

                return ServerRegistrationResponse(
                    success=False,
                    server_id=None,
                    message=f"Failed to register server '{name}': {e!s}",
                    server=None,
                    user_context=user_context_info,
                )

        @self.mcp_server.tool()
        async def proxy_request(
            ctx: Context,
            method: str,
            params: dict[str, Any] | None = None,
            server_id: str | None = None,
        ) -> ProxyRequestResponse:
            """Proxy MCP request with authentication context."""

            # Use enhanced authentication pattern
            try:
                user_context = get_user_context_from_token()
                user_id = user_context.user_id
                tenant_id = user_context.tenant_id
                user_roles = user_context.roles
                user_email = user_context.email
            except Exception as e:
                logger.error(f"Authentication failed for proxy_request: {e}")
                raise FastMCPAuthenticationError(
                    "Authentication required for proxy requests",
                    auth_method="oauth_proxy",
                    operation="proxy_request",
                ) from e

            logger.info(
                f"User {user_id} with roles {user_roles} proxying {method} request"
            )

            # Build request data
            request_data = {
                "jsonrpc": "2.0",
                "id": f"fastmcp_{ctx.request_id if hasattr(ctx, 'request_id') else 'unknown'}",
                "method": method,
                "params": params or {},
            }

            # Create user context info
            user_context_info = UserContextInfo(
                user_id=user_id,
                tenant_id=tenant_id,
                can_see_all="admin" in user_roles,
                authenticated=True,
                email=user_email,
                roles=user_roles,
            )

            try:
                # Proxy request with authentication context
                proxy = await get_proxy_service()
                result = await proxy.proxy_request(
                    request_data=request_data,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    preferred_servers=[server_id] if server_id else None,
                    timeout=30.0,
                )

                await ctx.info(f"Proxied {method} request")

                return ProxyRequestResponse(
                    success=result.success,
                    response=result.data if result.success else None,
                    error=result.data.get("error") if not result.success else None,
                    server_id=result.server_id,
                    method=method,
                    execution_time_ms=result.response_time * 1000,
                    user_context=user_context_info,
                )

            except Exception as e:
                logger.error(f"Failed to proxy {method} request: {e}")

                return ProxyRequestResponse(
                    success=False,
                    response=None,
                    error=str(e),
                    server_id=server_id,
                    method=method,
                    execution_time_ms=None,
                    user_context=user_context_info,
                )

        @self.mcp_server.tool()
        async def health_check(ctx: Context) -> HealthCheckResponse:
            """Comprehensive health check with authentication status."""

            # Check authentication status using enhanced pattern
            user_context_info = None
            try:
                user_context = get_user_context_from_token()
                user_id = user_context.user_id
                user_email = user_context.email
                user_roles = user_context.roles
                tenant_id = user_context.tenant_id
                user_authenticated = True
                logger.debug(f"Health check requested by authenticated user: {user_id}")

                user_context_info = UserContextInfo(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    can_see_all="admin" in user_roles,
                    authenticated=True,
                    email=user_email,
                    roles=user_roles,
                )
            except Exception:
                # Try legacy pattern as fallback
                user_context = get_user_context_from_context(ctx)
                if user_context:
                    user_id = user_context.user_id
                    user_email = user_context.email
                    user_roles = user_context.roles
                    tenant_id = user_context.tenant_id
                    user_authenticated = True
                    logger.debug(
                        f"Health check requested by user (legacy auth): {user_id}"
                    )

                    user_context_info = UserContextInfo(
                        user_id=user_id,
                        tenant_id=tenant_id,
                        can_see_all="admin" in user_roles,
                        authenticated=True,
                        email=user_email,
                        roles=user_roles,
                    )
                else:
                    user_id = "anonymous"
                    user_email = ""
                    user_authenticated = False
                    logger.debug("Health check requested by anonymous user")

                    user_context_info = UserContextInfo(
                        user_id=user_id,
                        tenant_id=None,
                        can_see_all=False,
                        authenticated=False,
                        email=None,
                        roles=[],
                    )

            # Check system health
            db = await get_database()
            db_health = await db.health_check()

            # Check services
            try:
                await get_registry_service()
                registry_status = "healthy"
            except Exception:
                registry_status = "unhealthy"

            try:
                await get_proxy_service()
                proxy_status = "healthy"
            except Exception:
                proxy_status = "unhealthy"

            # Overall status
            overall_status = (
                "healthy"
                if all(
                    [
                        db_health.get("postgres", {}).get("status") == "healthy",
                        db_health.get("redis", {}).get("status") == "healthy",
                        registry_status == "healthy",
                        proxy_status == "healthy",
                    ]
                )
                else "degraded"
            )

            # Create authentication status
            auth_status = AuthenticationStatusInfo(
                enabled=self._has_azure_credentials(),
                provider="Azure AD OAuth Proxy"
                if self._has_azure_credentials()
                else "disabled",
                user_authenticated=user_authenticated,
                user_id=user_id,
                user_email=user_email if user_authenticated else None,
                enhanced_auth_pattern=True,
            )

            # Create service health info
            services = {
                "database": db_health,
                "registry": {"status": registry_status},
                "proxy": {"status": proxy_status},
                "fastmcp": ServiceHealthInfo(
                    status="healthy",
                    version=self.settings.app_version,
                ),
            }

            return HealthCheckResponse(
                status=overall_status,
                authentication=auth_status,
                services=services,
                timestamp=datetime.now(timezone.utc).isoformat(),
                user_context=user_context_info,
            )

        @self.mcp_server.tool()
        async def get_trace_analytics(_ctx: Context) -> dict[str, Any]:
            """Get distributed tracing analytics and performance insights."""

            # Get user context for authorization
            try:
                user_context = get_user_context_from_token()
                user_roles = user_context.roles

                # Require admin role for system-wide trace analytics
                if "admin" not in user_roles:
                    raise FastMCPAuthorizationError(
                        "Admin role required for trace analytics",
                        user_id=user_context.user_id,
                        required_roles=["admin"],
                        actual_roles=user_roles,
                    )

            except Exception as e:
                logger.warning(f"Authentication failed for trace analytics: {e}")
                raise FastMCPAuthenticationError(
                    "Authentication required for trace analytics"
                ) from e

            # Get tracing middleware from the server
            tracing_middleware = None
            if hasattr(self.mcp_server, "_middleware_stack"):
                for middleware in self.mcp_server._middleware_stack:
                    if isinstance(middleware, DistributedTracingMiddleware):
                        tracing_middleware = middleware
                        break

            if not tracing_middleware:
                return {
                    "status": "disabled",
                    "message": "Distributed tracing not enabled or not configured",
                    "enable_tracing_setting": self.settings.monitoring.enable_tracing,
                }

            # Get comprehensive performance analytics
            performance_summary = tracing_middleware.get_performance_summary()
            active_traces = tracing_middleware.get_active_traces()

            return {
                "status": "enabled",
                "tracing_enabled": tracing_middleware.enabled,
                "azure_integration": tracing_middleware.azure_exporter is not None,
                "active_traces_count": len(active_traces),
                "performance_analytics": performance_summary,
                "configuration": {
                    "max_active_traces": tracing_middleware.max_active_traces,
                    "completed_trace_retention": tracing_middleware.completed_trace_retention,
                    "export_batch_size": tracing_middleware.export_batch_size,
                    "export_interval_seconds": tracing_middleware.export_interval_seconds,
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        @self.mcp_server.tool()
        async def get_user_journey_analytics(
            _ctx: Context, user_id: str, tenant_id: str | None = None
        ) -> dict[str, Any]:
            """Get user journey pattern analytics for specific user."""

            # Get requesting user context
            try:
                user_context = get_user_context_from_token()
                requesting_user_roles = user_context.roles
                requesting_user_id = user_context.user_id
                requesting_tenant_id = user_context.tenant_id

                # Authorization: Admin can see any user, users can see only themselves in their tenant
                if "admin" not in requesting_user_roles and (
                    requesting_user_id != user_id
                    or (tenant_id and requesting_tenant_id != tenant_id)
                ):
                    raise FastMCPAuthorizationError(
                        "Can only view your own journey analytics",
                        user_id=requesting_user_id,
                        requested_user_id=user_id,
                        operation="user_journey_analytics",
                    )

            except Exception as e:
                logger.warning(f"Authentication failed for user journey analytics: {e}")
                raise FastMCPAuthenticationError(
                    "Authentication required for user journey analytics"
                ) from e

            # Get tracing middleware
            tracing_middleware = None
            if hasattr(self.mcp_server, "_middleware_stack"):
                for middleware in self.mcp_server._middleware_stack:
                    if isinstance(middleware, DistributedTracingMiddleware):
                        tracing_middleware = middleware
                        break

            if not tracing_middleware or not tracing_middleware.enabled:
                return {
                    "status": "disabled",
                    "message": "Distributed tracing not enabled",
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                }

            # Get user journey analysis
            journey_analytics = tracing_middleware.get_user_journey_analysis(
                user_id, tenant_id
            )

            return {
                "status": "enabled",
                **journey_analytics,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        @self.mcp_server.tool()
        async def get_active_traces(_ctx: Context, limit: int = 50) -> dict[str, Any]:
            """Get currently active request traces for monitoring."""

            # Admin-only endpoint for system monitoring
            try:
                user_context = get_user_context_from_token()
                user_roles = user_context.roles

                if "admin" not in user_roles:
                    raise FastMCPAuthorizationError(
                        "Admin role required for active trace monitoring",
                        user_id=user_context.user_id,
                        required_roles=["admin"],
                        actual_roles=user_roles,
                    )

            except Exception as e:
                logger.warning(f"Authentication failed for active traces: {e}")
                raise FastMCPAuthenticationError(
                    "Authentication required for active trace monitoring"
                ) from e

            # Get tracing middleware
            tracing_middleware = None
            if hasattr(self.mcp_server, "_middleware_stack"):
                for middleware in self.mcp_server._middleware_stack:
                    if isinstance(middleware, DistributedTracingMiddleware):
                        tracing_middleware = middleware
                        break

            if not tracing_middleware:
                return {"status": "disabled", "traces": [], "total_count": 0}

            active_traces = tracing_middleware.get_active_traces()
            limited_traces = active_traces[:limit]

            # Convert traces to serializable format
            trace_data = []
            for trace in limited_traces:
                trace_info = {
                    "trace_id": trace.trace_id,
                    "request_id": trace.request_id,
                    "user_id": trace.user_id,
                    "tenant_id": trace.tenant_id,
                    "method": trace.method,
                    "endpoint": trace.endpoint,
                    "duration_ms": (time.time() - trace.start_time)
                    * 1000,  # Current duration
                    "status": trace.status,
                    "spans_count": len(trace.spans),
                    "start_time": datetime.fromtimestamp(trace.start_time).isoformat(),
                }
                trace_data.append(trace_info)

            return {
                "status": "enabled",
                "traces": trace_data,
                "total_count": len(active_traces),
                "returned_count": len(limited_traces),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def _register_resources(self) -> None:
        """Register MCP resources with authentication."""
        logger.info("Registering FastMCP resources")

        @self.mcp_server.resource("config://server")
        async def server_configuration(_ctx: Context) -> ConfigurationResponse:
            """Get server configuration (admin only)."""

            # Use enhanced authentication pattern for resource access
            try:
                user_context = get_user_context_from_token()
                user_id = user_context.user_id
                user_roles = user_context.roles
                tenant_id = user_context.tenant_id
                user_email = user_context.email
            except Exception as e:
                logger.warning(f"Authentication failed for config resource: {e}")
                raise FastMCPAuthenticationError(
                    "Authentication required to access configuration",
                    auth_method="oauth_proxy",
                    operation="config_resource",
                ) from e

            if "admin" not in user_roles:
                raise FastMCPAuthorizationError(
                    "Admin role required to access server configuration",
                    required_roles=["admin"],
                    user_roles=user_roles,
                    operation="config_resource",
                )

            config = {
                "name": "MCP Registry Gateway",
                "version": self.settings.app_version,
                "authentication": {
                    "provider": "azure_oauth_proxy"
                    if self._has_azure_credentials()
                    else "disabled",
                    "tenant_id": self.settings.fastmcp.azure_tenant_id,
                    "scopes": self.settings.fastmcp.oauth_scopes,
                },
                "database": {
                    "type": "postgresql",
                    "host": self.settings.database.postgres_host,
                    "database": self.settings.database.postgres_db,
                },
                "middleware": {
                    "rate_limiting": self.settings.fastmcp.enable_rate_limiting,
                    "audit_logging": self.settings.fastmcp.enable_audit_logging,
                    "tool_access_control": self.settings.fastmcp.enable_tool_access_control,
                },
            }

            # Create user context info
            user_context_info = UserContextInfo(
                user_id=user_id,
                tenant_id=tenant_id,
                can_see_all="admin" in user_roles,
                authenticated=True,
                email=user_email,
                roles=user_roles,
            )

            return ConfigurationResponse(
                configuration=config,
                masked_secrets=True,
                timestamp=datetime.now(timezone.utc).isoformat(),
                user_context=user_context_info,
            )

    def get_server(self) -> FastMCP:
        """Get the configured FastMCP server instance."""
        if not self._initialized:
            raise RuntimeError(
                "FastMCP server not initialized. Call initialize() first."
            )

        if not self.mcp_server:
            raise RuntimeError("FastMCP server not properly initialized")

        return self.mcp_server

    async def shutdown(self) -> None:
        """Shutdown the FastMCP server."""
        logger.info("Shutting down FastMCP Registry Gateway Server")
        # The FastMCP server will handle its own cleanup
        self._initialized = False


# Global server instance
_mcp_gateway_server: MCPRegistryGatewayServer | None = None


async def get_fastmcp_server() -> MCPRegistryGatewayServer:
    """Get or create the global FastMCP server instance."""
    global _mcp_gateway_server

    if _mcp_gateway_server is None:
        _mcp_gateway_server = MCPRegistryGatewayServer()
        await _mcp_gateway_server.initialize()

    return _mcp_gateway_server
