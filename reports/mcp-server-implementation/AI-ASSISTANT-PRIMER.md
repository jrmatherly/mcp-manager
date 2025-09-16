# AI Assistant Primer: MCP Registry Gateway Implementation

**Document Purpose**: Single source of truth for understanding current state and continuing work seamlessly
**Created**: 2025-09-15
**Phase 1 Progress**: Task 1 Complete (Database Tests), Task 2 Active (API Implementation)
**Branch**: main
**Last Updated**: September 15, 2025 - Task 1 Completion

---

## Executive Summary

**Project**: MCP Registry Gateway - Enterprise-grade MCP (Model Context Protocol) Registry, Gateway, and Proxy System
**Current Status**: 70% implementation ready - Task 1 of Phase 1 complete
**Active Phase**: Phase 1 (Server Registration Foundation) - Task 2 in progress
**Implementation Progress**: Database tests complete (21/21 passing), API development active
**Timeline**: 14-18 weeks total, currently in Week 1 of Phase 1 implementation

**Critical Status**: System has untracked implementation reports in `reports/mcp-server-implementation/` directory requiring git add before next deployment.

### Immediate Action Items
1. **Next Priority**: Begin Phase 1 server registration implementation
2. **Critical Blocker**: None currently
3. **Pending Decision**: 6-role RBAC hierarchy migration timing
4. **Current Focus**: Database foundation and API key management

### Current Implementation Status (65% Ready)
- ✅ **Foundation**: Better-Auth v1.3.9, FastMCP v2.12.3, PostgreSQL with 38 indexes
- ✅ **Database**: Complete Drizzle schema, T3 Env configuration, health monitoring
- ✅ **Authentication**: Client-side auth with Azure AD role mapping working
- ⚠️ **Missing**: OAuth proxy implementation, advanced RBAC, monitoring dashboard
- ❌ **Not Started**: MCP server management, DCR bridge, comprehensive testing

---

## Project Architecture Overview

### Three-Layer Authentication Model
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Better-Auth   │───▶│    FastAPI      │───▶│   MCP Servers   │
│  (Frontend)     │    │  (Backend)      │    │   (External)    │
│ Session & Roles │    │ OAuth Proxy     │    │ Protocol Client │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack Summary
- **Frontend**: Next.js 15.5.3, React 19.1.1, TypeScript 5.9.2, TailwindCSS v4
- **Backend**: Python ≥3.10, FastAPI ≥0.114.2, FastMCP ≥0.4.0
- **Database**: PostgreSQL ≥17 with Drizzle ORM (frontend-managed)
- **Authentication**: Better-Auth with multi-provider SSO (Google, GitHub, Microsoft/Entra ID)
- **Infrastructure**: Docker Compose, Redis for caching

### Key Integration Points
- **Better-Auth ↔ Azure AD**: Automatic role mapping from Azure AD groups
- **Frontend ↔ Backend**: T3 Env for type-safe environment variables
- **Database Management**: All schema operations in frontend TypeScript stack
- **Authentication Flow**: Client-side auth with `/api/auth/*` endpoints

---

## Implementation Plan Summary

### 4-Phase Approach (14-18 weeks total)

**Phase 1: Server Registration Foundation** (3-4 weeks)
*Status*: In Progress (Task 1 Complete, Task 2 Active)
*Dependencies*: None
*Key Deliverables*: MCP server registration, API key management, basic auth, database migrations

**Phase 2: OAuth Authentication Integration** (4-5 weeks)  
*Status*: Not Started  
*Dependencies*: Phase 1  
*Key Deliverables*: OAuth 2.1 proxy, DCR support, FastMCP integration, multi-provider SSO

**Phase 3: RBAC and User Preferences** (4-5 weeks)  
*Status*: Design Complete  
*Dependencies*: Phase 1, Phase 2  
*Key Deliverables*: 6-role hierarchy, permission matrix, MFA, audit logging

**Phase 4: Monitoring and Health** (3-4 weeks)  
*Status*: Not Started  
*Dependencies*: All previous phases  
*Key Deliverables*: System health dashboard, metrics collection, alerting, SLA tracking

