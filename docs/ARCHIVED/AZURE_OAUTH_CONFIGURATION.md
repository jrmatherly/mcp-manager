# Azure OAuth Configuration for FastMCP - MCP Registry Gateway

**Created**: September 10, 2025  
**Version**: FastMCP 2.12.0+  
**Project**: MCP Registry Gateway  
**Purpose**: Complete guide for configuring Azure OAuth with FastMCP using OAuth Proxy pattern  
**Official Documentation**: Reference [Azure Integrations](../fastmcp_docs/integrations/azure.mdx), [Server-Side OAuth Proxy](../fastmcp_docs/servers/auth/oauth-proxy.mdx), [Azure Provider](../fastmcp_docs/python-sdk/fastmcp-server-auth-providers-azure.mdx), and [OAuth Proxy](../fastmcp_docs/python-sdk/fastmcp-server-auth-oauth_proxy.mdx) for authoritative FastMCP patterns

## Overview

This guide provides step-by-step instructions for implementing Azure OAuth authentication in the MCP Registry Gateway using FastMCP's native OAuth Proxy pattern. Azure requires OAuth Proxy because it doesn't support Dynamic Client Registration (DCR), which MCP clients expect.

## Architecture Pattern

The MCP Registry Gateway uses a **hybrid architecture** with Azure OAuth:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Registry Gateway                         │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI (Port 8000)         │  FastMCP (Port 8001)            │
│  ┌─────────────────────────┐  │ ┌─────────────────────────────┐ │
│  │  • REST API (existing) │  │ │  • OAuth Proxy              │ │
│  │  • Service Discovery   │  │ │  • Authenticated Tools      │ │
│  │  │  • Health Monitoring   │  │ │  • Role-based Access        │ │
│  │  • Registry Management │  │ │  • Audit Logging            │ │
│  └─────────────────────────┘  │ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Shared Infrastructure                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database    │    Redis Cache                   │ │
│  │  • Server registry      │    • Session data               │ │
│  │  • User data           │    • Token cache               │ │
│  │  • Audit logs          │    • Client registrations      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Azure Requirements
1. **Azure Account** with access to create App registrations
2. **Microsoft Entra ID** (Azure AD) tenant
3. **Admin permissions** to create and configure applications

### Project Requirements
1. **FastMCP 2.12.0+** installed
2. **Redis** for token caching
3. **PostgreSQL** for audit logging
4. **Environment variables** configured

## Step 1: Azure App Registration

### Create Application in Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Microsoft Entra ID → App registrations**
3. Click **"New registration"**

### Configure Application Settings

**Basic Configuration:**
- **Name**: `MCP Registry Gateway`
- **Supported account types**: 
  - Single tenant (recommended for enterprise)
  - Multitenant (for broader access)
- **Redirect URI**: 
  - Type: `Web`
  - URL: `https://your-domain.com/auth/callback` (production)
  - URL: `http://localhost:8001/auth/callback` (development)

### Generate Client Secret

