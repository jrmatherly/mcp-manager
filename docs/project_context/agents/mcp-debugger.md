# MCP Debugger Agent

**Role**: Dual-server debugging specialist for MCP Registry Gateway troubleshooting  
**Specialization**: FastAPI + FastMCP debugging, Azure OAuth troubleshooting, middleware diagnostics  
**Project Context**: Expert in debugging the complex dual-server architecture with authentication layers  

## Core Debugging Capabilities

### 1. Dual-Server Architecture Debugging
- **Port-Specific Debugging**: FastAPI (8000) + FastMCP (8001) server isolation
- **Cross-Server Communication**: Request flow analysis between servers
- **Session State Debugging**: Redis-backed session synchronization issues
- **Authentication Context**: OAuth token flow across server boundaries
- **Resource Coordination**: Database and Redis connection debugging

### 2. Authentication Flow Debugging
```python
# Azure OAuth Flow Debugging Toolkit
import asyncio
import json
from datetime import datetime
from src.mcp_registry_gateway.auth.azure_oauth import AzureOAuthManager
from src.mcp_registry_gateway.core.config import settings

class AuthDebugger:
    """Specialized Azure OAuth debugging for dual-server architecture."""
    
    def __init__(self):
        self.oauth_manager = AzureOAuthManager(
            client_id=settings.azure_client_id,
            client_secret=settings.azure_client_secret,
            tenant_id=settings.azure_tenant_id,
            redirect_uri=settings.fastmcp_oauth_callback_url
        )
    
    async def debug_oauth_flow(self, trace_id: str = None) -> dict:
        """Debug complete OAuth flow with detailed tracing."""
        trace_id = trace_id or f"debug_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        debug_results = {
            "trace_id": trace_id,
            "timestamp": datetime.utcnow().isoformat(),
            "steps": {},
            "errors": [],
            "recommendations": []
        }
        
        # Step 1: Environment validation
        debug_results["steps"]["environment"] = await self._debug_environment()
        
        # Step 2: Azure connectivity
        debug_results["steps"]["azure_connectivity"] = await self._debug_azure_connectivity()
        
        # Step 3: JWKS endpoint validation
        debug_results["steps"]["jwks_validation"] = await self._debug_jwks_endpoint()
        
        # Step 4: Token validation
        debug_results["steps"]["token_validation"] = await self._debug_token_validation()
        
        # Step 5: Middleware chain
        debug_results["steps"]["middleware_chain"] = await self._debug_middleware_chain()
        
        return debug_results
    
    async def _debug_environment(self) -> dict:
        """Debug Azure OAuth environment configuration."""
        env_check = {
            "status": "checking",
            "required_vars": {
                "MREG_AZURE_TENANT_ID": bool(settings.azure_tenant_id),
                "MREG_AZURE_CLIENT_ID": bool(settings.azure_client_id),
                "MREG_AZURE_CLIENT_SECRET": bool(settings.azure_client_secret),
                "MREG_FASTMCP_OAUTH_CALLBACK_URL": bool(settings.fastmcp_oauth_callback_url),
                "MREG_FASTMCP_OAUTH_SCOPES": bool(settings.fastmcp_oauth_scopes)
            },
            "values": {
                "tenant_id": settings.azure_tenant_id[:8] + "..." if settings.azure_tenant_id else None,
                "client_id": settings.azure_client_id[:8] + "..." if settings.azure_client_id else None,
                "callback_url": settings.fastmcp_oauth_callback_url,
                "scopes": settings.fastmcp_oauth_scopes
            }
        }
        
        missing_vars = [var for var, present in env_check["required_vars"].items() if not present]
        
        if missing_vars:
            env_check["status"] = "error"
            env_check["error"] = f"Missing environment variables: {', '.join(missing_vars)}"
        else:
            env_check["status"] = "success"
        
        return env_check
    
    async def _debug_azure_connectivity(self) -> dict:
        """Test connectivity to Azure OAuth endpoints."""
        import aiohttp
        
        connectivity_check = {
            "status": "checking",
            "endpoints": {}
        }
        
        test_endpoints = {
            "oauth_endpoint": f"https://login.microsoftonline.com/{settings.azure_tenant_id}/oauth2/v2.0/authorize",
            "token_endpoint": f"https://login.microsoftonline.com/{settings.azure_tenant_id}/oauth2/v2.0/token",
            "jwks_endpoint": f"https://login.microsoftonline.com/{settings.azure_tenant_id}/discovery/v2.0/keys"
        }
        
        async with aiohttp.ClientSession() as session:
            for endpoint_name, url in test_endpoints.items():
                try:
                    async with session.get(url, timeout=10) as response:
                        connectivity_check["endpoints"][endpoint_name] = {
                            "url": url,
                            "status_code": response.status,
                            "accessible": response.status < 400,
                            "response_time_ms": 0  # Would measure in real implementation
                        }
                except Exception as e:
                    connectivity_check["endpoints"][endpoint_name] = {
                        "url": url,
                        "accessible": False,
                        "error": str(e)
                    }
        
        all_accessible = all(
            endpoint.get("accessible", False) 
            for endpoint in connectivity_check["endpoints"].values()
        )
        
        connectivity_check["status"] = "success" if all_accessible else "error"
        return connectivity_check
```