### Critical Dependencies Between Phases
- **Phase 1 → Phase 3**: API endpoints must accept 6-role values
- **Phase 2 → Phase 3**: OAuth tokens must contain new role claims
- **Phase 3 → Phase 4**: Monitoring must track all 6 roles
- **Database Migration**: Must complete before any code deployment

---

## Current Implementation Status

### Phase 1: Server Registration Foundation
**Status**: 🟢 **Active Development** (Started September 15, 2025)

#### Completed Foundation Work
- ✅ PostgreSQL database with 38 strategic indexes
- ✅ Drizzle ORM schema with complete type safety
- ✅ T3 Env configuration for type-safe environment variables
- ✅ Better-Auth integration with Azure AD role mapping
- ✅ Client-side authentication pattern working
- ✅ Database health monitoring with performance scoring
- ✅ TailwindCSS v4 theme-aware UI system

#### Phase 1 Task Progress
**✅ Task 1: Database Schema and Migrations** (COMPLETE)
- All 21 database schema validation tests passing
- PostgreSQL timestamp handling fixed
- JSON column operations validated
- Foreign key relationships confirmed
- Cascade delete operations working

**🔄 Task 2: Backend API Implementation** (IN PROGRESS)
- [ ] MCP server registration API endpoints
- [ ] Enhanced API key management with security patterns (`mcp_` prefix, 64-char, 90-day rotation)
- [ ] Server management UI components
- [ ] Audit logging infrastructure
- [ ] Request/response structured logging
- [ ] Basic authentication framework for MCP proxy

**⏳ Task 3: Frontend Server Management Components** (PENDING)
- [ ] Server registration form
- [ ] Server list/grid views
- [ ] Health status displays

**⏳ Task 4: API Integration and State Management** (PENDING)
- [ ] Frontend-backend integration
- [ ] State management setup

**⏳ Task 5: Security and Compliance** (PENDING)
- [ ] Audit logging infrastructure
- [ ] Security pattern implementation

#### Current Blockers
None identified. Phase 1 development is progressing well with Task 1 complete.

### Phase 2: OAuth Authentication Integration
**Status**: 🔴 **Not Started**

#### Critical Missing Components
- [ ] **MCPCompliantOAuthProxy class**: Core OAuth proxy implementation
- [ ] **OAuth2Form React component**: User-facing OAuth configuration
- [ ] **OAuthConnectionTester utilities**: End-to-end validation tools
- [ ] **DCR Bridge implementation**: Dynamic Client Registration support
- [ ] **PKCE end-to-end validation**: Security flow verification
- [ ] **Token synchronization safety measures**: Cross-layer token management

#### Dependencies
- Phase 1 API endpoints accepting new role values
- Azure AD configuration for group mappings
- FastMCP OAuth proxy configuration

### Phase 3: RBAC and User Preferences
**Status**: 🟡 **Design Complete, Implementation Pending**

#### 6-Role Hierarchy Design (Breaking Changes)
```typescript
enum UserRole {
  ADMIN = 'admin',           // Full system access (replaces admin)
  MANAGER = 'manager',       // Team management access (NEW)
  DEVELOPER = 'developer',   // Development access (replaces server_owner)
  ANALYST = 'analyst',       // Analytics access (NEW)
  VIEWER = 'viewer',         // Read-only access (replaces user)
  GUEST = 'guest'            // Limited guest access (NEW)
}
```

#### Critical Migration Requirements
- **Database Migration**: `server_owner` → `developer`, `user` → `viewer`
- **TypeScript Type Updates**: Update all role references
- **Backend Permission Matrix**: Expand from 3 to 6 roles
- **Session Regeneration**: Required on role changes
- **Azure AD Group Mapping**: Update group mappings before deployment

#### Implementation Status
- ✅ Role hierarchy design complete
- ✅ Permission matrix defined (30+ granular permissions)
- ✅ Migration strategy documented
- ❌ Database migration scripts not created
- ❌ TypeScript types not updated
- ❌ Backend role validation not implemented

### Phase 4: Monitoring and Health
**Status**: 🔴 **Not Started**

#### Missing Infrastructure Components
- [ ] **SystemHealthDashboard** (1500+ lines): Real-time monitoring
- [ ] **MetricsCollector with Prometheus**: Performance data collection
- [ ] **AlertManager implementation**: Automated alerting
- [ ] **Real-time analytics dashboard**: Operational visibility
- [ ] **Authentication monitoring**: Security event tracking

