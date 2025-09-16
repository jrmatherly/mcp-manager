# Python Style Guide

## Context

Python development conventions for the MCP Registry Gateway backend using FastAPI, with emphasis on type safety, async patterns, and modern Python features.

## Python Version and Tools

### Environment Setup
```bash
# Use UV package manager (NEVER pip or poetry)
uv sync              # Install dependencies
uv add package       # Add new package
uv run pytest        # Run tests
uv run mypy .        # Type checking
uv run ruff check .  # Linting
```

### Python Version
- **Minimum**: Python 3.10
- **Recommended**: Python 3.11+
- **Features**: Use modern syntax (match/case, union types, walrus operator)

## Code Formatting

### Black Configuration
```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ["py310"]
include = '\.pyi?$'
```

### Ruff Configuration
```toml
[tool.ruff]
line-length = 88
target-version = "py310"
select = ["E", "F", "I", "N", "W", "UP", "B", "C4", "DTZ", "T10", "ISC", "PIE", "PYI", "RSE", "RET", "SIM", "TID", "TCH", "ARG", "PL"]
ignore = ["E501"]  # Line length handled by Black
```

## Type Hints

### Modern Type Syntax
```python
# Python 3.10+ union syntax (preferred)
from typing import Any

def process_data(value: str | None = None) -> dict[str, Any]:
    return {"value": value}

# Optional for single None union
from typing import Optional
def get_user(id: str) -> Optional[User]:  # Same as User | None
    pass

# List and Dict types (3.9+)
def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}
```

### Complex Types
```python
from typing import TypeAlias, TypeVar, Generic, Protocol

# Type aliases
UserId: TypeAlias = int
UserData: TypeAlias = dict[str, Any]

# Generic types
T = TypeVar("T")
class Repository(Generic[T]):
    def __init__(self, items: list[T]) -> None:
        self._items = items
    
    def find(self, predicate: Callable[[T], bool]) -> T | None:
        return next((item for item in self._items if predicate(item)), None)

# Protocols (structural subtyping)
class Comparable(Protocol):
    def __lt__(self, other: Any) -> bool: ...
    def __gt__(self, other: Any) -> bool: ...

def sort_items(items: list[Comparable]) -> list[Comparable]:
    return sorted(items)
```

## Pydantic Models

### Model Definition
```python
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Literal

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    DEVELOPER = "developer"
    ANALYST = "analyst"
    VIEWER = "viewer"
    GUEST = "guest"

class User(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True
    )
    
    id: str = Field(..., description="User ID")
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    name: str = Field(..., min_length=1, max_length=100)
    role: UserRole
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    
    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.lower()
```

### Request/Response Models
```python
# Request model
class CreateUserRequest(BaseModel):
    email: str
    name: str
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.VIEWER

# Response model
class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    created_at: datetime
    
    class Config:
        from_attributes = True  # Enable ORM mode

# Pagination model
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool
```

## FastAPI Patterns

### Router Organization
```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
    responses={404: {"description": "Not found"}}
)

# Dependency injection
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)]
) -> User:
    # Validate token and return user
    pass

CurrentUser = Annotated[User, Depends(get_current_user)]
```

### Endpoint Patterns
```python
@router.get(
    "/",
    response_model=PaginatedResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List all users",
    description="Get a paginated list of all users"
)
async def list_users(
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse[UserResponse]:
    """List all users with pagination."""
    # Implementation
    pass

@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_user(
    request: CreateUserRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Create a new user."""
    # Implementation
    pass
```

### Exception Handling
```python
# Custom exceptions
class AppException(Exception):
    """Base application exception."""
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: dict[str, str] | None = None
    ):
        self.status_code = status_code
        self.detail = detail
        self.headers = headers

class UserNotFoundError(AppException):
    def __init__(self, user_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )

# Exception handler
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )
```

## Async Patterns

### Async/Await
```python
import asyncio
from typing import AsyncGenerator, AsyncIterator

# Async function
async def fetch_user(user_id: str) -> User:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/api/users/{user_id}")
        return User(**response.json())

# Async generator
async def stream_data() -> AsyncGenerator[bytes, None]:
    async with aiofiles.open("data.txt", "rb") as f:
        while chunk := await f.read(1024):
            yield chunk

# Async context manager
class AsyncDatabase:
    async def __aenter__(self):
        self.conn = await asyncpg.connect(DATABASE_URL)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.conn.close()

# Concurrent operations
async def fetch_all_data():
    tasks = [
        fetch_user("user1"),
        fetch_posts("user1"),
        fetch_comments("user1")
    ]
    results = await asyncio.gather(*tasks)
    return results
```

### Database Operations
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select, update, delete

# Async database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Async queries
async def get_user_by_email(
    db: AsyncSession,
    email: str
) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()

# Async transaction
async def transfer_credits(
    db: AsyncSession,
    from_user: str,
    to_user: str,
    amount: int
):
    async with db.begin():
        # All operations in transaction
        await db.execute(
            update(User)
            .where(User.id == from_user)
            .values(credits=User.credits - amount)
        )
        await db.execute(
            update(User)
            .where(User.id == to_user)
            .values(credits=User.credits + amount)
        )
