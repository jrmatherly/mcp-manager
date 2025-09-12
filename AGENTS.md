# AGENTS.md
This file provides guidance to AI coding assistants working in this repository.

**Note:** CLAUDE.md, .clinerules, .cursorrules, .windsurfrules, .replit.md, GEMINI.md, .github/copilot-instructions.md, and .idx/airules.md are symlinks to AGENTS.md in this project.

# MCP Registry Gateway

Enterprise-grade MCP (Model Context Protocol) Registry, Gateway, and Proxy System with unified FastAPI/FastMCP architecture, multi-tenancy support, and comprehensive authentication via Azure OAuth.

## Build & Commands

### Backend Development (Python/FastAPI)

**CRITICAL**: Use UV package manager for all Python operations.

```bash
# Install dependencies
cd backend
uv sync

# Run development server (unified architecture)
uv run uvicorn mcp_registry_gateway.unified_app:create_app --reload --port 8000

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

### Frontend Development (Next.js/React)

**CRITICAL**: Document the EXACT script names from package.json.

```bash
# Install dependencies
cd frontend
npm install

# Development server
npm run dev                            # runs with --turbopack for fast refresh

# Build and production
npm run build                          # production build
npm run start                          # start production server

# Code quality
npm run lint                           # ESLint checks

# Database operations (Drizzle ORM)
npm run db:generate                    # generate Drizzle migrations
npm run db:migrate                     # apply migrations to database
npm run db:push                        # push schema changes directly
npm run db:studio                      # open Drizzle Studio GUI
```

### Docker Operations

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild containers
docker-compose build
docker-compose up -d --build

# Stop services
docker-compose down
docker-compose down -v                 # also remove volumes
```

### Script Command Consistency