---

## Critical Recent Changes

### Major Architectural Updates (Last 10 Commits)
1. **f51fd20**: Documentation consolidation and styling guides
2. **9325b13**: TailwindCSS v4 theme-aware UI system implementation
3. **a4c11a2**: Dark mode enhancements and hover effects
4. **d88cdf8**: Card shadow system with theme transitions
5. **8acacb0**: **CRITICAL**: Database management migrated to frontend TypeScript stack
6. **d9ae095**: Client-side authentication with Azure AD role mapping

### Database Architecture Change (Commit 8acacb0)
**CRITICAL SEPARATION**:
- **Frontend (TypeScript/Drizzle)**: Schema definition, table creation, migrations, Better-Auth
- **Backend (Python/FastAPI)**: Operational updates only, no schema modifications
- **Impact**: All database operations now consolidated in frontend stack

### Authentication System Updates
- **Better-Auth Role Mapping**: Azure AD groups automatically map to roles
- **Client-Side Admin Routes**: Authentication uses client components for better UX
- **T3 Env Integration**: Type-safe environment variable validation
- **Session Management**: Automatic role synchronization during OAuth callbacks

---

## Active Work Items

### Current TODO Analysis
**Active TODOs Found in Codebase**:

1. **Frontend Dashboard** (`frontend/src/app/dashboard/page.tsx:164`):
   ```typescript
   {/* TODO: Add Server Form Modal/Dialog when form component is created */}
   ```
   *Priority*: High (Phase 1 requirement)

2. **Server Management** (`frontend/src/lib/server-management.ts:14`):
   ```typescript
   // TODO: For now, we'll use userId as tenantId for simplicity
   ```
   *Priority*: Medium (needs proper multi-tenancy)

3. **Phase 3 Documentation** (multiple references):
   - Role verification TODO resolved in `role-hierarchy-verification-report.md`
   - Permission checking placeholders in RBAC implementation

### Last Completed Task
**Task 1: Database Schema and Migrations** (Completed: September 15, 2025)
- Fixed all 21 database schema validation tests from 0 passing to 100% passing
- Key fixes implemented:
  - PostgreSQL timestamp string to Date conversions
  - JSON vs JSONB type corrections
  - Added missing required fields (checked_at, created_at, updated_at)
  - Updated tests to match actual database constraints
  - Fixed decimal precision comparisons

### Next Priority Task
**Active**: Task 2 - Backend API Implementation
- Create MCP server registration API endpoints in FastAPI
- Implement enhanced API key management (`mcp_` prefix, 64-char, 90-day rotation)
- Add request/response structured logging
- Set up authentication middleware for MCP proxy

### Blocked Items
None currently identified. All dependencies are clear.

---

## Key Technical Decisions Made

### Authentication Architecture
- **Better-Auth v1.3.9**: Chosen for multi-provider SSO and role management
- **Client-Side Route Protection**: Admin routes use client components with `useSession()` hooks
- **Azure AD Integration**: Automatic group-to-role mapping with fallback mechanisms
- **Session Management**: Regeneration required on role changes for security

### Database Management
- **Frontend-Centric**: All schema operations moved to TypeScript/Drizzle
- **Backend Operational-Only**: Python FastAPI only performs operational updates
- **T3 Env**: Type-safe environment variable validation with Zod schemas
- **Health Monitoring**: Automated database performance scoring

### Role-Based Access Control
- **6-Role Hierarchy**: Expanded from 3-role to 6-role system for granularity
- **Conservative Migration**: `user` → `viewer` to minimize privilege escalation
- **Permission Matrix**: 30+ granular permissions with inheritance
- **Breaking Changes**: Requires coordinated frontend/backend deployment

### MCP Integration
- **FastMCP v2.12.3**: OAuth proxy for MCP protocol compliance
- **Dynamic Client Registration**: DCR bridge for non-DCR providers
- **Token Synchronization**: Atomic refresh across all three layers
- **Security**: PKCE with S256 method, comprehensive audit logging

---

## Known Issues and Gotchas

### Authentication Complexity
- **Azure AD Role Formats**: Returns roles in 4 different formats requiring normalization
- **Token Synchronization**: Must maintain consistency across Better-Auth → FastAPI → MCP layers
- **OAuth State Collision**: Proxy scenarios can cause state parameter conflicts
- **Session Edge Cases**: Role changes require session regeneration to prevent privilege escalation

