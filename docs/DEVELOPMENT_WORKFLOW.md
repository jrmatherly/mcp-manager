# Development Workflow - MCP Registry Gateway

This document provides comprehensive development workflow guidance for the MCP Registry Gateway unified architecture, including code quality processes, testing strategies, and daily development patterns.

> **📖 Part of**: [MCP Registry Gateway](../README.md) | **🏠 See Also**: [Development Setup](DEVELOPMENT_SETUP.md)

---

## 🔄 **Daily Development Workflow**

### **Start of Day**

```bash
# 1. Update your local repository
git fetch origin
git pull origin main

# 2. Start backend services
cd backend
docker-compose up -d postgres redis
uv sync  # Update dependencies if needed

# 3. Verify environment
uv run mcp-gateway validate
uv run mcp-gateway healthcheck

# 4. Start development server
uv run mcp-gateway serve --reload --port 8000
```

### **During Development**

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test locally
# ... edit code ...

# Run quality checks frequently
uv run ruff check .
uv run ruff format .
uv run mypy .
uv run pytest tests/

# Test your changes
uv run mcp-demo  # Interactive testing
```

### **Before Committing**

```bash
# Run full quality check suite
uv run ruff format .           # Format code
uv run ruff check . --fix      # Fix linting issues
uv run mypy .                  # Type checking
uv run pytest --cov            # Tests with coverage

# Stage and commit
git add .
git commit -m "feat: descriptive commit message"
```

---

## 🛠️ **Development Commands**

### **Core CLI Commands**

```bash
# Server Management
uv run mcp-gateway serve --reload --port 8000   # Development server with hot reload
uv run mcp-gateway serve --help                 # See all server options

# Configuration & Validation
uv run mcp-gateway config                       # Display current configuration
uv run mcp-gateway config --show-secrets        # Include sensitive values (dev only)
uv run mcp-gateway validate                     # Validate environment setup
uv run mcp-gateway healthcheck                  # Check system health

# Database Operations
uv run mcp-gateway init-db                      # Initialize database
uv run mcp-gateway optimize-db                  # Apply performance optimizations
uv run mcp-gateway setup-enhanced               # Enhanced setup with seed data
uv run mcp-gateway register-server              # Register an MCP server

# Testing & Demo
uv run mcp-demo                                 # Run interactive demo
```

### **Database Migration Commands**

```bash
# Alembic migrations
uv run alembic upgrade head                     # Apply all migrations
uv run alembic downgrade -1                     # Rollback one migration
uv run alembic revision --autogenerate -m "description"  # Generate migration
uv run alembic current                          # Show current migration
uv run alembic history                          # Show migration history
```

### **Code Quality Commands**

```bash
# Formatting
uv run ruff format .                            # Format all code
uv run ruff format src/                         # Format source only
uv run ruff format --check .                    # Check formatting without changes

# Linting
uv run ruff check .                             # Lint all code
uv run ruff check . --fix                       # Auto-fix linting issues
uv run ruff check src/ --select E,W            # Check specific rules

# Type Checking
uv run mypy .                                   # Type check all code
uv run mypy src/                                # Type check source only
uv run mypy --strict src/                       # Strict type checking

# Testing
uv run pytest                                   # Run all tests
uv run pytest --cov                             # With coverage report
uv run pytest -v                                # Verbose output
uv run pytest -x                                # Stop on first failure
uv run pytest tests/test_auth.py               # Run specific file
uv run pytest -k "test_login"                   # Run tests matching pattern
uv run pytest -m unit                           # Run unit tests only
uv run pytest -m integration                    # Run integration tests only
```

---

## 📝 **Code Quality Standards**

### **Python Code Style**

```python
"""Module docstring describing the purpose."""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from fastapi import HTTPException, Depends
from sqlmodel import Session

from mcp_registry_gateway.core.exceptions import ValidationError
from mcp_registry_gateway.db.models import MCPServer


class ServerService:
    """Service for managing MCP servers.
    
    This service provides CRUD operations and business logic
    for MCP server registration and management.
    """
    
    def __init__(self, session: Session):
        """Initialize the server service.
        
        Args:
            session: Database session for operations.
        """
        self.session = session
    
    async def register_server(
        self,
        name: str,
        url: str,
        capabilities: List[str],
        description: Optional[str] = None
    ) -> MCPServer:
        """Register a new MCP server.
        
        Args:
            name: Unique server name.
            url: Server endpoint URL.
            capabilities: List of server capabilities.
            description: Optional server description.
            
        Returns:
            The registered server instance.
            
        Raises:
            ValidationError: If server data is invalid.
            HTTPException: If server already exists.
        """
        # Implementation here
        pass
