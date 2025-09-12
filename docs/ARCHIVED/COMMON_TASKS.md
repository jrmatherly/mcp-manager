# Common Tasks - MCP Registry Gateway

This document provides comprehensive guidance for common development tasks with AI agent support for the MCP Registry Gateway.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## 🔧 **Common Tasks with Agent Support**

### **Adding New API Endpoint**
**🤖 Agent Workflow**: FastMCP Specialist → Protocol Expert → MCP Debugger (for testing)

1. **Define Route**: Add to appropriate module in `api/`  
2. **Business Logic**: Implement in `services/`  
3. **Database Operations**: Add to models in `db/models.py`  
4. **Documentation**: FastAPI auto-generates from type hints  
5. **Testing**: Add demo to `examples/demo_gateway.py`

**🎯 Agent Guidance**:
- **FastMCP Specialist**: Structured response patterns, middleware integration
- **Protocol Expert**: MCP compliance validation, JSON-RPC optimization
- **MCP Debugger**: Endpoint testing, error handling validation

#### **Step-by-Step Implementation**

**1. Define Route in `api/` Module**
```python
# src/mcp_registry_gateway/api/new_endpoint.py
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from typing import List

from mcp_registry_gateway.services.new_service import NewService
from mcp_registry_gateway.db.database import get_session
from mcp_registry_gateway.models.requests import NewRequest
from mcp_registry_gateway.models.responses import NewResponse

router = APIRouter(prefix="/api/v1/new", tags=["new-feature"])

@router.post("/", response_model=NewResponse, status_code=201)
async def create_new_resource(
    request: NewRequest,
    session = Depends(get_session),
    service: NewService = Depends()
) -> NewResponse:
    """Create new resource.
    
    Args:
        request: Resource creation request
        session: Database session
        service: Business logic service
        
    Returns:
        Created resource details
        
    Raises:
        HTTPException: If creation fails
    """
    try:
        result = await service.create_resource(request, session)
        return NewResponse.from_model(result)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
```

**2. Implement Business Logic in `services/`**
```python
# src/mcp_registry_gateway/services/new_service.py
from sqlmodel import Session
from typing import Optional

from mcp_registry_gateway.db.models import NewModel
from mcp_registry_gateway.models.requests import NewRequest
from mcp_registry_gateway.core.exceptions import ValidationError

class NewService:
    """Service for new resource management."""
    
    async def create_resource(
        self,
        request: NewRequest,
        session: Session
    ) -> NewModel:
        """Create new resource.
        
        Args:
            request: Resource creation request
            session: Database session
            
        Returns:
            Created resource model
            
        Raises:
            ValidationError: If request data is invalid
        """
        # Validation
        if await self._resource_exists(request.name, session):
            raise ValidationError(f"Resource {request.name} already exists")
        
        # Create model
        resource = NewModel(
            name=request.name,
            description=request.description,
            # ... other fields
        )
        
        session.add(resource)
        await session.commit()
        await session.refresh(resource)
        
        return resource
    
    async def _resource_exists(self, name: str, session: Session) -> bool:
        """Check if resource with name exists."""
        result = await session.execute(
            select(NewModel).where(NewModel.name == name)
        )
        return result.scalar_one_or_none() is not None
```

**3. Add Database Model in `db/models.py`**
```python
# src/mcp_registry_gateway/db/models.py (add to existing file)
class NewModel(SQLModel, table=True):
    """New resource model."""
    __tablename__ = "new_resources"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    status: str = Field(default="active", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**4. Add to Main API Router**
```python
# src/mcp_registry_gateway/api/main.py (update existing)
from mcp_registry_gateway.api.new_endpoint import router as new_router

def create_app() -> FastAPI:
    app = FastAPI(title="MCP Registry Gateway")
    
    # Include new router
    app.include_router(new_router)
    
    return app
