# Development Setup - MCP Registry Gateway

This document provides comprehensive guidance for setting up the development environment for the MCP Registry Gateway project with its unified FastAPI/FastMCP architecture.

> **📖 Part of**: [MCP Registry Gateway](../README.md) | **🏠 Project Root**: [mcp-manager](../)

---

## 🏗️ **Architecture Overview**

### **Unified Single-Server Architecture**
- **Single Process**: FastAPI + FastMCP integrated in one application
- **REST API**: Available at `/api/v1/*`
- **MCP Operations**: Available at `/mcp/*`
- **OAuth Integration**: Azure OAuth for authentication
- **Ports**: 8000 (production), 8002 (development with docker-compose)

---

## ⚙️ **Development Environment**

### **Required Tools**
- **Python**: 3.10 - 3.12
- **Node.js**: >= 18
- **Docker & Docker Compose**: For PostgreSQL and Redis
- **UV**: Modern Python package manager (automatically installed)

### **Package Managers**
- **Backend**: UV (Python) - modern, fast package manager
- **Frontend**: npm (Node.js) - standard package manager

---

## 🚀 **Quick Start**

### **1. Clone and Navigate**
```bash
git clone <repository-url>
cd mcp-manager
```

### **2. Backend Setup**
```bash
cd backend

# Install dependencies
uv sync --all-groups --all-extras

# Create environment file
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# Start database services
docker-compose up -d postgres redis

# Initialize database
uv run alembic upgrade head
uv run mcp-gateway init-db

# Start development server
uv run mcp-gateway serve --reload --port 8000
```

### **3. Frontend Setup (Optional)**
```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### **4. Docker Development (Alternative)**
```bash
# From project root
cp .env.example .env
docker-compose up -d

# Development with hot reload
docker-compose --profile dev up app-dev
```

---

## 🔧 **Environment Configuration**

### **Backend Environment Variables**

Create `backend/.env` from `backend/.env.example`:

```bash
# Core Application
APP_NAME="MCP Registry Gateway"
APP_VERSION="0.1.0"
ENVIRONMENT=development
DEBUG=true

# Database (PostgreSQL)
DB_POSTGRES_HOST=localhost
DB_POSTGRES_PORT=5432
DB_POSTGRES_USER=mcp_user
DB_POSTGRES_PASSWORD=mcp_password
DB_POSTGRES_DB=mcp_registry

# Cache (Redis)
DB_REDIS_HOST=localhost
DB_REDIS_PORT=6379
DB_REDIS_PASSWORD=
DB_REDIS_DB=0

# Security
SECURITY_JWT_SECRET_KEY=your-jwt-secret-change-this
SECURITY_JWT_ALGORITHM=HS256
SECURITY_JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Azure OAuth (Optional)
SECURITY_AZURE_TENANT_ID=your-tenant-id
SECURITY_AZURE_CLIENT_ID=your-client-id
SECURITY_AZURE_CLIENT_SECRET=your-client-secret

# Service Configuration
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8000
SERVICE_WORKERS=1

# FastMCP Settings
MREG_FASTMCP_ENABLED=true
MREG_FASTMCP_PORT=8001  # Not used in unified mode
MREG_FASTMCP_HOST=0.0.0.0
```

### **Frontend Environment Variables**

Create `frontend/.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MCP_URL=http://localhost:8000/mcp

# Database (for Drizzle ORM)
DATABASE_URL=postgresql://mcp_user:mcp_password@localhost:5432/mcp_registry

# Better-Auth
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_URL=http://localhost:3000
```

---

## 🛠️ **Development Tools**

### **Backend Development Commands**

```bash
# Package Management
uv sync                              # Install dependencies
uv sync --all-groups                 # Install all dependency groups
uv add <package>                     # Add runtime dependency
uv add <package> --group dev         # Add dev dependency

# Development Server
uv run mcp-gateway serve --reload --port 8000  # Start with hot reload
uv run mcp-gateway serve --help                # See all options

# Database Management
uv run alembic upgrade head          # Apply migrations
uv run alembic revision --autogenerate -m "description"  # Create migration
uv run mcp-gateway init-db           # Initialize database
uv run mcp-gateway optimize-db       # Apply performance optimizations

# Code Quality
uv run ruff check .                  # Lint code
uv run ruff format .                 # Format code
uv run mypy .                        # Type checking
uv run pytest                        # Run tests
uv run pytest --cov                  # Run tests with coverage

