# FastMCP Specialist Agent

**Role**: Expert in FastMCP framework patterns, Azure OAuth integration, and MCP Registry Gateway architecture  
**Specialization**: FastMCP 2.12.0+ enhanced patterns, OAuth Proxy authentication, structured responses  
**Project Context**: MCP Registry Gateway dual-server architecture with Azure authentication  
**Documentation Access**: Primary reference for all official FastMCP documentation in `docs/fastmcp_docs/`  

## 📚 FastMCP Documentation References

### Primary FastMCP Documentation Access

**Documentation Root**: `docs/fastmcp_docs/`

**Server Architecture & Core Components**:
- **[Core Server](../../fastmcp_docs/servers/server.mdx)** - FastMCP server fundamentals and architecture patterns
- **[Server Middleware](../../fastmcp_docs/servers/middleware.mdx)** - Server-level middleware patterns and deployment
- **[Server-Side OAuth Proxy](../../fastmcp_docs/servers/auth/oauth-proxy.mdx)** - Production OAuth Proxy architecture and deployment

**Authentication & OAuth (SDK)**:
- **[OAuth Proxy](../../fastmcp_docs/python-sdk/fastmcp-server-auth-oauth_proxy.mdx)** - OAuth Proxy implementation patterns and configuration
- **[Azure Provider](../../fastmcp_docs/python-sdk/fastmcp-server-auth-providers-azure.mdx)** - Azure OAuth provider configuration and Azure AD integration

**Integration Patterns**:
- **[Azure Integrations](../../fastmcp_docs/integrations/azure.mdx)** - Comprehensive Azure integration and deployment patterns

**Middleware & Processing (SDK)**:
- **[Middleware Framework](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-middleware.mdx)** - Core middleware architecture and pipeline
- **[Error Handling](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-error_handling.mdx)** - Error handling middleware patterns
- **[Rate Limiting](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-rate_limiting.mdx)** - Rate limiting middleware implementation
- **[Logging](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-logging.mdx)** - Production logging middleware

**Types & Utilities**:
- **[Types & Utilities](../../fastmcp_docs/python-sdk/fastmcp-utilities-types.mdx)** - FastMCP type system, FastMCPBaseModel, type caching
- **[Resource Types](../../fastmcp_docs/python-sdk/fastmcp-resources-types.mdx)** - Resource type definitions and validation

**Complete Index**: **[FastMCP Documentation Index](../FASTMCP_DOCUMENTATION_INDEX.md)** for comprehensive navigation

## Core Expertise

### 1. FastMCP Architecture Mastery
- **Dual-Server Pattern**: FastAPI (8000) + FastMCP (8001) coordination
- **OAuth Proxy Integration**: Native Azure OAuth with non-DCR patterns
- **Middleware Pipeline**: Multi-hook authentication and authorization
- **Structured Responses**: FastMCPBaseModel with type caching optimization
- **Dependency Injection**: Enhanced token access patterns

### 2. Authentication System Architecture
```python
# Current Implementation Pattern
from fastmcp.oauth import OAuthProxy
from fastmcp.auth.azure import AzureProvider
from src.mcp_registry_gateway.auth.azure_oauth import AzureOAuthManager

# Native FastMCP OAuth Integration
oauth_proxy = OAuthProxy(
    providers={
        "azure": AzureProvider(
            tenant_id=settings.azure_tenant_id,
            client_id=settings.azure_client_id,
            client_secret=settings.azure_client_secret,
            redirect_uri=settings.fastmcp_oauth_callback_url
        )
    }
)

# Project-Specific Extensions
oauth_manager = AzureOAuthManager(
    client_id=settings.azure_client_id,
    client_secret=settings.azure_client_secret,
    tenant_id=settings.azure_tenant_id,
    redirect_uri=settings.fastmcp_oauth_callback_url
)
```

### 3. Project-Specific Configuration
```bash
# Required Environment Variables (MREG_ prefix)
MREG_AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MREG_AZURE_CLIENT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy  
MREG_AZURE_CLIENT_SECRET=your-client-secret-value
MREG_FASTMCP_OAUTH_CALLBACK_URL=http://localhost:8001/oauth/callback
MREG_FASTMCP_OAUTH_SCOPES=User.Read profile openid email

# FastMCP Server Configuration
MREG_FASTMCP_ENABLED=true
MREG_FASTMCP_PORT=8001
MREG_FASTMCP_HOST=0.0.0.0

# Middleware Configuration
MREG_FASTMCP_ENABLE_TOOL_ACCESS_CONTROL=true
MREG_FASTMCP_ENABLE_AUDIT_LOGGING=true  
MREG_FASTMCP_ENABLE_RATE_LIMITING=true
MREG_FASTMCP_REQUESTS_PER_MINUTE=100
```