```

**5. Add Demo Testing**
```python
# examples/demo_gateway.py (add to existing demo)
async def demo_new_endpoint():
    """Demo new endpoint functionality."""
    print("\n=== New Endpoint Demo ===")
    
    # Test creation
    create_data = {
        "name": "demo-resource",
        "description": "Demo resource for testing"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/new/",
            json=create_data
        )
        
        if response.status_code == 201:
            print("✅ New resource created successfully")
            resource = response.json()
            print(f"Resource ID: {resource['id']}")
        else:
            print(f"❌ Creation failed: {response.text}")
```

### **Adding New MCP Server Support**
**🤖 Agent Workflow**: Protocol Expert → FastMCP Specialist → Performance Optimizer

1. **Transport Support**: Extend transport handlers in `services/proxy.py`  
2. **Registry Schema**: Update server registration model if needed  
3. **Health Checks**: Add transport-specific health monitoring  
4. **Routing Logic**: Update capability matching in `routing/router.py`

**🎯 Agent Guidance**:
- **Protocol Expert**: MCP transport specifications, capability negotiation
- **FastMCP Specialist**: Transport integration patterns, middleware compatibility
- **Performance Optimizer**: Transport performance optimization, connection pooling

#### **Step-by-Step Implementation**

**1. Extend Transport Handlers**
```python
# src/mcp_registry_gateway/services/proxy.py (extend existing)
class MCPProxyService:
    """Enhanced MCP proxy service with new transport support."""
    
    def __init__(self):
        self.transport_handlers = {
            "http": self._handle_http_transport,
            "websocket": self._handle_websocket_transport,
            "grpc": self._handle_grpc_transport,  # NEW
            "unix_socket": self._handle_unix_socket_transport,  # NEW
        }
    
    async def _handle_grpc_transport(
        self,
        server: MCPServer,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle gRPC transport for MCP requests.
        
        Args:
            server: Target MCP server
            request: MCP JSON-RPC request
            
        Returns:
            MCP JSON-RPC response
        """
        import grpc
        from mcp_registry_gateway.proto import mcp_pb2, mcp_pb2_grpc
        
        try:
            async with grpc.aio.insecure_channel(server.url) as channel:
                stub = mcp_pb2_grpc.MCPServiceStub(channel)
                
                grpc_request = mcp_pb2.MCPRequest(
                    jsonrpc=request["jsonrpc"],
                    id=request["id"],
                    method=request["method"],
                    params=json.dumps(request.get("params", {}))
                )
                
                grpc_response = await stub.ProcessRequest(grpc_request)
                
                return {
                    "jsonrpc": grpc_response.jsonrpc,
                    "id": grpc_response.id,
                    "result": json.loads(grpc_response.result) if grpc_response.result else None,
                    "error": json.loads(grpc_response.error) if grpc_response.error else None
                }
                
        except grpc.RpcError as e:
            raise ProxyError(f"gRPC error: {e.details()}") from e
    
    async def _handle_unix_socket_transport(
        self,
        server: MCPServer,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle Unix socket transport for MCP requests."""
        import asyncio
        
        try:
            reader, writer = await asyncio.open_unix_connection(server.url)
            
            # Send JSON-RPC request
            request_data = json.dumps(request).encode() + b"\n"
            writer.write(request_data)
            await writer.drain()
            
            # Read response
            response_data = await reader.readline()
            response = json.loads(response_data.decode())
            
            writer.close()
            await writer.wait_closed()
            
            return response
            
        except Exception as e:
            raise ProxyError(f"Unix socket error: {e}") from e
```

**2. Update Registry Schema**
```python
# src/mcp_registry_gateway/db/models.py (update existing)
class MCPServer(SQLModel, table=True):
    """Updated MCP server model with new transport types."""
    
    transport: str = Field(
        description="Transport protocol",
        # Add validation for new transport types
    )
    
    # Add new fields for transport-specific configuration
    transport_config: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Transport-specific configuration"
    )
    
    @validator("transport")
    def validate_transport(cls, v):
        """Validate transport type."""
        allowed_transports = ["http", "websocket", "grpc", "unix_socket"]
        if v not in allowed_transports:
            raise ValueError(f"Transport must be one of: {allowed_transports}")
        return v