### Database Management
- **Migration Coordination**: Frontend and backend must deploy simultaneously
- **Type Safety**: T3 Env validation only works in Next.js runtime (CLI scripts use dotenv/config)
- **Performance**: 38 indexes provide 40-90% query improvement but require maintenance
- **Health Monitoring**: Automated scoring requires periodic optimization

### Development Workflow
- **Testing Philosophy**: "Fix tests to match production code" - never modify production for tests
- **Package Managers**: UV only for Python backend, npm for frontend
- **Environment Files**: Separate configs for frontend (.env.local) and backend (.env)
- **Git Workflow**: Feature branches only, never work on main/master

### Security Considerations
- **API Key Management**: 90-day rotation policy with `mcp_` prefix enforcement
- **Rate Limiting**: Role-based limits (admin: 1000 RPM, viewer: 100 RPM)
- **Audit Logging**: 7-year retention requirement for compliance
- **DCR Bridge Requirement**: Non-DCR providers need proxy implementation

---

## Quick Reference - File Locations

### Implementation Documentation
- **Main Plan**: `reports/mcp-server-implementation/add-server-implementation-plan.md`
- **Phase 1**: `reports/mcp-server-implementation/phase-1-server-registration.md`
- **Phase 2**: `reports/mcp-server-implementation/phase-2-authentication-integration.md`
- **Phase 3**: `reports/mcp-server-implementation/phase-3-rbac-preferences.md`
- **Phase 4**: `reports/mcp-server-implementation/phase-4-monitoring-health.md`
- **Coordination**: `reports/mcp-server-implementation/phase-coordination-6-roles.md`

### Validation Reports
- **Implementation Validation**: `reports/mcp-server-implementation/implementation-validation-report.md`
- **Role Hierarchy Verification**: `reports/mcp-server-implementation/role-hierarchy-verification-report.md`
- **Authentication Deep Dive**: `reports/mcp-server-implementation/authentication-deep-dive.md`

### Key Source Files

#### Frontend (TypeScript/Next.js)
- **Authentication**: `frontend/src/lib/auth.ts`
- **Database Schema**: `frontend/src/db/schema/`
  - `frontend/src/db/schema/user.ts` - User and role definitions
  - `frontend/src/db/schema/server.ts` - MCP server schema
  - `frontend/src/db/schema/auth.ts` - Better-Auth tables
- **Environment Config**: `frontend/src/env.ts` (T3 Env validation)
- **Types**: `frontend/src/types/better-auth.ts`
- **Database Setup**: `frontend/src/db/setup.ts`

#### Backend (Python/FastAPI)
- **Main App**: `backend/src/mcp_registry_gateway/main.py`
- **Middleware**: `backend/src/mcp_registry_gateway/middleware/`
  - `auth.py` - Authentication middleware
  - `rate_limiter.py` - Role-based rate limiting
- **Configuration**: `backend/pyproject.toml`
- **Environment**: `backend/.env`

#### Configuration Files
- **Frontend Package**: `frontend/package.json`
- **Backend Dependencies**: `backend/pyproject.toml`
- **Docker**: `docker-compose.yml`
- **Database Config**: `frontend/drizzle.config.ts`

---

## Environment and Configuration

### Development Requirements
- **Frontend**: Node.js ≥22, Next.js 15.5.3, React 19.1.1, TypeScript 5.9.2
- **Backend**: Python ≥3.10, FastAPI ≥0.114.2, FastMCP ≥0.4.0
- **Database**: PostgreSQL ≥17 with 38 performance indexes
- **Container**: Docker and Docker Compose for local development

### Environment Variables (Critical)

#### Frontend (.env.local)
```bash
# Database (T3 Env validated)
DATABASE_URL="postgresql://username:password@localhost:5432/mcp_registry"

# Better-Auth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_TENANT_ID="your-tenant-id"
```

#### Backend (.env)
```bash
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/mcp_registry"

# FastMCP Configuration (to be implemented)
FASTMCP_OAUTH_SCOPES="openid profile email groups"
FASTMCP_DCR_ENABLED="true"
FASTMCP_METRICS_ENDPOINT="http://localhost:8000/metrics"

# Security
MCP_API_KEY_ROTATION_DAYS="90"
MCP_AUDIT_RETENTION_DAYS="2555"  # 7 years
```