# Utilities
uv run mcp-gateway config            # Show configuration
uv run mcp-gateway validate          # Validate environment
uv run mcp-gateway healthcheck       # Check system health
uv run mcp-demo                      # Run interactive demo
```

### **Frontend Development Commands**

```bash
# Development
npm run dev                          # Start dev server with Turbopack
npm run build                        # Production build
npm run start                        # Start production server

# Database (Drizzle)
npm run db:generate                  # Generate migrations
npm run db:migrate                   # Apply migrations
npm run db:push                      # Push schema changes
npm run db:studio                    # Open Drizzle Studio

# Code Quality
npm run lint                         # ESLint checks
npm run type-check                   # TypeScript checks
```

---

## 🐋 **Docker Development**

### **Using Docker Compose**

```bash
# Start all services (production mode)
docker-compose up -d

# Start development mode with hot reload
docker-compose --profile dev up app-dev

# View logs
docker-compose logs -f app
docker-compose logs -f app-dev

# Stop services
docker-compose down
docker-compose down -v  # Also remove volumes
```

### **Docker Services**
- **postgres**: PostgreSQL database
- **redis**: Redis cache
- **app**: Production unified server (port 8000)
- **app-dev**: Development server with hot reload (port 8002)

---

## 🔍 **IDE Configuration**

### **VS Code**

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "backend/.venv/bin/python",
  "python.terminal.activateEnvironment": true,
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  },
  "ruff.path": ["backend/.venv/bin/ruff"],
  "mypy-type-checker.path": ["backend/.venv/bin/mypy"],
  "typescript.tsdk": "frontend/node_modules/typescript/lib",
  "editor.formatOnSave": true
}
```

### **VS Code Debug Configuration**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend: MCP Gateway",
      "type": "python",
      "request": "launch",
      "module": "mcp_registry_gateway.cli",
      "args": ["serve", "--reload", "--port", "8000"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/backend/src"
      },
      "envFile": "${workspaceFolder}/backend/.env"
    },
    {
      "name": "Frontend: Next.js",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal",
      "envFile": "${workspaceFolder}/frontend/.env.local"
    }
  ]
}
```

---

## 🧪 **Testing Setup**

### **Backend Testing**

```bash
cd backend

# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src/mcp_registry_gateway

# Run specific test file
uv run pytest tests/test_auth.py

# Run tests matching pattern
uv run pytest -k "test_login"

# Run with verbose output
uv run pytest -v

# Run unit tests only
uv run pytest -m unit

# Run integration tests only
uv run pytest -m integration
```

### **Frontend Testing**

```bash
cd frontend

# Run tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

---

## 📝 **Common Development Tasks**

### **Adding a New API Endpoint**

1. **Backend**: Add route in `backend/src/mcp_registry_gateway/api/routes/`
2. **Test**: Create test in `backend/tests/`
3. **Frontend**: Update API client in `frontend/src/lib/api/`
4. **Documentation**: Update OpenAPI docs (auto-generated)

### **Database Schema Changes**

1. **Modify**: Update SQLModel in `backend/src/mcp_registry_gateway/db/models.py`
2. **Generate**: `uv run alembic revision --autogenerate -m "description"`
3. **Review**: Check generated migration in `backend/alembic/versions/`
4. **Apply**: `uv run alembic upgrade head`

### **Environment Variable Changes**

1. **Add**: Update `backend/.env.example` and root `.env.example`
2. **Configure**: Add to `backend/src/mcp_registry_gateway/core/config.py`
3. **Document**: Update this guide and AGENTS.md
4. **Docker**: Update docker-compose.yml if needed

---

## 🔧 **Troubleshooting**

### **Common Issues and Solutions**

#### **Port Already in Use**
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process
kill -9 <PID>
```

#### **Database Connection Failed**
```bash
# Check PostgreSQL is running
docker-compose ps postgres
# Restart if needed
docker-compose restart postgres
# Check logs
docker-compose logs postgres
```

#### **Redis Connection Failed**
```bash
# Check Redis is running
docker-compose ps redis
# Test connection
redis-cli ping
```

#### **Import Errors**
```bash
# Ensure you're in backend directory
cd backend
# Reinstall dependencies
uv sync --all-groups --all-extras
# Check Python version
python --version  # Should be 3.10-3.12
```

#### **Frontend Build Errors**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

---

## 📚 **Next Steps**

- **[Development Workflow](DEVELOPMENT_WORKFLOW.md)** - Code quality and testing workflow
- **[API Documentation](http://localhost:8000/docs)** - Interactive API docs (when server is running)
- **[MCP Documentation](http://localhost:8000/mcp/docs)** - MCP-specific endpoints

---

**Last Updated**: 2025-01-12  
**Project**: [MCP Registry Gateway](https://github.com/jrmatherly/mcp-manager)