```

## Error Handling

### Try/Except Patterns
```python
# Specific exception handling
try:
    result = await risky_operation()
except ValidationError as e:
    logger.error(f"Validation failed: {e}")
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(e)
    )
except DatabaseError as e:
    logger.error(f"Database error: {e}")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Service temporarily unavailable"
    )
except Exception as e:
    logger.exception("Unexpected error")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Internal server error"
    )
finally:
    await cleanup()
```

### Context Managers
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def managed_resource():
    resource = await acquire_resource()
    try:
        yield resource
    finally:
        await release_resource(resource)

# Usage
async with managed_resource() as resource:
    await use_resource(resource)
```

## Logging

### Structured Logging
```python
import structlog
from typing import Any

logger = structlog.get_logger()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

# Usage
logger.info(
    "user_action",
    user_id=user.id,
    action="login",
    ip_address=request.client.host
)

logger.error(
    "database_error",
    error=str(e),
    query=query,
    retry_count=retry_count
)
```

## Testing

### Pytest Patterns
```python
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

# Fixtures
@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()

@pytest.fixture
def mock_user():
    return User(
        id="test-id",
        email="test@example.com",
        name="Test User",
        role=UserRole.VIEWER
    )

# Test markers
@pytest.mark.asyncio
@pytest.mark.unit
async def test_create_user(mock_user):
    result = await create_user_service(mock_user)
    assert result.id == mock_user.id

@pytest.mark.asyncio
@pytest.mark.integration
async def test_api_endpoint(client: AsyncClient, db_session):
    response = await client.post(
        "/api/v1/users",
        json={"email": "test@example.com", "name": "Test"}
    )
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"

# Mocking
@pytest.mark.asyncio
async def test_with_mock():
    with patch("app.services.external_api") as mock_api:
        mock_api.fetch_data = AsyncMock(return_value={"status": "ok"})
        result = await process_with_external_api()
        assert result["status"] == "ok"
        mock_api.fetch_data.assert_called_once()
```

## Environment Variables

### Pydantic Settings
```python
from pydantic import BaseSettings, Field, PostgresDsn, RedisDsn

class Settings(BaseSettings):
    # Database
    database_url: PostgresDsn = Field(..., env="DATABASE_URL")
    database_pool_size: int = Field(10, env="DATABASE_POOL_SIZE")
    
    # Redis
    redis_url: RedisDsn = Field(..., env="REDIS_URL")
    
    # Security
    jwt_secret: str = Field(..., env="JWT_SECRET", min_length=32)
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    jwt_expiration: int = Field(3600, env="JWT_EXPIRATION")
    
    # Service configuration
    service_name: str = Field("mcp-gateway", env="SERVICE_NAME")
    service_version: str = Field("1.0.0", env="SERVICE_VERSION")
    
    # MCP specific
    mreg_api_url: str = Field(..., env="MREG_API_URL")
    mreg_api_key: str = Field(..., env="MREG_API_KEY")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

# Singleton instance
settings = Settings()
```

## Code Organization

### Project Structure
```
backend/
├── src/
│   ├── mcp_registry_gateway/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI app
│   │   ├── config.py         # Settings
│   │   ├── dependencies.py   # Dependency injection
│   │   ├── exceptions.py     # Custom exceptions
│   │   ├── middleware/       # Middleware
│   │   ├── routers/          # API routes
│   │   ├── services/         # Business logic
│   │   ├── models/           # Pydantic models
│   │   ├── db/              # Database
│   │   └── utils/           # Utilities
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── pyproject.toml
└── .env.example
```

### Import Organization
```python
# Standard library
import os
import sys
from datetime import datetime
from typing import Any, Optional

# Third-party
import httpx
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from sqlalchemy import select

# Local - absolute imports
from mcp_registry_gateway.config import settings
from mcp_registry_gateway.models import User
from mcp_registry_gateway.services import UserService
```

## Docstrings

### Google Style
```python
def calculate_rate_limit(user_role: str, tier: str = "standard") -> int:
    """Calculate API rate limit based on user role and tier.
    
    Args:
        user_role: The role of the user (admin, user, etc.)
        tier: Service tier (standard, premium, enterprise)
        
    Returns:
        Rate limit in requests per minute.
        
    Raises:
        ValueError: If user_role is not recognized.
        
    Examples:
        >>> calculate_rate_limit("admin", "enterprise")
        10000
        >>> calculate_rate_limit("user", "standard")
        100
    """
    # Implementation
    pass
```

## Best Practices

### Do's
- ✓ Use type hints everywhere
- ✓ Follow PEP 8 with Black formatting
- ✓ Use async/await for I/O operations
- ✓ Handle exceptions explicitly
- ✓ Use dependency injection in FastAPI
- ✓ Write comprehensive tests

### Don'ts
- ✗ Don't use pip or poetry (use UV)
- ✗ Don't use synchronous I/O in async functions
- ✗ Don't catch bare exceptions
- ✗ Don't use mutable default arguments
- ✗ Don't ignore type checker warnings
- ✗ Don't hardcode configuration values