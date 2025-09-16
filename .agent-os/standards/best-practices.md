# Development Best Practices

## Context

Development best practices for the MCP Registry Gateway project - an enterprise-grade MCP Registry with frontend (TypeScript/React/Next.js) and backend (Python/FastAPI) components.

## Core Principles

### Testing Philosophy
- **Fix tests to match production code**: Never modify production code to make tests pass
- **Tests adapt to implementation**: Tests should validate behavior, not dictate it
- **Coverage targets**: 80% minimum, 95% for critical paths
- **Test organization**: Unit, integration, and E2E tests in dedicated directories

### Architecture Principles
- **Separation of Concerns**: Frontend owns database schema, backend owns operations
- **Client-Side Auth**: Admin routes use client components with useSession() hooks
- **Type Safety**: Full TypeScript and Python type hints throughout
- **Environment Validation**: T3 Env for frontend, Pydantic Settings for backend
- **Conservative Permissions**: Principle of least privilege for all operations

### Keep It Simple
- Implement solutions in the fewest lines that remain readable
- Prefer established patterns over novel approaches
- Use framework conventions rather than custom abstractions
- Avoid premature optimization

## Frontend Best Practices (Next.js/React/TypeScript)

### Component Architecture
```typescript
// Server components by default
export default async function ServerComponent() {
  const data = await fetchData()
  return <div>{data}</div>
}

// Client components only when needed
'use client'
export function InteractiveComponent() {
  const [state, setState] = useState()
  return <button onClick={() => setState()}>Click</button>
}
```

### Authentication Patterns
- Use Better-Auth for all authentication
- Client-side route protection for admin areas
- Session hooks for auth state
- Graceful redirects (dashboard, not 404)
- Always show loading states during auth checks

```typescript
// Client-side auth protection pattern
'use client'
import { useSession } from '@/lib/auth-client'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) return <LoadingSpinner />
  if (!session?.user?.role === 'admin') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
```

### Database Operations
- All schema management through Drizzle ORM
- TypeScript-first schema definitions
- Migrations managed by frontend only
- Use transactions for multi-table operations
- Prepared statements for performance

```typescript
// Database transaction pattern
import { db } from '@/db'

await db.transaction(async (tx) => {
  const server = await tx.insert(mcpServer).values(serverData).returning()
  await tx.insert(mcpTool).values({ serverId: server[0].id, ...toolData })
})
```

### Environment Variables
```typescript
// Use T3 Env for type-safe validation
import { env } from "@/env"

// Never use process.env directly in app code
const apiUrl = env.NEXT_PUBLIC_API_URL // ✓
const apiUrl = process.env.NEXT_PUBLIC_API_URL // ✗
```

**Usage Pattern**:

| Context | Import Pattern | Reason |
|---------|---------------|--------|
| **Next.js App Code** | `import { env } from "../env"` | Runs within Next.js runtime |
| **CLI Scripts** | `import "dotenv/config"` | Runs outside Next.js via `tsx` |
| **Drizzle Config** | `import "dotenv/config"` | Runs outside Next.js via drizzle-kit |

### Error Handling
- Comprehensive try/catch blocks
- User-friendly error messages via toast
- Log errors with context
- Graceful degradation
- Never expose internal errors to users

```typescript
try {
  const result = await apiCall()
  return result
} catch (error) {
  logger.error('API call failed', { error, context })
  toast.error('Unable to complete request. Please try again.')
  throw new Error('API_CALL_FAILED')
}
```

### State Management
- React hooks for local state
- Server state via React Query/SWR
- URL state for shareable UI state
- Avoid global state when possible
- Use React Context sparingly

### Performance Optimization
- Dynamic imports for code splitting
- Image optimization with next/image
- Lazy loading for heavy components
- Memoization for expensive computations
- Proper use of React.memo and useMemo

## Backend Best Practices (Python/FastAPI)

### Package Management
```bash
# Always use UV package manager
uv sync              # ✓ Install dependencies
pip install          # ✗ Never use pip directly
poetry install       # ✗ Never use poetry
```

### Database Operations
- **Operational-only pattern**: No schema creation or table management
- Read operations and metrics updates only
- Use asyncpg for PostgreSQL connections
- Connection pooling for production
- Never execute DDL statements

