#!/usr/bin/env python3
"""
Enterprise MCP Server with Azure OAuth Authentication

Demonstrates enterprise-grade MCP server implementation following
MCP Registry Gateway project patterns with:
- Azure OAuth Proxy authentication (corrected FastMCP architecture)
- Role-based access control with tenant isolation
- Comprehensive audit logging to database
- Rate limiting and middleware chain
- FastMCPBaseModel structured responses

Usage:
    python server.py

This server showcases the authenticated FastMCP patterns used in the
MCP Registry Gateway project with Azure AD integration.

Environment Variables (MREG_ prefix following project standards):
    MREG_AZURE_TENANT_ID          - Azure AD tenant ID
    MREG_AZURE_CLIENT_ID          - Azure app registration client ID
    MREG_AZURE_CLIENT_SECRET      - Azure app registration client secret
    MREG_FASTMCP_OAUTH_CALLBACK_URL - OAuth callback URL (default: http://localhost:8001/oauth/callback)
    MREG_FASTMCP_ENABLE_AUDIT_LOGGING - Enable audit logging (default: true)
    MREG_FASTMCP_ENABLE_RATE_LIMITING - Enable rate limiting (default: true)
    MREG_FASTMCP_ENABLE_TOOL_ACCESS_CONTROL - Enable tool access control (default: true)
    MREG_FASTMCP_REQUESTS_PER_MINUTE - Rate limit per minute (default: 100)
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastmcp import Context, FastMCP
from pydantic import BaseModel, Field

# Import the project's authentication and middleware patterns
try:
    # In actual project, these would be direct imports
    from mcp_registry_gateway.auth import (
        AzureOAuthProxyManager,
        UserContext,
        get_user_context_from_context,
        require_authentication,
    )
    from mcp_registry_gateway.middleware import (
        AuditLoggingMiddleware,
        RateLimitMiddleware,
        ToolAccessControlMiddleware,
    )
    from mcp_registry_gateway.models.responses import (
        FastMCPBaseModel,
    )
except ImportError:
    # Fallback implementations for standalone example
    print(
        "Note: Running in standalone mode. For full functionality, install mcp-registry-gateway package."
    )

    class FastMCPBaseModel(BaseModel):
        """Base model for structured FastMCP responses."""

        success: bool = True
        timestamp: str = Field(
            default_factory=lambda: datetime.now(timezone.utc).isoformat()
        )

    class UserContext:
        def __init__(self, user_id: str, tenant_id: str, roles: List[str] = None):
            self.user_id = user_id
            self.tenant_id = tenant_id
            self.roles = roles or []

    def get_user_context_from_context(context) -> Optional[UserContext]:
        # Simplified implementation for example
        return getattr(context, "user_context", None)

    def require_authentication(*args, **kwargs):
        def decorator(func):
            return func  # Simplified for example

        return decorator

    class AzureOAuthProxyManager:
        def __init__(self):
            pass

        def create_oauth_proxy(self):
            return None

    class AuditLoggingMiddleware:
        pass

    class RateLimitMiddleware:
        def __init__(self, requests_per_minute=100):
            pass

    class ToolAccessControlMiddleware:
        pass


# Configure logging following project patterns
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class EnterpriseServerConfig:
    """Configuration for enterprise server following project patterns."""

    def __init__(self):
        # Azure OAuth configuration (MREG_ prefix following project standards)
        self.azure_tenant_id = os.getenv("MREG_AZURE_TENANT_ID")
        self.azure_client_id = os.getenv("MREG_AZURE_CLIENT_ID")
        self.azure_client_secret = os.getenv("MREG_AZURE_CLIENT_SECRET")
        self.oauth_callback_url = os.getenv(
            "MREG_FASTMCP_OAUTH_CALLBACK_URL", "http://localhost:8001/oauth/callback"
        )
        self.oauth_scopes = ["User.Read", "profile", "openid", "email"]

        # Middleware configuration
        self.enable_audit_logging = (
            os.getenv("MREG_FASTMCP_ENABLE_AUDIT_LOGGING", "true").lower() == "true"
        )
        self.enable_rate_limiting = (
            os.getenv("MREG_FASTMCP_ENABLE_RATE_LIMITING", "true").lower() == "true"
        )
        self.enable_tool_access_control = (
            os.getenv("MREG_FASTMCP_ENABLE_TOOL_ACCESS_CONTROL", "true").lower()
            == "true"
        )

        # Rate limiting configuration
        self.requests_per_minute = int(
            os.getenv("MREG_FASTMCP_REQUESTS_PER_MINUTE", "100")
        )

    def has_azure_credentials(self) -> bool:
        """Check if Azure OAuth credentials are configured."""
        return all(
            [self.azure_tenant_id, self.azure_client_id, self.azure_client_secret]
        )


# Response models following project patterns
class SecureDataResponse(FastMCPBaseModel):
    """Response model for secure data queries."""

    data: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    record_count: int


class AdminStatusResponse(FastMCPBaseModel):
    """Response model for admin status queries."""

    status: Dict[str, Any]
    metadata: Dict[str, Any]
    admin_user: str


class AuthenticationResponse(FastMCPBaseModel):
    """Response model for authentication information."""

    auth_url: str
    state: str
    metadata: Dict[str, Any]


class SecureDataRequest(BaseModel):
    """Secure data request with validation following project patterns."""

    query: str = Field(min_length=1, max_length=1000, description="Data query")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Query filters")
    limit: int = Field(default=100, ge=1, le=1000, description="Result limit")

    def validate_query(self) -> str:
        """Validate and sanitize query input."""
        import re

        # Basic SQL injection protection
        dangerous_patterns = [
            r";\s*(DROP|DELETE|TRUNCATE|ALTER)",
            r"UNION\s+SELECT",
            r"(\'|\"|\`|--|\/*|\*/)",
            r"(xp_|sp_|exec\s*\()",
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, self.query, re.IGNORECASE):
                raise ValueError("Query contains potentially dangerous patterns")

        return self.query.strip()


class EnterpriseServer:
    """Enterprise MCP server using project authentication patterns."""

    def __init__(self, config: EnterpriseServerConfig):
        self.config = config
        self.mcp_server: Optional[FastMCP] = None
        self.auth_provider = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize the enterprise server using project patterns."""
        if self._initialized:
            return

        logger.info("Initializing Enterprise MCP Server with Azure OAuth")

        # Setup authentication using project's Azure OAuth Proxy
        if self.config.has_azure_credentials():
            self._setup_authentication()
        else:
            logger.warning(
                "Azure OAuth credentials not configured. "
                "Server will run without authentication. "
                "Set MREG_AZURE_TENANT_ID, MREG_AZURE_CLIENT_ID, and MREG_AZURE_CLIENT_SECRET"
            )

        # Create FastMCP server with authentication
        self.mcp_server = FastMCP(
            name="Enterprise Auth Server",
            version="1.0.0",
            auth=self.auth_provider,  # Azure OAuth Proxy
        )

        # Setup middleware pipeline
        await self._setup_middleware()

        # Register tools and resources
        self._register_tools()

        self._initialized = True
        logger.info("Enterprise MCP Server initialized successfully")

    def _setup_authentication(self) -> None:
        """Setup Azure OAuth authentication using project patterns."""
        try:
            # Use project's Azure OAuth Proxy manager
            oauth_manager = AzureOAuthProxyManager()
            self.auth_provider = oauth_manager.create_oauth_proxy()
            logger.info("Azure OAuth authentication configured")
        except Exception as e:
            logger.error(f"Failed to setup Azure OAuth: {e}")
            # Fall back to no authentication for demo purposes
            self.auth_provider = None

    async def _setup_middleware(self) -> None:
        """Setup middleware pipeline following project patterns."""
        if not self.mcp_server:
            return

        # Add middleware components based on configuration
        if self.config.enable_audit_logging:
            try:
                audit_middleware = AuditLoggingMiddleware()
                self.mcp_server.add_middleware(audit_middleware)
                logger.info("Audit logging middleware enabled")
            except Exception as e:
                logger.warning(f"Could not enable audit logging: {e}")

        if self.config.enable_rate_limiting:
            try:
                rate_limit_middleware = RateLimitMiddleware(
                    requests_per_minute=self.config.requests_per_minute
                )
                self.mcp_server.add_middleware(rate_limit_middleware)
                logger.info("Rate limiting middleware enabled")
            except Exception as e:
                logger.warning(f"Could not enable rate limiting: {e}")

        if self.config.enable_tool_access_control:
            try:
                access_control_middleware = ToolAccessControlMiddleware()
                self.mcp_server.add_middleware(access_control_middleware)
                logger.info("Tool access control middleware enabled")
            except Exception as e:
                logger.warning(f"Could not enable tool access control: {e}")

    def _register_tools(self) -> None:
        """Register tools using project patterns."""
        if not self.mcp_server:
            return

        # Register enterprise tools with authentication
        self.mcp_server.tool()(self._secure_query_data)
        self.mcp_server.tool()(self._admin_system_status)
        self.mcp_server.tool()(self._get_authentication_info)

        logger.info("Enterprise tools registered")

    async def run(self) -> None:
        """Run the enterprise server."""
        if not self.mcp_server:
            await self.initialize()

        logger.info("Starting Enterprise MCP Server...")
        if self.mcp_server:
            await self.mcp_server.run()
        else:
            logger.error("Server initialization failed")

    # Tool implementations using project patterns
    @require_authentication(roles=["user", "admin"])
    async def _secure_query_data(
        self,
        context: Context,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
    ) -> SecureDataResponse:
        """Secure data query with authentication."""
        user_context = get_user_context_from_context(context)
        if not user_context:
            raise ValueError("Authentication required")

        # Validate input
        request = SecureDataRequest(query=query, filters=filters or {}, limit=limit)
        request.validate_query()

        # Simulate secure data access
        simulated_data = [
            {
                "id": i,
                "value": f"secure_data_{i}",
                "user_access": user_context.user_id,
                "tenant": user_context.tenant_id,
            }
            for i in range(min(request.limit, 10))
        ]

        metadata = {
            "user_id": user_context.user_id,
            "tenant_id": user_context.tenant_id,
            "query": request.query,
            "processing_time": 0.05,
            "security_level": "enterprise",
        }

        return SecureDataResponse(
            data=simulated_data, metadata=metadata, record_count=len(simulated_data)
        )

    @require_authentication(roles=["admin"])
    async def _admin_system_status(self, context: Context) -> AdminStatusResponse:
        """Administrative system status - requires admin role."""
        user_context = get_user_context_from_context(context)
        if not user_context:
            raise ValueError("Authentication required")

        if "admin" not in user_context.roles:
            raise ValueError("Administrative privileges required")

        # Simulate system status collection
        system_status = {
            "server_status": "healthy",
            "database_connections": 15,
            "active_sessions": 42,
            "memory_usage": "68%",
            "cpu_usage": "23%",
            "uptime": "5 days, 3 hours",
            "last_security_scan": "2025-01-15T10:30:00Z",
        }

        metadata = {
            "admin_user": user_context.user_id,
            "access_level": "system_admin",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        return AdminStatusResponse(
            status=system_status, metadata=metadata, admin_user=user_context.user_id
        )

    async def _get_authentication_info(
        self, context: Context
    ) -> AuthenticationResponse:
        """Get authentication information and login URL."""
        # Generate authentication URL for Azure OAuth
        auth_url = (
            f"https://login.microsoftonline.com/{self.config.azure_tenant_id}"
            f"/oauth2/v2.0/authorize"
            f"?client_id={self.config.azure_client_id}"
            f"&response_type=code"
            f"&redirect_uri={self.config.oauth_callback_url}"
            f"&scope={' '.join(self.config.oauth_scopes)}"
        )

        metadata = {
            "tenant_id": self.config.azure_tenant_id,
            "client_id": self.config.azure_client_id,
            "scopes": self.config.oauth_scopes,
            "callback_url": self.config.oauth_callback_url,
        }

        return AuthenticationResponse(
            auth_url=auth_url,
            state="secure_random_state",  # In production, generate random state
            metadata=metadata,
        )


# Main execution
async def main():
    """Main function to run the enterprise server."""
    config = EnterpriseServerConfig()
    enterprise_server = EnterpriseServer(config)

    logger.info("Enterprise MCP Server starting...")
    logger.info(f"Azure OAuth configured: {config.has_azure_credentials()}")
    logger.info(f"Audit logging: {config.enable_audit_logging}")
    logger.info(f"Rate limiting: {config.enable_rate_limiting}")
    logger.info(f"Tool access control: {config.enable_tool_access_control}")

    try:
        await enterprise_server.run()
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Server error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