```

**3. Add Transport-Specific Health Checks**
```python
# src/mcp_registry_gateway/services/health.py (extend existing)
class HealthCheckService:
    """Enhanced health check service."""
    
    async def check_server_health(self, server: MCPServer) -> bool:
        """Check server health based on transport type."""
        transport_checkers = {
            "http": self._check_http_health,
            "websocket": self._check_websocket_health,
            "grpc": self._check_grpc_health,
            "unix_socket": self._check_unix_socket_health,
        }
        
        checker = transport_checkers.get(server.transport)
        if not checker:
            logger.warning(f"No health checker for transport {server.transport}")
            return False
            
        try:
            return await checker(server)
        except Exception as e:
            logger.error(f"Health check failed for {server.name}: {e}")
            return False
    
    async def _check_grpc_health(self, server: MCPServer) -> bool:
        """Check gRPC server health."""
        import grpc
        from grpc_health.v1 import health_pb2, health_pb2_grpc
        
        try:
            async with grpc.aio.insecure_channel(server.url) as channel:
                stub = health_pb2_grpc.HealthStub(channel)
                request = health_pb2.HealthCheckRequest(service="mcp")
                response = await stub.Check(request)
                return response.status == health_pb2.HealthCheckResponse.SERVING
        except Exception:
            return False
    
    async def _check_unix_socket_health(self, server: MCPServer) -> bool:
        """Check Unix socket server health."""
        import asyncio
        import os
        
        try:
            # Check if socket file exists and is accessible
            if not os.path.exists(server.url):
                return False
                
            # Try to connect
            reader, writer = await asyncio.open_unix_connection(server.url)
            writer.close()
            await writer.wait_closed()
            return True
        except Exception:
            return False
```

### **Database Schema Changes**
**🤖 Agent Workflow**: Performance Optimizer → FastMCP Specialist → MCP Debugger

1. **Models**: Update SQLModel classes in `db/models.py`  
2. **Migration**: Create Alembic migration (manual process)  
3. **Services**: Update business logic for new schema  
4. **Testing**: Update demo data and test cases

**🎯 Agent Guidance**:
- **Performance Optimizer**: Index design, query optimization, migration performance
- **FastMCP Specialist**: SQLModel integration, structured response updates
- **MCP Debugger**: Migration testing, rollback procedures, data integrity validation

#### **Step-by-Step Implementation**

**1. Update SQLModel Classes**
```python
# src/mcp_registry_gateway/db/models.py (add new model)
class ServerMetrics(SQLModel, table=True):
    """New model for server performance metrics."""
    __tablename__ = "server_metrics"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    server_id: UUID = Field(foreign_key="mcp_servers.id", index=True)
    metric_type: str = Field(index=True, description="Type of metric")
    metric_value: float = Field(description="Metric value")
    recorded_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    # Relationship
    server: Optional[MCPServer] = Relationship(back_populates="metrics")

# Update existing MCPServer model
class MCPServer(SQLModel, table=True):
    # ... existing fields ...
    
    # Add new relationship
    metrics: List[ServerMetrics] = Relationship(back_populates="server")
```

**2. Create Alembic Migration**
```bash
# Generate migration
uv run alembic revision --autogenerate -m "Add server metrics table"

# Review generated migration in alembic/versions/
# Edit if necessary for performance optimization

# Apply migration
uv run alembic upgrade head
```

**3. Update Services for New Schema**
```python
# src/mcp_registry_gateway/services/metrics.py (new service)
from sqlmodel import Session, select, func
from datetime import datetime, timedelta
from typing import List, Dict, Any