```python
# Backend database pattern - operations only
async def update_server_health(server_id: int, status: str) -> None:
    """Update server health status - operational only."""
    async with get_db_connection() as conn:
        await conn.execute(
            "UPDATE mcp_server SET health_status = $1 WHERE id = $2",
            status, server_id
        )
```

### API Design
- RESTful endpoints with proper HTTP methods
- Pydantic models for request/response validation
- Comprehensive error responses
- Status codes from fastapi.status
- OpenAPI documentation auto-generation

```python
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

class ServerResponse(BaseModel):
    id: int
    name: str
    health_status: str

@router.get("/servers/{server_id}", response_model=ServerResponse)
async def get_server(server_id: int) -> ServerResponse:
    server = await get_server_by_id(server_id)
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Server not found", "code": "SERVER_NOT_FOUND"}
        )
    return server
```

### Authentication & Authorization
- Validate Better-Auth JWT tokens
- Role-based access control (6-tier RBAC)
- Rate limiting by role
- Audit logging for sensitive operations
- Session validation middleware

### Error Handling
```python
from fastapi import HTTPException, status

# Proper error handling with context
try:
    result = await operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}", extra={"context": context})
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"error": "Operation failed", "code": "OP_FAILED"}
    )
```

### Async Best Practices
- Use async/await for all I/O operations
- Proper connection management
- Avoid blocking operations
- Use background tasks for long operations
- Implement proper timeout handling

## Database Best Practices

### Schema Management
- **Frontend-only**: All schema operations in TypeScript/Drizzle
- Version control migrations
- Never modify schema from backend
- Use indexes strategically (38 performance indexes)
- Document schema changes

### Query Optimization
- Use prepared statements
- Batch operations when possible
- Proper index usage
- Connection pooling
- Monitor slow queries

### Data Integrity
- Use transactions for consistency
- Foreign key constraints
- Check constraints for business rules
- Audit trails for changes
- Soft deletes where appropriate

## Security Best Practices

### Authentication
- Multi-provider SSO (Google, GitHub, Microsoft)
- Session regeneration on role changes
- Secure token storage
- PKCE for OAuth flows
- MFA support

### Authorization
- 6-tier RBAC system
- Principle of least privilege
- Resource-based permissions
- Audit all privileged operations
- Regular permission reviews

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Validate all inputs
- Sanitize outputs
- Never log sensitive information

### Secret Management
- Environment variables for secrets
- Never commit secrets
- Rotate credentials regularly
- Use secure secret storage
- Audit secret access

## Testing Best Practices

### Testing Philosophy
- **Tests follow code**: Adapt tests to implementation
- **Behavior over implementation**: Test what, not how
- **Isolation**: Mock external dependencies
- **Clarity**: Test names describe scenarios
- **Maintenance**: Update tests with code changes

### Frontend Testing
```typescript
// Vitest with React Testing Library
describe('UserCard', () => {
  it('should display user information', () => {
    render(<UserCard user={mockUser} />)
    expect(screen.getByText(mockUser.name)).toBeInTheDocument()
  })
})
```

### Backend Testing
```python
# pytest with markers
@pytest.mark.unit
async def test_calculate_rate_limit():
    result = calculate_rate_limit("admin")
    assert result == 1000

@pytest.mark.integration
async def test_api_endpoint(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
```

### Test Organization
- **Unit Tests**: `frontend/tests/unit/` - Components, hooks, utilities
- **Integration Tests**: `frontend/tests/integration/` - API flows, auth workflows
- **Database Tests**: `frontend/tests/db-optimization.test.ts` - Performance optimization
- **E2E Tests**: `frontend/tests/e2e/` - End-to-end user workflows
- **Backend Tests**: `backend/tests/` with markers (`@pytest.mark.unit`, `@pytest.mark.integration`)

## Git Best Practices

### Workflow
- Feature branches for all work
- Never work directly on main
- Create restore points before risky operations
- Small, focused commits
- Descriptive commit messages

### Code Review
- Review for patterns, not just correctness
- Check security implications
- Verify test coverage
- Ensure documentation updates
- Validate against best practices

## Documentation Best Practices

### Code Documentation
- Self-documenting code first
- Comments explain "why" not "what"
- Keep documentation near code
- Update docs with code changes
- Use type hints/annotations

### Project Documentation
- README with quick start
- Architecture documentation
- API documentation
- Deployment guides
- Troubleshooting guides

## Performance Best Practices

### Monitoring
- Application metrics (Prometheus)
- Database query performance
- API response times
- Error rates and patterns
- Resource utilization

