# Development Workflow - MCP Registry Gateway

This document provides comprehensive development workflow guidance, including code quality processes, validation scripts, and CLI commands for the MCP Registry Gateway.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## 🔄 **Development Workflow**

### **Validated Development Scripts**
All development scripts have been validated and are working correctly:

```bash
# One-command project setup (updated and working)
./scripts/setup.sh

# Code quality workflow (all scripts validated)
./scripts/format.sh     # Ruff formatting - ✅ Working
./scripts/lint.sh       # Ruff + MyPy linting - ✅ Working (159 MyPy warnings, non-blocking)
./scripts/test.sh       # Pytest with coverage - ✅ Working (9% coverage with infrastructure ready)

# Combined quality check
./scripts/format.sh && ./scripts/lint.sh && ./scripts/test.sh
```

### **CLI Commands (All Validated)**
```bash
# Main gateway commands
uv run mcp-gateway serve        # Start unified server (FastAPI + FastMCP with Azure OAuth)
uv run mcp-gateway config       # Show configuration
uv run mcp-gateway healthcheck  # System health check
uv run mcp-gateway demo         # Run comprehensive demo
uv run mcp-gateway validate     # Validate environment variables and configuration

# Legacy compatibility (redirects to unified serve command)
uv run mcp-gateway fastmcp      # LEGACY: Use 'serve' command for unified architecture

# Database management
uv run mcp-gateway init-db      # Initialize database
uv run mcp-gateway optimize-db  # Database performance optimization with indexes
uv run mcp-gateway setup-enhanced  # Enhanced database setup with performance optimization
uv run mcp-gateway register-server  # Register MCP server

# Standalone commands  
uv run mcp-demo                 # Alternative demo command
```

## 🛠️ **Development Tools and Scripts**

### **Setup and Initialization**

#### **Automated Project Setup**
```bash
# Complete project initialization
./scripts/setup.sh

# What the setup script does:
# 1. Install UV package manager
# 2. Install all project dependencies
# 3. Install development tools globally
# 4. Setup environment configuration
# 5. Start Docker services (PostgreSQL, Redis)
# 6. Initialize database with optimal performance
# 7. Validate configuration
# 8. Run health checks
```

#### **Manual Setup Steps**
```bash
# If automated setup fails, run manually:

# 1. Install dependencies
uv sync --all-groups

# 2. Install development tools
uv tool install ruff
uv tool install mypy
uv tool install pytest
uv tool install coverage

# 3. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start services
docker-compose up -d postgres redis

# 5. Initialize database
uv run mcp-gateway init-db

# 6. Validate setup
uv run mcp-gateway validate
uv run mcp-gateway healthcheck
```

### **Code Quality Workflow**

#### **Formatting with Ruff**
```bash
# Automatic code formatting
./scripts/format.sh

# Manual formatting commands
uv tool run ruff format src/          # Format source code
uv tool run ruff format tests/        # Format test code
uv tool run ruff check src/ --fix     # Auto-fix linting issues

# Check formatting without changes
uv tool run ruff format src/ --check
```

#### **Linting and Type Checking**
```bash
# Combined linting and type checking
./scripts/lint.sh

# Individual commands
uv tool run ruff check src/           # Code quality checks
uv tool run mypy src/                 # Static type analysis

# Specific linting rules
uv tool run ruff check src/ --select E  # Error checks only
uv tool run ruff check src/ --select W  # Warning checks only
uv tool run ruff check src/ --select F  # Pyflakes checks
```

#### **Testing and Coverage**
```bash
# Run all tests with coverage
./scripts/test.sh

# Specific test commands
uv run pytest tests/ -v               # Verbose test output
uv run pytest tests/ -x               # Stop on first failure
uv run pytest tests/ -k "test_name"   # Run specific tests
uv run pytest tests/ --lf             # Run last failed tests

# Coverage analysis
uv run pytest --cov=src/mcp_registry_gateway
uv run coverage html                  # Generate HTML coverage report
uv run coverage report               # Terminal coverage report
```

### **Development Lifecycle**

#### **Daily Development Workflow**
```bash
# 1. Start development session
git status                            # Check repository status
git pull origin main                  # Get latest changes
uv sync                               # Update dependencies
docker-compose up -d postgres redis  # Start services

# 2. Development work
# Make code changes...

# 3. Quality checks before commit
./scripts/format.sh                  # Format code
./scripts/lint.sh                    # Check code quality
./scripts/test.sh                    # Run tests

# 4. Commit changes
git add .
git commit -m "feat: description of changes"
git push origin feature-branch
```

