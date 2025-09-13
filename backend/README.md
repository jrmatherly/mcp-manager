# MCP Registry Gateway - Backend

Enterprise-grade backend for the MCP (Model Context Protocol) Registry, Gateway, and Proxy System.

## Features

- **Unified Architecture**: FastAPI + FastMCP integration in a single unified application
- **Multi-tenancy Support**: Role-based access control with tenant isolation
- **Authentication**: Azure OAuth integration with JWT token management
- **Database Integration**: PostgreSQL with SQLModel ORM and Redis caching
- **Performance**: Async/await throughout with connection pooling and caching
- **Monitoring**: Structured logging, metrics, and distributed tracing support

## Quick Start

### Development Setup

```bash
# Install dependencies with UV
uv sync

# Run development server
uv run mcp-gateway serve --reload --port 8000

# Run tests
uv run pytest

# Code quality checks
uv run ruff check .
uv run mypy .
```

### Database Setup

```bash
# Apply database migrations
uv run alembic upgrade head

# Create new migration (if needed)
uv run alembic revision --autogenerate -m "description"
```

## Architecture

- **Core**: FastAPI application with FastMCP server integration
- **Database**: SQLModel with async PostgreSQL driver
- **Caching**: Redis for session management and performance
- **Security**: JWT tokens with Azure OAuth provider
- **API**: RESTful endpoints with OpenAPI documentation

## Configuration

Copy `.env.example` to `.env` and configure:

- Database connection (PostgreSQL + Redis)
- Security settings (JWT secrets, Azure OAuth)
- Service configuration (ports, workers, etc.)

## Testing

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov

# Run specific test types
uv run pytest -m unit
uv run pytest -m integration
```

## CLI Commands

```bash
# Main gateway CLI
uv run mcp-gateway

# Demo mode
uv run mcp-demo
```

Part of the [MCP Manager](../README.md) project.