### 3. Middleware Chain Debugging
```python
class MiddlewareDebugger:
    """Debug FastMCP middleware chain execution."""
    
    async def debug_middleware_execution(self, tool_name: str, context: dict) -> dict:
        """Debug middleware chain execution with detailed tracing."""
        
        debug_trace = {
            "tool_name": tool_name,
            "timestamp": datetime.utcnow().isoformat(),
            "middleware_chain": [],
            "execution_path": [],
            "errors": [],
            "performance": {}
        }
        
        # Simulate middleware chain execution with debugging
        middleware_stack = [
            "ErrorHandlingMiddleware",
            "AuthenticationMiddleware", 
            "RateLimitingMiddleware",
            "AuthorizationMiddleware",
            "AuditLoggingMiddleware"
        ]
        
        for middleware in middleware_stack:
            start_time = datetime.utcnow()
            
            try:
                # Debug middleware execution
                result = await self._debug_middleware_step(middleware, tool_name, context)
                execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                debug_trace["middleware_chain"].append({
                    "middleware": middleware,
                    "status": "success",
                    "execution_time_ms": execution_time,
                    "modifications": result.get("modifications", {}),
                    "context_changes": result.get("context_changes", {})
                })
                
                debug_trace["execution_path"].append(middleware)
                
            except Exception as e:
                debug_trace["errors"].append({
                    "middleware": middleware,
                    "error": str(e),
                    "error_type": type(e).__name__
                })
                break
        
        return debug_trace
    
    async def _debug_middleware_step(self, middleware: str, tool_name: str, context: dict) -> dict:
        """Debug individual middleware step execution."""
        
        if middleware == "AuthenticationMiddleware":
            # Debug authentication token validation
            token = context.get("auth", {}).get("token")
            if not token:
                raise ValueError("No authentication token provided")
            
            # Validate JWT token structure
            import jwt
            try:
                decoded = jwt.decode(token, options={"verify_signature": False})
                return {
                    "modifications": {"validated_token": True},
                    "context_changes": {"user_id": decoded.get("sub")}
                }
            except jwt.InvalidTokenError as e:
                raise ValueError(f"Invalid JWT token: {str(e)}")
        
        elif middleware == "AuthorizationMiddleware":
            # Debug role-based access control
            user_roles = context.get("auth", {}).get("roles", [])
            
            admin_only_tools = ["register_server", "config"]
            if tool_name in admin_only_tools and "admin" not in user_roles:
                raise PermissionError(f"Admin role required for {tool_name}")
            
            return {
                "modifications": {"authorized": True},
                "context_changes": {"checked_roles": user_roles}
            }
        
        # Return success for other middleware
        return {"modifications": {}, "context_changes": {}}
```