```

### **Type Hints Requirements**

- **Always Required**: All function parameters and return types
- **Class Attributes**: Type all class attributes
- **Use Modern Syntax**: `str | None` instead of `Optional[str]`
- **Generic Types**: Specify contents (`List[str]`, not just `List`)

### **Docstring Standards**

```python
def process_request(
    request_id: UUID,
    data: Dict[str, Any],
    timeout: int = 30
) -> Dict[str, Any]:
    """Process an incoming MCP request.
    
    Handles request validation, routing, and response formatting
    for MCP protocol compliance.
    
    Args:
        request_id: Unique request identifier.
        data: Request payload following MCP protocol.
        timeout: Maximum processing time in seconds.
        
    Returns:
        Dictionary containing the processed response.
        
    Raises:
        ValidationError: If request format is invalid.
        TimeoutError: If processing exceeds timeout.
        
    Example:
        >>> result = process_request(
        ...     request_id=uuid4(),
        ...     data={"method": "completion", "params": {...}}
        ... )
        >>> print(result["status"])
        'success'
    """
    pass
```

### **Error Handling Patterns**

```python
from mcp_registry_gateway.core.exceptions import (
    MCPGatewayError,
    ValidationError,
    ServerNotFoundError,
    AuthenticationError
)

async def secure_operation(user_id: UUID, resource_id: UUID) -> Any:
    """Perform a secure operation with proper error handling."""
    try:
        # Validate user permissions
        if not await check_permissions(user_id, resource_id):
            raise AuthenticationError("Insufficient permissions")
        
        # Perform operation
        result = await perform_operation(resource_id)
        
        # Log success
        logger.info(f"Operation completed for user {user_id}")
        return result
        
    except ValidationError as e:
        logger.warning(f"Validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except AuthenticationError as e:
        logger.error(f"Auth failed for user {user_id}: {e}")
        raise HTTPException(status_code=403, detail="Forbidden")
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
```

---

## 🔍 **Testing Strategies**

### **Test Organization**

```
backend/tests/
├── unit/                   # Unit tests (isolated components)
│   ├── test_auth.py
│   ├── test_models.py
│   └── test_utils.py
├── integration/            # Integration tests (component interaction)
│   ├── test_api.py
│   ├── test_database.py
│   └── test_mcp.py
├── e2e/                    # End-to-end tests (full workflow)
│   └── test_workflows.py
├── conftest.py            # Shared fixtures
└── test_config.py         # Test configuration
```

### **Test Patterns**

```python
import pytest
from unittest.mock import Mock, AsyncMock
from fastapi.testclient import TestClient

from mcp_registry_gateway.api.main import app


class TestServerAPI:
    """Test suite for server API endpoints."""
    
    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_db(self, monkeypatch):
        """Mock database session."""
        mock = AsyncMock()
        monkeypatch.setattr("mcp_registry_gateway.db.get_session", mock)
        return mock
    
    def test_list_servers(self, client: TestClient):
        """Test server listing endpoint."""
        # Arrange
        expected_servers = [
            {"id": "1", "name": "test-server", "status": "active"}
        ]
        
        # Act
        response = client.get("/api/v1/servers")
        
        # Assert
        assert response.status_code == 200
        assert len(response.json()) > 0
    
    @pytest.mark.asyncio
    async def test_register_server(self, client: TestClient, mock_db):
        """Test server registration with mocked database."""
        # Arrange
        server_data = {
            "name": "new-server",
            "url": "http://localhost:3000",
            "capabilities": ["completion", "tools"]
        }
        
        # Act
        response = client.post("/api/v1/servers", json=server_data)
        
        # Assert
        assert response.status_code == 201
        assert response.json()["name"] == server_data["name"]
```

### **Coverage Requirements**

```bash
# Generate coverage report
uv run pytest --cov=src/mcp_registry_gateway --cov-report=html

# View coverage in browser
open htmlcov/index.html

# Coverage targets:
# - Overall: >= 80%
# - Critical paths: >= 95%
# - New code: >= 90%
```

---

## 🐛 **Debugging Workflow**

### **Debug Configuration**

```bash
# Enable debug logging
export DEBUG=true
export MONITORING_LOG_LEVEL=DEBUG

# Run with verbose output
uv run mcp-gateway serve --reload --log-level debug

# Enable SQL query logging
export DB_POSTGRES_ECHO=true
```

### **Common Debugging Commands**

```bash
# Check current configuration
uv run mcp-gateway config --show-secrets

# Test database connectivity
psql -h localhost -U mcp_user -d mcp_registry -c "SELECT 1;"

# Test Redis connectivity
redis-cli ping

# Check API health
curl http://localhost:8000/health

# Test OAuth flow (if configured)
curl http://localhost:8000/mcp/oauth/login

# View detailed logs
docker-compose logs -f app-dev --tail=100
```

### **Performance Profiling**

```bash
# Profile application startup
time uv run mcp-gateway serve --help

# Profile API endpoints
ab -n 100 -c 10 http://localhost:8000/health

# Monitor resource usage
htop  # While application is running

# Database query analysis
# Add to .env: DB_POSTGRES_ECHO=true
# Check logs for slow queries
```

---

## 🚀 **Deployment Preparation**

### **Pre-deployment Checklist**

```bash
# 1. Code Quality
uv run ruff format .
uv run ruff check . --fix
uv run mypy . --strict
uv run pytest --cov

# 2. Security Audit
uv run pip-audit  # Check for vulnerable dependencies
uv run bandit -r src/  # Security linting

# 3. Performance Check
uv run pytest tests/performance/ --benchmark-only

# 4. Documentation
# Update API docs
# Update README.md
# Update CHANGELOG.md

# 5. Environment Variables
uv run mcp-gateway validate  # Validate configuration

# 6. Database Migrations
uv run alembic upgrade head  # Ensure migrations are current

# 7. Build Docker Image
docker build -t mcp-gateway:latest .
docker run --rm mcp-gateway:latest mcp-gateway healthcheck
```

### **Release Process**

```bash
# 1. Create release branch
git checkout -b release/v1.0.0

# 2. Update version
# Edit pyproject.toml version
# Edit APP_VERSION in .env.example

# 3. Generate changelog
git log --oneline --decorate > CHANGELOG.md

# 4. Commit release
git add .
git commit -m "chore: prepare release v1.0.0"

# 5. Tag release
git tag -a v1.0.0 -m "Release version 1.0.0"

# 6. Push to repository
git push origin release/v1.0.0
git push origin v1.0.0
```

---

## 🔧 **Advanced Workflows**

### **Feature Development Pattern**

```bash
# 1. Create feature branch
git checkout -b feature/oauth-improvements

# 2. Set up development environment
cd backend
docker-compose up -d postgres redis
uv sync --all-groups

# 3. Run tests to ensure clean start
uv run pytest

# 4. Implement feature
# ... make changes ...

# 5. Test incrementally
uv run pytest tests/unit/test_your_feature.py
uv run mcp-demo  # Manual testing

# 6. Full validation
uv run ruff format .
uv run ruff check . --fix
uv run mypy .
uv run pytest --cov

# 7. Commit with conventional commits
git add .
git commit -m "feat(auth): add refresh token rotation"

# 8. Push and create PR
git push origin feature/oauth-improvements
# Create PR on GitHub
```

### **Hotfix Workflow**

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-auth-fix

# 2. Implement fix
# ... fix the issue ...

# 3. Test thoroughly
uv run pytest tests/ -x  # Stop on first failure
uv run mcp-gateway healthcheck

# 4. Commit and push
git add .
git commit -m "fix(auth): resolve token validation bypass"
git push origin hotfix/critical-auth-fix

# 5. Create PR with urgency label
```

### **Database Schema Evolution**

```bash
# 1. Modify models
# Edit src/mcp_registry_gateway/db/models.py

# 2. Generate migration
uv run alembic revision --autogenerate -m "add user preferences table"

# 3. Review generated migration
# Check alembic/versions/xxx_add_user_preferences_table.py

# 4. Test migration
uv run alembic upgrade head
uv run alembic downgrade -1
uv run alembic upgrade head

# 5. Update seed data if needed
# Edit src/mcp_registry_gateway/db/seed.py

# 6. Test with fresh database
docker-compose down -v
docker-compose up -d postgres
uv run mcp-gateway init-db
uv run mcp-gateway setup-enhanced
```

---

## 📚 **Additional Resources**

### **Project Documentation**
- [Development Setup](DEVELOPMENT_SETUP.md) - Environment setup guide
- [API Documentation](http://localhost:8000/docs) - Interactive OpenAPI docs
- [MCP Protocol Docs](http://localhost:8000/mcp/docs) - MCP-specific endpoints

### **External Resources**
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [FastMCP Documentation](https://github.com/punkpeye/fastmcp)
- [UV Package Manager](https://github.com/astral-sh/uv)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com/)

---

**Last Updated**: 2025-01-12  
**Project**: [MCP Registry Gateway](https://github.com/jrmatherly/mcp-manager)