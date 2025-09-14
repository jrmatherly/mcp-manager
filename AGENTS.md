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
uv sync                               # Install dependencies
uv run mcp-gateway serve --reload --port 8000  # Dev server
uv run pytest                         # Run tests
uv run ruff check . && uv run mypy .  # Quality checks
uv run alembic upgrade head           # Apply migrations
```

### Frontend (Next.js/React)
**CRITICAL**: All database management is now in the frontend (TypeScript).

```bash
cd frontend
npm install                           # Install dependencies
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

**When tests fail, fix the code, not the test.**

- **Backend**: `pytest` with markers (`@pytest.mark.unit`, `@pytest.mark.integration`)
- **Frontend**: Vitest with React Testing Library
- **Database**: Comprehensive optimization tests in `frontend/tests/db-optimization.test.ts`
- **Coverage**: 80% minimum, 95% for critical paths
- **Test Infrastructure**: Vitest configured with BigInt support, PostgreSQL integration
- **Location**: `backend/tests/`, `frontend/tests/` with specialized test utilities

## File Organization

### Critical Directories
- **`reports/`**: ALL project reports and documentation
- **`temp/`**: Temporary files, debugging scripts (never commit)
- **`docs/agents/`**: Detailed documentation (see below)

### Environment Files
- `backend/.env` - Backend config (Python/FastAPI)
- `frontend/.env.local` - Frontend Next.js config with database credentials
- Root `.env` - Docker Compose variables

### Database Management (Important Changes)
- **Fully Automated Setup**: `npm run db:setup:full` now handles everything automatically
- **Unified in Frontend**: All database operations moved from Python to TypeScript
- **SQL Consolidation**: All SQL files consolidated in `frontend/drizzle/sql/`
- **Auto-Applied Optimizations**: Extensions, 38 indexes, functions, and views applied automatically
- **Setup Script**: Database setup via `frontend/src/db/setup.ts` (replaces Python scripts)
- **Archived Scripts**: Python database scripts moved to `backend/scripts/archive/`

## Detailed Documentation

For comprehensive guides, see:

- **[Backend Development](./docs/agents/backend-development.md)** - Python/FastAPI, testing, conventions
- **[Frontend Development](./docs/agents/frontend-development.md)** - Next.js/React, testing, types
- **[Docker & Deployment](./docs/agents/docker-deployment.md)** - Container operations, environment setup
- **[Testing & Quality](./docs/agents/testing-quality.md)** - Testing philosophy, file organization, reports
- **[Security & Configuration](./docs/agents/security-configuration.md)** - Auth, validation, environment variables
- **[Agent Delegation](./docs/agents/agent-delegation.md)** - Specialist agents, parallel execution

## Dependencies

**Backend**: Python ≥3.10, FastAPI ≥0.114.2, FastMCP ≥0.4.0, PostgreSQL ≥17, Redis ≥8
**Frontend**: Node.js ≥22, Next.js 15.5.3, React 19.1.1, TypeScript 5.9.2
**Database**: PostgreSQL ≥17 with 38 performance indexes, 3 analytics functions, 3 monitoring views
**Testing**: Vitest with BigInt support, PostgreSQL integration, comprehensive database test suite

## ⚠️ Critical Rules

### Agent Delegation & Parallel Execution
- **MANDATORY**: Use specialized agents when available (better-auth-orchestrator, enhanced-database-expert, etc.)
- **MANDATORY**: Send all independent tool calls in single message for parallel execution
- **Performance Impact**: Parallel execution is 3-5x faster than sequential calls

### Security & Best Practices
- Never commit `.env` files (use `.env.example` templates)
- Better-Auth with Microsoft/Entra ID integration for authentication and session management
- Pydantic validation for backend, Zod validation for frontend
- Rate limiting: Admin (1000 RPM), Server Owner (500 RPM), User (100 RPM), Anonymous (20 RPM)
- Centralized logging utility (replaced all console.log statements)
- Type-safe database operations with Drizzle ORM (unified in frontend)
- Environment-aware configuration and structured logging

### Database Performance & Optimization
- **38 Strategic Indexes**: Essential + composite indexes for 40-90% query performance improvement
- **3 Database Functions**: Real-time analytics and monitoring capabilities
- **3 Monitoring Views**: Operational visibility for database health and performance
- **Migration Management**: Automated migrations with comprehensive rollback support
- **Test Coverage**: Database optimization test suite with performance validation

---

**important-instruction-reminders**
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.