# Code Standards - MCP Registry Gateway

This document provides comprehensive code style and quality standards for the MCP Registry Gateway project.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## 📝 **Code Style & Standards**

### **Formatting & Linting (Validated Tools)**
- **Primary**: Ruff (formatting, linting, import sorting) - ✅ Zero errors  
- **Type Checking**: MyPy (enhanced configuration) - ⚠️ 159 warnings (static analysis, non-blocking)  
- **Line Length**: 88 characters  
- **Import Style**: isort integration via Ruff

### **Code Quality Requirements**
- **Type Hints**: Required for all public functions and classes  
- **Docstrings**: Required for public APIs (Google style)  
- **Error Handling**: Use custom exceptions from `core.exceptions`  
- **Async/Await**: Prefer async patterns for I/O operations  
- **Pydantic Models**: Use for data validation and serialization

### **Naming Conventions**
- **Variables/Functions**: `snake_case`  
- **Classes**: `PascalCase`  
- **Constants**: `UPPER_SNAKE_CASE`  
- **Private Methods**: `_leading_underscore`  
- **Environment Variables**: `MREG_COMPONENT_SETTING`

### **Database Conventions**
- **Tables**: `snake_case` (e.g., `mcp_servers`, `server_tools`)  
- **Columns**: `snake_case` with descriptive names  
- **Primary Keys**: UUID with `gen_random_uuid()` default  
- **Timestamps**: `created_at`, `updated_at` with `NOW()` default

## 🔧 **Tool Configuration**

### **Ruff Configuration**

```toml
# pyproject.toml - Ruff configuration
[tool.ruff]
line-length = 88
target-version = "py310"
src = ["src"]
exclude = [
    ".bzr",
    ".direnv",
    ".eggs",
    ".git",
    ".git-rewrite",
    ".hg",
    ".mypy_cache",
    ".nox",
    ".pants.d",
    ".pytype",
    ".ruff_cache",
    ".svn",
    ".tox",
    ".venv",
    "__pypackages__",
    "_build",
    "buck-out",
    "build",
    "dist",
    "node_modules",
    "venv",
]

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # Pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
    "N",   # pep8-naming
    "YTT", # flake8-2020
    "S",   # flake8-bandit
    "BLE", # flake8-blind-except
    "FBT", # flake8-boolean-trap
    "A",   # flake8-builtins
    "COM", # flake8-commas
    "C90", # mccabe
    "DJ",  # flake8-django
    "EM",  # flake8-errmsg
    "EXE", # flake8-executable
    "FA",  # flake8-future-annotations
    "ISC", # flake8-implicit-str-concat
    "ICN", # flake8-import-conventions
    "G",   # flake8-logging-format
    "INP", # flake8-no-pep420
    "PIE", # flake8-pie
    "T20", # flake8-print
    "PYI", # flake8-pyi
    "PT",  # flake8-pytest-style
    "Q",   # flake8-quotes
    "RSE", # flake8-raise
    "RET", # flake8-return
    "SLF", # flake8-self
    "SLOT",# flake8-slots
    "SIM", # flake8-simplify
    "TID", # flake8-tidy-imports
    "TCH", # flake8-type-checking
    "INT", # flake8-gettext
    "ARG", # flake8-unused-arguments
    "PTH", # flake8-use-pathlib
    "TD",  # flake8-todos
    "FIX", # flake8-fixme
    "ERA", # eradicate
    "PD",  # pandas-vet
    "PGH", # pygrep-hooks
    "PL",  # Pylint
    "TRY", # tryceratops
    "FLY", # flynt
    "NPY", # NumPy-specific rules
    "AIR", # Airflow
    "PERF",# Perflint
    "FURB",# refurb
    "LOG", # flake8-logging
    "RUF", # Ruff-specific rules
]

ignore = [
    "E501",   # line too long (handled by formatter)
    "B008",   # do not perform function calls in argument defaults
    "S101",   # use of assert detected
    "S311",   # standard pseudo-random generators not suitable for cryptographic purposes
    "FBT001", # boolean-typed positional argument in function definition
    "FBT002", # boolean-typed positional argument in function definition
    "A003",   # class attribute shadows python builtin
    "PLR0913", # too many arguments
    "PLR0912", # too many branches
    "PLR0915", # too many statements
    "PLR2004", # magic value used in comparison
    "PD901",  # avoid using the generic variable name `df` for dataframes
    "TD002",  # missing author in TODO
    "TD003",  # missing issue link on the line following this TODO
    "FIX002", # line contains TODO
]

# Allow fix for all enabled rules (when `--fix`) is provided.
fixable = ["ALL"]
unfixable = []

# Allow unused variables when underscore-prefixed.
dummy-variable-rgx = "^(_+|(_+[a-zA-Z0-9_]*[a-zA-Z0-9]+?))$"

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
line-ending = "auto"

[tool.ruff.lint.per-file-ignores]
"tests/**/*" = [
    "S101",   # asserts allowed in tests
    "ARG",    # unused function args in tests
    "FBT",    # don't care about booleans as positional arguments in tests
    "PLR2004", # magic values in tests
    "S311",   # pseudo-random generators OK in tests
]
"scripts/**/*" = [
    "T20",    # print statements OK in scripts
    "S101",   # asserts OK in scripts
    "PLR2004", # magic values OK in scripts
]

[tool.ruff.lint.mccabe]
max-complexity = 10

[tool.ruff.lint.pydocstyle]
convention = "google"

[tool.ruff.lint.isort]
split-on-trailing-comma = true
known-first-party = ["mcp_registry_gateway"]
```