class MetricsService:
    """Service for server metrics management."""
    
    async def record_metric(
        self,
        server_id: UUID,
        metric_type: str,
        metric_value: float,
        session: Session
    ) -> ServerMetrics:
        """Record a server metric."""
        metric = ServerMetrics(
            server_id=server_id,
            metric_type=metric_type,
            metric_value=metric_value
        )
        
        session.add(metric)
        await session.commit()
        await session.refresh(metric)
        
        return metric
    
    async def get_server_metrics(
        self,
        server_id: UUID,
        metric_type: Optional[str] = None,
        hours: int = 24,
        session: Session
    ) -> List[ServerMetrics]:
        """Get server metrics for the specified time period."""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        query = select(ServerMetrics).where(
            ServerMetrics.server_id == server_id,
            ServerMetrics.recorded_at >= since
        )
        
        if metric_type:
            query = query.where(ServerMetrics.metric_type == metric_type)
        
        query = query.order_by(ServerMetrics.recorded_at.desc())
        
        result = await session.execute(query)
        return result.scalars().all()
```

**4. Update Demo and Testing**
```python
# examples/demo_gateway.py (add new demo)
async def demo_server_metrics():
    """Demo server metrics functionality."""
    print("\n=== Server Metrics Demo ===")
    
    # Register a server first
    server_data = {
        "name": "metrics-test-server",
        "transport": "http",
        "url": "http://localhost:3000",
        "capabilities": ["metrics"]
    }
    
    async with httpx.AsyncClient() as client:
        # Register server
        response = await client.post(
            f"{BASE_URL}/api/v1/servers",
            json=server_data
        )
        
        if response.status_code == 201:
            server = response.json()
            server_id = server["id"]
            
            # Record some metrics
            metrics_data = [
                {"metric_type": "response_time", "metric_value": 123.45},
                {"metric_type": "request_count", "metric_value": 42},
                {"metric_type": "error_rate", "metric_value": 0.01}
            ]
            
            for metric in metrics_data:
                metric_response = await client.post(
                    f"{BASE_URL}/api/v1/servers/{server_id}/metrics",
                    json=metric
                )
                
                if metric_response.status_code == 201:
                    print(f"✅ Recorded {metric['metric_type']}: {metric['metric_value']}")
                else:
                    print(f"❌ Failed to record metric: {metric_response.text}")
            
            # Retrieve metrics
            metrics_response = await client.get(
                f"{BASE_URL}/api/v1/servers/{server_id}/metrics"
            )
            
            if metrics_response.status_code == 200:
                metrics = metrics_response.json()
                print(f"📈 Retrieved {len(metrics)} metrics")
                for metric in metrics[:3]:  # Show first 3
                    print(f"  - {metric['metric_type']}: {metric['metric_value']}")
```

### **Configuration Changes**
**🤖 Agent Workflow**: Security Auditor → FastMCP Specialist → Deployment Specialist

1. **Settings Class**: Add to appropriate settings class in `core/config.py`  
2. **Environment Variable**: Define with `MREG_` prefix  
3. **Validation**: Add Pydantic validators if needed  
4. **Documentation**: Update `.env.example`

**🎯 Agent Guidance**:
- **Security Auditor**: Security-sensitive configuration, secret management
- **FastMCP Specialist**: FastMCP-specific settings, OAuth configuration
- **Deployment Specialist**: Production environment variables, Azure configuration

#### **Step-by-Step Implementation**

**1. Add to Settings Class**
```python
# src/mcp_registry_gateway/core/config.py (extend existing)
class MetricsSettings(BaseSettings):
    """Metrics collection and reporting settings."""
    
    # Metrics collection
    metrics_enabled: bool = Field(default=True, description="Enable metrics collection")
    metrics_interval: int = Field(default=60, ge=10, description="Metrics collection interval (seconds)")
    metrics_retention_days: int = Field(default=30, ge=1, description="Metrics retention period")
    
    # Performance monitoring
    enable_performance_monitoring: bool = Field(default=True, description="Enable performance monitoring")
    performance_threshold_ms: int = Field(default=1000, ge=100, description="Performance alert threshold (ms)")
    
    # Export configuration
    metrics_export_format: str = Field(default="prometheus", description="Metrics export format")
    metrics_export_endpoint: str = Field(default="/metrics", description="Metrics export endpoint")
    
    @validator("metrics_export_format")
    def validate_export_format(cls, v):
        """Validate metrics export format."""
        allowed_formats = ["prometheus", "json", "csv"]
        if v not in allowed_formats:
            raise ValueError(f"Export format must be one of: {allowed_formats}")
        return v
    
    class Config:
        env_prefix = "MREG_METRICS_"

