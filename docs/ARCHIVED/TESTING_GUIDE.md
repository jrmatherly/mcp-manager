# Testing Guide - MCP Registry Gateway

This document provides comprehensive testing strategies, commands, and validation procedures for the MCP Registry Gateway.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## 🧪 **Testing**

### **Test Structure**
- **Unit Tests**: Individual component testing (not implemented yet)  
- **Integration Tests**: Service-to-service communication (not implemented yet)  
- **Demo Scripts**: `examples/demo_gateway.py` - Comprehensive functionality demonstration

### **Test Commands**
```bash
# Run all tests with coverage (validated working)
./scripts/test.sh

# Run tests directly with project dependencies
uv run pytest tests/ -v
uv run pytest --cov=src/mcp_registry_gateway
uv run pytest -m unit           # Unit tests only (when implemented)
uv run pytest -m integration    # Integration tests only (when implemented)

# Coverage reporting
uv run coverage html            # Generate HTML report
uv run coverage report          # Terminal report
```

### **Demo Testing (Multiple Options)**
```bash
# Option 1: Using standalone demo command
uv run mcp-demo

# Option 2: Using main CLI demo command
uv run mcp-gateway demo

# Option 3: Direct script execution (DEPRECATED - use CLI commands above)
uv run python examples/demo_gateway.py

# Test endpoints (dual-server architecture)
curl -X GET http://localhost:8000/health   # FastAPI health
curl -X GET http://localhost:8001/health   # FastMCP health
curl -X GET http://localhost:8000/api/v1/servers  # Server listing
```

## 🔧 **Testing Infrastructure**

### **Test Framework Setup**

#### **Pytest Configuration**
```toml
# pyproject.toml
[tool.pytest.ini_options]
minversion = "6.0"
addopts = "-ra -q --strict-markers"
testpaths = ["tests"]
markers = [
    "unit: Unit tests",
    "integration: Integration tests",
    "e2e: End-to-end tests",
    "slow: Slow running tests",
    "auth: Authentication-related tests",
    "database: Database-dependent tests"
]
```

#### **Test Directory Structure**
```
tests/
├── unit/                    # Unit tests
│   ├── test_config.py       # Configuration tests
│   ├── test_models.py       # Database model tests
│   ├── test_auth.py         # Authentication tests
│   └── test_utils.py        # Utility function tests
├── integration/             # Integration tests
│   ├── test_api.py          # API endpoint tests
│   ├── test_proxy.py        # Proxy functionality tests
│   └── test_fastmcp.py      # FastMCP server tests
├── e2e/                     # End-to-end tests
│   ├── test_workflows.py    # Complete workflow tests
│   └── test_auth_flow.py    # OAuth authentication flow tests
├── fixtures/                # Test fixtures and data
│   ├── conftest.py          # Pytest configuration and fixtures
│   └── test_data.py         # Test data and factories
└── requirements.txt         # Test-specific dependencies
```

### **Test Configuration**

#### **Test Environment Setup**
```bash
# Test environment variables
MREG_ENVIRONMENT=testing
MREG_DEBUG=false
MREG_LOG_LEVEL=WARNING

# Test Database (isolated from development)
MREG_POSTGRES_HOST=localhost
MREG_POSTGRES_DB=mcp_registry_test
MREG_POSTGRES_USER=mcp_test_user
MREG_POSTGRES_PASSWORD=mcp_test_password

# Test Redis (separate database)
MREG_REDIS_URL=redis://localhost:6379/1

# Disable features that interfere with testing
MREG_FASTMCP_ENABLE_RATE_LIMITING=false
MREG_CIRCUIT_BREAKER_ENABLED=false
MREG_METRICS_ENABLED=false

# Test Azure OAuth (use test application)
MREG_AZURE_TENANT_ID=test-tenant-id
MREG_AZURE_CLIENT_ID=test-client-id
MREG_AZURE_CLIENT_SECRET=test-client-secret
```

#### **Test Fixtures**
```python
# tests/fixtures/conftest.py
import pytest
from fastapi.testclient import TestClient
from mcp_registry_gateway.api.main import create_app
from mcp_registry_gateway.core.config import get_settings

@pytest.fixture
def test_app():
    """Create test FastAPI application."""
    settings = get_settings()
    app = create_app(settings)
    return app

@pytest.fixture
def test_client(test_app):
    """Create test client."""
    with TestClient(test_app) as client:
        yield client

@pytest.fixture
def test_db():
    """Create test database session."""
    # Setup test database
    yield db_session
    # Cleanup test database

@pytest.fixture
def mock_azure_oauth():
    """Mock Azure OAuth for testing."""
    with patch('mcp_registry_gateway.auth.azure_oauth.AzureOAuthManager') as mock:
        yield mock
```