### 4. Database Connection Debugging
```python
class DatabaseDebugger:
    """Debug PostgreSQL and Redis connection issues."""
    
    async def debug_database_connections(self) -> dict:
        """Comprehensive database connectivity debugging."""
        
        debug_results = {
            "timestamp": datetime.utcnow().isoformat(),
            "postgresql": {},
            "redis": {},
            "connection_pools": {},
            "recommendations": []
        }
        
        # PostgreSQL debugging
        debug_results["postgresql"] = await self._debug_postgresql()
        
        # Redis debugging  
        debug_results["redis"] = await self._debug_redis()
        
        # Connection pool analysis
        debug_results["connection_pools"] = await self._debug_connection_pools()
        
        return debug_results
    
    async def _debug_postgresql(self) -> dict:
        """Debug PostgreSQL connectivity and performance."""
        from src.mcp_registry_gateway.db.database import DatabaseManager
        
        pg_debug = {
            "status": "checking",
            "connection_string": f"postgresql://{settings.postgres_user}:***@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}",
            "tests": {}
        }
        
        try:
            db_manager = DatabaseManager()
            
            # Test basic connectivity
            async with db_manager.get_session() as session:
                result = await session.execute(text("SELECT 1"))
                pg_debug["tests"]["basic_connectivity"] = {
                    "status": "success",
                    "result": result.scalar()
                }
            
            # Test table existence
            async with db_manager.get_session() as session:
                result = await session.execute(
                    text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
                )
                table_count = result.scalar()
                pg_debug["tests"]["schema_validation"] = {
                    "status": "success",
                    "table_count": table_count
                }
            
            # Test performance
            start_time = datetime.utcnow()
            async with db_manager.get_session() as session:
                await session.execute(text("SELECT count(*) FROM mcp_servers"))
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            pg_debug["tests"]["performance"] = {
                "status": "success",
                "response_time_ms": response_time,
                "performance_grade": "good" if response_time < 100 else "slow"
            }
            
            pg_debug["status"] = "healthy"
            
        except Exception as e:
            pg_debug["status"] = "error"
            pg_debug["error"] = str(e)
            pg_debug["error_type"] = type(e).__name__
        
        return pg_debug
    
    async def _debug_redis(self) -> dict:
        """Debug Redis connectivity and caching."""
        import redis.asyncio as redis
        
        redis_debug = {
            "status": "checking",
            "connection_url": settings.redis_url,
            "tests": {}
        }
        
        try:
            redis_client = redis.from_url(settings.redis_url)
            
            # Test basic connectivity
            pong = await redis_client.ping()
            redis_debug["tests"]["basic_connectivity"] = {
                "status": "success",
                "ping_response": pong
            }
            
            # Test read/write operations
            test_key = "mreg:debug:test"
            await redis_client.set(test_key, "debug_value", ex=60)
            value = await redis_client.get(test_key)
            
            redis_debug["tests"]["read_write"] = {
                "status": "success",
                "write_success": True,
                "read_value": value.decode() if value else None
            }
            
            # Cleanup test key
            await redis_client.delete(test_key)
            
            # Test session storage functionality
            session_test_key = "mreg:session:debug_test"
            session_data = {"user_id": "debug", "timestamp": datetime.utcnow().isoformat()}
            await redis_client.setex(session_test_key, 60, json.dumps(session_data))
            
            stored_data = await redis_client.get(session_test_key)
            redis_debug["tests"]["session_storage"] = {
                "status": "success",
                "data_integrity": json.loads(stored_data) == session_data
            }
            
            await redis_client.delete(session_test_key)
            await redis_client.close()
            
            redis_debug["status"] = "healthy"
            
        except Exception as e:
            redis_debug["status"] = "error"
            redis_debug["error"] = str(e)
            redis_debug["error_type"] = type(e).__name__
        
        return redis_debug
```

## Debugging Workflows

