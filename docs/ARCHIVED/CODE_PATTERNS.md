# Code Analysis & Patterns - MCP Registry Gateway

This document provides comprehensive analysis of code patterns, architectural decisions, and design principles used in the MCP Registry Gateway.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## 🔍 **Code Analysis & Patterns**

### **Key Architectural Patterns**
- **Dependency Injection**: FastAPI-style with `Depends()`  
- **Repository Pattern**: Database operations in service classes  
- **Factory Pattern**: Configuration and database connection creation  
- **Circuit Breaker**: Fault tolerance in proxy operations  
- **Connection Pooling**: Async database and HTTP connections

### **Error Handling Strategy**
- **Custom Exceptions**: Domain-specific error types in `core.exceptions`  
- **FastAPI Exception Handlers**: HTTP error response formatting  
- **Async Error Propagation**: Proper exception handling in async contexts  
- **Circuit Breaker Fallbacks**: Graceful degradation on service failures

### **Performance Considerations**
- **Async First**: All I/O operations use async/await  
- **Connection Reuse**: HTTP client and database connection pooling  
- **Query Optimization**: Efficient database queries with proper indexing  
- **Caching Strategy**: Redis for session data and health status caching

## 🏗️ **Architectural Patterns Deep Dive**

### **Dependency Injection Pattern**

The MCP Registry Gateway uses FastAPI's dependency injection system extensively for clean separation of concerns and testability.

#### **Database Session Injection**
```python
# src/mcp_registry_gateway/db/database.py
from sqlmodel import Session, create_engine
from contextlib import asynccontextmanager
from typing import AsyncGenerator

class DatabaseManager:
    """Database connection manager with dependency injection."""
    
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url, echo=False)
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[Session, None]:
        """Provide database session with automatic cleanup."""
        async with Session(self.engine) as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

# Dependency provider
async def get_session() -> AsyncGenerator[Session, None]:
    """FastAPI dependency for database sessions."""
    db_manager = get_database_manager()  # From configuration
    async with db_manager.get_session() as session:
        yield session

# Usage in endpoints
@router.post("/servers", response_model=ServerResponse)
async def create_server(
    server_data: ServerCreateRequest,
    session: Session = Depends(get_session),  # Injected dependency
    current_user: UserContext = Depends(get_current_user)
) -> ServerResponse:
    """Create server with injected dependencies."""
    # Implementation with clean separation
    pass
```

#### **Service Layer Injection**
```python
# src/mcp_registry_gateway/services/registry.py
class RegistryService:
    """Registry service with injected dependencies."""
    
    def __init__(
        self,
        db_manager: DatabaseManager,
        cache_manager: CacheManager,
        logger: logging.Logger
    ):
        self.db_manager = db_manager
        self.cache_manager = cache_manager
        self.logger = logger
    
    async def register_server(self, server_data: ServerCreateRequest) -> MCPServer:
        """Register server with dependency-injected resources."""
        # Use injected dependencies
        async with self.db_manager.get_session() as session:
            # Implementation
            pass

# Dependency factory
def get_registry_service() -> RegistryService:
    """Factory for registry service with dependencies."""
    return RegistryService(
        db_manager=get_database_manager(),
        cache_manager=get_cache_manager(),
        logger=get_logger("registry")
    )

# Usage in endpoints
@router.post("/servers")
async def create_server(
    server_data: ServerCreateRequest,
    registry: RegistryService = Depends(get_registry_service)
) -> ServerResponse:
    """Endpoint with service injection."""
    server = await registry.register_server(server_data)
    return ServerResponse.from_model(server)
```

### **Repository Pattern Implementation**

The repository pattern abstracts database operations and provides a clean interface for data access.