1. Navigate to **Certificates & secrets**
2. Click **"New client secret"**
3. Description: `FastMCP OAuth Secret`
4. Expiration: Choose appropriate duration
5. **Copy the secret value immediately** (won't be shown again)

### Note Required Credentials

From the **Overview** page, collect:
- **Application (client) ID**: `835f09b6-0f0f-40cc-85cb-f32c5829a149`
- **Directory (tenant) ID**: `08541b6e-646d-43de-a0eb-834e6713d6d5`
- **Client Secret**: The value copied above

## Step 2: Environment Configuration

### Required Environment Variables

Add to your `.env` file:

```bash
# Existing MCP Registry Gateway configuration (preserved)
MREG_POSTGRES_HOST=localhost
MREG_POSTGRES_PORT=5432
MREG_POSTGRES_USER=mcp_user
MREG_POSTGRES_PASSWORD=mcp_password
MREG_POSTGRES_DB=mcp_registry
MREG_REDIS_URL=redis://localhost:6379/0

# FastMCP Azure OAuth configuration
AZURE_TENANT_ID=08541b6e-646d-43de-a0eb-834e6713d6d5
AZURE_CLIENT_ID=835f09b6-0f0f-40cc-85cb-f32c5829a149
AZURE_CLIENT_SECRET=your-client-secret-here
OAUTH_CALLBACK_URL=https://your-domain.com/auth/callback
OAUTH_SCOPES="User.Read profile openid email"

# FastMCP Server Configuration
FASTMCP_SERVER_PORT=8001
FASTMCP_SERVER_HOST=0.0.0.0

# Optional performance tuning
AZURE_VALIDATE_WITH_GRAPH=true
AZURE_TOKEN_CACHE_TTL=3600
AZURE_CLOCK_SKEW=300
```

### Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AZURE_TENANT_ID` | ✅ | Azure tenant ID | `08541b6e-646d-43de-a0eb-834e6713d6d5` |
| `AZURE_CLIENT_ID` | ✅ | Azure app client ID | `835f09b6-0f0f-40cc-85cb-f32c5829a149` |
| `AZURE_CLIENT_SECRET` | ✅ | Azure app client secret | `your-secret-here` |
| `OAUTH_CALLBACK_URL` | ✅ | OAuth callback URL | `https://domain.com/auth/callback` |
| `OAUTH_SCOPES` | ❌ | Required OAuth scopes | `"User.Read profile openid email"` |
| `AZURE_VALIDATE_WITH_GRAPH` | ❌ | Validate tokens with Graph API | `true` |
| `AZURE_TOKEN_CACHE_TTL` | ❌ | Token cache duration (seconds) | `3600` |

## Step 3: FastMCP Server Implementation

### Basic FastMCP Server with Azure OAuth

Create `src/mcp_registry_gateway/fastmcp_server.py`:

```python
"""FastMCP server with Azure OAuth authentication for MCP Registry Gateway."""

import os
from fastmcp import FastMCP
from fastmcp.server.auth.providers.azure import AzureProvider
from fastmcp.server.middleware import create_middleware_chain

from .middleware.audit import AuditLoggingMiddleware
from .middleware.rate_limit import RateLimitMiddleware
from .middleware.access_control import ToolAccessControlMiddleware
from .db.database import DatabaseManager


async def create_fastmcp_server() -> FastMCP:
    """Create and configure FastMCP server with Azure OAuth."""
    
    # Azure OAuth Provider configuration
    azure_provider = AzureProvider(
        client_id=os.getenv("AZURE_CLIENT_ID"),
        client_secret=os.getenv("AZURE_CLIENT_SECRET"),
        tenant_id=os.getenv("AZURE_TENANT_ID"),
        base_url=os.getenv("OAUTH_CALLBACK_URL", "http://localhost:8001").rsplit("/auth/callback", 1)[0],
        required_scopes=os.getenv("OAUTH_SCOPES", "User.Read profile openid email").split(),
        validate_with_graph=os.getenv("AZURE_VALIDATE_WITH_GRAPH", "true").lower() == "true",
        cache_backend="redis",
        cache_url=os.getenv("MREG_REDIS_URL"),
        cache_ttl=int(os.getenv("AZURE_TOKEN_CACHE_TTL", "3600"))
    )
    
    # Create FastMCP server with authentication
    mcp = FastMCP(
        name="mcp-registry-gateway",
        auth=azure_provider
    )
    
    # Initialize database manager
    db_manager = DatabaseManager()
    
    # Configure middleware chain
    middleware_chain = create_middleware_chain([
        RateLimitMiddleware(requests_per_minute=100),
        ToolAccessControlMiddleware({
            "register_server": ["admin"],
            "delete_server": ["admin"],
            "proxy_request": ["user", "admin"],
            "get_server_health": ["user", "admin"]
        }),
        AuditLoggingMiddleware(db_manager)
    ])
    
    mcp.set_middleware(middleware_chain)
    
    return mcp
```

### Authentication Context Access

Access user information in tools:

```python
from fastmcp.server.dependencies import get_access_token
from fastmcp import Context

@mcp.tool()
async def register_server(ctx: Context, name: str, url: str) -> str:
    """Register MCP server with authentication context."""
    
    # Access Azure user context
    token = get_access_token()
    user_id = token.claims.get("sub")
    user_email = token.claims.get("email")
    user_tenant = token.claims.get("tid")
    user_roles = token.claims.get("roles", [])
    
    # Log authentication context
    await ctx.info(f"Server registration by {user_email} ({user_id})")
    
    # Business logic with authentication context
    server_id = await registry_service.register_server(
        name=name,
        url=url,
        registered_by=user_id,
        tenant_id=user_tenant
    )
    
    return f"Server '{name}' registered with ID: {server_id}"
```

## Step 4: Middleware Configuration

### Role-Based Access Control Middleware

```python
"""Role-based access control middleware for FastMCP tools."""

from fastmcp.server.middleware import Middleware, MiddlewareContext
from fastmcp.exceptions import ToolError
from typing import Dict, List


class ToolAccessControlMiddleware(Middleware):
    """Middleware for role-based tool access control."""
    
    def __init__(self, permissions: Dict[str, List[str]]):
        """
        Initialize with tool permissions mapping.
        
        Args:
            permissions: Dict mapping tool names to required roles
        """
        self.permissions = permissions
    
    async def on_call_tool(self, context: MiddlewareContext, call_next):
        """Check tool access permissions before execution."""
        tool_name = context.message.name
        required_roles = self.permissions.get(tool_name, [])
        
        if required_roles and context.fastmcp_context:
            # Get user roles from authentication context
            auth_context = context.fastmcp_context.auth
            if auth_context and hasattr(auth_context, 'token'):
                user_roles = auth_context.token.claims.get("roles", [])
                
                # Check if user has required role
                if not any(role in user_roles for role in required_roles):
                    raise ToolError(
                        f"Access denied: {tool_name} requires one of {required_roles}"
                    )
        
        return await call_next(context)
```

### Audit Logging Middleware

```python
"""Audit logging middleware for FastMCP operations."""

from fastmcp.server.middleware import Middleware, MiddlewareContext
from ..db.database import DatabaseManager
import json
from datetime import datetime


class AuditLoggingMiddleware(Middleware):
    """Middleware for comprehensive audit logging."""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    async def on_call_tool(self, context: MiddlewareContext, call_next):
        """Log tool execution with user context."""
        start_time = datetime.utcnow()
        
        # Extract user context
        user_id = None
        user_email = None
        if context.fastmcp_context and context.fastmcp_context.auth:
            auth_context = context.fastmcp_context.auth
            if hasattr(auth_context, 'token'):
                user_id = auth_context.token.claims.get("sub")
                user_email = auth_context.token.claims.get("email")
        
        try:
            result = await call_next(context)
            
            # Log successful operation
            await self._log_operation(
                operation="tool_call",
                tool_name=context.message.name,
                user_id=user_id,
                user_email=user_email,
                arguments=context.message.arguments,
                success=True,
                duration_ms=(datetime.utcnow() - start_time).total_seconds() * 1000
            )
            
            return result
            
        except Exception as e:
            # Log failed operation
            await self._log_operation(
                operation="tool_call",
                tool_name=context.message.name,
                user_id=user_id,
                user_email=user_email,
                arguments=context.message.arguments,
                success=False,
                error=str(e),
                duration_ms=(datetime.utcnow() - start_time).total_seconds() * 1000
            )
            raise
    
    async def _log_operation(self, **kwargs):
        """Log operation to database."""
        async with self.db_manager.get_session() as session:
            # Implementation depends on your audit log table structure
            pass
```

## Step 5: Integration with Existing FastAPI

### Hybrid Server Startup

Update your main application to run both servers:

```python
"""Main application with hybrid FastAPI + FastMCP architecture."""

import asyncio
import uvicorn
from fastapi import FastAPI
from .api.main import create_fastapi_app
from .fastmcp_server import create_fastmcp_server


async def run_hybrid_servers():
    """Run both FastAPI and FastMCP servers concurrently."""
    
    # Create FastAPI app (existing)
    fastapi_app = create_fastapi_app()
    
    # Create FastMCP server (new)
    fastmcp_server = await create_fastmcp_server()
    
    # Run both servers concurrently
    await asyncio.gather(
        # FastAPI server (existing functionality)
        uvicorn.run(
            fastapi_app,
            host="0.0.0.0",
            port=8000,
            log_level="info"
        ),
        
        # FastMCP server (authenticated operations)
        fastmcp_server.run(
            transport="http",
            host="0.0.0.0",
            port=8001
        )
    )


if __name__ == "__main__":
    asyncio.run(run_hybrid_servers())
```

## Step 6: Testing and Validation

### Test Client Configuration

Create a test client to validate authentication:

```python
"""Test client for Azure OAuth authentication."""

import asyncio
from fastmcp import Client


async def test_azure_auth():
    """Test Azure OAuth authentication flow."""
    
    # Connect to FastMCP server with OAuth
    async with Client("http://localhost:8001/mcp/", auth="oauth") as client:
        print("✓ Authenticated with Azure!")
        
        # Test authenticated tool
        try:
            result = await client.call_tool("register_server", {
                "name": "test-server",
                "url": "http://localhost:9000"
            })
            print(f"✓ Tool call successful: {result}")
        except Exception as e:
            print(f"✗ Tool call failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_azure_auth())
```

### Authentication Flow Testing

1. **First-time authentication**:
   - Browser opens to Microsoft login
   - User signs in with Azure credentials
   - Grants requested permissions
   - Redirected back to application
   - Token cached for future use

2. **Subsequent requests**:
   - Cached token used automatically
   - No re-authentication required
   - Token refreshed when expired

## Step 7: Production Deployment

### Security Considerations

1. **HTTPS Required**: Production must use HTTPS for OAuth callbacks
2. **Secret Management**: Use Azure Key Vault or similar for secrets
3. **Token Validation**: Enable Graph API validation for security
4. **Tenant Isolation**: Ensure proper tenant ID validation

### Performance Optimization

1. **Redis Caching**: Configure Redis for token caching
2. **Connection Pooling**: Use connection pools for database access
3. **Rate Limiting**: Implement appropriate rate limits
4. **Monitoring**: Add comprehensive logging and metrics

### Environment-Specific Configuration

**Development:**
```bash
OAUTH_CALLBACK_URL=http://localhost:8001/auth/callback
AZURE_VALIDATE_WITH_GRAPH=false
```

**Production:**
```bash
OAUTH_CALLBACK_URL=https://your-domain.com/auth/callback
AZURE_VALIDATE_WITH_GRAPH=true
```

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**:
   - Ensure Azure app registration matches `OAUTH_CALLBACK_URL`
   - Check for trailing slashes and protocol differences

2. **Token Validation Failures**:
   - Verify tenant ID is correct
   - Check if Graph API validation is enabled
   - Ensure required scopes are granted

3. **Permission Errors**:
   - Verify user has required roles in Azure AD
   - Check middleware configuration
   - Review audit logs for access attempts

### Debug Configuration

Enable debug logging:

```python
import logging

# Enable FastMCP debug logging
logging.getLogger("fastmcp").setLevel(logging.DEBUG)
logging.getLogger("fastmcp.server.auth").setLevel(logging.DEBUG)
```

## Next Steps

1. **Implement additional tools** with authentication
2. **Configure role-based permissions** in Azure AD
3. **Set up monitoring and alerting**
4. **Add comprehensive error handling**
5. **Implement token refresh logic**

This configuration provides enterprise-grade Azure OAuth authentication for your MCP Registry Gateway while preserving existing functionality and enabling gradual migration to authenticated operations.