### Optimization
- Measure before optimizing
- Focus on bottlenecks
- Cache strategically
- Optimize database queries
- Use CDN for static assets

## Deployment Best Practices

### Environment Management
- Separate configs per environment
- Feature flags for gradual rollout
- Blue-green deployments
- Rollback procedures
- Health checks

### Container Best Practices
- Multi-stage Docker builds
- Minimal base images
- Non-root users
- Health check endpoints
- Graceful shutdown handling

## Common Pitfalls to Avoid

### Frontend
- ✗ Using process.env directly (use T3 Env)
- ✗ Server components with onClick handlers
- ✗ Modifying database from multiple places
- ✗ Storing sensitive data in localStorage
- ✗ Infinite re-render loops

### Backend
- ✗ Using pip or poetry (use UV)
- ✗ Creating database tables from backend
- ✗ Blocking operations in async handlers
- ✗ Returning internal errors to users
- ✗ Missing rate limiting

### General
- ✗ Modifying production code for tests
- ✗ Committing secrets or .env files
- ✗ Working directly on main branch
- ✗ Skipping code review
- ✗ Ignoring security warnings

## Code Style Standards

### Python Backend
- **Package Manager**: UV only (never pip/poetry)
- **Line Length**: 88 characters (Black/Ruff default)
- **Type Hints**: Always use (Python 3.10+ union syntax: `str | None`)
- **Imports**: stdlib → third-party → local (two blank lines before code)
- **Naming**: `snake_case` functions, `PascalCase` classes, `UPPER_SNAKE` constants
- **Environment Variables**: Use prefixes: `DB_`, `SECURITY_`, `SERVICE_`, `MREG_`

### TypeScript Frontend
- **Indentation**: 2 spaces
- **Semicolons**: Not required (Next.js convention)
- **Imports**: React/Next → third-party → local → types
- **Components**: `PascalCase.tsx`, hooks with `use` prefix
- **Error Handling**: try/catch with proper typing, toast notifications for users

## File Organization

### Critical Directories
- **`reports/`**: ALL project reports and documentation
- **`temp/`**: Temporary files, debugging scripts (never commit)
- **`docs/agents/`**: Detailed documentation
- **`frontend/tests/`**: Organized test directories with specialized utilities
- **`backend/tests/`**: pytest with markers and comprehensive utilities

### Environment Files
- `backend/.env` - Backend config (Python/FastAPI)
- `frontend/.env.local` - Frontend Next.js config with database credentials
- Root `.env` - Docker Compose variables

## Dependencies

**Backend**: Python ≥3.10, FastAPI ≥0.114.2, FastMCP ≥0.4.0, PostgreSQL ≥17, Redis ≥8
**Frontend**: Node.js ≥22, Next.js 15.5.3, React 19.1.1, TypeScript 5.9.2
**Database**: PostgreSQL ≥17 with 38 performance indexes, 3 analytics functions, 3 monitoring views, automated health monitoring
**Testing**: Vitest with BigInt support, PostgreSQL integration, comprehensive database optimization test suite

## Quick Reference

### Database Health Check
```bash
cd frontend
npm run db:health              # Database health scoring
npm run db:optimize            # Performance optimization
npm run test                   # Run full test suite including DB tests
```

### Development Workflow
```bash
# Backend
cd backend
uv sync                        # Install dependencies
uv run mcp-gateway serve --reload --port 8000  # Dev server

# Frontend
cd frontend
npm install                    # Install dependencies
npm run db:setup:full          # Complete DB setup
npm run dev                    # Dev server (--turbopack)
```

### Testing Commands
```bash
# Frontend
npm run test                   # Vitest tests
npm run test:coverage          # With coverage
npm run typecheck              # TypeScript validation

# Backend
uv run pytest                  # All tests
uv run pytest -m unit         # Unit tests only
uv run pytest -m integration  # Integration tests only
```

## Success Metrics
- ✅ Tests adapt to production code (never vice versa)
- ✅ Client-side auth for admin routes
- ✅ T3 Env for all environment variables
- ✅ Frontend-only database schema management
- ✅ Backend operational-only database pattern
- ✅ 80% test coverage minimum, 95% for critical paths
- ✅ UV package manager for all Python operations
- ✅ Type safety throughout (TypeScript + Python type hints)
- ✅ Better-Auth for authentication and RBAC
- ✅ Performance monitoring and optimization