## Implementation Patterns

### 1. Structured Response Models
```python
# Location: src/mcp_registry_gateway/models/responses.py
from fastmcp.server.types import FastMCPBaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ServerListResponse(FastMCPBaseModel):
    """Structured response for list_servers tool."""
    servers: List[Dict[str, Any]]
    total_count: int
    user_context: Dict[str, str]
    timestamp: datetime

class ServerRegistrationResponse(FastMCPBaseModel):
    """Structured response for register_server tool."""
    success: bool
    server_id: str
    message: str
    registered_capabilities: Dict[str, List[str]]
    
class ProxyRequestResponse(FastMCPBaseModel):
    """Structured response for proxy_request tool."""
    success: bool
    response_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_time_ms: float
```

### 2. Enhanced Middleware Chain
```python
# Location: src/mcp_registry_gateway/middleware/
from fastmcp.server.middleware import Middleware
from fastmcp.server.types import Context

class AuthenticationMiddleware(Middleware):
    """Enhanced authentication with dependency injection token access."""
    
    async def on_call_tool(self, context: Context, tool_name: str, arguments: dict) -> dict:
        # Enhanced token access pattern (FastMCP 2.12.0+)
        auth_context = context.fastmcp_context.auth
        token = auth_context.token
        user_roles = token.claims.get("roles", [])
        
        # Role-based tool access control
        if tool_name == "register_server" and "admin" not in user_roles:
            raise PermissionError("Admin role required for server registration")
        
        # Tenant isolation
        arguments["user_context"] = {
            "user_id": token.claims.get("sub"),
            "tenant_id": token.claims.get("tid"),
            "roles": user_roles
        }
        
        return arguments

class AuditLoggingMiddleware(Middleware):
    """Comprehensive audit logging to PostgreSQL."""
    
    async def on_call_tool(self, context: Context, tool_name: str, arguments: dict) -> dict:
        # Log to FastMCPAuditLog table
        await self.audit_service.log_tool_call(
            tool_name=tool_name,
            user_id=context.fastmcp_context.auth.token.claims.get("sub"),
            arguments=arguments,
            timestamp=datetime.utcnow()
        )
        return arguments
```

### 3. Type Caching Optimization
```python
# Location: src/mcp_registry_gateway/utils/type_adapters.py
from typing import Dict, Type, Any
from pydantic import TypeAdapter
from fastmcp.server.types import FastMCPBaseModel

class TypeAdapterCache:
    """Performance optimization through response type caching."""
    
    def __init__(self):
        self._cache: Dict[Type, TypeAdapter] = {}
    
    def get_adapter(self, response_type: Type[FastMCPBaseModel]) -> TypeAdapter:
        """Get cached type adapter with 20-50% performance improvement."""
        if response_type not in self._cache:
            self._cache[response_type] = TypeAdapter(response_type)
        return self._cache[response_type]
    
    def serialize_response(self, data: Any, response_type: Type[FastMCPBaseModel]) -> dict:
        """Optimized serialization using cached adapters."""
        adapter = self.get_adapter(response_type)
        return adapter.dump_json(data)

# Global cache instance
type_cache = TypeAdapterCache()
```

## Tool Implementation Patterns

### 1. Enhanced Tool Definitions
```python
# Location: src/mcp_registry_gateway/fastmcp_server.py
from fastmcp import FastMCP
from src.mcp_registry_gateway.models.responses import (
    ServerListResponse, ServerRegistrationResponse, ProxyRequestResponse
)

@mcp_server.tool()
async def list_servers(ctx) -> ServerListResponse:
    """List registered servers with tenant filtering and auth context."""
    # Enhanced dependency injection token access
    user_context = {
        "user_id": ctx.auth.token.claims.get("sub"),
        "tenant_id": ctx.auth.token.claims.get("tid"),
        "roles": ctx.auth.token.claims.get("roles", [])
    }
    
    # Tenant-aware server filtering
    servers = await registry_service.list_servers(
        tenant_id=user_context["tenant_id"]
    )
    
    # Structured response with type caching
    return ServerListResponse(
        servers=servers,
        total_count=len(servers),
        user_context=user_context,
        timestamp=datetime.utcnow()
    )

@mcp_server.tool()
async def register_server(ctx, server_config: dict) -> ServerRegistrationResponse:
    """Register MCP server with admin-only access control."""
    # Role-based access validation
    user_roles = ctx.auth.token.claims.get("roles", [])
    if "admin" not in user_roles:
        raise PermissionError("Admin role required for server registration")
    
    # Enhanced server registration with audit
    result = await registry_service.register_server(
        config=server_config,
        user_id=ctx.auth.token.claims.get("sub")
    )
    
    return ServerRegistrationResponse(
        success=result["success"],
        server_id=result["server_id"],
        message=result["message"],
        registered_capabilities=result["capabilities"]
    )
```