## 🤖 **Unit Testing**

### **Configuration Tests**
```python
# tests/unit/test_config.py
import pytest
from mcp_registry_gateway.core.config import Settings, DatabaseSettings

def test_database_settings_validation():
    """Test database configuration validation."""
    # Valid configuration
    db_settings = DatabaseSettings(
        postgres_host="localhost",
        postgres_user="test_user",
        postgres_password="test_password",
        postgres_db="test_db"
    )
    assert db_settings.postgres_url == "postgresql+asyncpg://test_user:test_password@localhost:5432/test_db"

def test_settings_environment_loading():
    """Test settings loading from environment."""
    import os
    os.environ["MREG_POSTGRES_HOST"] = "test-host"
    settings = Settings()
    assert settings.database.postgres_host == "test-host"
```

### **Model Tests**
```python
# tests/unit/test_models.py
import pytest
from uuid import uuid4
from mcp_registry_gateway.db.models import MCPServer, ServerCapability

def test_mcp_server_creation():
    """Test MCP server model creation."""
    server = MCPServer(
        name="test-server",
        transport="http",
        url="http://localhost:3000",
        status="active"
    )
    assert server.name == "test-server"
    assert server.transport == "http"
    assert server.status == "active"

def test_server_capability_relationship():
    """Test server-capability relationship."""
    server = MCPServer(name="test-server", transport="http", url="http://localhost:3000")
    capability = ServerCapability(name="list_files", server=server)
    assert capability.server == server
    assert capability.name == "list_files"
```

### **Authentication Tests**
```python
# tests/unit/test_auth.py
import pytest
from unittest.mock import Mock, patch
from mcp_registry_gateway.auth.context import UserContext, AuthContext
from mcp_registry_gateway.auth.utils import check_user_role

def test_user_context_creation():
    """Test user context creation."""
    user_context = UserContext(
        user_id="test@example.com",
        name="Test User",
        roles=["user"],
        tenant_id="test-tenant"
    )
    assert user_context.user_id == "test@example.com"
    assert "user" in user_context.roles
    assert user_context.tenant_id == "test-tenant"

def test_role_checking():
    """Test role-based access control."""
    user_context = UserContext(
        user_id="admin@example.com",
        name="Admin User",
        roles=["admin"],
        tenant_id="test-tenant"
    )
    
    # Admin should have admin access
    assert check_user_role(user_context, "admin") == True
    
    # Admin should also have user access
    assert check_user_role(user_context, "user") == True
    
    # Admin should not have server_owner access (different role)
    assert check_user_role(user_context, "server_owner") == False
```

## 🔗 **Integration Testing**

### **API Endpoint Tests**
```python
# tests/integration/test_api.py
import pytest
from fastapi.testclient import TestClient

@pytest.mark.integration
def test_health_endpoint(test_client: TestClient):
    """Test health check endpoint."""
    response = test_client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "components" in data

@pytest.mark.integration
def test_server_registration(test_client: TestClient):
    """Test server registration endpoint."""
    server_data = {
        "name": "test-server",
        "transport": "http",
        "url": "http://localhost:3000",
        "capabilities": ["list_files", "read_file"]
    }
    
    response = test_client.post("/api/v1/servers", json=server_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["name"] == "test-server"
    assert "id" in data
    assert data["status"] == "active"

@pytest.mark.integration
def test_server_listing(test_client: TestClient):
    """Test server listing endpoint."""
    # First register a server
    server_data = {
        "name": "list-test-server",
        "transport": "http",
        "url": "http://localhost:3001",
        "capabilities": ["search"]
    }
    test_client.post("/api/v1/servers", json=server_data)
    
    # Then list servers
    response = test_client.get("/api/v1/servers")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(server["name"] == "list-test-server" for server in data)
```