### **MyPy Configuration**

```toml
# pyproject.toml - MyPy configuration
[tool.mypy]
python_version = "3.10"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
warn_unreachable = true
strict_equality = true
show_error_codes = true
show_column_numbers = true
pretty = true

# Import discovery
namespace_packages = true
explicit_package_bases = true

# Platform configuration
python_executable = ".venv/bin/python"

# Per-module options
[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
disallow_incomplete_defs = false

[[tool.mypy.overrides]]
module = [
    "asyncpg.*",
    "psycopg.*",
    "redis.*",
    "websockets.*",
    "uvicorn.*",
    "fastmcp.*",
]
ignore_missing_imports = true
```

## 📝 **Code Style Guidelines**

### **Import Organization**

```python
# Standard library imports
import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

# Third-party imports
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

# Local application imports
from mcp_registry_gateway.core.config import get_settings
from mcp_registry_gateway.core.exceptions import ValidationError
from mcp_registry_gateway.db.database import get_session
from mcp_registry_gateway.db.models import MCPServer
```

### **Function and Class Definitions**

#### **Function Signatures**
```python
# Good: Clear type hints and documentation
async def register_server(
    server_data: ServerRegistrationRequest,
    session: Session = Depends(get_session),
    current_user: UserContext = Depends(get_current_user),
) -> ServerRegistrationResponse:
    """Register a new MCP server.
    
    Args:
        server_data: Server registration information
        session: Database session dependency
        current_user: Authenticated user context
        
    Returns:
        Server registration response with server details
        
    Raises:
        ValidationError: If server data is invalid
        PermissionError: If user lacks registration permissions
    """
    # Implementation here
    pass

# Bad: Missing type hints and documentation
def register_server(server_data, session, current_user):
    pass
```

#### **Class Definitions**
```python
# Good: SQLModel with proper fields and relationships
class MCPServer(SQLModel, table=True):
    """Model representing an MCP server registration.
    
    This model stores information about registered MCP servers including
    their connection details, capabilities, and current status.
    
    Attributes:
        id: Unique server identifier (UUID)
        name: Human-readable server name
        transport: Communication transport protocol
        url: Server endpoint URL
        status: Current server operational status
        description: Optional server description
        tenant_id: Tenant isolation identifier
        created_at: Server registration timestamp
        updated_at: Last modification timestamp
        capabilities: Related server capabilities
    """
    __tablename__ = "mcp_servers"
    
    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
        description="Unique server identifier"
    )
    name: str = Field(
        index=True,
        min_length=1,
        max_length=100,
        description="Server name"
    )
    transport: str = Field(
        description="Transport protocol (http, websocket)"
    )
    url: str = Field(
        description="Server endpoint URL"
    )
    status: str = Field(
        default="active",
        index=True,
        description="Server status (active, inactive, error)"
    )
    description: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional server description"
    )
    tenant_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Tenant isolation identifier"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last update timestamp"
    )
    
    # Relationships
    capabilities: List["ServerCapability"] = Relationship(
        back_populates="server"
    )
```