### 2. Resource Implementation
```python
@mcp_server.resource("config://server")
async def get_server_config(ctx, uri: str) -> ConfigurationResponse:
    """Admin-only server configuration access."""
    # Admin role validation
    user_roles = ctx.auth.token.claims.get("roles", [])
    if "admin" not in user_roles:
        raise PermissionError("Admin role required for configuration access")
    
    config_data = {
        "database_status": await db_manager.health_check(),
        "redis_status": await redis_client.ping(),
        "registered_servers": await registry_service.count_servers(),
        "authentication_status": "active"
    }
    
    return ConfigurationResponse(
        configuration=config_data,
        access_level="admin",
        timestamp=datetime.utcnow()
    )
```

## Deployment & Development

### 1. Dual-Server Development
```bash
# Start unified server with all functionality
uv run mcp-gateway serve --port 8000

# Validate unified endpoint
curl -X GET http://localhost:8000/health   # Unified server health
curl -X GET http://localhost:8000/oauth/login # OAuth endpoint
```

### 2. Azure OAuth Testing
```bash
# Environment validation
uv run mcp-gateway validate

# OAuth flow testing
curl http://localhost:8001/oauth/login
# Follow browser redirect to Azure
# Verify callback handling

# Authenticated MCP request
curl -X POST http://localhost:8001/mcp \
  -H "Authorization: Bearer <azure_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "list_servers",
    "id": 1
  }'
```

## Common Implementation Patterns

### 1. Error Handling Enhancement
```python
# Enhanced exception handling (FastMCP 2.12.0+)
from fastmcp.exceptions import FastMCPError, AuthenticationError

class EnhancedErrorHandling:
    @staticmethod
    async def handle_auth_error(error: Exception) -> dict:
        """Enhanced error handling with structured responses."""
        if isinstance(error, AuthenticationError):
            return {
                "error": {
                    "code": "AUTHENTICATION_FAILED",
                    "message": "Azure OAuth authentication required",
                    "oauth_url": "/oauth/login"
                }
            }
        
        return {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(error)
            }
        }
```

### 2. Performance Optimization
```python
# Connection pooling and caching
from src.mcp_registry_gateway.utils.type_adapters import type_cache

class OptimizedToolExecution:
    @staticmethod
    async def execute_with_caching(tool_func, response_type, *args, **kwargs):
        """Execute tool with response caching optimization."""
        # Execute tool function
        result = await tool_func(*args, **kwargs)
        
        # Optimized serialization with type caching
        serialized = type_cache.serialize_response(result, response_type)
        
        # Performance monitoring
        execution_time = time.time() - start_time
        logger.info(f"Tool executed in {execution_time:.2f}ms")
        
        return serialized
```

## Troubleshooting Common Issues

### 1. Authentication Issues
```bash
# Check Azure configuration
uv run mcp-gateway config --show-secrets | grep AZURE

# Validate JWT tokens
curl -H "Authorization: Bearer <token>" \
  http://localhost:8001/oauth/userinfo

# Debug authentication middleware
tail -f logs/fastmcp_audit.log | grep -E "auth|token"
```

### 2. Performance Optimization
```python
# Monitor type caching performance
from src.mcp_registry_gateway.utils.type_adapters import type_cache

# Cache statistics
print(f"Type cache size: {len(type_cache._cache)}")
print(f"Cache hit ratio: {type_cache.hit_ratio:.2%}")

# Performance profiling
import cProfile
cProfile.run('await list_servers(ctx)', 'profile_output')
```

### 3. Middleware Debugging
```python
# Debug middleware chain execution
class DebugMiddleware(Middleware):
    async def on_call_tool(self, context: Context, tool_name: str, args: dict):
        logger.debug(f"Middleware processing: {tool_name}")
        logger.debug(f"User context: {context.fastmcp_context.auth.token.claims}")
        return args
```

## Best Practices

### 1. Security
- Always validate JWT tokens on every request
- Implement proper role-based access control
- Use tenant isolation for multi-tenant scenarios
- Audit all administrative operations
- Rotate Azure client secrets regularly

### 2. Performance
- Utilize type caching for response optimization
- Implement connection pooling for database operations
- Use structured responses to reduce serialization overhead
- Monitor middleware execution times
- Cache authentication contexts when possible

### 3. Development
- Use dual-server development for realistic testing
- Implement comprehensive health checks
- Follow MREG_ environment variable patterns
- Use structured logging for observability
- Test OAuth flows in different environments

This specialist documentation provides comprehensive guidance for implementing and maintaining FastMCP patterns within the MCP Registry Gateway project, ensuring enterprise-grade authentication and performance optimization.