### T3 Env Usage Patterns

| Context | Import Pattern | Reason |
|---------|---------------|---------|
| **Next.js App Code** | `import { env } from "../env"` | Runs within Next.js runtime |
| **CLI Scripts** | `import "dotenv/config"` | Runs outside Next.js via tsx |
| **Drizzle Config** | `import "dotenv/config"` | Runs outside Next.js via drizzle-kit |

---

## Testing Requirements

### Testing Philosophy
**CRITICAL RULE**: When tests fail, fix the test to match production code, not the other way around.

### Current Test Infrastructure
- **Frontend**: Vitest with React Testing Library, BigInt support
- **Backend**: pytest with markers (`@pytest.mark.unit`, `@pytest.mark.integration`)
- **Coverage Targets**: 80% minimum, 95% for critical paths
- **Database Tests**: Performance optimization test suite

### Test Organization
- **Frontend Unit**: `frontend/tests/unit/` - Components, hooks, utilities
- **Frontend Integration**: `frontend/tests/integration/` - API flows, auth workflows
- **Database Tests**: `frontend/tests/db-optimization.test.ts` - Performance validation
- **Backend Tests**: `backend/tests/` - API endpoints, middleware, authentication

### Test Utilities
- **Auth Mocking**: Session and role mocking utilities
- **Database Utilities**: Test database setup and teardown
- **API Mocking**: MSW (Mock Service Worker) for API testing
- **Performance Testing**: Database optimization and query performance

---

## Next Steps - Priority Order

### 1. Immediate (This Week)
**Priority**: Critical  
**Task**: Begin Phase 1 implementation  
**Files**: 
- Create API endpoints in `backend/src/mcp_registry_gateway/api/servers.py`
- Implement server management UI in `frontend/src/components/server-management/`
- Update dashboard to remove TODO and add functional server form

**Success Criteria**:
- [ ] MCP server registration API endpoint functional
- [ ] Basic server management UI components created
- [ ] Dashboard TODO removed with working form
- [ ] API key generation with security patterns implemented

### 2. Short Term (Next 2 Weeks)
**Priority**: High  
**Task**: Complete Phase 1 foundation  
**Dependencies**: Immediate tasks completed  

**Deliverables**:
- [ ] Enhanced API key management with 90-day rotation
- [ ] Audit logging infrastructure
- [ ] Request/response structured logging
- [ ] Database migration for server registration schema
- [ ] Basic authentication framework preparation

### 3. Medium Term (Next Month)
**Priority**: Medium  
**Task**: Phase 2 OAuth integration preparation  
**Dependencies**: Phase 1 completion  

**Planning Requirements**:
- [ ] MCPCompliantOAuthProxy class design
- [ ] Azure AD configuration update planning
- [ ] DCR bridge implementation strategy
- [ ] Token synchronization architecture finalization

---

## Common Commands

### Frontend Development
```bash
cd frontend
npm install                 # Install dependencies
npm run dev                 # Start dev server (--turbopack)
npm run db:setup:full       # Complete automated DB setup
npm run test                # Run Vitest tests
npm run build               # Production build
npm run lint                # ESLint checks
npm run typecheck           # TypeScript validation
npm run db:studio           # Open Drizzle Studio
npm run db:health           # Database health check
```

### Backend Development
```bash
cd backend
uv sync                     # Install dependencies (UV only)
uv run mcp-gateway serve --reload --port 8000  # Start dev server
uv run pytest              # Run tests
uv run ruff check . && uv run mypy .           # Quality checks
```

### Docker Operations
```bash
docker-compose up -d        # Start all services
docker-compose logs -f backend  # View backend logs
docker-compose down -v      # Stop and remove volumes
```

### Database Operations
```bash
# Frontend database management
cd frontend
npm run db:generate         # Generate Drizzle types
npm run db:migrate          # Run migrations
npm run db:seed             # Seed test data
npm run db:optimize         # Optimize performance
npm run db:maintenance      # Scheduled maintenance
```

---

## Session Handoff Checklist

When starting a new AI assistant session, verify:

