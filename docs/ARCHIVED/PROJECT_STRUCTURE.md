# Project Structure - MCP Registry Gateway

This document provides a comprehensive overview of the MCP Registry Gateway project structure, including directory organization, file purposes, and architectural layout.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## 📁 **Project Structure**

```
fastmcp-manager/
├── src/mcp_registry_gateway/           # Main application source
│   ├── core/                          # Core configuration and exceptions
│   │   ├── config.py                  # Environment-based settings with MREG_ prefix + FastMCP
│   │   ├── exceptions.py              # Custom exception classes
│   │   └── __init__.py
│   ├── db/                            # Database layer
│   │   ├── database.py                # Async database manager
│   │   ├── models.py                  # SQLModel schemas + FastMCPAuditLog table
│   │   └── __init__.py
│   ├── api/                           # FastAPI routes and endpoints
│   │   ├── main.py                    # Legacy FastAPI application factory (DEPRECATED)
│   │   ├── mcp_routes.py               # MCP endpoint handlers with FastMCP integration (NEW)
│   │   └── __init__.py
│   ├── services/                      # Business logic services
│   │   ├── registry.py                # Server registry management
│   │   ├── proxy.py                   # MCP request proxying
│   │   └── __init__.py
│   ├── routing/                       # Request routing logic
│   │   ├── router.py                  # Smart routing algorithms
│   │   └── __init__.py
│   ├── auth/                          # Authentication module (NEW - Modular Architecture)
│   │   ├── __init__.py                # Clean auth exports interface
│   │   ├── azure_oauth.py             # AzureOAuthManager for OAuth proxy management
│   │   ├── context.py                 # AuthContext, UserContext classes
│   │   ├── providers.py               # OAuth provider factory functions
│   │   └── utils.py                   # Authentication utilities and role checking
│   ├── middleware/                    # FastMCP middleware components (NEW)
│   │   ├── __init__.py                # Middleware exports
│   │   ├── access_control.py          # Role-based tool access control
│   │   ├── audit.py                   # Comprehensive audit logging
│   │   ├── rate_limit.py              # User/tenant rate limiting
│   │   ├── auth_middleware.py         # Authentication middleware
│   │   ├── base.py                    # Base middleware classes
│   │   ├── error_handling.py          # Error handling middleware
│   │   └── tool_access.py             # Tool access control middleware
│   ├── utils/                         # Utility functions (NEW)
│   │   ├── __init__.py                # Utility exports
│   │   ├── validation.py              # Configuration validation with Rich output
│   │   └── type_adapters.py           # FastMCP type caching for performance optimization
│   ├── models/                        # Response models (NEW)
│   │   ├── __init__.py                # Model exports
│   │   └── responses.py               # FastMCPBaseModel response classes for structured tool returns
│   ├── unified_app.py                 # Unified application factory with path-based routing (NEW)
│   ├── api/
│   │   ├── mcp_routes.py               # MCP endpoint handlers with FastMCP integration (NEW)
│   ├── middleware/
│   │   ├── path_auth.py                # Path-based authentication middleware (NEW)
│   ├── cli.py                         # CLI interface + FastMCP commands
│   └── __init__.py
├── scripts/                           # Build and automation scripts
│   ├── setup.sh                       # Automated project setup
│   ├── setup_database.py              # Database initialization
│   ├── setup_database_enhanced.py     # Enhanced database setup with performance optimization
│   ├── db_performance_migration.py    # Database performance optimization script
│   ├── validate_config.py             # Configuration validation (DEPRECATED - moved to utils/)
│   ├── format.sh                      # Code formatting (ruff)
│   ├── lint.sh                        # Code linting (ruff, mypy)
│   ├── test.sh                        # Test execution with coverage
│   └── docker-dev.sh                  # Docker development utilities
├── examples/                          # Usage examples and demos
│   ├── demo_gateway.py                # Comprehensive gateway demo
│   └── README.md                      # Example documentation
├── docs/                              # Project documentation
│   ├── architecture/                  # Architecture documentation
│   ├── project_context/               # Project knowledge base
│   │   ├── agents/                    # 🤖 AI Agent Documentation (NEW)
│   │   │   ├── README.md              # Agent overview and coordination matrix
│   │   │   ├── fastmcp-specialist.md  # FastMCP framework expert
│   │   │   ├── mcp-orchestrator.md    # Workflow coordination specialist
│   │   │   ├── mcp-debugger.md        # Troubleshooting and diagnostics expert
│   │   │   ├── mcp-security-auditor.md # Azure OAuth security specialist
│   │   │   ├── mcp-deployment-specialist.md # Azure deployment expert
│   │   │   ├── mcp-performance-optimizer.md # Performance tuning specialist
│   │   │   └── mcp-protocol-expert.md # MCP compliance expert
│   │   ├── AZURE_APP_REGISTRATION_GUIDE.md # Azure OAuth setup guide
│   │   ├── DATABASE_PERFORMANCE_GUIDE.md  # Database optimization guide
│   │   └── README.md                  # FastMCP framework knowledge base
├── .claude/                           # Claude Code Integration (NEW)
│   └── agents/mcp/                    # 🤖 Claude Code agent configurations
├── claudedocs/                        # AI-specific documentation
│   ├── project_status.md              # Current implementation status
│   ├── code_quality_resolution.md     # Code quality fix log
│   ├── proxy_error_fix_summary.md     # Error resolution documentation
│   └── DATABASE_IMPROVEMENTS_SUMMARY.md # Database optimization implementation summary
├── pyproject.toml                     # Project configuration and dependencies
├── uv.lock                           # Dependency lockfile (uv package manager)
├── docker-compose.yml                # Docker orchestration
├── Dockerfile                        # Multi-stage container build
├── .env.example                      # Environment configuration template
└── README.md                         # Main project documentation
```