### **FastMCP Server Tests**
```python
# tests/integration/test_fastmcp.py
import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from mcp_registry_gateway.fastmcp_server import create_fastmcp_server

@pytest.mark.integration
@pytest.mark.auth
async def test_fastmcp_authentication():
    """Test FastMCP server authentication."""
    with patch('mcp_registry_gateway.auth.azure_oauth.AzureOAuthManager') as mock_oauth:
        mock_oauth.return_value.validate_token = AsyncMock(return_value={
            "user_id": "test@example.com",
            "name": "Test User",
            "roles": ["user"]
        })
        
        server = create_fastmcp_server()
        
        # Test authenticated request
        request = {
            "jsonrpc": "2.0",
            "id": "1",
            "method": "tools/call",
            "params": {
                "name": "list_servers",
                "arguments": {}
            }
        }
        
        # This would be an actual FastMCP protocol test
        # Implementation depends on FastMCP testing framework
```

## 🌍 **End-to-End Testing**

### **Complete Workflow Tests**
```python
# tests/e2e/test_workflows.py
import pytest
import requests
import time
from concurrent.futures import ThreadPoolExecutor

@pytest.mark.e2e
@pytest.mark.slow
def test_complete_server_lifecycle():
    """Test complete server registration and usage workflow."""
    base_url = "http://localhost:8000"
    
    # 1. Register a server
    server_data = {
        "name": "e2e-test-server",
        "transport": "http",
        "url": "http://localhost:3000",
        "capabilities": ["list_files", "read_file"]
    }
    
    register_response = requests.post(
        f"{base_url}/api/v1/servers",
        json=server_data
    )
    assert register_response.status_code == 201
    server_id = register_response.json()["id"]
    
    # 2. Verify server appears in listing
    list_response = requests.get(f"{base_url}/api/v1/servers")
    assert list_response.status_code == 200
    servers = list_response.json()
    assert any(server["id"] == server_id for server in servers)
    
    # 3. Test service discovery
    discovery_response = requests.get(
        f"{base_url}/api/v1/discovery/tools?tools=list_files"
    )
    assert discovery_response.status_code == 200
    discovered_servers = discovery_response.json()
    assert any(server["id"] == server_id for server in discovered_servers)
    
    # 4. Test health monitoring
    health_response = requests.get(f"{base_url}/health")
    assert health_response.status_code == 200
    health_data = health_response.json()
    assert health_data["status"] == "healthy"
    
    # 5. Cleanup - unregister server
    delete_response = requests.delete(f"{base_url}/api/v1/servers/{server_id}")
    assert delete_response.status_code == 204

@pytest.mark.e2e
@pytest.mark.slow
def test_load_balancer_behavior():
    """Test load balancer distributes requests across servers."""
    base_url = "http://localhost:8000"
    
    # Register multiple servers
    server_ids = []
    for i in range(3):
        server_data = {
            "name": f"lb-test-server-{i}",
            "transport": "http",
            "url": f"http://localhost:{3000 + i}",
            "capabilities": ["test_tool"]
        }
        response = requests.post(f"{base_url}/api/v1/servers", json=server_data)
        server_ids.append(response.json()["id"])
    
    # Test multiple proxy requests to verify load balancing
    # This would require mock servers or real test servers
    
    # Cleanup
    for server_id in server_ids:
        requests.delete(f"{base_url}/api/v1/servers/{server_id}")
```

### **Authentication Flow Tests**
```python
# tests/e2e/test_auth_flow.py
import pytest
import requests
from unittest.mock import patch

@pytest.mark.e2e
@pytest.mark.auth
def test_oauth_authentication_flow():
    """Test complete OAuth authentication flow."""
    fastmcp_url = "http://localhost:8001"
    
    # 1. Test unauthenticated access (should redirect to login)
    response = requests.get(f"{fastmcp_url}/oauth/userinfo", allow_redirects=False)
    assert response.status_code in [401, 302]  # Unauthorized or redirect
    
    # 2. Test login endpoint
    login_response = requests.get(f"{fastmcp_url}/oauth/login", allow_redirects=False)
    assert login_response.status_code == 302  # Redirect to Azure
    assert "login.microsoftonline.com" in login_response.headers["Location"]
    
    # 3. Test callback handling (would require mocking Azure response)
    # This is typically tested with mock Azure OAuth responses
    
    # 4. Test authenticated requests
    # This would require actual OAuth tokens or mocked authentication
```

## 📋 **Testing Strategies**

### **Test Data Management**

#### **Database Test Setup**
```python
# tests/fixtures/test_data.py
import factory
from mcp_registry_gateway.db.models import MCPServer, ServerCapability

class MCPServerFactory(factory.Factory):
    """Factory for creating test MCP servers."""
    class Meta:
        model = MCPServer
    
    name = factory.Sequence(lambda n: f"test-server-{n}")
    transport = "http"
    url = factory.Sequence(lambda n: f"http://localhost:{3000 + n}")
    status = "active"
    description = factory.Faker("text", max_nb_chars=200)

class ServerCapabilityFactory(factory.Factory):
    """Factory for creating test server capabilities."""
    class Meta:
        model = ServerCapability
    
    name = factory.Faker("word")
    capability_type = "tool"
    server = factory.SubFactory(MCPServerFactory)
```