#### **Feature Development Workflow**
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Implement feature
# Write code, tests, documentation...

# 3. Validate implementation
uv run mcp-gateway validate          # Configuration validation
uv run mcp-gateway demo              # Functional testing
./scripts/format.sh && ./scripts/lint.sh && ./scripts/test.sh

# 4. Create pull request
git push origin feature/new-feature
# Create PR on GitHub
```

#### **Bug Fix Workflow**
```bash
# 1. Reproduce issue
uv run mcp-gateway healthcheck       # System health check
uv run mcp-gateway config --show-secrets  # Configuration review

# 2. Debug with enhanced logging
MREG_DEBUG=true MREG_LOG_LEVEL=DEBUG uv run mcp-gateway serve

# 3. Implement fix
# Fix code and add tests...

# 4. Verify fix
./scripts/test.sh                    # Regression testing
uv run mcp-gateway demo              # Functional verification
```

## 📝 **Code Quality Standards**

### **Code Formatting and Style**

#### **Ruff Configuration**
```toml
# pyproject.toml - Ruff settings
[tool.ruff]
line-length = 88
target-version = "py310"

[tool.ruff.lint]
select = [
    "E",  # pycodestyle errors
    "W",  # pycodestyle warnings
    "F",  # Pyflakes
    "I",  # isort
    "B",  # flake8-bugbear
    "C4", # flake8-comprehensions
    "UP", # pyupgrade
]
ignore = [
    "E501",  # line too long (handled by formatter)
    "B008",  # do not perform function calls in argument defaults
]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
line-ending = "auto"
```

#### **MyPy Configuration**
```toml
# pyproject.toml - MyPy settings
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

# Module-specific settings
[[tool.mypy.overrides]]
module = ["tests.*"]
disallow_untyped_defs = false
```

### **Code Quality Requirements**

#### **Type Hints**
```python
# Required for all public functions and classes
from typing import Optional, List, Dict, Any
from uuid import UUID

def register_server(
    name: str,
    transport: str,
    url: str,
    capabilities: List[str],
    description: Optional[str] = None
) -> Dict[str, Any]:
    """Register a new MCP server.
    
    Args:
        name: Server name
        transport: Transport protocol (http, websocket)
        url: Server URL
        capabilities: List of server capabilities
        description: Optional server description
        
    Returns:
        Dictionary containing server registration details
        
    Raises:
        ValidationError: If server data is invalid
    """
    pass
```

#### **Docstring Standards**
```python
# Google-style docstrings required for public APIs
class MCPServer:
    """Model representing an MCP server registration.
    
    The MCPServer class provides the core data model for server
    registration and management within the MCP Registry Gateway.
    
    Attributes:
        id: Unique server identifier
        name: Human-readable server name
        transport: Communication transport (http, websocket)
        url: Server endpoint URL
        status: Current server status (active, inactive, error)
        capabilities: List of server capabilities
        
    Example:
        >>> server = MCPServer(
        ...     name="file-server",
        ...     transport="http",
        ...     url="http://localhost:3000"
        ... )
        >>> server.status
        'active'
    """
```

#### **Error Handling Standards**
```python
# Use custom exceptions from core.exceptions
from mcp_registry_gateway.core.exceptions import (
    ValidationError,
    ServerNotFoundError,
    ProxyError
)