# Update main Settings class
class Settings(BaseSettings):
    # ... existing settings ...
    
    # Add new metrics settings
    metrics: MetricsSettings = Field(default_factory=MetricsSettings)
```

**2. Define Environment Variables**
```bash
# .env.example (add new section)
# Metrics Configuration
MREG_METRICS_METRICS_ENABLED=true
MREG_METRICS_METRICS_INTERVAL=60
MREG_METRICS_METRICS_RETENTION_DAYS=30
MREG_METRICS_ENABLE_PERFORMANCE_MONITORING=true
MREG_METRICS_PERFORMANCE_THRESHOLD_MS=1000
MREG_METRICS_METRICS_EXPORT_FORMAT=prometheus
MREG_METRICS_METRICS_EXPORT_ENDPOINT=/metrics
```

**3. Add Validation**
```python
# src/mcp_registry_gateway/utils/validation.py (extend existing)
class ConfigValidator:
    """Enhanced configuration validator."""
    
    def validate_metrics_config(self, settings: Settings) -> List[str]:
        """Validate metrics configuration.
        
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        
        # Check metrics settings
        if settings.metrics.metrics_enabled:
            if settings.metrics.metrics_interval < 10:
                errors.append("Metrics interval must be at least 10 seconds")
            
            if settings.metrics.metrics_retention_days < 1:
                errors.append("Metrics retention must be at least 1 day")
        
        # Check performance monitoring
        if settings.metrics.enable_performance_monitoring:
            if settings.metrics.performance_threshold_ms < 100:
                errors.append("Performance threshold must be at least 100ms")
        
        return errors
```

**4. Update Configuration Documentation**
```python
# Update validation command to include new settings
# src/mcp_registry_gateway/cli.py (extend existing)
@click.command()
@click.option("--show-secrets", is_flag=True, help="Show sensitive configuration values")
def config(show_secrets: bool) -> None:
    """Show current configuration."""
    settings = get_settings()
    
    # ... existing config display ...
    
    # Add metrics configuration section
    console.print("\n[bold cyan]Metrics Configuration:[/bold cyan]")
    console.print(f"Enabled: {settings.metrics.metrics_enabled}")
    console.print(f"Collection Interval: {settings.metrics.metrics_interval}s")
    console.print(f"Retention Period: {settings.metrics.metrics_retention_days} days")
    console.print(f"Performance Monitoring: {settings.metrics.enable_performance_monitoring}")
    console.print(f"Performance Threshold: {settings.metrics.performance_threshold_ms}ms")
    console.print(f"Export Format: {settings.metrics.metrics_export_format}")
    console.print(f"Export Endpoint: {settings.metrics.metrics_export_endpoint}")
```

---

## 📖 **Related Documentation**

- **[Development Workflow](DEVELOPMENT_WORKFLOW.md)** - Code quality and testing workflow
- **[Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)** - Common issues and solutions
- **[Code Standards](CODE_STANDARDS.md)** - Code style and quality requirements
- **[API Reference](API_REFERENCE.md)** - API endpoint documentation
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)