### **Error Handling Patterns**

#### **Custom Exception Usage**
```python
from mcp_registry_gateway.core.exceptions import (
    ValidationError,
    ServerNotFoundError,
    ProxyError,
    AuthenticationError
)

# Good: Specific exception types with context
async def get_server(server_id: UUID) -> MCPServer:
    """Retrieve server by ID.
    
    Args:
        server_id: Server identifier
        
    Returns:
        MCP server instance
        
    Raises:
        ServerNotFoundError: If server doesn't exist
        ValidationError: If server_id is invalid
    """
    if not server_id:
        raise ValidationError("Server ID is required")
        
    try:
        server = await database.get_server(server_id)
        if not server:
            raise ServerNotFoundError(
                f"Server {server_id} not found",
                server_id=server_id
            )
        return server
    except Exception as e:
        logger.error(f"Failed to retrieve server {server_id}: {e}")
        raise

# Bad: Generic exceptions without context
async def get_server(server_id):
    server = await database.get_server(server_id)
    if not server:
        raise Exception("Server not found")
    return server
```

#### **Exception Handling in Async Context**
```python
# Good: Proper async exception handling
async def proxy_request(
    server_id: UUID,
    request: Dict[str, Any]
) -> Dict[str, Any]:
    """Proxy MCP request to target server.
    
    Args:
        server_id: Target server ID
        request: MCP JSON-RPC request
        
    Returns:
        MCP JSON-RPC response
        
    Raises:
        ServerNotFoundError: If server is not registered
        ProxyError: If request proxying fails
    """
    try:
        server = await get_server(server_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                server.url,
                json=request,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
            
    except ServerNotFoundError:
        raise  # Re-raise specific exceptions
    except httpx.HTTPStatusError as e:
        raise ProxyError(
            f"HTTP error {e.response.status_code}: {e.response.text}",
            status_code=e.response.status_code,
            server_id=server_id
        ) from e
    except httpx.RequestError as e:
        raise ProxyError(
            f"Request failed: {e}",
            server_id=server_id
        ) from e
    except Exception as e:
        logger.exception(f"Unexpected error proxying to {server_id}")
        raise ProxyError(
            f"Unexpected proxy error: {e}",
            server_id=server_id
        ) from e
```

### **Async/Await Patterns**

#### **Database Operations**
```python
# Good: Async database operations with proper session management
async def create_server(
    server_data: ServerRegistrationRequest,
    session: AsyncSession
) -> MCPServer:
    """Create new MCP server registration.
    
    Args:
        server_data: Server registration data
        session: Async database session
        
    Returns:
        Created server instance
    """
    server = MCPServer(
        name=server_data.name,
        transport=server_data.transport,
        url=server_data.url,
        description=server_data.description
    )
    
    session.add(server)
    await session.commit()
    await session.refresh(server)
    
    return server

# Good: Async query operations
async def list_servers(
    session: AsyncSession,
    tenant_id: Optional[str] = None,
    status: Optional[str] = None
) -> List[MCPServer]:
    """List MCP servers with optional filtering.
    
    Args:
        session: Async database session
        tenant_id: Optional tenant filter
        status: Optional status filter
        
    Returns:
        List of matching servers
    """
    query = select(MCPServer)
    
    if tenant_id:
        query = query.where(MCPServer.tenant_id == tenant_id)
    if status:
        query = query.where(MCPServer.status == status)
        
    result = await session.execute(query)
    return result.scalars().all()
```

