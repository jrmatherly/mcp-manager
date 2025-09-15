# AGENTS.md

This file provides guidance to AI coding assistants working in this repository.

**Note:** CLAUDE.md, .clinerules, .cursorrules, .windsurfrules, .replit.md, GEMINI.md, .github/copilot-instructions.md, and .idx/airules.md are symlinks to AGENTS.md in this project.

# MCP Registry Gateway

Enterprise-grade MCP (Model Context Protocol) Registry, Gateway, and Proxy System with unified database management, multi-tenancy support, and comprehensive authentication via Better-Auth.

## Quick Setup

### Backend (Python/FastAPI)
**CRITICAL**: Use UV package manager for all Python operations.

```bash
cd backend
uv sync                                        # Install dependencies
uv run mcp-gateway serve --reload --port 8000  # Dev server
uv run pytest                                  # Run tests
uv run ruff check . && uv run mypy .           # Quality checks
```

**Architecture Note**: Backend follows operational-only pattern - no database table creation or schema management. All schema operations are handled by the frontend TypeScript stack.

### Frontend (Next.js/React)
**CRITICAL**: All database management is now in the frontend (TypeScript).

```bash
cd frontend
npm install                          # Install dependencies
npm run db:setup:full                # Complete automated DB setup (create, migrate, optimize, apply all SQL)
npm run dev                          # Dev server (--turbopack)
npm run build                        # Production build
npm run lint                         # ESLint checks
npm run test                         # Run Vitest tests (including database optimization tests)
npm run db:generate                  # Generate Drizzle types
npm run db:studio                    # Open Drizzle Studio
npm run db:seed                      # Seed database with test data
npm run db:health                    # Database health check
```

### Authentication System (Better-Auth)
**CRITICAL**: Client-side authentication pattern for admin routes.

```bash
# Debug authentication issues
curl http://localhost:3000/api/debug/session  # Session debugging endpoint
```

**Key Features**:
- **Microsoft OAuth with Role Mapping**: Azure AD groups map to Better-Auth roles
- **Client-Side Route Protection**: Admin routes use client components for auth checking
- **Role Synchronization**: Automatic role updates during OAuth callbacks
- **Multi-Provider SSO**: Google, GitHub, Microsoft/Entra ID support

### Docker
```bash
docker-compose up -d                 # Start all services
docker-compose logs -f backend       # View logs
docker-compose down -v               # Stop and remove volumes
```

## Code Style (Essential Rules)

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

## Testing Philosophy

**When tests fail, fix the test to match production code, not the other way around.**
**Never modify production code to make tests pass - tests should adapt to the implementation.**

- **Backend**: `pytest` with markers (`@pytest.mark.unit`, `@pytest.mark.integration`)
- **Frontend**: Vitest with React Testing Library
- **Test Organization**: Structured test directories with specialized utilities
  - **Unit Tests**: `frontend/tests/unit/` - Components, hooks, utilities
  - **Integration Tests**: `frontend/tests/integration/` - API flows, auth workflows
  - **Database Tests**: `frontend/tests/db-optimization.test.ts` - Performance optimization
  - **E2E Tests**: `frontend/tests/e2e/` - End-to-end user workflows
- **Coverage**: 80% minimum, 95% for critical paths
- **Test Infrastructure**: Vitest configured with BigInt support, PostgreSQL integration
- **Test Utilities**: Auth mocking, database utilities, MSW API mocking
- **Location**: `backend/tests/`, `frontend/tests/` with comprehensive test utilities

## File Organization

### Critical Directories
- **`reports/`**: ALL project reports and documentation
- **`temp/`**: Temporary files, debugging scripts (never commit)
- **`docs/agents/`**: Detailed documentation (see below)

### Environment Files
- `backend/.env` - Backend config (Python/FastAPI)
- `frontend/.env.local` - Frontend Next.js config with database credentials
- Root `.env` - Docker Compose variables

### Environment Variable Configuration (T3 Env)
The frontend uses **T3 Env** (`@t3-oss/env-nextjs`) for type-safe environment variable validation with Zod schemas.

**Configuration File**: `frontend/src/env.ts`
- Provides type-safe, validated environment variables
- Automatic validation at build time
- Separate server and client variable schemas
- Full TypeScript IntelliSense support

**Usage Pattern**:

| Context | Import Pattern | Reason |
|---------|---------------|--------|
| **Next.js App Code** | `import { env } from "../env"` | Runs within Next.js runtime |
| **CLI Scripts** | `import "dotenv/config"` | Runs outside Next.js via `tsx` |
| **Drizzle Config** | `import "dotenv/config"` | Runs outside Next.js via drizzle-kit |

**CLI Scripts Using dotenv/config**:
- `src/db/setup.ts` - Database setup operations
- `src/db/migrate.ts` - Migration management
- `src/db/setup-views.ts` - View creation
- `src/db/optimize.ts` - Database optimization
- `drizzle.config.ts` - Drizzle ORM configuration

These files run as standalone Node.js scripts outside the Next.js runtime and cannot access T3 Env validation.