## 🏗️ **Directory Breakdown**

### **Source Code (`src/mcp_registry_gateway/`)**

#### **Core Modules**
- **`core/`**: Foundation configuration and exception handling
  - `config.py`: Environment-based settings with `MREG_` prefix + FastMCP settings
  - `exceptions.py`: Custom exception classes for domain-specific error handling

#### **Database Layer (`db/`)**
- **`database.py`**: Async database manager with connection pooling
- **`models.py`**: SQLModel schemas including FastMCPAuditLog table

#### **API Layer (`api/`)**
- **`main.py`**: FastAPI application factory with FastMCP integration

#### **Business Logic (`services/`)**
- **`registry.py`**: Server registry management with tenant isolation
- **`proxy.py`**: MCP request proxying with intelligent routing

#### **Request Routing (`routing/`)**
- **`router.py`**: Smart routing algorithms with capability matching

#### **Authentication (`auth/`) - NEW Modular Architecture**
- **`azure_oauth.py`**: AzureOAuthManager for OAuth proxy management
- **`context.py`**: AuthContext and UserContext classes
- **`providers.py`**: OAuth provider factory functions
- **`utils.py`**: Authentication utilities and role checking

#### **Middleware (`middleware/`) - NEW**
- **`access_control.py`**: Role-based tool access control
- **`audit.py`**: Comprehensive audit logging
- **`rate_limit.py`**: User/tenant rate limiting
- **`auth_middleware.py`**: Authentication middleware
- **`base.py`**: Base middleware classes
- **`error_handling.py`**: Error handling middleware
- **`tool_access.py`**: Tool access control middleware

#### **Utilities (`utils/`) - NEW**
- **`validation.py`**: Configuration validation with Rich output
- **`type_adapters.py`**: FastMCP type caching for performance optimization

#### **Response Models (`models/`) - NEW**
- **`responses.py`**: FastMCPBaseModel response classes for structured tool returns

#### **Unified Architecture Components - NEW**
- **`unified_app.py`**: Unified application factory with path-based routing
- **`api/mcp_routes.py`**: MCP endpoint handlers with FastMCP integration
- **`middleware/path_auth.py`**: Path-based authentication middleware
- **`cli.py`**: CLI interface with unified server commands

### **Scripts Directory (`scripts/`)**

#### **Setup and Initialization**
- **`setup.sh`**: Automated project setup with dependency management
- **`setup_database.py`**: Basic database initialization
- **`setup_database_enhanced.py`**: Enhanced database setup with performance optimization
- **`db_performance_migration.py`**: Database performance optimization script

#### **Development Tools**
- **`format.sh`**: Code formatting using Ruff
- **`lint.sh`**: Code linting with Ruff and MyPy
- **`test.sh`**: Test execution with coverage reporting
- **`docker-dev.sh`**: Docker development utilities

#### **Deprecated**
- **`validate_config.py`**: Configuration validation (DEPRECATED - moved to `utils/validation.py`)

### **Examples and Documentation**

#### **Examples (`examples/`)**
- **`demo_gateway.py`**: Comprehensive gateway functionality demonstration
- **`README.md`**: Example documentation and usage patterns

#### **Documentation (`docs/`)**
- **`architecture/`**: System architecture documentation
- **`project_context/`**: Project knowledge base and context
  - **`agents/`**: 🤖 AI Agent Documentation (NEW)
  - **`AZURE_APP_REGISTRATION_GUIDE.md`**: Azure OAuth setup guide
  - **`DATABASE_PERFORMANCE_GUIDE.md`**: Database optimization guide
  - **`UNIFIED_ARCHITECTURE_GUIDE.md`**: Complete unified architecture implementation guide (NEW)

#### **Claude Code Integration (`.claude/`)**
- **`agents/mcp/`**: 🤖 Claude Code agent configurations for native integration

#### **AI Documentation (`claudedocs/`)**
- **`project_status.md`**: Current implementation status
- **`code_quality_resolution.md`**: Code quality fix log
- **`proxy_error_fix_summary.md`**: Error resolution documentation
- **`DATABASE_IMPROVEMENTS_SUMMARY.md`**: Database optimization implementation summary

### **Configuration and Dependencies**

#### **Project Configuration**
- **`pyproject.toml`**: Project configuration, dependencies, and CLI entry points
- **`uv.lock`**: Dependency lockfile for UV package manager
- **`.env.example`**: Environment configuration template

#### **Containerization**
- **`docker-compose.yml`**: Docker orchestration for development
- **`Dockerfile`**: Multi-stage container build configuration

## 🎯 **Architectural Highlights**

### **Modular Authentication System**
The `auth/` module provides a clean, modular authentication architecture:
- **Provider abstraction**: Support for multiple OAuth providers
- **Context management**: Centralized user and authentication context
- **Utility functions**: Role checking and permission validation

### **Middleware Architecture**
The `middleware/` system provides:
- **Layered security**: Access control, rate limiting, audit logging
- **Flexible configuration**: Enable/disable specific middleware components
- **Performance optimization**: Efficient request processing pipeline

### **Enhanced Performance**
The `utils/` module includes:
- **Type caching**: FastMCP type adapter caching for performance
- **Configuration validation**: Rich CLI validation with comprehensive checking

### **Structured Responses**
The `models/` module provides:
- **FastMCPBaseModel**: Base response model for structured tool returns
- **Type safety**: Full type hints and validation
- **Performance optimization**: 20-50% performance improvement through structured responses

---

## 📖 **Related Documentation**

- **[Development Setup Guide](DEVELOPMENT_SETUP.md)** - Environment setup and package management
- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Environment variables and settings
- **[API Reference](API_REFERENCE.md)** - Complete endpoint documentation
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)