**Important**: When modifying npm scripts in package.json, ensure all references are updated:
- GitHub Actions workflows (.github/workflows/*.yml)
- README.md documentation
- Dockerfile/docker-compose.yml configurations
- CI/CD configuration files
- Setup/installation scripts

Common places that reference npm scripts:
- Build commands → Check: workflows, README, Dockerfile
- Test commands → Check: workflows, contributing docs
- Lint commands → Check: pre-commit hooks, workflows
- Start commands → Check: README, deployment docs

## Code Style

### Python Backend Conventions

**Import Conventions:**
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

**Formatting Rules:**
- Line length: 88 characters (Black/Ruff default)
- Indentation: 4 spaces
- String quotes: Double quotes preferred
- Docstrings: Google style, triple double quotes

**Naming Conventions:**
- Files/modules: `snake_case.py`
- Classes: `PascalCase` (e.g., `MCPGatewayError`)
- Functions/variables: `snake_case` (e.g., `get_user_data`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_CONNECTIONS`)
- Private methods: `_leading_underscore`
- Environment variables: `PREFIX_VARIABLE_NAME` (e.g., `DB_POSTGRES_HOST`)

**Type Usage Patterns:**
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

**Error Handling:**
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

### TypeScript/React Frontend Conventions

**Import Conventions:**
```typescript
// React and Next.js imports first
import { useState, useEffect } from "react";
import type { Metadata } from "next";

// Third-party libraries
import { Toaster } from "react-hot-toast";
import { z } from "zod";

// Local imports
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// Types/interfaces
import type { User, Session } from "@/types";
```

**Formatting Rules:**
- Indentation: 2 spaces
- Semicolons: Not required (Next.js convention)
- Quotes: Double quotes for JSX attributes, single quotes for JS strings
- No trailing commas in function parameters

**Naming Conventions:**
- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Hooks: `use` prefix (e.g., `useAuth.ts`)
- Pages: `page.tsx` in route directories
- API routes: `route.ts` in api directories
- CSS classes: Tailwind utility classes

**Type Usage Patterns:**
```typescript
// Prefer interfaces for object types
interface UserProps {
  user: User;
  onUpdate?: (user: User) => void;
}

// Use type for unions and intersections
type Status = "pending" | "active" | "inactive";

// Functional components with typed props
export default function UserCard({ user, onUpdate }: UserProps) {
  // Component logic
}

// Use const assertions for constants
const ROLES = ["admin", "user", "server_owner"] as const;
type Role = typeof ROLES[number];
```

**Error Handling:**
```typescript
// Use try/catch with proper error typing
try {
  const data = await fetchUser(id);
  setUser(data);
} catch (error) {
  if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error("An unexpected error occurred");
  }
}

// Use error boundaries for component errors
// Use toast notifications for user feedback
```

## Testing

### Backend Testing (Python/Pytest)

**Test File Patterns:**
- Test files: `test_*.py` or `*_test.py`
- Test location: `backend/tests/` directory
- Test markers: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.slow`

**Testing Conventions:**
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

**Coverage Requirements:**
- Minimum coverage: 80%
- Critical paths: 95%+ coverage
- Exclude: migrations, **init**.py files

### Frontend Testing (Vitest/React Testing Library)

**Test File Patterns:**
- Test files: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
- Test location: Alongside components or in `__tests__` directories

**Testing Conventions:**
```typescript
// Component test example
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import UserCard from "./UserCard";

describe("UserCard", () => {
  it("displays user information correctly", () => {
    const user = { id: "1", name: "John Doe", email: "john@example.com" };
    
    render(<UserCard user={user} />);
    
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });
  
  it("calls onUpdate when edit button is clicked", () => {
    const onUpdate = vi.fn();
    const user = { id: "1", name: "John Doe", email: "john@example.com" };
    
    render(<UserCard user={user} onUpdate={onUpdate} />);
    
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    
    expect(onUpdate).toHaveBeenCalledWith(user);
  });
});
```

### Testing Philosophy

**When tests fail, fix the code, not the test.**

Key principles:
- **Tests should be meaningful** - Avoid tests that always pass regardless of behavior
- **Test actual functionality** - Call the functions being tested, don't just check side effects
- **Failing tests are valuable** - They reveal bugs or missing features
- **Fix the root cause** - When a test fails, fix the underlying issue, don't hide the test
- **Test edge cases** - Tests that reveal limitations help improve the code
- **Document test purpose** - Each test should include a comment explaining why it exists

## Security

### Authentication & Authorization

**Backend Security:**
- JWT tokens with RS256 algorithm for production
- Azure OAuth integration for enterprise SSO
- Role-based access control (RBAC) with tiered permissions
- Rate limiting: Admin (1000 RPM), Server Owner (500 RPM), User (100 RPM), Anonymous (20 RPM)

**Frontend Security:**
- Better-Auth for secure session management
- httpOnly cookies for token storage
- CSRF protection on state-changing operations
- Content Security Policy (CSP) headers

### Data Validation

**Backend Validation:**
```python
# Always validate with Pydantic models
class ServerRegistration(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    endpoint: HttpUrl
    api_key: SecretStr
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Name must be alphanumeric with hyphens/underscores")
        return v
```

**Frontend Validation:**
```typescript
// Use Zod for runtime validation
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["admin", "user", "server_owner"])
});

// Validate before API calls
const validatedData = userSchema.parse(formData);
```

### Secret Management

- Never commit `.env` files (use `.env.example` as template)
- Use environment variable prefixes: `DB_`, `SECURITY_`, `SERVICE_`, `MONITORING_`, `MREG_`
- Store secrets in secure vaults for production
- Rotate API keys and tokens regularly

### Security Best Practices

- SQL injection prevention via parameterized queries (SQLModel)
- XSS prevention with React's automatic escaping
- Input sanitization on all user inputs
- Rate limiting on all public endpoints
- Audit logging for sensitive operations
- Regular dependency updates for security patches

## Directory Structure & File Organization

### Reports Directory
ALL project reports and documentation should be saved to the `reports/` directory:

```
mcp-manager/
├── reports/              # All project reports and documentation
│   └── *.md             # Various report types
├── temp/                # Temporary files and debugging
├── backend/             # Python FastAPI backend
├── frontend/            # Next.js frontend
└── docs/                # Project documentation
```

### Report Generation Guidelines

**Implementation Reports:**
- Phase validation: `PHASE_X_VALIDATION_REPORT.md`
- Implementation summaries: `IMPLEMENTATION_SUMMARY_[FEATURE].md`
- Feature completion: `FEATURE_[NAME]_REPORT.md`

**Testing & Analysis Reports:**
- Test results: `TEST_RESULTS_[DATE].md`
- Coverage reports: `COVERAGE_REPORT_[DATE].md`
- Performance analysis: `PERFORMANCE_ANALYSIS_[SCENARIO].md`
- Security scans: `SECURITY_SCAN_[DATE].md`

**Quality & Validation:**
- Code quality: `CODE_QUALITY_REPORT.md`
- Dependency analysis: `DEPENDENCY_REPORT.md`
- API compatibility: `API_COMPATIBILITY_REPORT.md`

**Report Naming Conventions:**
- Use descriptive names: `[TYPE]_[SCOPE]_[DATE].md`
- Include dates: `YYYY-MM-DD` format
- Group with prefixes: `TEST_`, `PERFORMANCE_`, `SECURITY_`
- Markdown format: All reports end in `.md`

### Temporary Files & Debugging

All temporary files, debugging scripts, and test artifacts should be organized in a `/temp` folder:

**Temporary File Organization:**
- **Debug scripts**: `temp/debug-*.py`, `temp/analyze-*.js`
- **Test artifacts**: `temp/test-results/`, `temp/coverage/`
- **Generated files**: `temp/generated/`, `temp/build-artifacts/`
- **Logs**: `temp/logs/debug.log`, `temp/logs/error.log`

**Guidelines:**
- Never commit files from `/temp` directory
- Use `/temp` for all debugging and analysis scripts
- Clean up `/temp` directory regularly
- Include `/temp/` in `.gitignore`

### Example `.gitignore` patterns
```gitignore
# Temporary files and debugging
/temp/
temp/
**/temp/
debug-*.py
test-*.js
analyze-*.sh
*-debug.*
*.debug

# Environment files
.env
.env.local
*.env

# Claude settings
.claude/settings.local.json

# Don't ignore reports directory
!reports/
!reports/**

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/
.ruff_cache/

# Node.js
node_modules/
.next/
out/
dist/
build/
*.log
npm-debug.log*
.npm
.eslintcache

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
```

### Claude Code Settings (.claude Directory)

The `.claude` directory contains Claude Code configuration files:

#### Version Controlled Files (commit these)
- `.claude/settings.json` - Shared team settings
- `.claude/commands/*.md` - Custom slash commands
- `.claude/hooks/*.sh` - Hook scripts for automation

#### Ignored Files (do NOT commit)
- `.claude/settings.local.json` - Personal preferences
- Any `*.local.json` files - Personal configuration

## Configuration

### Backend Environment Variables

Required environment variables with prefix system:

```bash
# Application Settings (APP_ prefix)
APP_NAME="MCP Registry Gateway"
APP_VERSION="0.1.0"
ENVIRONMENT=development
DEBUG=false

# Database Settings (DB_ prefix)
DB_POSTGRES_HOST=localhost
DB_POSTGRES_PORT=5432
DB_POSTGRES_USER=mcp_user
DB_POSTGRES_PASSWORD=secure_password
DB_POSTGRES_DB=mcp_registry
DB_REDIS_HOST=localhost
DB_REDIS_PORT=6379

# Security Settings (SECURITY_ prefix)
SECURITY_JWT_SECRET_KEY=your-jwt-secret-change-this
SECURITY_JWT_ALGORITHM=HS256
SECURITY_JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
SECURITY_AZURE_TENANT_ID=your-tenant-id
SECURITY_AZURE_CLIENT_ID=your-client-id
SECURITY_AZURE_CLIENT_SECRET=your-client-secret

# Service Settings (SERVICE_ prefix)
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8000
SERVICE_WORKERS=1

# FastMCP Settings (MREG_ prefix)
MREG_FASTMCP_ENABLED=true
MREG_FASTMCP_PORT=8001
MREG_FASTMCP_HOST=0.0.0.0
```

### Frontend Environment Variables

Create `.env.local` for Next.js:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MCP_URL=http://localhost:8001

# Better-Auth Configuration
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mcp_registry
```

### Development Environment Setup

1. **Backend Setup:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your values
   uv sync
   uv run alembic upgrade head
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit .env.local with your values
   npm install
   npm run db:migrate
   ```

3. **Docker Setup:**
   ```bash
   cp .env.example .env
   docker-compose up -d
   ```

### Dependencies and Version Requirements

**Backend:**
- Python: >= 3.10, < 3.13
- FastAPI: >= 0.114.2
- FastMCP: >= 0.4.0
- PostgreSQL: >= 13
- Redis: >= 6

**Frontend:**
- Node.js: >= 18
- Next.js: 15.5.3
- React: 19.1.1
- TypeScript: 5.9.2

## Agent Delegation & Tool Execution

### ⚠️ MANDATORY: Always Delegate to Specialists & Execute in Parallel

**When specialized agents are available, you MUST use them instead of attempting tasks yourself.**

**When performing multiple operations, send all tool calls (including Task calls for agent delegation) in a single message to execute them concurrently for optimal performance.**

#### Available Specialized Agents

While no project-specific agents are defined in `.claude/agents/`, the following general-purpose agents should be used:

- **better-auth-orchestrator**: For authentication implementation and Better-Auth integration
- **auth-*-specialist**: Various auth specialists for specific auth domains
- **enhanced-database-expert**: For database schema design and optimization
- **postgres-expert**: For PostgreSQL-specific queries and performance
- **enhanced-nextjs-expert**: For Next.js architecture and optimization
- **enhanced-react-expert**: For React component patterns and hooks
- **enhanced-typescript-expert**: For TypeScript type system and configuration
- **enhanced-devops-expert**: For Docker, CI/CD, and deployment
- **testing-expert**: For test strategy and implementation
- **security-engineer**: For security audits and vulnerability assessment

#### Critical: Always Use Parallel Tool Calls

**IMPORTANT: Send all tool calls in a single message to execute them in parallel.**

**These cases MUST use parallel tool calls:**
- Searching for different patterns in the codebase
- Reading multiple files simultaneously
- Running multiple tests or checks
- Delegating to multiple specialist agents
- Any independent operations that don't require sequential output

**Sequential calls ONLY when:**
You genuinely REQUIRE the output of one tool to determine the usage of the next tool.

**Performance Impact:** Parallel tool execution is 3-5x faster than sequential calls.

#### Planning Approach
1. Think: "What information do I need to fully answer this question?"
2. Send all tool calls in a single message
3. Execute all searches/reads/delegations together
4. Process results comprehensively

**Remember:** Both delegation to specialists and parallel execution are requirements, not suggestions.