### Authentication System (Important Changes)
- **Microsoft OAuth Role Mapping**: Azure AD groups automatically map to Better-Auth roles
- **Client-Side Admin Routes**: Admin authentication uses client components for better UX
- **Role Synchronization**: OAuth callbacks automatically sync user roles to database
- **Environment Variable Handling**: T3 Env for type-safe configuration with client/server separation
- **Debug Capabilities**: Session debugging endpoint for authentication troubleshooting

### Architecture Separation (Critical Changes)

**Frontend (TypeScript/Drizzle) Responsibilities:**
- Database schema definition and management
- Table creation, migrations, and index management
- Better-Auth integration and user management
- All SQL operations (`frontend/drizzle/sql/`)
- Database setup via `frontend/src/db/setup.ts`

**Backend (Python/FastAPI) Responsibilities:**
- Operational database updates (health status, metrics)
- Request/response logging and monitoring
- MCP server proxy and routing operations
- Connection management and read operations
- No table creation or schema modifications

**Key Architectural Principles:**
- Clean separation: Frontend owns schema, Backend owns operations
- No duplicate database operations or competing migrations
- Unified single-server architecture with path-based routing
- Middleware uses singleton pattern to prevent metric conflicts

## Detailed Documentation

For comprehensive guides, see:

- **[Backend Development](./docs/agents/backend-development.md)** - Python/FastAPI, testing, conventions
- **[Frontend Development](./docs/agents/frontend-development.md)** - Next.js/React, testing, types, authentication patterns
- **[Docker & Deployment](./docs/agents/docker-deployment.md)** - Container operations, environment setup
- **[Testing & Quality](./docs/agents/testing-quality.md)** - Testing philosophy, file organization, reports
- **[Security & Configuration](./docs/agents/security-configuration.md)** - Auth, validation, environment variables, role mapping
- **[Authentication Troubleshooting](./docs/agents/authentication-troubleshooting.md)** - Common auth issues, debugging, solutions
- **[TailwindCSS v4 Guide](./docs/agents/tailwind-v4-guide.md)** - Theme-aware styling, dark mode, glassmorphism effects
- **[Agent Delegation](./docs/agents/agent-delegation.md)** - Specialist agents, parallel execution

## Dependencies

**Backend**: Python ≥3.10, FastAPI ≥0.114.2, FastMCP ≥0.4.0, PostgreSQL ≥17, Redis ≥8
**Frontend**: Node.js ≥22, Next.js 15.5.3, React 19.1.1, TypeScript 5.9.2
**Database**: PostgreSQL ≥17 with 38 performance indexes, 3 analytics functions, 3 monitoring views, automated health monitoring
**Testing**: Vitest with BigInt support, PostgreSQL integration, comprehensive database optimization test suite

## ⚠️ Critical Rules

### Backend Architecture (Post-Remediation)
- **No Legacy Endpoints**: All `/legacy/mcp/*` routes removed from codebase
- **Singleton Metrics**: Prometheus metrics use singleton pattern to prevent registration conflicts
- **Direct Middleware Imports**: No conditional middleware loading, all imports are direct
- **Operational-Only Database**: Backend only performs operational updates, never creates tables
- **Clean Startup**: Backend starts without warnings or deprecated endpoint messages
- **Path-Based Auth**: Authentication middleware protects `/mcp/*` endpoints only

### Agent Delegation & Parallel Execution
- **MANDATORY**: Use specialized agents when available (better-auth-orchestrator, enhanced-database-expert, etc.)
- **MANDATORY**: Send all independent tool calls in single message for parallel execution
- **Performance Impact**: Parallel execution is 3-5x faster than sequential calls

### Authentication & Route Protection
- **Client-Side Auth Pattern**: Admin routes use client components with `useSession()` hooks
- **Role-Based Access Control**: Azure AD groups map to Better-Auth roles (admin/user/server_owner)
- **Graceful Redirects**: Non-admin users redirect to dashboard (not 404)
- **Loading States**: Proper loading indicators during authentication checks
- **Environment Separation**: T3 Env handles server/client variable validation

### Security & Best Practices
- Never commit `.env` files (use `.env.example` templates)
- Better-Auth with multi-provider SSO (Google, GitHub, Microsoft/Entra ID) for authentication and session management
- Pydantic validation for backend, Zod validation for frontend
- Rate limiting: Admin (1000 RPM), Server Owner (500 RPM), User (100 RPM), Anonymous (20 RPM)
- Centralized logging utility (replaced all console.log statements)
- Type-safe database operations with Drizzle ORM (unified in frontend)
- Environment-aware configuration and structured logging
- Automated database health monitoring with performance scoring

### Database Performance & Optimization
- **38 Strategic Indexes**: Essential + composite indexes for 40-90% query performance improvement
- **3 Database Functions**: Real-time analytics and monitoring capabilities (`get_server_health_summary`, `get_request_performance_summary`, `get_tenant_usage_summary`)
- **3 Monitoring Views**: Operational visibility for database health and performance (`database_size_summary`, `index_usage_summary`, `performance_monitoring`)
- **Automated Health Monitoring**: Database health scoring and performance tracking with `npm run db:health`
- **Migration Management**: Automated migrations with comprehensive rollback support
- **Test Coverage**: Database optimization test suite with performance validation and health check testing
- **Maintenance Automation**: Scheduled optimization tasks with `npm run db:maintenance`

---

**important-instruction-reminders**
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.