#### **Base Repository Pattern**
```python
# src/mcp_registry_gateway/repositories/base.py
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, List, Optional
from uuid import UUID
from sqlmodel import Session, select

T = TypeVar('T')

class BaseRepository(Generic[T], ABC):
    """Base repository with common CRUD operations."""
    
    def __init__(self, session: Session, model_class: type[T]):
        self.session = session
        self.model_class = model_class
    
    async def create(self, entity: T) -> T:
        """Create new entity."""
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity
    
    async def get_by_id(self, entity_id: UUID) -> Optional[T]:
        """Get entity by ID."""
        return await self.session.get(self.model_class, entity_id)
    
    async def list_all(self, limit: int = 100, offset: int = 0) -> List[T]:
        """List all entities with pagination."""
        query = select(self.model_class).offset(offset).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def update(self, entity: T) -> T:
        """Update entity."""
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity
    
    async def delete(self, entity_id: UUID) -> bool:
        """Delete entity by ID."""
        entity = await self.get_by_id(entity_id)
        if entity:
            await self.session.delete(entity)
            await self.session.commit()
            return True
        return False
```

#### **Specialized Repository Implementation**
```python
# src/mcp_registry_gateway/repositories/server_repository.py
from typing import List, Optional
from sqlmodel import select, and_
from mcp_registry_gateway.db.models import MCPServer, ServerCapability
from mcp_registry_gateway.repositories.base import BaseRepository

class ServerRepository(BaseRepository[MCPServer]):
    """Repository for MCP server operations."""
    
    def __init__(self, session: Session):
        super().__init__(session, MCPServer)
    
    async def find_by_name(self, name: str) -> Optional[MCPServer]:
        """Find server by name."""
        query = select(MCPServer).where(MCPServer.name == name)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def find_by_capability(
        self,
        capability: str,
        status: str = "active"
    ) -> List[MCPServer]:
        """Find servers by capability."""
        query = (
            select(MCPServer)
            .join(ServerCapability)
            .where(
                and_(
                    ServerCapability.name == capability,
                    MCPServer.status == status
                )
            )
            .distinct()
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def find_by_tenant(
        self,
        tenant_id: str,
        status: Optional[str] = None
    ) -> List[MCPServer]:
        """Find servers by tenant with optional status filter."""
        query = select(MCPServer).where(MCPServer.tenant_id == tenant_id)
        
        if status:
            query = query.where(MCPServer.status == status)
        
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_server_statistics(self) -> dict:
        """Get server statistics."""
        # Total servers
        total_query = select(func.count(MCPServer.id))
        total_result = await self.session.execute(total_query)
        total_servers = total_result.scalar()
        
        # Active servers
        active_query = select(func.count(MCPServer.id)).where(
            MCPServer.status == "active"
        )
        active_result = await self.session.execute(active_query)
        active_servers = active_result.scalar()
        
        # Servers by transport
        transport_query = (
            select(MCPServer.transport, func.count(MCPServer.id))
            .group_by(MCPServer.transport)
        )
        transport_result = await self.session.execute(transport_query)
        transport_counts = dict(transport_result.all())
        
        return {
            "total_servers": total_servers,
            "active_servers": active_servers,
            "servers_by_transport": transport_counts
        }
```

### **Factory Pattern Implementation**

The factory pattern is used for creating complex objects with configuration dependencies.

#### **Configuration Factory**
```python
# src/mcp_registry_gateway/core/config.py
from functools import lru_cache
from typing import Optional

class ConfigurationFactory:
    """Factory for creating configuration objects."""
    
    @staticmethod
    def create_database_config(
        environment: str = "development"
    ) -> DatabaseSettings:
        """Create database configuration based on environment."""
        if environment == "production":
            return DatabaseSettings(
                postgres_host=os.getenv("PROD_POSTGRES_HOST"),
                postgres_ssl_mode="require",
                min_connections=10,
                max_connections=50,
                echo=False
            )
        elif environment == "testing":
            return DatabaseSettings(
                postgres_db="mcp_registry_test",
                min_connections=1,
                max_connections=5,
                echo=False
            )
        else:  # development
            return DatabaseSettings(
                min_connections=2,
                max_connections=10,
                echo=True
            )
    
    @staticmethod
    def create_security_config(
        environment: str = "development"
    ) -> SecuritySettings:
        """Create security configuration based on environment."""
        base_config = SecuritySettings()
        
        if environment == "production":
            base_config.enable_cors = False
            base_config.jwt_expiry = 3600  # 1 hour
            base_config.enable_security_headers = True
        elif environment == "development":
            base_config.enable_cors = True
            base_config.jwt_expiry = 86400  # 24 hours
            base_config.enable_security_headers = False
        
        return base_config

@lru_cache()
def get_settings() -> Settings:
    """Factory function for application settings (cached)."""
    environment = os.getenv("MREG_ENVIRONMENT", "development")
    
    return Settings(
        environment=environment,
        database=ConfigurationFactory.create_database_config(environment),
        security=ConfigurationFactory.create_security_config(environment),
        # ... other configurations
    )
```

