# Tech Stack

## Context

Tech stack for the MCP Registry Gateway project - an enterprise-grade MCP (Model Context Protocol) Registry, Gateway, and Proxy System with unified database management, multi-tenancy support, and comprehensive authentication.

**Project-Specific Override**: This overrides global AgentOS defaults for the MCP Registry Gateway project.

## Frontend Stack

- **Framework**: Next.js 15.5.3
- **UI Library**: React 19.1.1
- **Language**: TypeScript 5.9.2
- **Build Tool**: Next.js (Turbopack for development)
- **Package Manager**: npm
- **Node Version**: 22 LTS
- **CSS Framework**: TailwindCSS 4.1.13
- **UI Components**: Radix UI + custom components
- **Authentication**: Better-Auth 1.3.9
- **Database ORM**: Drizzle ORM 0.44.5
- **Environment Validation**: T3 Env (@t3-oss/env-nextjs)
- **Testing**: Vitest 3.2.4 with React Testing Library
- **Icons**: Lucide React 0.544.0
- **Font Provider**: Google Fonts (Geist font)
- **Font Loading**: Next.js Font Optimization
- **State Management**: React Query (TanStack Query 5.87.4)
- **Form Management**: React Hook Form 7.62.0 + Zod validation
- **Notifications**: React Hot Toast 2.6.0

## Backend Stack

- **Framework**: FastAPI ≥0.114.2
- **Language**: Python ≥3.10,<3.13
- **MCP Implementation**: FastMCP ≥0.4.0
- **Package Manager**: UV (not pip/poetry)
- **Type Validation**: Pydantic v2 Settings
- **Database Client**: asyncpg 0.30.0, psycopg 3.1.13
- **Environment Management**: Pydantic Settings
- **Testing**: pytest 7.4.3 with pytest-asyncio
- **Code Quality**: Ruff 0.6.0 (linting), MyPy 1.8.0 (type checking), Black 24.0.0
- **ASGI Server**: Uvicorn with standard extras
- **HTTP Client**: httpx 0.25.1, aiohttp 3.9.0
- **Security**: PyJWT, PassLib, Cryptography

## Shared Infrastructure

- **Primary Database**: PostgreSQL 17 (Alpine)
  - 38 performance indexes for 40-90% query optimization
  - 3 analytics functions for real-time monitoring
  - 3 monitoring views for operational visibility
  - Automated health monitoring and performance scoring
- **Cache/Sessions**: Redis 8 (Alpine)
  - Session management and caching
  - LRU eviction policy with 256MB memory limit
- **Container Platform**: Docker & Docker Compose
  - Multi-stage builds for production optimization
  - Development environment with hot reloading
  - Health checks for all services

## Database Architecture

- **Schema Management**: Frontend (TypeScript/Drizzle) owns all schema operations
- **Migrations**: Drizzle Kit with comprehensive rollback support
- **Operations**: Backend (Python/FastAPI) handles operational updates only
- **Connection Pooling**: Native connection pooling (PgBouncer ready for production)
- **Performance**: 38 strategic indexes for optimal query performance
- **Monitoring**: Automated health checks and performance analytics

## Authentication & Security

- **User Authentication**: Better-Auth with multi-provider SSO
- **OAuth Providers**: Google, GitHub, Microsoft/Azure AD with role mapping
- **API Authentication**: JWT tokens, API keys with tiered rate limiting
- **Role System**: 6-tier RBAC (admin, manager, developer, analyst, viewer, guest)
- **Session Management**: Redis-backed sessions with secure configuration
- **Azure Integration**: Azure AD groups automatically map to Better-Auth roles
- **Rate Limiting**: Tiered (Admin: 1000 RPM, User: 100 RPM, Anonymous: 20 RPM)

## Development Tools

- **Version Control**: Git with feature branch workflow
- **CI/CD**: GitHub Actions (or Bitbucket Cloud Actions)
- **Code Quality**:
  - Frontend: ESLint 9, TypeScript strict mode
  - Backend: Ruff, MyPy, Black with 88-character line length
- **API Documentation**: OpenAPI/Swagger with Scalar API Reference
- **Database Management**: Drizzle Studio for visual database management
- **Environment Management**: T3 Env (frontend), Pydantic Settings (backend)

## Testing Strategy

- **Coverage Requirements**: 80% minimum, 95% for critical paths
- **Unit Tests**: Vitest (frontend), pytest (backend) with async support
- **Integration Tests**: API flows, database operations, auth workflows
- **E2E Tests**: Planned for critical user journeys
- **Performance Tests**: Database optimization benchmarks and health validation
- **Test Organization**: Specialized test directories with comprehensive utilities

## Development & Deployment

- **Development**: Docker Compose with hot reloading and file watching
- **Production**: Multi-stage Docker builds with unified server architecture
- **Environment Management**: Type-safe validation with .env files
- **Monitoring**: Prometheus metrics, structured JSON logging, health endpoints
- **Observability**: Comprehensive logging with consola, performance tracking
- **Process Management**: UV for Python dependencies, npm for Node.js

## Asset Management

- **Static Assets**: Next.js public directory with optimization
- **Image Optimization**: Next.js Image component with automatic formats
- **API Assets**: FastAPI static file serving
- **CDN**: Optional (CloudFlare, Fastly) for production scaling

## Version Management

**Last Updated**: January 2025

**Key Version Dependencies**:
- Next.js: Follow React compatibility matrix
- Python: 3.10-3.12 range for FastAPI/FastMCP compatibility
- PostgreSQL: 17+ for advanced performance features
- Redis: 8+ for latest security and performance improvements

**Upgrade Strategy**:
- Frontend: Regular minor updates, major updates quarterly
- Backend: Security updates immediately, feature updates monthly
- Database: Annual major version upgrades with migration testing