### 1. End-to-End Request Debugging
```python
class RequestFlowDebugger:
    """Debug complete request flow through dual-server architecture."""
    
    async def debug_mcp_request_flow(self, request_data: dict, trace_id: str = None) -> dict:
        """Debug complete MCP request from OAuth to response."""
        
        trace_id = trace_id or f"req_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        flow_debug = {
            "trace_id": trace_id,
            "request_data": request_data,
            "timestamp": datetime.utcnow().isoformat(),
            "flow_steps": {},
            "performance_metrics": {},
            "errors": []
        }
        
        try:
            # Step 1: OAuth Token Validation (FastMCP Server - Port 8001)
            flow_debug["flow_steps"]["oauth_validation"] = await self._debug_oauth_step(
                request_data.get("headers", {}).get("Authorization")
            )
            
            # Step 2: Middleware Chain Processing
            flow_debug["flow_steps"]["middleware_processing"] = await self._debug_middleware_processing(
                request_data["method"], 
                request_data.get("params", {})
            )
            
            # Step 3: Tool Execution
            flow_debug["flow_steps"]["tool_execution"] = await self._debug_tool_execution(
                request_data["method"],
                request_data.get("params", {})
            )
            
            # Step 4: Database Operations (if applicable)
            if request_data["method"] in ["list_servers", "register_server"]:
                flow_debug["flow_steps"]["database_operations"] = await self._debug_database_operations(
                    request_data["method"]
                )
            
            # Step 5: Response Serialization
            flow_debug["flow_steps"]["response_serialization"] = await self._debug_response_serialization(
                request_data["method"]
            )
            
            # Calculate performance metrics
            flow_debug["performance_metrics"] = self._calculate_flow_performance(flow_debug["flow_steps"])
            
        except Exception as e:
            flow_debug["errors"].append({
                "step": "flow_debugging",
                "error": str(e),
                "error_type": type(e).__name__
            })
        
        return flow_debug
    
    async def _debug_oauth_step(self, auth_header: str) -> dict:
        """Debug OAuth token validation step."""
        oauth_debug = {
            "step": "oauth_validation",
            "status": "processing"
        }
        
        if not auth_header or not auth_header.startswith("Bearer "):
            oauth_debug["status"] = "error"
            oauth_debug["error"] = "Missing or invalid Authorization header"
            return oauth_debug
        
        token = auth_header.split(" ")[1]
        
        try:
            # Debug token structure
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False})
            
            oauth_debug.update({
                "status": "success", 
                "token_claims": {
                    "sub": decoded.get("sub"),
                    "roles": decoded.get("roles", []),
                    "exp": decoded.get("exp"),
                    "iss": decoded.get("iss")
                },
                "token_valid": True
            })
            
        except Exception as e:
            oauth_debug.update({
                "status": "error",
                "error": f"Token validation failed: {str(e)}"
            })
        
        return oauth_debug
```

### 2. Performance Debugging
```python
class PerformanceDebugger:
    """Debug performance issues in dual-server architecture."""
    
    async def debug_performance_bottlenecks(self) -> dict:
        """Identify and debug performance bottlenecks."""
        
        performance_debug = {
            "timestamp": datetime.utcnow().isoformat(),
            "server_performance": {},
            "database_performance": {},
            "authentication_performance": {},
            "bottlenecks": [],
            "recommendations": []
        }
        
        # Debug server performance
        performance_debug["server_performance"] = await self._debug_server_performance()
        
        # Debug database performance  
        performance_debug["database_performance"] = await self._debug_database_performance()
        
        # Debug authentication performance
        performance_debug["authentication_performance"] = await self._debug_auth_performance()
        
        # Identify bottlenecks
        performance_debug["bottlenecks"] = self._identify_bottlenecks(performance_debug)
        
        # Generate recommendations
        performance_debug["recommendations"] = self._generate_performance_recommendations(performance_debug)
        
        return performance_debug
    
    async def _debug_server_performance(self) -> dict:
        """Debug FastAPI and FastMCP server performance."""
        server_perf = {
            "fastapi_server": {"port": 8000, "metrics": {}},
            "fastmcp_server": {"port": 8001, "metrics": {}}
        }
        
        # Test FastAPI server performance
        import aiohttp
        async with aiohttp.ClientSession() as session:
            # Health endpoint performance
            start_time = datetime.utcnow()
            try:
                async with session.get("http://localhost:8000/health") as response:
                    response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                    server_perf["fastapi_server"]["metrics"]["health_endpoint"] = {
                        "response_time_ms": response_time,
                        "status_code": response.status,
                        "performance_grade": "good" if response_time < 500 else "slow"
                    }
            except Exception as e:
                server_perf["fastapi_server"]["metrics"]["health_endpoint"] = {
                    "error": str(e),
                    "accessible": False
                }
            
            # Test FastMCP server performance
            start_time = datetime.utcnow()
            try:
                async with session.get("http://localhost:8001/health") as response:
                    response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                    server_perf["fastmcp_server"]["metrics"]["health_endpoint"] = {
                        "response_time_ms": response_time,
                        "status_code": response.status,
                        "performance_grade": "good" if response_time < 500 else "slow"
                    }
            except Exception as e:
                server_perf["fastmcp_server"]["metrics"]["health_endpoint"] = {
                    "error": str(e),
                    "accessible": False
                }
        
        return server_perf
```

