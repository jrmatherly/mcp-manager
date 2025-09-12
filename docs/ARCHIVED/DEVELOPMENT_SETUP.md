# Development Setup - MCP Registry Gateway

This document provides comprehensive guidance for setting up the development environment for the MCP Registry Gateway project.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## ⚙️ **Development Environment**

### **Package Manager**
- **Tool**: UV (modern Python package manager)  
- **Virtual Environment**: Managed automatically by UV  
- **Dependency Groups**: dev, test, lint, docs (see pyproject.toml)

### **Development Tools (Global Installation)**
- **Formatter**: `uv tool install ruff` (formatting and linting)  
- **Type Checker**: `uv tool install mypy` (static type analysis)  
- **Testing**: `uv tool install pytest` (test framework)  
- **Coverage**: `uv tool install coverage` (test coverage reporting)

### **Command Patterns**
```bash
# Package management
uv sync                              # Install dev dependencies
uv sync --all-groups                 # Install all dependency groups
uv sync --no-dev                     # Production dependencies only
uv add <package>                     # Add runtime dependency
uv add <package> --group test        # Add test dependency

# Development tools (global)
uv tool run ruff check src/ --fix    # Lint and auto-fix
uv tool run ruff format src/         # Format code
uv tool run mypy src/                # Type checking
uv tool run pytest --cov=src/       # Run tests with coverage

# Application commands
uv run mcp-gateway serve --port 8001 # Start development server
uv run mcp-gateway healthcheck       # Health check
uv run mcp-gateway config            # Show configuration
uv run mcp-gateway demo              # Run demo
```

## 🚀 **Getting Started**

### **Quick Setup**
```bash
# Automated setup (recommended)
./scripts/setup.sh

# Manual setup
uv sync --all-groups                 # Install all dependencies
cp .env.example .env                 # Create environment file
# Edit .env with your database credentials
docker-compose up -d postgres redis # Start services
uv run mcp-gateway init-db           # Initialize database
uv run mcp-gateway serve --port 8001 # Start gateway
```

### **Development Workflow**
```bash
# 1. Start services
docker-compose up -d postgres redis

# 2. Code development  
./scripts/format.sh                 # Format code
./scripts/lint.sh                   # Check code quality
./scripts/test.sh                   # Run tests

# 3. Test unified gateway
uv run mcp-gateway serve --port 8000 # Single unified server with all features

# 4. Demo and testing
uv run mcp-gateway demo  # Test all endpoints
# OAuth features require Azure OAuth configuration (see Authentication section)
```

## 🔧 **Development Tools Setup**

### **Global Tool Installation**
```bash
# Install development tools globally with UV
uv tool install ruff     # Code formatter and linter
uv tool install mypy     # Static type checker
uv tool install pytest   # Testing framework
uv tool install coverage # Test coverage analysis
```

### **IDE Configuration**

#### **VS Code Settings**
```json
{
  "python.defaultInterpreterPath": ".venv/bin/python",
  "python.formatting.provider": "none",
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  },
  "ruff.args": ["--config", "pyproject.toml"]
}
```

#### **PyCharm Configuration**
- **Interpreter**: Set to project's `.venv/bin/python`
- **Code Style**: Import Ruff configuration from `pyproject.toml`
- **Type Checking**: Enable MyPy integration

### **Pre-commit Hooks (Optional)**
```bash
# Install pre-commit
uv tool install pre-commit

# Setup hooks (if .pre-commit-config.yaml exists)
pre-commit install
```

## 🐋 **Debugging Setup**

### **VS Code Debug Configuration**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI Server",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "mcp_registry_gateway.api.main:create_app",
        "--factory",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload"
      ],
      "console": "integratedTerminal",
      "envFile": "${workspaceFolder}/.env"
    },
    {
      "name": "FastMCP Server",
      "type": "python",
      "request": "launch",
      "module": "mcp_registry_gateway.cli",
      "args": ["serve", "--port", "8000"],
      "console": "integratedTerminal",
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

### **Debug Environment Variables**
```bash
# Add to .env for debug mode
MREG_DEBUG=true
MREG_LOG_LEVEL=DEBUG

# Database debug
MREG_POSTGRES_ECHO=true  # Log all SQL queries
```

## 🔍 **Environment Validation**

### **Configuration Validation**
```bash
# Validate current environment setup
uv run mcp-gateway validate

# Show current configuration
uv run mcp-gateway config

# Show configuration with secrets (development only)
uv run mcp-gateway config --show-secrets
```

### **Health Checks**
```bash
# Check system health
uv run mcp-gateway healthcheck

# Check with extended timeout
uv run mcp-gateway healthcheck --timeout 10

# Test database connectivity
psql -h localhost -U mcp_user -d mcp_registry -c "SELECT version();"

# Test Redis connectivity
redis-cli ping
```

## 📦 **Dependency Management**

### **Adding Dependencies**
```bash
# Runtime dependencies
uv add fastapi
uv add "fastapi[standard]"

# Development dependencies
uv add pytest --group dev
uv add mypy --group lint

# Optional dependencies
uv add redis --optional cache
```

### **Updating Dependencies**
```bash
# Update all dependencies
uv sync --upgrade

# Update specific dependency
uv add fastapi@latest

# Check for outdated packages
uv show --outdated
```

### **Virtual Environment Management**
```bash
# UV automatically manages virtual environments
# Manual venv operations (rarely needed):

# Show venv location
uv venv --python 3.11

# Activate venv manually (usually not needed)
source .venv/bin/activate

# Deactivate
deactivate
```

## 🌍 **Environment Setup**

### **Local Development**
```bash
# 1. Clone repository
git clone <repository-url>
cd fastmcp-manager

# 2. Setup environment
./scripts/setup.sh  # Automated setup

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Start services
docker-compose up -d postgres redis

# 5. Initialize database
uv run mcp-gateway init-db

# 6. Verify setup
uv run mcp-gateway validate
uv run mcp-gateway healthcheck
```

### **Docker Development**
```bash
# Build development image
docker build -t mcp-gateway:dev .

# Run with docker-compose
docker-compose up --build

# Development with volume mounts
docker-compose -f docker-compose.dev.yml up
```

### **Production-like Local Environment**
```bash
# Set production environment
cp .env.example .env.prod
# Configure production settings in .env.prod

# Run with production settings
MREG_ENVIRONMENT=production uv run mcp-gateway serve
```

---

## 📖 **Related Documentation**

- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Environment variables and settings
- **[Development Workflow](DEVELOPMENT_WORKFLOW.md)** - Code quality and testing workflow
- **[Testing Guide](TESTING_GUIDE.md)** - Testing strategies and commands
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)