#### **HTTP Client Operations**
```python
# Good: Async HTTP operations with proper resource management
async def check_server_health(server: MCPServer) -> bool:
    """Check if MCP server is responsive.
    
    Args:
        server: MCP server to check
        
    Returns:
        True if server is healthy, False otherwise
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{server.url}/health")
            return response.status_code == 200
    except Exception:
        return False

# Good: Batch async operations
async def check_all_servers_health(
    servers: List[MCPServer]
) -> Dict[UUID, bool]:
    """Check health of multiple servers concurrently.
    
    Args:
        servers: List of servers to check
        
    Returns:
        Dictionary mapping server IDs to health status
    """
    async def check_single_server(server: MCPServer) -> tuple[UUID, bool]:
        health = await check_server_health(server)
        return server.id, health
    
    tasks = [check_single_server(server) for server in servers]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    health_status = {}
    for result in results:
        if isinstance(result, Exception):
            logger.warning(f"Health check failed: {result}")
            continue
        server_id, is_healthy = result
        health_status[server_id] = is_healthy
    
    return health_status
```

### **Configuration and Settings**

#### **Pydantic Settings Classes**
```python
# Good: Structured settings with validation
from pydantic import BaseSettings, Field, validator
from typing import Optional, List

class DatabaseSettings(BaseSettings):
    """Database configuration settings."""
    
    postgres_host: str = Field(default="localhost", description="PostgreSQL host")
    postgres_port: int = Field(default=5432, description="PostgreSQL port")
    postgres_user: str = Field(description="PostgreSQL username")
    postgres_password: str = Field(description="PostgreSQL password")
    postgres_db: str = Field(description="PostgreSQL database name")
    postgres_ssl_mode: str = Field(default="prefer", description="SSL mode")
    
    # Connection pool settings
    min_connections: int = Field(default=5, ge=1, description="Minimum pool connections")
    max_connections: int = Field(default=20, ge=1, description="Maximum pool connections")
    pool_timeout: int = Field(default=30, ge=1, description="Connection timeout")
    
    # Development settings
    echo: bool = Field(default=False, description="Log SQL queries")
    
    @validator("max_connections")
    def validate_max_connections(cls, v, values):
        """Ensure max_connections >= min_connections."""
        if "min_connections" in values and v < values["min_connections"]:
            raise ValueError("max_connections must be >= min_connections")
        return v
    
    @property
    def postgres_url(self) -> str:
        """Get PostgreSQL connection URL."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
    
    class Config:
        env_prefix = "MREG_"
        case_sensitive = False
```

## 🧪 **Testing Standards**

### **Test Structure and Naming**

```python
# Good: Descriptive test names and structure
import pytest
from fastapi.testclient import TestClient
from mcp_registry_gateway.db.models import MCPServer

class TestServerRegistration:
    """Test suite for MCP server registration functionality."""
    
    def test_register_server_with_valid_data_creates_server(self, test_client: TestClient):
        """Test that registering with valid data creates a server successfully."""
        # Arrange
        server_data = {
            "name": "test-server",
            "transport": "http",
            "url": "http://localhost:3000",
            "capabilities": ["list_files", "read_file"]
        }
        
        # Act
        response = test_client.post("/api/v1/servers", json=server_data)
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "test-server"
        assert data["status"] == "active"
        assert "id" in data
    
    def test_register_server_with_invalid_url_returns_validation_error(
        self, test_client: TestClient
    ):
        """Test that registering with invalid URL returns validation error."""
        # Arrange
        server_data = {
            "name": "test-server",
            "transport": "http",
            "url": "invalid-url",  # Invalid URL
            "capabilities": ["list_files"]
        }
        
        # Act
        response = test_client.post("/api/v1/servers", json=server_data)
        
        # Assert
        assert response.status_code == 422
        data = response.json()
        assert "validation" in data["error"]["code"].lower()
    
    @pytest.mark.parametrize("transport", ["http", "websocket"])
    def test_register_server_supports_all_transport_types(
        self, test_client: TestClient, transport: str
    ):
        """Test that server registration supports all transport types."""
        # Arrange
        server_data = {
            "name": f"test-{transport}-server",
            "transport": transport,
            "url": f"{transport}://localhost:3000",
            "capabilities": ["test_capability"]
        }
        
        # Act
        response = test_client.post("/api/v1/servers", json=server_data)
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["transport"] == transport
```