#### **Service Factory Pattern**
```python
# src/mcp_registry_gateway/services/factory.py
from typing import Dict, Type, Any
from mcp_registry_gateway.services.base import BaseService

class ServiceFactory:
    """Factory for creating service instances."""
    
    def __init__(self):
        self._services: Dict[str, Type[BaseService]] = {}
        self._instances: Dict[str, BaseService] = {}
    
    def register_service(self, name: str, service_class: Type[BaseService]) -> None:
        """Register a service class."""
        self._services[name] = service_class
    
    def create_service(
        self,
        name: str,
        **kwargs: Any
    ) -> BaseService:
        """Create service instance with dependencies."""
        if name not in self._services:
            raise ValueError(f"Service {name} not registered")
        
        # Check if instance already exists (singleton pattern)
        if name in self._instances:
            return self._instances[name]
        
        service_class = self._services[name]
        instance = service_class(**kwargs)
        
        # Cache instance
        self._instances[name] = instance
        
        return instance
    
    def get_service(self, name: str) -> BaseService:
        """Get existing service instance."""
        if name not in self._instances:
            raise ValueError(f"Service {name} not created")
        return self._instances[name]

# Global factory instance
service_factory = ServiceFactory()

# Register services
from mcp_registry_gateway.services.registry import RegistryService
from mcp_registry_gateway.services.proxy import ProxyService
from mcp_registry_gateway.services.health import HealthService

service_factory.register_service("registry", RegistryService)
service_factory.register_service("proxy", ProxyService)
service_factory.register_service("health", HealthService)

# Usage in dependencies
def get_registry_service() -> RegistryService:
    """Get registry service instance."""
    return service_factory.create_service(
        "registry",
        db_manager=get_database_manager(),
        cache_manager=get_cache_manager()
    )
```

### **Circuit Breaker Pattern**

The circuit breaker pattern provides fault tolerance and prevents cascading failures.

#### **Circuit Breaker Implementation**
```python
# src/mcp_registry_gateway/patterns/circuit_breaker.py
import asyncio
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Optional
import logging

class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, blocking requests
    HALF_OPEN = "half_open" # Testing if service recovered

class CircuitBreaker:
    """Circuit breaker for fault tolerance."""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        name: str = "circuit_breaker"
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name
        
        # State management
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.logger = logging.getLogger(f"circuit_breaker.{name}")
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection."""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.logger.info(f"Circuit breaker {self.name} moving to HALF_OPEN")
            else:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker {self.name} is OPEN"
                )
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if self.last_failure_time is None:
            return True
        
        time_since_failure = datetime.now() - self.last_failure_time
        return time_since_failure >= timedelta(seconds=self.recovery_timeout)
    
    def _on_success(self) -> None:
        """Handle successful operation."""
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            self.logger.info(f"Circuit breaker {self.name} recovered to CLOSED")
        
        self.failure_count = 0
        self.last_failure_time = None
    
    def _on_failure(self) -> None:
        """Handle failed operation."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.logger.warning(
                f"Circuit breaker {self.name} OPENED after {self.failure_count} failures"
            )
    
    @property
    def is_closed(self) -> bool:
        """Check if circuit is closed (normal operation)."""
        return self.state == CircuitState.CLOSED
    
    @property
    def is_open(self) -> bool:
        """Check if circuit is open (blocking requests)."""
        return self.state == CircuitState.OPEN

class CircuitBreakerOpenError(Exception):
    """Exception raised when circuit breaker is open."""
    pass
```

