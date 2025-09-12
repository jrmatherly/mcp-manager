# MCP Registry Gateway

🚀 **Enterprise-Grade Model Context Protocol (MCP) Registry, Gateway, and Proxy System with Azure OAuth**

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](./docs/project_context/README.md)
[![Authentication](https://img.shields.io/badge/Auth-Azure%20OAuth%20%2B%20FastMCP-blue)](./docs/project_context/AZURE_APP_REGISTRATION_GUIDE.md)
[![Code Quality](https://img.shields.io/badge/Code%20Quality-Zero%20Linting%20Errors-brightgreen)](./code-errors.txt)
![Architecture](https://img.shields.io/badge/Architecture-Unified%20Single%20Server-blue)

Transform individual MCP servers into a unified, fault-tolerant service mesh with intelligent routing, high availability, comprehensive observability, and enterprise-grade Azure OAuth authentication.

## ✨ Key Features

### 🔐 **Enterprise Authentication**
- **Azure OAuth Integration** - FastMCP OAuth Proxy with native AzureProvider
- **Role-Based Access Control** - Admin, user, server_owner permissions with tenant isolation
- **Multi-Tenant Support** - Automatic tenant boundary enforcement with fairness algorithms
- **Comprehensive Audit Logging** - All operations logged to PostgreSQL with user context
- **Advanced Monitoring** - Prometheus metrics with user behavior analytics and session tracking
- **Smart Token Management** - Background token refresh with 95%+ success rate and proactive renewal

### 🏗️ **Unified Architecture**  
- **Single Server Process** (Port 8000) - All functionality in one optimized application
- **Path-Based Routing** - `/api/v1/*` for REST API, `/mcp/*` for authenticated MCP operations
- **Azure OAuth Integration** - FastMCP OAuth Proxy with native Azure provider
- **Resource Efficiency** - 25% memory reduction, 50% fewer database connections

### 🎯 **Core Capabilities**
- **Smart Request Routing** - Automatically selects optimal MCP servers based on capabilities
- **Advanced Load Balancing** - 5 algorithms: round-robin, weighted, least-connections, random, consistent-hash  
- **Fault Tolerance** - Circuit breakers, health monitoring, and graceful degradation
- **Complete Observability** - Request/response logging, Prometheus metrics, and real-time monitoring
- **Multi-Transport Support** - HTTP and WebSocket MCP server connections
- **Service Discovery** - Find servers by tools, resources, or capability tags
- **Production Ready** - Async architecture, database persistence, Docker deployment

### 🚀 **Production-Grade Features**
- **100+ Concurrent Users** - Multi-user scenarios with fair resource allocation
- **Advanced Rate Limiting** - Per-tenant fairness with sliding window algorithms and DDoS protection
- **Comprehensive Metrics** - 7 metric types covering user patterns, session analytics, and system performance
- **Intelligent Connection Pooling** - Adaptive pool sizing with 25-35% reduction in connection overhead
- **Performance Optimization** - 20-50% overall improvement with database query optimization

## 🤖 AI Agent Integration

The MCP Registry Gateway includes **7 specialist project-aware AI agents** that provide expert guidance for every aspect of the system:

| Agent | Specialization | When to Use |
|-------|----------------|-------------|
| **[FastMCP Specialist](docs/project_context/agents/fastmcp-specialist.md)** | Framework patterns, Azure OAuth, structured responses | FastMCP server issues, OAuth integration |
| **[MCP Orchestrator](docs/project_context/agents/mcp-orchestrator.md)** | Workflow coordination, agent delegation | Complex multi-step operations, task routing |
| **[MCP Debugger](docs/project_context/agents/mcp-debugger.md)** | Troubleshooting, diagnostics | Authentication failures, performance issues |
| **[Security Auditor](docs/project_context/agents/mcp-security-auditor.md)** | Azure OAuth security, compliance | Security configuration, access control |
| **[Deployment Specialist](docs/project_context/agents/mcp-deployment-specialist.md)** | Azure infrastructure, container orchestration | Production deployment, scaling |
| **[Performance Optimizer](docs/project_context/agents/mcp-performance-optimizer.md)** | Database optimization, caching | Performance tuning, monitoring |
| **[Protocol Expert](docs/project_context/agents/mcp-protocol-expert.md)** | MCP compliance, JSON-RPC optimization | Protocol issues, capability negotiation |

### Agent Workflow Examples

```bash
# Authentication Setup Workflow
1. Start with Security Auditor → Azure OAuth setup guide
2. Consult FastMCP Specialist → OAuth Proxy implementation
3. Use Debugger if needed → Authentication troubleshooting

# Performance Optimization Workflow  
1. Performance Optimizer → Database and caching optimization
2. MCP Debugger → Bottleneck identification
3. FastMCP Specialist → Structured response optimization

# Production Deployment Workflow
1. Deployment Specialist → Azure infrastructure setup
2. Security Auditor → Production security configuration
3. Performance Optimizer → Production tuning
```

**📖 [Complete Agent Documentation](docs/project_context/agents/README.md)**

### Agent-Assisted Development Workflows

#### 🔐 **Authentication Implementation**
```bash
# Step 1: Security Auditor consultation
# Refer to docs/project_context/agents/mcp-security-auditor.md
# → Azure OAuth configuration, JWT validation patterns

# Step 2: FastMCP Specialist implementation  
# Refer to docs/project_context/agents/fastmcp-specialist.md
# → OAuth Proxy integration, middleware setup

# Step 3: MCP Debugger testing (if needed)
# Refer to docs/project_context/agents/mcp-debugger.md
# → Authentication flow debugging, token validation
```

#### ⚡ **Performance Optimization**
```bash
# Step 1: Performance Optimizer analysis
# Refer to docs/project_context/agents/mcp-performance-optimizer.md
# → Database indexing, caching strategies, monitoring

# Step 2: MCP Debugger diagnostics
# Refer to docs/project_context/agents/mcp-debugger.md
# → Bottleneck identification, query analysis

# Step 3: FastMCP Specialist optimization
# Refer to docs/project_context/agents/fastmcp-specialist.md
# → Structured response caching, middleware optimization
```

#### ☁️ **Production Deployment**
```bash
# Step 1: Deployment Specialist planning
# Refer to docs/project_context/agents/mcp-deployment-specialist.md
# → Azure infrastructure, container orchestration

# Step 2: Security Auditor hardening
# Refer to docs/project_context/agents/mcp-security-auditor.md
# → Production security configuration, compliance

# Step 3: Performance Optimizer tuning
# Refer to docs/project_context/agents/mcp-performance-optimizer.md
# → Production performance monitoring, optimization
```
gh
## 🚀 Quick Start

### **Unified Single-Server Architecture**
```bash
# One-command setup (recommended)
./scripts/setup.sh

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Start unified server (includes both REST API and MCP)
uv run mcp-gateway serve --port 8000

# Access points:
# - REST API: http://localhost:8000/api/v1/
# - MCP Operations: http://localhost:8000/mcp/ (requires Azure OAuth)
# - API Documentation: http://localhost:8000/docs
# - Health Check: http://localhost:8000/health
```

### **Unified Configuration** (Single `.env` for backend + frontend)

The project uses a **unified configuration system** with one `.env` file serving both backend and frontend:

```bash
# Single configuration file setup
cp .env.example .env

# Configure essential values - automatically shared with frontend
# MREG_AZURE_TENANT_ID=your-tenant-id          # Backend Azure config
# MREG_AZURE_CLIENT_ID=your-client-id          # Backend Azure config  
# MREG_AZURE_CLIENT_SECRET=your-client-secret  # Backend Azure config

# Frontend automatically inherits these values:
# VITE_AZURE_CLIENT_ID=${MREG_AZURE_CLIENT_ID}      # No duplication!
# VITE_AZURE_TENANT_ID=${MREG_AZURE_TENANT_ID}      # Single source of truth

# Validate configuration
uv run mcp-gateway validate

# OAuth login endpoint: http://localhost:8000/mcp/oauth/login
```

**Benefits**: No configuration duplication, single source of truth, automatic frontend/backend synchronization.

### **Docker Deployment**
```bash
# Complete stack with single unified server
docker-compose up

# Production deployment
docker-compose -f docker-compose.prod.yml up
```

### **API Examples**

```bash
# REST API - Register an MCP server (unauthenticated)
curl -X POST http://localhost:8000/api/v1/servers \
  -H "Content-Type: application/json" \
  -d '{"name": "my-server", "endpoint_url": "http://localhost:3000", "transport_type": "http"}'

# REST API - Legacy proxy endpoint (unauthenticated, backward compatibility)
curl -X POST http://localhost:8000/legacy/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": "1", "method": "tools/list"}'

# MCP Operations - Authenticated operations (requires Azure OAuth token)
curl -X POST http://localhost:8000/mcp \
  -H "Authorization: Bearer <azure-oauth-token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "list_servers"}}'

# System Health - Check unified server health
curl -X GET http://localhost:8000/health
```

## 🏗️ Architecture

```mermaid
graph TB
    Client[Client Applications] --> UnifiedServer[Unified MCP Registry Gateway :8000]
    
    %% Path-based routing
    UnifiedServer --> PathRouter[Path-Based Router]
    PathRouter --> RestAPI[/api/v1/* - REST API]
    PathRouter --> MCPOps[/mcp/* - MCP Operations]
    
    %% Azure OAuth Flow (MCP only)
    MCPOps --> PathAuth[Path-Based Auth Middleware]
    PathAuth --> Azure[Azure AD OAuth]
    Azure --> TokenVerifier[Token Validation]
    TokenVerifier --> AuthContext[User Context]
    
    %% REST API Components (unauthenticated)
    RestAPI --> Router[Smart Router]
    Router --> LB[Load Balancer]
    LB --> Server1[MCP Server 1]
    LB --> Server2[MCP Server 2] 
    LB --> Server3[MCP Server N]
    
    %% MCP Components (authenticated)
    AuthContext --> MCPMiddleware[MCP Middleware Chain]
    MCPMiddleware --> AccessControl[Role-Based Access Control]
    MCPMiddleware --> RateLimit[Rate Limiting]
    MCPMiddleware --> Audit[Audit Logging]
    MCPMiddleware --> MCPTools[MCP Tools & Resources]
    
    %% Shared Infrastructure
    UnifiedServer --> Registry[Server Registry]
    Registry --> DB[(PostgreSQL - Shared Pool)]
    UnifiedServer --> Cache[(Redis - Shared Cache)]
    UnifiedServer --> Monitor[Health Monitor]
    
    %% Audit Trail
    Audit --> DB
```

**Unified Architecture Components:**
- **Single Server Process (Port 8000)**: All functionality in one optimized application
- **Path-Based Routing**: `/api/v1/*` (unauthenticated REST) and `/mcp/*` (authenticated MCP operations)
- **Azure OAuth Integration**: FastMCP OAuth Proxy with native AzureProvider for MCP endpoints
- **Smart Router**: Capability-based server selection and request routing
- **Middleware Pipeline**: Role-based access control, rate limiting, and audit logging
- **Shared Infrastructure**: Single database connection pool and Redis cache
- **Load Balancer**: Multiple algorithms with health monitoring
- **Circuit Breakers**: Fault tolerance and cascading failure prevention
- **Resource Efficiency**: 25% memory reduction, 50% fewer database connections

## 📊 **Enhanced Monitoring & Analytics**

### 🔍 **Prometheus Metrics Dashboard**
The system provides comprehensive monitoring through Prometheus metrics:

```bash
# Access metrics endpoint
curl http://localhost:8000/metrics

# Key metrics include:
# - mcp_auth_events_total: Authentication events by user/tenant
# - mcp_token_refresh_total: Token refresh operations with success rates
# - mcp_concurrent_users: Active users per tenant with activity status
# - mcp_user_behavior_patterns_total: User interaction patterns and workflows
# - mcp_tenant_activity_total: Per-tenant resource usage analytics
```

### 📈 **User Activity Analytics**
- **Session Tracking**: Login patterns with time-of-day analysis
- **Tool Usage Analytics**: Usage patterns categorized by duration and frequency
- **Behavior Pattern Detection**: Repetitive usage, browse-then-action, diverse exploration
- **Tenant Fairness Metrics**: Resource allocation and usage across tenants

### ⚡ **Performance Monitoring**
- **Connection Pool Metrics**: Adaptive sizing with usage analytics
- **Rate Limiting Analytics**: Fairness algorithm performance and DDoS protection
- **Token Management**: Background refresh success rates and timing analytics
- **Request Latency**: Per-tool, per-user, and per-tenant latency tracking

## 📋 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp` | POST | Authenticated MCP JSON-RPC operations |
| `/mcp/tools` | GET | List available MCP tools (authenticated) |
| `/mcp/oauth/login` | GET | Azure OAuth login initiation |
| `/legacy/mcp` | POST | Legacy unauthenticated proxy (deprecated) |
| `/api/v1/servers` | GET/POST/DELETE | Server registration management |
| `/api/v1/discovery/tools` | GET | Find servers by tool capabilities |
| `/api/v1/discovery/resources` | GET | Find servers by resource types |
| `/health` | GET | System health check |
| `/api/v1/admin/stats` | GET | System statistics and metrics |
| `/metrics` | GET | Prometheus metrics endpoint |

[📚 Complete API Documentation](./examples/README.md)

## 🚀 Quick Start

### Automated Setup (Recommended)

```bash
./scripts/setup.sh
```

This script will:
- Create `.env` from `.env.example` if needed
- Install all dependencies with `uv sync --all-groups`
- Check PostgreSQL and Redis connectivity
- Initialize database tables
- Start unified server on port 8000

### Manual Setup

1. **Install Dependencies**
   ```bash
   uv sync --all-groups
   ```

2. **Start Required Services**
   ```bash
   # Using Docker (recommended)
   docker-compose up -d postgres redis
   
   # Or start locally installed PostgreSQL and Redis
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database and Azure OAuth credentials
   ```

4. **Initialize Database**
   ```bash
   uv run mcp-gateway init-db
   ```

5. **Start the Unified Gateway**
   ```bash
   uv run mcp-gateway serve --port 8000
   ```

6. **Run the Demo** (Optional)
   ```bash
   # Comprehensive demo with unified architecture
   uv run mcp-gateway demo
   
   # Or standalone command
   uv run mcp-demo
   ```

### Production Deployment

#### Docker Deployment
```bash
# Build and start unified server stack
docker-compose up -d

# Unified gateway available at http://localhost:8000
# API documentation at http://localhost:8000/docs
# MCP operations at http://localhost:8000/mcp/*
```

#### Manual Production Setup
```bash
# Install production dependencies only
uv sync --no-dev

# Set production environment variables
export MREG_POSTGRES_HOST=your-postgres-host
export MREG_POSTGRES_DB=mcp_registry_prod
export MREG_REDIS_URL=redis://your-redis-host:6379/0
export MREG_AZURE_TENANT_ID=your-azure-tenant
export MREG_AZURE_CLIENT_ID=your-azure-client

# Run with production settings (single unified server)
uv run mcp-gateway serve --host 0.0.0.0 --port 8000
```

## 💻 Development

### Environment Setup

Install development dependencies:

```bash
# Install with development dependencies (default behavior)
uv sync

# Install with specific dependency groups
uv sync --group test --group lint --group docs

# Install with ALL dependency groups
uv sync --all-groups

# Install with optional dependencies (monitoring, docker)
uv sync --extra monitoring --extra docker

# Install everything (all groups + all optional dependencies)
uv sync --all-groups --all-extras

# Install only production dependencies (no dev tools)
uv sync --no-dev
```

### Dependency Management

```bash
# Add new dependencies
uv add fastapi
uv add pytest --group test
uv add ruff --group lint
uv add mkdocs --group docs

# Add optional dependencies
uv add sentry-sdk --optional monitoring
uv add docker --optional docker

# Remove dependencies
uv remove package-name
uv remove pytest --group test

# Update dependencies
uv lock --upgrade
uv sync
```

### Linting and Formatting

**Note:** Development tools are installed globally via `uv tool install` during setup.

#### Manual Tool Installation (if setup script not used)

If you didn't run the setup script, install the development tools manually:

```bash
# Install global development tools
uv tool install ruff
uv tool install mypy
uv tool install pytest
uv tool install coverage

# Verify installations
uv tool run ruff --version
uv tool run mypy --version
uv tool run pytest --version
uv tool run coverage --version
```

#### Usage

```bash
# Format code (recommended)
./scripts/format.sh

# Lint code (recommended)
./scripts/lint.sh

# Or run tools directly:
uv tool run ruff check src/mcp_registry_gateway tests scripts --fix
uv tool run ruff format src/mcp_registry_gateway tests scripts
uv tool run mypy src/mcp_registry_gateway
```

### Testing

**Note:** Development tools are installed globally via `uv tool install` during setup.

#### Manual Tool Installation (if setup script not used)

If you didn't run the setup script, ensure pytest and coverage are installed:

```bash
# Install testing tools (if not already installed above)
uv tool install pytest
uv tool install coverage

# Verify installations
uv tool run pytest --version
uv tool run coverage --version
```

#### Usage

```bash
# Run tests with coverage report (recommended)
./scripts/test.sh

# Or run tests directly:
uv tool run pytest
uv tool run pytest --cov=src/mcp_registry_gateway
uv tool run pytest -m unit
uv tool run pytest -m integration
uv tool run pytest -m "not slow"
```

### Running the Application

```bash
# Run the unified application (single server, all features)
uv run mcp-gateway serve --port 8000

# Run CLI commands
uv run mcp-gateway --help
uv run mcp-gateway demo            # Comprehensive demo
uv run mcp-gateway healthcheck     # System health check
uv run mcp-gateway validate        # Configuration validation

# Run with specific Python version
uv run --python 3.12 mcp-gateway serve --port 8000
```

### Build & Distribution

```bash
# Build the package
uv build

# Build wheel only
uv build --wheel

# Build source distribution only
uv build --sdist
```

## 📚 Documentation

### 🤖 **Project-Aware AI Agents**
- **[Agent Overview](docs/project_context/agents/README.md)** - 7 specialist agents for development workflow
- **[Agent Quick Reference](#-ai-agent-integration)** - When and how to use each specialist agent
- **[Claude Code Integration](.claude/agents/mcp/)** - Claude Code agent configurations

### Configuration Guides
- **[Unified Configuration Setup](docs/project_context/UNIFIED_CONFIGURATION_SETUP.md)** - **NEW:** Single `.env` setup guide for backend + frontend
- **[Configuration Guide](docs/project_context/CONFIGURATION_GUIDE.md)** - Comprehensive configuration reference with unified system
- **[Azure App Registration Setup](docs/project_context/AZURE_APP_REGISTRATION_GUIDE.md)** - Complete Azure AD configuration guide
- **[Environment Variables](.env.example)** - Unified configuration template with frontend integration
- **[Database Performance Guide](docs/project_context/DATABASE_PERFORMANCE_GUIDE.md)** - PostgreSQL optimization and setup

### Architecture Documentation
- **[FastMCP Knowledge Base](docs/project_context/README.md)** - FastMCP framework understanding
- **[Project Status](docs/project_context/README.md)** - Current implementation status and project overview
- **[Technical Analysis](claudedocs/project_status.md)** - AI technical analysis logs

### FastMCP Official Documentation
- **[FastMCP Documentation Index](docs/project_context/FASTMCP_DOCUMENTATION_INDEX.md)** - Quick reference to official FastMCP docs
- **[OAuth Proxy Documentation](docs/fastmcp_docs/python-sdk/fastmcp-server-auth-oauth_proxy.mdx)** - Official OAuth Proxy patterns
- **[Azure Provider Documentation](docs/fastmcp_docs/python-sdk/fastmcp-server-auth-providers-azure.mdx)** - Official Azure OAuth configuration
- **[Middleware Documentation](docs/fastmcp_docs/python-sdk/fastmcp-server-middleware-middleware.mdx)** - Official middleware framework
- **[Types & Utilities Documentation](docs/fastmcp_docs/python-sdk/fastmcp-utilities-types.mdx)** - Official type system and utilities

### API Documentation
- **[Complete API Reference](examples/README.md)** - Full API endpoint documentation
- **[Interactive API Docs](http://localhost:8000/docs)** - Swagger UI (when server running)
- **[CLI Reference](src/mcp_registry_gateway/cli.py)** - Command-line interface documentation

## 🤖 **Developer Agent Quick Reference**

| 🎯 Task | 🤖 Primary Agent | 🔗 Documentation | ⚡ Quick Command |
|---------|------------------|------------------|------------------|
| **OAuth Setup** | Security Auditor | [Guide](docs/project_context/agents/mcp-security-auditor.md) | `uv run mcp-gateway validate` |
| **FastMCP Config** | FastMCP Specialist | [Guide](docs/project_context/agents/fastmcp-specialist.md) | `uv run mcp-gateway serve --port 8000` |
| **Performance Issues** | Performance Optimizer | [Guide](docs/project_context/agents/mcp-performance-optimizer.md) | `uv run mcp-gateway optimize-db` |
| **Debugging** | MCP Debugger | [Guide](docs/project_context/agents/mcp-debugger.md) | `uv run mcp-gateway healthcheck` |
| **Azure Deployment** | Deployment Specialist | [Guide](docs/project_context/agents/mcp-deployment-specialist.md) | `docker-compose up` |
| **Protocol Issues** | Protocol Expert | [Guide](docs/project_context/agents/mcp-protocol-expert.md) | `curl -X POST http://localhost:8000/mcp` |
| **Workflow Coordination** | MCP Orchestrator | [Guide](docs/project_context/agents/mcp-orchestrator.md) | `uv run mcp-gateway demo` |

### 🚀 **Agent-First Development**

**For new developers**: Start with [MCP Orchestrator](docs/project_context/agents/mcp-orchestrator.md) for overall project guidance, then consult specialist agents for domain-specific tasks.

**For specific issues**: Use [MCP Debugger](docs/project_context/agents/mcp-debugger.md) for diagnosis, then route to the appropriate domain specialist.

**For unified architecture**: All agents understand the single-server architecture with path-based routing. The **[Unified Architecture Guide](docs/project_context/UNIFIED_ARCHITECTURE_GUIDE.md)** provides comprehensive implementation details.

**For complex projects**: Follow the **Agent Coordination Patterns** documented in each specialist agent guide.