### **Fixture Patterns**

```python
# Good: Reusable test fixtures
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine
from mcp_registry_gateway.api.main import create_app
from mcp_registry_gateway.db.models import MCPServer

@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    engine = create_engine(
        "sqlite:///test.db",
        connect_args={"check_same_thread": False}
    )
    yield engine
    engine.dispose()

@pytest.fixture
def test_session(test_engine):
    """Create test database session."""
    with Session(test_engine) as session:
        yield session
        session.rollback()  # Rollback after each test

@pytest.fixture
def test_client(test_session):
    """Create test FastAPI client."""
    app = create_app()
    app.dependency_overrides[get_session] = lambda: test_session
    
    with TestClient(app) as client:
        yield client

@pytest.fixture
def sample_server(test_session) -> MCPServer:
    """Create a sample MCP server for testing."""
    server = MCPServer(
        name="test-server",
        transport="http",
        url="http://localhost:3000",
        status="active"
    )
    test_session.add(server)
    test_session.commit()
    test_session.refresh(server)
    return server
```

## 📈 **Performance Standards**

### **Query Optimization**

```python
# Good: Efficient queries with proper indexing
async def get_servers_by_capability(
    capability: str,
    session: AsyncSession
) -> List[MCPServer]:
    """Get servers that support a specific capability.
    
    Uses optimized query with proper joins and indexing.
    
    Args:
        capability: Capability name to search for
        session: Database session
        
    Returns:
        List of servers supporting the capability
    """
    query = (
        select(MCPServer)
        .join(ServerCapability)
        .where(
            ServerCapability.name == capability,
            MCPServer.status == "active"
        )
        .options(selectinload(MCPServer.capabilities))
    )
    
    result = await session.execute(query)
    return result.scalars().unique().all()

# Bad: N+1 query problem
async def get_servers_by_capability_bad(
    capability: str,
    session: AsyncSession
) -> List[MCPServer]:
    """Bad example with N+1 queries."""
    all_servers = await session.execute(select(MCPServer))
    matching_servers = []
    
    for server in all_servers.scalars():  # N+1 queries here
        capabilities = await session.execute(
            select(ServerCapability).where(
                ServerCapability.server_id == server.id
            )
        )
        if any(cap.name == capability for cap in capabilities.scalars()):
            matching_servers.append(server)
    
    return matching_servers
```

### **Memory Management**

```python
# Good: Streaming large result sets
async def stream_audit_logs(
    session: AsyncSession,
    batch_size: int = 1000
) -> AsyncGenerator[List[AuditLog], None]:
    """Stream audit logs in batches to avoid memory issues.
    
    Args:
        session: Database session
        batch_size: Number of records per batch
        
    Yields:
        Batches of audit log records
    """
    offset = 0
    
    while True:
        query = (
            select(AuditLog)
            .order_by(AuditLog.created_at)
            .offset(offset)
            .limit(batch_size)
        )
        
        result = await session.execute(query)
        batch = result.scalars().all()
        
        if not batch:
            break
            
        yield batch
        offset += batch_size

# Good: Proper resource cleanup
async def process_large_dataset():
    """Process large dataset with proper resource management."""
    async with get_session() as session:
        async for batch in stream_audit_logs(session):
            # Process batch
            await process_batch(batch)
            
            # Explicit cleanup to free memory
            del batch
            await asyncio.sleep(0)  # Allow event loop to process other tasks
```

---

## 📖 **Related Documentation**

- **[Development Workflow](DEVELOPMENT_WORKFLOW.md)** - Code quality workflow and validation
- **[Testing Guide](TESTING_GUIDE.md)** - Testing standards and practices
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Development environment configuration
- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Project configuration standards
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)