#### **Circuit Breaker Usage in Services**
```python
# src/mcp_registry_gateway/services/proxy.py
class ProxyService:
    """Proxy service with circuit breaker protection."""
    
    def __init__(self):
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.logger = logging.getLogger("proxy_service")
    
    def _get_circuit_breaker(self, server_id: str) -> CircuitBreaker:
        """Get or create circuit breaker for server."""
        if server_id not in self.circuit_breakers:
            self.circuit_breakers[server_id] = CircuitBreaker(
                failure_threshold=5,
                recovery_timeout=60,
                expected_exception=(httpx.RequestError, httpx.HTTPStatusError),
                name=f"server_{server_id}"
            )
        return self.circuit_breakers[server_id]
    
    async def proxy_request(
        self,
        server: MCPServer,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Proxy request with circuit breaker protection."""
        circuit_breaker = self._get_circuit_breaker(str(server.id))
        
        try:
            return await circuit_breaker.call(
                self._make_request,
                server,
                request
            )
        except CircuitBreakerOpenError:
            # Circuit breaker is open, return cached response or error
            cached_response = await self._get_cached_response(server.id, request)
            if cached_response:
                self.logger.info(f"Returning cached response for {server.name}")
                return cached_response
            
            raise ProxyError(
                f"Server {server.name} is temporarily unavailable",
                server_id=server.id,
                error_code="SERVICE_UNAVAILABLE"
            )
    
    async def _make_request(
        self,
        server: MCPServer,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make actual HTTP request to server."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                server.url,
                json=request,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            return response.json()
    
    async def _get_cached_response(
        self,
        server_id: UUID,
        request: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get cached response for fallback."""
        # Implementation for cached responses
        # This could use Redis or in-memory cache
        pass
```

### **Connection Pooling Pattern**

Connection pooling is implemented for both database and HTTP connections to optimize resource usage.

#### **Database Connection Pool**
```python
# src/mcp_registry_gateway/db/pool.py
import asyncpg
from typing import Optional
import logging

class DatabasePool:
    """Async PostgreSQL connection pool manager."""
    
    def __init__(
        self,
        database_url: str,
        min_connections: int = 5,
        max_connections: int = 20,
        command_timeout: float = 60.0
    ):
        self.database_url = database_url
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.command_timeout = command_timeout
        self.pool: Optional[asyncpg.Pool] = None
        self.logger = logging.getLogger("database_pool")
    
    async def initialize(self) -> None:
        """Initialize connection pool."""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=self.min_connections,
                max_size=self.max_connections,
                command_timeout=self.command_timeout,
                server_settings={
                    'application_name': 'mcp_registry_gateway',
                    'jit': 'off'  # Disable JIT for consistent performance
                }
            )
            self.logger.info(
                f"Database pool initialized: {self.min_connections}-{self.max_connections} connections"
            )
        except Exception as e:
            self.logger.error(f"Failed to initialize database pool: {e}")
            raise
    
    async def close(self) -> None:
        """Close connection pool."""
        if self.pool:
            await self.pool.close()
            self.logger.info("Database pool closed")
    
    async def acquire(self) -> asyncpg.Connection:
        """Acquire connection from pool."""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")
        
        return await self.pool.acquire()
    
    async def release(self, connection: asyncpg.Connection) -> None:
        """Release connection back to pool."""
        if self.pool:
            await self.pool.release(connection)
    
    async def execute(
        self,
        query: str,
        *args,
        timeout: Optional[float] = None
    ) -> str:
        """Execute query using pool connection."""
        async with self.pool.acquire() as connection:
            return await connection.execute(query, *args, timeout=timeout)
    
    async def fetch(
        self,
        query: str,
        *args,
        timeout: Optional[float] = None
    ) -> list:
        """Fetch query results using pool connection."""
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, *args, timeout=timeout)
    
    async def fetchrow(
        self,
        query: str,
        *args,
        timeout: Optional[float] = None
    ) -> Optional[asyncpg.Record]:
        """Fetch single row using pool connection."""
        async with self.pool.acquire() as connection:
            return await connection.fetchrow(query, *args, timeout=timeout)
    
    @property
    def size(self) -> int:
        """Get current pool size."""
        return self.pool.get_size() if self.pool else 0
    
    @property
    def available_connections(self) -> int:
        """Get available connections in pool."""
        return self.pool.get_idle_size() if self.pool else 0
```