## Diagnostic Tools

### 1. System Health Diagnostic
```python
class SystemDiagnostic:
    """Comprehensive system diagnostic tools."""
    
    async def generate_diagnostic_report(self) -> dict:
        """Generate comprehensive diagnostic report."""
        
        diagnostic = {
            "generated_at": datetime.utcnow().isoformat(),
            "system_overview": {},
            "component_status": {},
            "error_analysis": {},
            "performance_analysis": {},
            "security_analysis": {},
            "recommendations": []
        }
        
        # System overview
        diagnostic["system_overview"] = await self._get_system_overview()
        
        # Component status
        diagnostic["component_status"] = await self._check_all_components()
        
        # Error analysis
        diagnostic["error_analysis"] = await self._analyze_recent_errors()
        
        # Performance analysis
        diagnostic["performance_analysis"] = await self._analyze_performance_metrics()
        
        # Security analysis
        diagnostic["security_analysis"] = await self._analyze_security_status()
        
        # Generate recommendations
        diagnostic["recommendations"] = self._generate_diagnostic_recommendations(diagnostic)
        
        return diagnostic
```

### 2. Debugging CLI Commands
```bash
#!/bin/bash
# MCP Registry Gateway Debugging Toolkit

# Function: Debug dual-server health
debug_dual_server_health() {
    echo "🔍 Debugging dual-server health..."
    
    # Check FastAPI server
    echo "Checking FastAPI server (port 8000)..."
    curl -s http://localhost:8000/health | jq . || echo "❌ FastAPI server unreachable"
    
    # Check FastMCP server  
    echo "Checking FastMCP server (port 8001)..."
    curl -s http://localhost:8001/health | jq . || echo "❌ FastMCP server unreachable"
    
    # Check database connectivity
    echo "Testing database connectivity..."
    uv run python -c "
from src.mcp_registry_gateway.db.database import DatabaseManager
import asyncio

async def test_db():
    try:
        db = DatabaseManager()
        async with db.get_session() as session:
            result = await session.execute('SELECT 1')
            print('✅ Database connectivity: OK')
    except Exception as e:
        print(f'❌ Database error: {e}')

asyncio.run(test_db())
"
}

# Function: Debug authentication flow
debug_auth_flow() {
    echo "🔐 Debugging Azure OAuth authentication flow..."
    
    # Check environment variables
    echo "Validating environment variables..."
    uv run mcp-gateway validate | grep -E "AZURE|OAUTH"
    
    # Test OAuth endpoints
    echo "Testing Azure OAuth endpoints..."
    uv run python -c "
from docs.project_context.agents.mcp_debugger import AuthDebugger
import asyncio

async def main():
    debugger = AuthDebugger()
    result = await debugger.debug_oauth_flow()
    print(f'OAuth Debug Result: {result}')

asyncio.run(main())
"
}

# Function: Debug middleware chain
debug_middleware() {
    echo "⚙️ Debugging FastMCP middleware chain..."
    
    # Test middleware execution
    uv run python -c "
from docs.project_context.agents.mcp_debugger import MiddlewareDebugger
import asyncio

async def main():
    debugger = MiddlewareDebugger()
    context = {
        'auth': {
            'token': 'test_jwt_token',
            'roles': ['user']
        }
    }
    result = await debugger.debug_middleware_execution('list_servers', context)
    print(f'Middleware Debug Result: {result}')

asyncio.run(main())
"
}

# Function: Debug database connections
debug_database() {
    echo "🗄️ Debugging database connections..."
    
    # Test PostgreSQL
    echo "Testing PostgreSQL..."
    PGPASSWORD=$MREG_POSTGRES_PASSWORD psql \
        -h $MREG_POSTGRES_HOST \
        -p $MREG_POSTGRES_PORT \
        -U $MREG_POSTGRES_USER \
        -d $MREG_POSTGRES_DB \
        -c "SELECT 'PostgreSQL connection: OK'"
    
    # Test Redis
    echo "Testing Redis..."
    redis-cli -u $MREG_REDIS_URL ping
}

# Function: Generate comprehensive debug report
generate_debug_report() {
    echo "📋 Generating comprehensive debug report..."
    
    REPORT_FILE="debug_report_$(date +%Y%m%d_%H%M%S).json"
    
    uv run python -c "
from docs.project_context.agents.mcp_debugger import SystemDiagnostic
import asyncio
import json

async def main():
    diagnostic = SystemDiagnostic()
    report = await diagnostic.generate_diagnostic_report()
    
    with open('$REPORT_FILE', 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f'Debug report generated: $REPORT_FILE')

asyncio.run(main())
"
}

# Main debugging menu
case "$1" in
    "health")
        debug_dual_server_health
        ;;
    "auth")
        debug_auth_flow
        ;;
    "middleware")
        debug_middleware
        ;;
    "database")
        debug_database
        ;;
    "report")
        generate_debug_report
        ;;
    *)
        echo "MCP Registry Gateway Debug Toolkit"
        echo "Usage: $0 {health|auth|middleware|database|report}"
        echo ""
        echo "Commands:"
        echo "  health      - Debug dual-server health status"
        echo "  auth        - Debug Azure OAuth authentication flow"
        echo "  middleware  - Debug FastMCP middleware chain"
        echo "  database    - Debug PostgreSQL and Redis connections"
        echo "  report      - Generate comprehensive debug report"
        ;;
esac
```