#### **Test Database Migration**
```bash
# Test database setup script
#!/bin/bash
# tests/setup_test_db.sh

export MREG_ENVIRONMENT=testing
export MREG_POSTGRES_DB=mcp_registry_test

# Create test database
psql -h localhost -U postgres -c "CREATE DATABASE mcp_registry_test;"

# Run migrations
uv run alembic upgrade head

echo "Test database setup complete"
```

### **Mock Strategies**

#### **External Service Mocking**
```python
# tests/fixtures/mocks.py
import pytest
from unittest.mock import Mock, AsyncMock, patch

@pytest.fixture
def mock_external_mcp_server():
    """Mock external MCP server responses."""
    mock_server = Mock()
    mock_server.call_tool = AsyncMock(return_value={
        "content": [{"type": "text", "text": "Mock response"}]
    })
    return mock_server

@pytest.fixture
def mock_azure_oauth():
    """Mock Azure OAuth provider."""
    with patch('mcp_registry_gateway.auth.azure_oauth.AzureOAuthManager') as mock:
        mock_instance = mock.return_value
        mock_instance.get_authorization_url = Mock(return_value="https://login.microsoftonline.com/oauth/authorize")
        mock_instance.exchange_code_for_token = AsyncMock(return_value={
            "access_token": "mock_access_token",
            "refresh_token": "mock_refresh_token",
            "user_info": {
                "user_id": "test@example.com",
                "name": "Test User"
            }
        })
        yield mock_instance
```

### **Performance Testing**

#### **Load Testing with pytest-benchmark**
```python
# tests/performance/test_load.py
import pytest
from fastapi.testclient import TestClient

@pytest.mark.benchmark
def test_health_endpoint_performance(test_client: TestClient, benchmark):
    """Benchmark health endpoint performance."""
    def make_health_request():
        response = test_client.get("/health")
        return response
    
    result = benchmark(make_health_request)
    assert result.status_code == 200

@pytest.mark.benchmark
def test_server_listing_performance(test_client: TestClient, benchmark):
    """Benchmark server listing performance."""
    # Setup test servers
    for i in range(10):
        server_data = {
            "name": f"perf-test-server-{i}",
            "transport": "http",
            "url": f"http://localhost:{3000 + i}",
            "capabilities": ["test_tool"]
        }
        test_client.post("/api/v1/servers", json=server_data)
    
    def list_servers():
        response = test_client.get("/api/v1/servers")
        return response
    
    result = benchmark(list_servers)
    assert result.status_code == 200
    assert len(result.json()) >= 10
```

## 📈 **Test Reporting and Metrics**

### **Coverage Reporting**
```bash
# Generate comprehensive coverage report
uv run pytest --cov=src/mcp_registry_gateway --cov-report=html --cov-report=term

# Coverage with branch coverage
uv run pytest --cov=src/mcp_registry_gateway --cov-branch --cov-report=html

# Coverage for specific modules
uv run pytest --cov=src/mcp_registry_gateway.auth --cov-report=term
```

### **Test Report Generation**
```bash
# Generate JUnit XML report
uv run pytest --junitxml=reports/junit.xml

# Generate HTML test report
uv run pytest --html=reports/report.html --self-contained-html

# Generate JSON report
uv run pytest --json-report --json-report-file=reports/report.json
```

### **Continuous Integration**
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Install uv
      uses: astral-sh/setup-uv@v1
    
    - name: Set up Python
      run: uv python install 3.11
    
    - name: Install dependencies
      run: uv sync --all-groups
    
    - name: Setup test database
      run: |
        MREG_POSTGRES_HOST=localhost MREG_POSTGRES_PASSWORD=postgres ./tests/setup_test_db.sh
    
    - name: Run tests
      run: uv run pytest --cov=src/mcp_registry_gateway --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
```

---

## 📖 **Related Documentation**

- **[Development Workflow](DEVELOPMENT_WORKFLOW.md)** - Code quality and testing workflow
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Environment setup for testing
- **[API Reference](API_REFERENCE.md)** - API endpoints for testing
- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Test environment configuration
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)