#### **HTTP Connection Pool**
```python
# src/mcp_registry_gateway/http/pool.py
import httpx
from typing import Optional, Dict, Any
import logging

class HTTPClientPool:
    """HTTP client pool for reusing connections."""
    
    def __init__(
        self,
        max_connections: int = 100,
        max_keepalive_connections: int = 20,
        keepalive_expiry: float = 5.0,
        timeout: float = 30.0
    ):
        self.max_connections = max_connections
        self.max_keepalive_connections = max_keepalive_connections
        self.keepalive_expiry = keepalive_expiry
        self.timeout = timeout
        self.client: Optional[httpx.AsyncClient] = None
        self.logger = logging.getLogger("http_client_pool")
    
    async def initialize(self) -> None:
        """Initialize HTTP client with connection pooling."""
        limits = httpx.Limits(
            max_connections=self.max_connections,
            max_keepalive_connections=self.max_keepalive_connections,
            keepalive_expiry=self.keepalive_expiry
        )
        
        timeout = httpx.Timeout(self.timeout)
        
        self.client = httpx.AsyncClient(
            limits=limits,
            timeout=timeout,
            headers={
                "User-Agent": "MCP-Registry-Gateway/1.0",
                "Accept": "application/json"
            }
        )
        
        self.logger.info(
            f"HTTP client pool initialized: {self.max_connections} max connections"
        )
    
    async def close(self) -> None:
        """Close HTTP client and connections."""
        if self.client:
            await self.client.aclose()
            self.logger.info("HTTP client pool closed")
    
    async def request(
        self,
        method: str,
        url: str,
        **kwargs: Any
    ) -> httpx.Response:
        """Make HTTP request using pooled client."""
        if not self.client:
            raise RuntimeError("HTTP client pool not initialized")
        
        try:
            response = await self.client.request(method, url, **kwargs)
            return response
        except httpx.RequestError as e:
            self.logger.error(f"HTTP request failed: {e}")
            raise
    
    async def get(self, url: str, **kwargs: Any) -> httpx.Response:
        """Make GET request."""
        return await self.request("GET", url, **kwargs)
    
    async def post(
        self,
        url: str,
        json: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> httpx.Response:
        """Make POST request."""
        return await self.request("POST", url, json=json, **kwargs)
    
    @property
    def connection_info(self) -> Dict[str, Any]:
        """Get connection pool information."""
        if not self.client:
            return {"status": "not_initialized"}
        
        # Note: httpx doesn't expose detailed pool stats
        # This is a simplified version
        return {
            "status": "initialized",
            "max_connections": self.max_connections,
            "max_keepalive": self.max_keepalive_connections,
            "timeout": self.timeout
        }
```

## 🛠️ **Design Patterns Summary**

### **Implemented Patterns**

| Pattern | Location | Purpose | Benefits |
|---------|----------|---------|----------|
| **Dependency Injection** | `api/`, `services/` | Clean separation of concerns | Testability, flexibility |
| **Repository** | `repositories/` | Data access abstraction | Database independence, testing |
| **Factory** | `core/config.py`, `services/factory.py` | Object creation | Configuration management, DI |
| **Circuit Breaker** | `patterns/circuit_breaker.py` | Fault tolerance | Prevents cascading failures |
| **Connection Pooling** | `db/pool.py`, `http/pool.py` | Resource management | Performance, scalability |
| **Singleton** | `core/config.py` | Configuration management | Single source of truth |
| **Observer** | `events/` (planned) | Event handling | Loose coupling, extensibility |
| **Strategy** | `routing/router.py` | Algorithm selection | Load balancing flexibility |
| **Adapter** | `transports/` | Protocol abstraction | Multi-transport support |
| **Middleware** | `middleware/` | Request processing | Cross-cutting concerns |

### **Pattern Benefits**

**Maintainability**:
- Clear separation of concerns
- Testable components
- Configurable behavior

**Performance**:
- Connection reuse
- Resource pooling
- Fault tolerance

**Scalability**:
- Async operations
- Load balancing strategies
- Circuit breaker protection

**Flexibility**:
- Dependency injection
- Factory pattern configuration
- Strategy pattern algorithms

---

## 📖 **Related Documentation**

- **[Code Standards](CODE_STANDARDS.md)** - Code style and quality requirements
- **[Development Workflow](DEVELOPMENT_WORKFLOW.md)** - Development patterns and practices
- **[Architecture Documentation](../architecture/)** - System architecture overview
- **[API Reference](API_REFERENCE.md)** - API design patterns
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)