### Context Loading
- [ ] Review this primer document for current state
- [ ] Check git status for uncommitted changes
- [ ] Verify current branch (should be feature branch, not main)
- [ ] Review recent commits for context

### Implementation Status
- [ ] Check for active TODOs in recently modified files
- [ ] Verify current phase from implementation plan
- [ ] Review any error logs or failed deployments
- [ ] Validate test status with `npm run test` and `uv run pytest`

### Environment Validation
- [ ] Frontend dev server running (`npm run dev`)
- [ ] Backend server running (`uv run mcp-gateway serve`)
- [ ] Database accessible (`npm run db:health`)
- [ ] Docker services up (`docker-compose ps`)

### Recent Work Analysis
- [ ] Review last commit message and changes
- [ ] Check for any breaking changes since last session
- [ ] Verify environment variables are current
- [ ] Validate dependencies are up to date

---

## Critical Warnings

### Deployment Safety
- **DO NOT** deploy without database migration completion
- **DO NOT** update roles without session regeneration
- **ALWAYS** maintain backward compatibility during migration
- **ALWAYS** test Azure AD integration with real tenant before production

### Development Safety
- **DO NOT** modify production code to make tests pass
- **DO NOT** work directly on main/master branch
- **ALWAYS** create feature branches for all work
- **ALWAYS** run quality checks before commits

### Database Safety
- **DO NOT** run migrations without backup
- **DO NOT** modify schema from backend (use frontend only)
- **ALWAYS** validate migration scripts before execution
- **ALWAYS** test rollback procedures

### Authentication Safety
- **DO NOT** skip session regeneration on role changes
- **DO NOT** ignore OAuth state validation
- **ALWAYS** validate token synchronization across layers
- **ALWAYS** test with real Azure AD tenant

---

## Glossary of Project-Specific Terms

### Core Technologies
- **MCP**: Model Context Protocol - standardized protocol for AI model communication
- **Better-Auth**: Authentication library for Next.js with multi-provider support
- **FastMCP**: FastAPI-based MCP implementation with OAuth proxy capabilities
- **T3 Env**: Type-safe environment variable validation library
- **Drizzle ORM**: TypeScript-first ORM for PostgreSQL

### Authentication Concepts
- **DCR**: Dynamic Client Registration (OAuth 2.1 specification)
- **PKCE**: Proof Key for Code Exchange (OAuth security extension)
- **RBAC**: Role-Based Access Control (6-role hierarchy implementation)
- **SSO**: Single Sign-On (multi-provider authentication)

### System Architecture
- **Three-Layer Auth**: Better-Auth → FastAPI → MCP Servers authentication flow
- **Frontend-Centric DB**: Database management consolidated in TypeScript stack
- **Client-Side Auth**: Authentication checks performed in client components
- **Token Synchronization**: Coordinated token management across all layers

### Development Workflow
- **UV**: Python package manager (replaces pip/poetry)
- **Feature Branches**: All work done on feature branches, never main
- **Parallel Execution**: Multiple tool calls in single message for efficiency
- **Conservative Migration**: Principle of least privilege for role transitions

---

## Communication Context

### Project Guidelines
- **AGENTS.md**: Primary guidance for AI assistants working in repository
- **Testing Philosophy**: "Fix tests to match production code" principle
- **Conservative Approach**: Principle of least privilege for all permissions
- **Documentation First**: Comprehensive documentation before implementation

### Quality Standards
- **Code Coverage**: 80% minimum, 95% for critical authentication paths
- **Response Times**: <200ms API response, <500ms authentication flow
- **Security Standards**: OAuth 2.1 compliance, PKCE implementation, audit logging
- **Performance**: 40-90% query improvement with strategic indexing

### Team Conventions
- **Commit Messages**: Descriptive, avoid "fix", "update", "changes"
- **Branch Naming**: `feature/description`, `bugfix/description`
- **TODO Comments**: Mark implementation points, include line references
- **Error Handling**: try/catch with proper typing, toast notifications

---

**Document Status**: Complete and current  
**Next Review**: After Phase 1 completion  
**Maintenance**: Update after major architectural changes or phase completions  
**Emergency Contact**: Check git log and recent commits for latest context

**Critical Success Factor**: This document must be updated as phases complete to maintain accuracy for future AI assistant sessions.