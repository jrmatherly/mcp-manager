# Docker & Deployment Guide

## Recent Updates

**Database Management Changes (Important):**
- **Unified in Frontend**: All database operations now managed via TypeScript in frontend
- **Automated Setup**: `npm run db:setup:full` handles complete database initialization
- **Health Monitoring**: Built-in health checks with `npm run db:health`
- **Performance Optimization**: 38 indexes, 3 analytics functions, 3 monitoring views applied automatically
- **No Manual SQL**: All SQL execution is now automated through TypeScript scripts

**Authentication Updates:**
- **Multi-Provider SSO**: Google, GitHub, and Microsoft/Entra ID support
- **Better-Auth Integration**: Session management with Redis caching
- **Environment Variables**: Updated OAuth provider configuration

## Docker & Deployment Guide

## Docker Operations

### Basic Commands

```bash
# Start all services (from project root)
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# Rebuild containers (needed after dependency changes)
docker-compose build --no-cache
docker-compose up -d --build

# Stop services
docker-compose down
docker-compose down -v                 # also remove volumes

# Development with file watching
docker-compose watch                  # auto-rebuilds on file changes
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

## Environment Setup

### Development Environment Setup

1. **Backend Setup:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit backend/.env with your values
   uv sync
   uv run alembic upgrade head
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit frontend/.env.local with your values
   npm install
   npm run db:migrate
   ```

3. **Docker Setup:**
   ```bash
   # From project root
   cp .env.example .env
   # Edit root .env for Docker Compose variables
   docker-compose up -d
   ```

**Note on Environment Files:**
- `backend/.env` - Backend application configuration (takes precedence)
- Root `.env` - Docker Compose and fallback configuration
- `frontend/.env.local` - Frontend Next.js configuration

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
