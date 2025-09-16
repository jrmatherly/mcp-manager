# Code Style Guide

## Context

Code style conventions for the MCP Registry Gateway project - an enterprise-grade MCP Registry with frontend (TypeScript/React/Next.js) and backend (Python/FastAPI) components.

## General Principles

- **Consistency**: Follow existing patterns in the codebase
- **Readability**: Code should be self-documenting with clear naming
- **Type Safety**: Always use TypeScript/Python type hints
- **Error Handling**: Comprehensive error handling with proper typing
- **Testing**: Write tests alongside implementation
- **Documentation**: Focus on "why" not "what" in comments

## Frontend Code Style (TypeScript/React/Next.js)

### Formatting
- **Indentation**: 2 spaces (never tabs)
- **Line Length**: 140 characters (as per Prettier config)
- **Semicolons**: Required (contrary to common Next.js convention - this project uses semicolons)
- **Quotes**: Double quotes for strings and JSX attributes
- **Trailing Commas**: Always use in multi-line structures
- **End of Line**: LF (Unix-style)

### Naming Conventions
- **Variables/Functions**: camelCase (`getUserData`, `isAuthenticated`)
- **React Components**: PascalCase (`UserProfile`, `AuthProvider`)
- **Types/Interfaces**: PascalCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **File Names**:
  - Components: PascalCase.tsx (`UserCard.tsx`)
  - Utilities: camelCase.ts (`formatDate.ts`)
  - Hooks: camelCase with use prefix (`useAuth.ts`)
  - Pages: kebab-case or camelCase depending on Next.js routing

### Import Organization
```typescript
// 1. React/Next.js imports
import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { z } from "zod";
import { Button } from "@radix-ui/react-button";

// 3. Local imports (absolute path with @/ alias)
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// 4. Type imports
import type { User, Session } from "@/types";
```

### React/Component Patterns
- Use functional components with hooks
- Prefer named exports for components
- Use `"use client"` directive when client-side features needed
- Implement proper loading and error states
- Use React.memo for expensive components
- Arrow functions for component definitions

### TypeScript Conventions
- Always provide explicit return types for functions
- Use `type` for object shapes, `interface` for extensible contracts
- Prefer union types over enums where appropriate
- Use `as const` for literal types
- Leverage type inference where obvious
- Use strict TypeScript configuration

### Error Handling
```typescript
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  console.error("API call failed:", error);
  toast.error("Failed to fetch data");
  return { success: false, error: String(error) };
}
```

### ESLint Configuration
- Follow existing ESLint config in `eslint.config.mjs`
- Use TypeScript ESLint recommended rules
- React hooks rules enforced
- Consistent type imports preferred
- No unused variables (prefix with `_` if needed)
- Console.warn in production code (console.log allowed in test files)

## Backend Code Style (Python/FastAPI)

### Formatting
- **Indentation**: 4 spaces (PEP 8)
- **Line Length**: 88 characters (Black/Ruff default)
- **Blank Lines**: Two before class/function definitions
- **Import Organization**: stdlib → third-party → local (two blank lines before code)