async def proxy_request(server_id: UUID, request: Dict[str, Any]) -> Dict[str, Any]:
    """Proxy request to MCP server.
    
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
        if not server:
            raise ServerNotFoundError(f"Server {server_id} not found")
            
        response = await send_request(server, request)
        return response
        
    except Exception as e:
        raise ProxyError(f"Failed to proxy request: {e}") from e
```

### **Database and Model Standards**

#### **SQLModel Patterns**
```python
# Use SQLModel for database models
from sqlmodel import SQLModel, Field, Relationship
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional, List

class MCPServerBase(SQLModel):
    """Base MCP server model."""
    name: str = Field(index=True, description="Server name")
    transport: str = Field(description="Transport protocol")
    url: str = Field(description="Server URL")
    description: Optional[str] = Field(default=None, description="Server description")

class MCPServer(MCPServerBase, table=True):
    """MCP server database model."""
    __tablename__ = "mcp_servers"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    status: str = Field(default="active", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    capabilities: List["ServerCapability"] = Relationship(back_populates="server")
```

#### **Database Naming Conventions**
```python
# Table names: snake_case plural
__tablename__ = "mcp_servers"
__tablename__ = "server_capabilities"
__tablename__ = "audit_logs"

# Column names: snake_case descriptive
server_id: UUID = Field(foreign_key="mcp_servers.id")
created_at: datetime = Field(default_factory=datetime.utcnow)
updated_at: datetime = Field(default_factory=datetime.utcnow)

# Index names: descriptive with prefix
class MCPServer(SQLModel, table=True):
    name: str = Field(index=True)  # Creates idx_mcp_servers_name
    status: str = Field(index=True)  # Creates idx_mcp_servers_status
```

## 🔍 **Development Debugging**

### **Debug Configuration**

#### **Environment Variables**
```bash
# Debug mode configuration
MREG_DEBUG=true                      # Enable debug mode
MREG_LOG_LEVEL=DEBUG                 # Verbose logging
MREG_POSTGRES_ECHO=true              # Log SQL queries

# Development-specific settings
MREG_FASTMCP_ENABLE_ERROR_DETAILS=true  # Detailed error messages
MREG_SECURITY_ENABLE_CORS=true          # Relaxed CORS for development
MREG_CIRCUIT_BREAKER_ENABLED=false      # Disable circuit breaker for debugging
```

#### **Debug Logging**
```python
# Enhanced logging for development
import logging
from mcp_registry_gateway.core.config import get_settings

settings = get_settings()
if settings.debug:
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("debug.log")
        ]
    )
    
    # Enable SQL query logging
    logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
```

### **Development Utilities**

#### **Configuration Inspection**
```bash
# Inspect current configuration
uv run mcp-gateway config                    # Show config (secrets hidden)
uv run mcp-gateway config --show-secrets     # Show config with secrets
uv run mcp-gateway validate                  # Validate configuration

# Test specific components
uv run mcp-gateway healthcheck               # Overall health
uv run mcp-gateway healthcheck --timeout 30  # Extended health check
```

#### **Database Inspection**
```bash
# Database utilities
psql -h localhost -U mcp_user -d mcp_registry  # Direct database access

# Check database performance
uv run mcp-gateway optimize-db --dry-run      # Show optimization plan
uv run mcp-gateway optimize-db                # Apply optimizations

# Database migration management
uv run alembic current                        # Current migration
uv run alembic history                        # Migration history
uv run alembic upgrade head                   # Apply migrations
```

#### **Server Testing**
```bash
# Test unified server setup
uv run mcp-gateway serve --port 8000 &       # Unified server in background

# Test endpoints
curl -X GET http://localhost:8000/health      # Server health
curl -X GET http://localhost:8000/oauth/login # OAuth endpoint
curl -X GET http://localhost:8000/api/v1/servers  # Server listing

# Cleanup background processes
killall python  # Or use specific PIDs
```

## 🚀 **Performance Optimization**

### **Development Performance**

#### **Fast Development Server**
```bash
# Use reload for fast development
uv run mcp-gateway serve --reload            # Auto-reload on changes
MREG_SERVICE_RELOAD=true uv run mcp-gateway serve  # Via environment

# Reduce startup time
MREG_POSTGRES_MIN_CONNECTIONS=1              # Minimal connection pool
MREG_REDIS_MIN_CONNECTIONS=1                 # Minimal Redis connections
MREG_HEALTH_CHECK_INTERVAL=60                # Longer health check interval
```

#### **Database Performance**
```bash
# Apply performance optimizations
uv run mcp-gateway optimize-db               # Add indexes and constraints

# Monitor query performance
MREG_POSTGRES_ECHO=true                      # Log queries in development

# Database connection optimization
MREG_POSTGRES_MAX_CONNECTIONS=10             # Limit connections in dev
MREG_POSTGRES_POOL_TIMEOUT=30                # Connection timeout
```

### **Code Performance**

#### **Profiling Commands**
```bash
# Profile application startup
time uv run mcp-gateway serve --help

# Profile specific operations
time uv run mcp-gateway demo
time uv run mcp-gateway healthcheck

# Memory usage monitoring
/usr/bin/time -v uv run mcp-gateway demo
```

#### **Performance Testing**
```bash
# Benchmark with pytest-benchmark
uv run pytest tests/performance/ --benchmark-only

# Load testing with basic tools
ab -n 100 -c 10 http://localhost:8000/health
curl -w "@curl-format.txt" http://localhost:8000/health
```

---

## 📖 **Related Documentation**

- **[Development Setup](DEVELOPMENT_SETUP.md)** - Environment setup and package management
- **[Testing Guide](TESTING_GUIDE.md)** - Testing strategies and commands
- **[Code Standards](CODE_STANDARDS.md)** - Detailed code style requirements
- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Environment configuration
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)