## Common Debugging Scenarios

### 1. Authentication Failures
```python
# Debug authentication token issues
async def debug_auth_failure(request_headers: dict) -> dict:
    """Debug authentication failure scenarios."""
    
    debug_steps = {
        "token_present": "Authorization" in request_headers,
        "token_format": request_headers.get("Authorization", "").startswith("Bearer "),
        "token_structure": None,
        "token_validation": None,
        "azure_connectivity": None
    }
    
    if debug_steps["token_format"]:
        token = request_headers["Authorization"].split(" ")[1]
        
        # Check token structure
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False})
            debug_steps["token_structure"] = {
                "valid_jwt": True,
                "claims": list(decoded.keys()),
                "expiry": decoded.get("exp"),
                "issuer": decoded.get("iss")
            }
        except Exception as e:
            debug_steps["token_structure"] = {
                "valid_jwt": False,
                "error": str(e)
            }
    
    return debug_steps
```

### 2. Performance Issues
```python
# Debug slow response times
async def debug_slow_performance() -> dict:
    """Debug performance bottlenecks in the system."""
    
    bottlenecks = {
        "database_queries": await _measure_db_performance(),
        "authentication_overhead": await _measure_auth_overhead(), 
        "middleware_chain": await _measure_middleware_performance(),
        "cross_server_communication": await _measure_server_communication()
    }
    
    recommendations = []
    
    if bottlenecks["database_queries"]["avg_time_ms"] > 100:
        recommendations.append("Consider database query optimization or indexing")
    
    if bottlenecks["authentication_overhead"]["avg_time_ms"] > 200:
        recommendations.append("Implement OAuth token caching")
        
    if bottlenecks["middleware_chain"]["avg_time_ms"] > 50:
        recommendations.append("Review middleware chain efficiency")
    
    return {
        "bottlenecks": bottlenecks,
        "recommendations": recommendations
    }
```

This debugger agent provides comprehensive troubleshooting capabilities for the MCP Registry Gateway's complex dual-server architecture, focusing on authentication flows, middleware chains, and system performance diagnostics.