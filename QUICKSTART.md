# Quick Start Guide - MCP Registry Gateway

This guide will help you get the MCP Registry Gateway running quickly, from development to production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Common Development Tasks](#common-development-tasks)
- [Testing](#testing)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js** ≥ 22.0.0 (with npm ≥ 10)
- **PostgreSQL** ≥ 17.0
- **Redis** ≥ 8.0
- **Python** >= 3.12 (with UV package manager)
- **Docker** (optional, for containerized deployment)

### Installation Instructions

#### macOS
```bash
# Using Homebrew
brew install node@22 postgresql@17 redis python@3.10
brew services start postgresql
brew services start redis

# Install UV (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Ubuntu/Debian
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install postgresql-17

# Redis
sudo apt-get install redis-server

# Python and UV
sudo apt-get install python3.12 python3.12-venv
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Windows
Use WSL2 and follow Ubuntu instructions, or use installers from:
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/windows/
- Redis: https://redis.io/docs/getting-started/installation/install-redis-on-windows/
- Python: https://www.python.org/downloads/

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/mcp-manager.git
cd mcp-manager
```

### 2. Backend Setup
```bash
cd backend

# Install Python dependencies with UV
uv sync

# Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

### 3. Frontend Setup
```bash
cd frontend

# Install Node.js dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your configuration
```

## Environment Configuration

### Backend Environment (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/mcp_registry
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-here
SECURITY_TOKEN_EXPIRE_MINUTES=60

# Service Configuration
SERVICE_NAME=mcp-gateway
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8000

# MCP Registry
MREG_MIN_SERVERS=1
MREG_MAX_SERVERS=100
```

### Frontend Environment (.env.local)
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/mcp_registry?sslmode=disable
REDIS_URL=redis://localhost:6379

# Better Auth Configuration
# Generate secret with: npx @better-auth/cli secret
BETTER_AUTH_SECRET=your-better-auth-secret-here
BETTER_AUTH_URL=http://localhost:3000

# OAuth Providers (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=common

# Email Provider (for verification)
RESEND_API_KEY=your-resend-api-key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Logging (optional)
NEXT_PUBLIC_LOG_LEVEL=debug
LOG_LEVEL=debug
```

## Database Setup

### Complete Automated Setup (Recommended)
```bash
cd frontend

# Run fully automated database setup
# - Creates database if needed
# - Runs all migrations
# - Applies PostgreSQL extensions automatically
# - Applies 38 performance indexes automatically
# - Creates analytics functions and monitoring views automatically
# - Verifies schema integrity
npm run db:setup:full

# Seed with test data (optional)
npm run db:seed
```

**✅ That's it!** No manual steps required. The setup is now fully automated.

### Step-by-Step Setup (Advanced)
If you need to run individual steps:
```bash
cd frontend

# 1. Create database
npm run db:setup:create

# 2. Run migrations
npm run db:migrate

# 3. Performance optimizations (now included in db:setup:full)
npm run db:health

# 4. Verify setup
npm run db:setup:verify
```

### Database Management Commands
```bash
# Database setup and management
npm run db:setup          # Complete setup process
npm run db:setup:drop     # Drop database (careful!)
npm run db:setup:create   # Create database
npm run db:setup:test     # Test DB & Redis connections
npm run db:setup:verify   # Verify database schema
npm run db:setup:full     # Create, migrate, and optimize

# Reset and rebuild
npm run db:reset:full     # Complete reset (drop, create, migrate, optimize)
npm run db:reset          # Reset database (dev only)
npm run db:reset-and-seed # Reset and seed with test data

# Migrations and schema
npm run db:generate       # Generate Drizzle types from schema
npm run db:migrate        # Run database migrations
npm run db:push          # Push schema changes (dev only)
npm run db:introspect    # Introspect existing database

# Optimization and maintenance
npm run db:optimize       # Apply performance optimizations
npm run db:health        # Check database health
npm run db:maintenance   # Run maintenance tasks
npm run db:analyze       # Analyze database performance

# Development tools
npm run db:studio        # Open Drizzle Studio GUI
npm run db:seed         # Seed database with test data
```

## Running the Application

### Development Mode

#### Terminal 1: Backend
```bash
cd backend
uv run mcp-gateway serve --reload --port 8000
```

#### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Using Docker Compose (Development)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Common Development Tasks

### Running Tests
```bash
# Frontend tests
cd frontend
npm run test              # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:ui          # Vitest UI

# Backend tests
cd backend
uv run pytest            # Run all tests
uv run pytest -v         # Verbose output
uv run pytest --cov      # With coverage
```

### Code Quality
```bash
# Frontend
cd frontend
npm run lint             # ESLint
npm run typecheck        # TypeScript check
npm run build           # Production build

# Backend
cd backend
uv run ruff check .      # Linting
uv run mypy .           # Type checking
uv run black .          # Format code
```

### Database Operations

#### Reset Database Completely
```bash
cd frontend
npm run db:reset:full    # Drop, create, migrate, optimize
```

#### Update Schema
```bash
# 1. Modify schema files in frontend/src/db/schema/
# 2. Generate migration
npm run db:generate

# 3. Apply migration
npm run db:migrate
```

#### Backup Database
```bash
pg_dump mcp_registry > backup.sql
```

#### Restore Database
```bash
psql mcp_registry < backup.sql
```

## Testing

### Unit Tests
```bash
# Frontend
cd frontend
npm run test:run         # Run once
npm run test:watch       # Watch mode

# Backend
cd backend
uv run pytest tests/unit/
```

### Integration Tests
```bash
# Frontend (including database optimization tests)
cd frontend
npm run test tests/db-optimization.test.ts

# Backend
cd backend
uv run pytest tests/integration/
```

### E2E Tests
```bash
cd frontend
npm run test:e2e
```

## Docker Deployment

### Development with Docker
```bash
# Build and start
docker-compose -f docker-compose.yml up --build

# Run in background
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Stop
docker-compose down

# Clean everything (including volumes)
docker-compose down -v
```

### Production with Docker
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## Production Deployment

### Pre-deployment Checklist
- [ ] Set strong SECRET_KEY and database passwords
- [ ] Configure SSL/TLS certificates
- [ ] Set up backup strategy
- [ ] Configure monitoring and logging
- [ ] Set appropriate rate limits
- [ ] Review security settings
- [ ] Test backup and restore procedures

### Environment Variables (Production)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db-host:5432/mcp_registry?sslmode=require
REDIS_URL=redis://:password@redis-host:6379

# Better Auth (Frontend)
BETTER_AUTH_SECRET=<strong-random-key-generated-with-cli>
BETTER_AUTH_URL=https://yourdomain.com

# Backend Security
SECRET_KEY=<strong-random-backend-key>
ALLOWED_ORIGINS=https://yourdomain.com

# OAuth Providers (with production credentials)
GITHUB_CLIENT_ID=<production-github-client-id>
GITHUB_CLIENT_SECRET=<production-github-secret>
# ... other providers as needed
```

### Deployment Platforms

#### Vercel (Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Railway/Render (Full Stack)
1. Connect GitHub repository
2. Configure environment variables
3. Set build command: `npm run build`
4. Set start command: `npm run start`

#### AWS/GCP/Azure
Use Docker images with Kubernetes or container services:
```bash
# Build images
docker build -t mcp-frontend ./frontend
docker build -t mcp-backend ./backend

# Push to registry
docker push your-registry/mcp-frontend
docker push your-registry/mcp-backend
```

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Check connection
psql -U postgres -h localhost -p 5432

# Reset and recreate database (fully automated)
cd frontend
npm run db:reset:full
```

**Note:** The `db:setup:full` command now handles all database setup automatically, including PostgreSQL extensions, performance indexes, functions, and views. No manual SQL execution is required.

#### Redis Connection Failed
```bash
# Check Redis is running
redis-cli ping

# Start Redis
redis-server

# On macOS
brew services start redis

# On Ubuntu
sudo systemctl start redis
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000  # Frontend
lsof -i :8000  # Backend

# Kill process
kill -9 <PID>
```

#### Migration Errors
```bash
# Reset migrations
cd frontend
npm run db:reset:full

# Or manually
psql mcp_registry -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run db:migrate
```

#### TypeScript Errors
```bash
# Regenerate types
cd frontend
npm run db:generate
npm run typecheck
```

#### Authentication Issues
- Verify BETTER_AUTH_SECRET is set (generate with: `npx @better-auth/cli secret`)
- Check OAuth provider credentials (GitHub, Google, Azure)
- Ensure callback URLs are configured correctly in OAuth providers
- Verify BETTER_AUTH_URL matches your application URL
- Check RESEND_API_KEY for email verification
- Clear browser cookies and session storage

#### Docker Issues
```bash
# Clean Docker system
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check logs
docker-compose logs <service-name>
```

### Getting Help

1. Check the [documentation](./docs/)
2. Search [existing issues](https://github.com/yourusername/mcp-manager/issues)
3. Create a new issue with:
   - Environment details (OS, Node version, etc.)
   - Error messages and logs
   - Steps to reproduce

## Next Steps

- Read the [Architecture Documentation](./docs/architecture.md)
- Review [API Documentation](http://localhost:8000/docs)
- Explore the [Database Schema](./frontend/src/db/schema/)
- Learn about [Better-Auth Integration](./docs/auth.md)
- Understand [MCP Protocol](./docs/mcp-protocol.md)

---

**Need more help?** Check the full documentation in `/docs` or open an issue on GitHub.