### Naming Conventions
- **Functions/Variables**: snake_case (`get_user_data`, `is_authenticated`)
- **Classes**: PascalCase (`UserProfile`, `AuthProvider`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Private**: Leading underscore (`_internal_method`)
- **File Names**: snake_case (`user_service.py`)
- **Module Names**: snake_case with clear purpose

### Type Hints
```python
# Use Python 3.10+ union syntax
def process_data(value: str | None = None) -> dict[str, Any]:
    """Process data with optional value parameter."""
    pass

# Use descriptive type aliases
UserId = int
UserData = dict[str, Any]

# Always include return types
async def fetch_user(user_id: UserId) -> UserData | None:
    """Fetch user data by ID."""
    pass
```

### Docstrings (Google Style)
```python
def calculate_rate_limit(user_role: str) -> int:
    """Calculate rate limit based on user role.

    Args:
        user_role: The role of the user (admin, user, etc.)

    Returns:
        Rate limit in requests per minute.

    Raises:
        ValueError: If user_role is not recognized.
    """
```

### FastAPI Patterns
- Use dependency injection for shared resources
- Implement proper Pydantic models for validation
- Use status codes from `fastapi.status`
- Implement comprehensive error handling
- Use async/await for I/O operations
- Follow REST conventions for endpoint naming

### Environment Variables
- Use prefixes: `DB_`, `SECURITY_`, `SERVICE_`, `MREG_`
- Load via Pydantic Settings
- Never hardcode secrets
- Document all variables in .env.example

### Ruff Configuration
- Line length: 88 characters
- Target Python 3.10+
- Enable comprehensive rule set (E, W, F, I, B, C4, UP, ARG, SIM, TCH, RUF)
- Auto-fix enabled for most rules
- Ignore E501 (line length handled by formatter)

## Testing Conventions

### Frontend Testing (Vitest)
- Use Vitest with React Testing Library
- Test file naming: `*.test.ts` or `*.test.tsx`
- Organize tests in `tests/` directory with subdirectories:
  - `tests/unit/` - Component and utility tests
  - `tests/integration/` - API and workflow tests
  - `tests/e2e/` - End-to-end user scenarios
- Mock external dependencies appropriately
- Test user interactions, not implementation details
- Use `describe` and `it` for test organization

### Backend Testing (pytest)
- Use pytest with async support
- Test file naming: `test_*.py`
- Organize in `tests/` directory
- Use fixtures for common setup
- Mark tests: `@pytest.mark.unit`, `@pytest.mark.integration`, `@pytest.mark.security`
- Minimum 80% coverage requirement

## Database Conventions

### Schema Definition (Drizzle ORM)
- Use Drizzle ORM for schema definition in TypeScript
- All database operations handled by frontend TypeScript stack
- Follow naming conventions: snake_case for tables and columns
- Use proper TypeScript types for database schemas
- Implement proper indexes for performance

### Migration Management
- Use Drizzle Kit for migrations
- Frontend handles all schema changes and migrations
- Backend only performs operational database updates
- No table creation or schema modifications in backend

## Git Conventions

### Commit Messages
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `style:`
- Keep subject line under 50 characters
- Use imperative mood: "Add feature" not "Added feature"
- Reference issues: `fixes #123`
- Include emoji indicators when beneficial

### Branch Naming
- Feature: `feature/add-user-auth`
- Bug fix: `fix/login-error`
- Hotfix: `hotfix/security-patch`
- Documentation: `docs/update-readme`

## Quality Standards

### Frontend Quality Gates
- **ESLint**: Must pass with no errors
- **TypeScript**: Strict mode enabled, must compile without errors
- **Prettier**: Auto-format with 140 character line length
- **Build**: Must compile without errors or warnings
- **Tests**: Minimum 80% coverage

### Backend Quality Gates
- **Ruff**: Must pass with no errors
- **MyPy**: Must pass strict type checking
- **Black**: Auto-format with 88 character line length
- **Tests**: Minimum 80% coverage
- **UV**: Use UV package manager for all Python operations

## Configuration Files Reference

- **Frontend ESLint**: `frontend/eslint.config.mjs`
- **Frontend TypeScript**: `frontend/tsconfig.json`
- **Frontend Prettier**: `frontend/.prettierrc`
- **Backend Ruff/MyPy**: `backend/pyproject.toml`
- **Environment Variables**: `frontend/.env.local`, `backend/.env`

## Code Review Checklist

### General
- [ ] Follows naming conventions
- [ ] Includes proper type hints/types
- [ ] Has comprehensive error handling
- [ ] Includes tests with adequate coverage
- [ ] Documentation updated if needed
- [ ] No hardcoded secrets or credentials
- [ ] No commented-out code
- [ ] Security best practices followed

### Frontend Specific
- [ ] Uses double quotes for strings
- [ ] Proper import organization
- [ ] Client components marked with "use client"
- [ ] Loading and error states implemented
- [ ] Accessibility considerations (ARIA labels, etc.)
- [ ] Responsive design patterns followed

### Backend Specific
- [ ] Follows Google-style docstrings
- [ ] Uses environment variable prefixes
- [ ] Proper async/await usage
- [ ] Pydantic models for validation
- [ ] FastAPI dependency injection used appropriately
- [ ] Operational-only database pattern followed

## Migration Notes

When migrating existing code to these standards:

1. **Frontend**: Run `npm run lint:fix` to auto-fix ESLint issues
2. **Backend**: Run `uv run ruff check . --fix` to auto-fix Ruff issues
3. **Formatting**: Use Prettier (frontend) and Black (backend) for auto-formatting
4. **Type Safety**: Gradually add type hints and resolve TypeScript strict mode issues
5. **Testing**: Add tests to reach minimum coverage requirements

## Architecture-Specific Notes

### Authentication System
- Uses Better-Auth with multi-provider SSO
- Client-side route protection pattern
- Role-based access control (admin/user/server_owner)
- Environment variable handling via T3 Env

### Database Architecture
- Frontend (TypeScript/Drizzle) manages schema and migrations
- Backend (Python) performs operational updates only
- Unified single-server architecture with path-based routing
- Performance optimization with 38+ strategic indexes
