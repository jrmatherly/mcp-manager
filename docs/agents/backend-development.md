# Backend Development Guide

## Python/FastAPI Development

**CRITICAL**: Use UV package manager for all Python operations.

### Commands

```bash
# Install dependencies
cd backend
uv sync

# Run development server (unified architecture)
uv run mcp-gateway serve --reload --port 8000

# Run tests
uv run pytest                          # all tests
uv run pytest tests/test_auth.py       # single test file
uv run pytest -k "test_function_name"  # specific test by name
uv run pytest --cov                    # with coverage report
uv run pytest -m unit                  # run unit tests only
uv run pytest -m integration           # run integration tests only

# Code quality checks (ALL must pass before committing)
uv run ruff check .                    # linting
uv run ruff format .                   # formatting
uv run black .                         # alternative formatter
uv run mypy .                          # type checking

# Database operations
uv run alembic upgrade head                          # apply migrations
uv run alembic revision --autogenerate -m "message" # create migration
uv run alembic downgrade -1                          # rollback one migration

# CLI commands
uv run mcp-gateway                     # main CLI
uv run mcp-demo                        # demo mode
```

## Code Style

### Import Conventions
```python
# Standard library imports first
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

# Third-party imports
from fastapi import FastAPI, Depends
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

# Local imports (two blank lines after imports)
from .core.config import get_settings
from .db.models import User


# Your code starts here
```

### Formatting Rules
- Line length: 88 characters (Black/Ruff default)
- Indentation: 4 spaces
- String quotes: Double quotes preferred
- Docstrings: Google style, triple double quotes

### Naming Conventions
- Files/modules: `snake_case.py`
- Classes: `PascalCase` (e.g., `MCPGatewayError`)
- Functions/variables: `snake_case` (e.g., `get_user_data`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_CONNECTIONS`)
- Private methods: `_leading_underscore`
- Environment variables: `PREFIX_VARIABLE_NAME` (e.g., `DB_POSTGRES_HOST`)

### Type Usage Patterns
```python
# Always use type hints
def process_request(
    user_id: str,
    data: dict[str, Any],
    timeout: int = 30
) -> Optional[ResponseModel]:
    ...

# Use Union types with | operator (Python 3.10+)
redis_password: SecretStr | None = Field(default=None)

# Pydantic models for validation
class UserCreate(BaseModel):
    email: EmailStr
    password: SecretStr
    role: Literal["admin", "user", "server_owner"]
```

### Error Handling
```python
# Custom exceptions with meaningful messages
class MCPGatewayError(Exception):
    """Base exception for MCP Gateway errors."""
    pass

# Use try/except with specific exceptions
try:
    result = await process_mcp_request(request)
except ValidationError as e:
    logger.error(f"Validation failed: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except MCPGatewayError as e:
    logger.error(f"Gateway error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

## Testing

### Test File Patterns
- Test files: `test_*.py` or `*_test.py`
- Test location: `backend/tests/` directory
- Test markers: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.slow`

### Testing Conventions
```python
# Test file structure
import pytest
from unittest.mock import Mock, AsyncMock

# Fixtures at top
@pytest.fixture
async def test_client():
    """Create test client with mocked dependencies."""
    ...

# Test functions with descriptive names
async def test_user_creation_with_valid_data():
    """Test that user creation succeeds with valid input."""
    # Arrange
    user_data = {"email": "test@example.com", "password": "secure123"}
    
    # Act
    response = await client.post("/users", json=user_data)
    
    # Assert
    assert response.status_code == 201
    assert response.json()["email"] == user_data["email"]
```

### Coverage Requirements
- Minimum coverage: 80%
- Critical paths: 95%+ coverage
- Exclude: migrations, **init**.py files

## Dependencies and Version Requirements

**Backend:**
- Python: >= 3.10, < 3.13
- FastAPI: >= 0.114.2
- FastMCP: >= 0.4.0
- PostgreSQL: >= 13
- Redis: >= 6
