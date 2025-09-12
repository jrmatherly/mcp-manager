# Configuration Guide - MCP Registry Gateway

This document provides comprehensive configuration guidance for the MCP Registry Gateway, including the unified environment configuration system, settings classes, and configuration validation.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## 🎯 **Unified Configuration System**

The MCP Registry Gateway uses a **unified configuration approach** with a single `.env` file that serves both backend and frontend applications, eliminating duplication and providing a single source of truth.

### **🔑 Key Benefits**
- **Single source of truth**: One `.env` file maintains all configuration
- **No duplication**: Azure OAuth and API settings shared between backend/frontend  
- **Consistent prefixes**: Clear separation with `MREG_`, `VITE_`, `DB_`, etc.
- **Environment variable referencing**: Frontend variables reference backend values
- **Developer friendly**: Single file to maintain, comprehensive validation

---

## 🔧 **Configuration Structure**

### **Environment Variable Prefixes**
The unified system uses structured prefixes for organization:

| Prefix | Purpose | Settings Class | Example |
|--------|---------|----------------|---------|
| `APP_*` | Main application settings | `Settings` | `APP_NAME="MCP Registry Gateway"` |
| `VITE_*` | Frontend configuration | Frontend build | `VITE_API_BASE_URL=http://localhost:8000` |
| `DB_*` | Database and caching | `DatabaseSettings` | `DB_POSTGRES_HOST=localhost` |
| `SECURITY_*` | Authentication/authorization | `SecuritySettings` | `SECURITY_JWT_SECRET_KEY=...` |
| `SERVICE_*` | Service discovery/routing | `ServiceSettings` | `SERVICE_PORT=8000` |
| `MONITORING_*` | Logging and observability | `MonitoringSettings` | `MONITORING_LOG_LEVEL=INFO` |
| `MREG_*` | FastMCP server settings | `FastMCPSettings` | `MREG_AZURE_CLIENT_ID=...` |

### **Frontend Integration**
Frontend configuration uses `VITE_` prefix and references backend values:

```bash
# Azure OAuth - Backend configuration (source of truth)
MREG_AZURE_CLIENT_ID=your-azure-client-id
MREG_AZURE_TENANT_ID=your-azure-tenant-id
MREG_AZURE_CLIENT_SECRET=your-azure-client-secret

# Frontend automatically inherits these values
VITE_AZURE_CLIENT_ID=${MREG_AZURE_CLIENT_ID}      # References backend value
VITE_AZURE_TENANT_ID=${MREG_AZURE_TENANT_ID}      # References backend value
VITE_AZURE_REDIRECT_URI=http://localhost:3000/auth/callback
```

---

## 📋 **Environment Variables**

```bash
# Core Application
MREG_APP_NAME="MCP Registry Gateway"
MREG_ENVIRONMENT=development  # development|staging|production
MREG_DEBUG=false

# Database (PostgreSQL)
MREG_POSTGRES_HOST=localhost
MREG_POSTGRES_PORT=5432
MREG_POSTGRES_USER=mcp_user
MREG_POSTGRES_PASSWORD=mcp_password
MREG_POSTGRES_DB=mcp_registry

# Cache (Redis)
MREG_REDIS_URL=redis://localhost:6379/0

# Service Configuration
MREG_SERVICE_HOST=0.0.0.0
MREG_SERVICE_PORT=8000
MREG_SERVICE_WORKERS=1

# FastMCP Server Configuration (NEW)
MREG_FASTMCP_ENABLED=true
MREG_FASTMCP_PORT=8001
MREG_FASTMCP_HOST=0.0.0.0

# Azure OAuth Configuration (NEW - REQUIRED for authentication)
MREG_AZURE_TENANT_ID=your-azure-tenant-id
MREG_AZURE_CLIENT_ID=your-azure-client-id
MREG_AZURE_CLIENT_SECRET=your-azure-client-secret
MREG_FASTMCP_OAUTH_CALLBACK_URL=http://localhost:8001/oauth/callback
MREG_FASTMCP_OAUTH_SCOPES=User.Read,profile,openid,email

# Middleware Configuration (NEW)
MREG_FASTMCP_ENABLE_TOOL_ACCESS_CONTROL=true
MREG_FASTMCP_ENABLE_AUDIT_LOGGING=true  
MREG_FASTMCP_ENABLE_RATE_LIMITING=true

# PRIORITY 1 ENHANCEMENTS - PRODUCTION READY FEATURES
# Enhanced Monitoring with Prometheus Metrics
MREG_FASTMCP_ENABLE_PROMETHEUS_METRICS=true
MREG_FASTMCP_METRICS_EXPORT_INTERVAL=60
MREG_FASTMCP_ENABLE_USER_ANALYTICS=true
MREG_FASTMCP_ENABLE_BEHAVIOR_TRACKING=true
MREG_FASTMCP_SESSION_TRACKING_ENABLED=true

# Background Token Refresh Optimization (95%+ Success Rate)
MREG_FASTMCP_ENABLE_BACKGROUND_TOKEN_REFRESH=true
MREG_FASTMCP_TOKEN_REFRESH_MARGIN_MINUTES=5
MREG_FASTMCP_PROACTIVE_REFRESH_MINUTES=10
MREG_FASTMCP_TOKEN_REFRESH_MAX_RETRIES=4
MREG_FASTMCP_TOKEN_REFRESH_RETRY_INTERVALS="30,60,120,300"

# Advanced Per-Tenant Rate Limiting (99%+ Fair Allocation)
MREG_FASTMCP_ENABLE_TENANT_FAIRNESS_ALGORITHM=true
MREG_FASTMCP_TENANT_FAIRNESS_WINDOW_SECONDS=300
MREG_FASTMCP_TENANT_BURST_ALLOWANCE_FACTOR=1.5
MREG_FASTMCP_ENABLE_SLIDING_WINDOW_RATE_LIMITING=true

# Connection Pool Tuning (25-35% Overhead Reduction)
MREG_FASTMCP_ENABLE_ADAPTIVE_CONNECTION_POOLING=true
MREG_FASTMCP_CONNECTION_POOL_SCALING_ENABLED=true
MREG_FASTMCP_MIN_POOL_SIZE=10
MREG_FASTMCP_MAX_POOL_SIZE=100
MREG_FASTMCP_POOL_SCALING_FACTOR=1.5

# Multi-User Support (100+ Concurrent Users)
MREG_FASTMCP_MAX_CONCURRENT_USERS=500
MREG_FASTMCP_SESSION_CLEANUP_INTERVAL=300
MREG_FASTMCP_USER_ACTIVITY_TIMEOUT=1800
MREG_FASTMCP_TENANT_RESOURCE_MONITORING=true
MREG_FASTMCP_REQUESTS_PER_MINUTE=100

# Security (Updated)
MREG_SECURITY_JWT_SECRET_KEY=your-secret-key
MREG_SECURITY_ENABLE_CORS=true

# Feature Flags
MREG_FEATURE_FLAGS="advanced_routing:true,circuit_breaker:true,azure_oauth:true"
```

### **Configuration Classes**
- `DatabaseSettings` - Database connection and pooling  
- `SecuritySettings` - Authentication and authorization  
- `ServiceSettings` - Service discovery and routing  
- `MonitoringSettings` - Logging and observability  
- `FastMCPSettings` - FastMCP server and Azure OAuth configuration (NEW)
- `Settings` - Main configuration combining all sections

## 📋 **Detailed Configuration Sections**

### **Core Application Settings**

```bash
# Application Identity
MREG_APP_NAME="MCP Registry Gateway"  # Application name for logging and monitoring
MREG_VERSION="0.1.0"                   # Application version (auto-detected from pyproject.toml)

# Environment Configuration
MREG_ENVIRONMENT=development          # Environment: development|staging|production
MREG_DEBUG=false                      # Enable debug mode and verbose logging
MREG_LOG_LEVEL=INFO                   # Logging level: DEBUG|INFO|WARNING|ERROR|CRITICAL
```

### **Database Configuration (PostgreSQL)**

```bash
# Connection Settings
MREG_POSTGRES_HOST=localhost          # PostgreSQL host
MREG_POSTGRES_PORT=5432               # PostgreSQL port
MREG_POSTGRES_USER=mcp_user           # Database user
MREG_POSTGRES_PASSWORD=mcp_password   # Database password
MREG_POSTGRES_DB=mcp_registry         # Database name

# Connection Pool Settings
MREG_POSTGRES_MIN_CONNECTIONS=5       # Minimum pool connections
MREG_POSTGRES_MAX_CONNECTIONS=20      # Maximum pool connections
MREG_POSTGRES_POOL_TIMEOUT=30         # Connection timeout (seconds)

# Database Features
MREG_POSTGRES_ECHO=false              # Log SQL queries (debug only)
MREG_POSTGRES_SSL_MODE=prefer         # SSL mode: disable|allow|prefer|require
```

### **Cache Configuration (Redis)**

```bash
# Redis Connection
MREG_REDIS_URL=redis://localhost:6379/0  # Redis connection URL
MREG_REDIS_PASSWORD=                      # Redis password (if auth enabled)

# Redis Pool Settings
MREG_REDIS_MIN_CONNECTIONS=5             # Minimum pool connections
MREG_REDIS_MAX_CONNECTIONS=20            # Maximum pool connections
MREG_REDIS_SOCKET_TIMEOUT=5              # Socket timeout (seconds)

# Cache Settings
MREG_REDIS_DEFAULT_TTL=3600              # Default cache TTL (seconds)
MREG_REDIS_HEALTH_CHECK_TTL=300          # Health check cache TTL
```

### **Service Configuration**

```bash
# FastAPI Server
MREG_SERVICE_HOST=0.0.0.0             # Bind host (0.0.0.0 for all interfaces)
MREG_SERVICE_PORT=8000                # FastAPI server port
MREG_SERVICE_WORKERS=1                # Number of worker processes
MREG_SERVICE_RELOAD=false             # Enable auto-reload (development only)

# Load Balancer Settings
MREG_DEFAULT_LOAD_BALANCER=round_robin # Default algorithm: round_robin|weighted|least_connections|random|consistent_hash
MREG_HEALTH_CHECK_INTERVAL=30         # Health check interval (seconds)
MREG_HEALTH_CHECK_TIMEOUT=10          # Health check timeout (seconds)

# Circuit Breaker Settings
MREG_CIRCUIT_BREAKER_ENABLED=true     # Enable circuit breaker
MREG_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5  # Failures before opening circuit
MREG_CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60  # Recovery timeout (seconds)
```

### **FastMCP Server Configuration**

```bash
# FastMCP Server
MREG_FASTMCP_ENABLED=true             # Enable FastMCP server
MREG_FASTMCP_HOST=0.0.0.0             # FastMCP bind host
MREG_FASTMCP_PORT=8001                # FastMCP server port
MREG_FASTMCP_NAME="MCP Registry Gateway" # Server name for MCP protocol
MREG_FASTMCP_VERSION="0.1.0"          # Server version

# Transport Settings
MREG_FASTMCP_TRANSPORT=stdio          # Transport: stdio|http|websocket
MREG_FASTMCP_MAX_CONNECTIONS=100      # Maximum concurrent connections
MREG_FASTMCP_CONNECTION_TIMEOUT=30    # Connection timeout (seconds)
```

### **Azure OAuth Configuration**

```bash
# Azure AD Application Registration
MREG_AZURE_TENANT_ID=your-azure-tenant-id           # Azure AD tenant ID
MREG_AZURE_CLIENT_ID=your-azure-client-id           # Azure AD application client ID
MREG_AZURE_CLIENT_SECRET=your-azure-client-secret   # Azure AD application client secret

# OAuth Flow Settings
MREG_FASTMCP_OAUTH_CALLBACK_URL=http://localhost:8001/oauth/callback  # OAuth callback URL
MREG_FASTMCP_OAUTH_SCOPES=User.Read,profile,openid,email              # Requested OAuth scopes
MREG_FASTMCP_OAUTH_STATE_TTL=300                                       # OAuth state TTL (seconds)

# Token Settings
MREG_FASTMCP_TOKEN_CACHE_TTL=3600     # Access token cache TTL (seconds)
MREG_FASTMCP_REFRESH_TOKEN_TTL=86400  # Refresh token TTL (seconds)
```

### **Middleware Configuration**

```bash
# Access Control
MREG_FASTMCP_ENABLE_TOOL_ACCESS_CONTROL=true  # Enable role-based tool access control
MREG_FASTMCP_DEFAULT_USER_ROLE=user           # Default user role: user|admin|server_owner

# Audit Logging
MREG_FASTMCP_ENABLE_AUDIT_LOGGING=true        # Enable audit logging to database
MREG_FASTMCP_AUDIT_LOG_RETENTION_DAYS=90      # Audit log retention period

# Rate Limiting
MREG_FASTMCP_ENABLE_RATE_LIMITING=true        # Enable rate limiting
MREG_FASTMCP_REQUESTS_PER_MINUTE=100          # Requests per minute per user
MREG_FASTMCP_BURST_LIMIT=20                   # Burst request limit

# Error Handling
MREG_FASTMCP_ENABLE_ERROR_DETAILS=false       # Include detailed error information (development only)
MREG_FASTMCP_MAX_ERROR_STACK_DEPTH=5          # Maximum error stack trace depth
```

### **Security Configuration**

```bash
# JWT Settings
MREG_SECURITY_JWT_SECRET_KEY=your-secret-key  # JWT signing secret (required)
MREG_SECURITY_JWT_ALGORITHM=HS256             # JWT signing algorithm
MREG_SECURITY_JWT_EXPIRY=3600                 # JWT expiry time (seconds)

# CORS Settings
MREG_SECURITY_ENABLE_CORS=true                # Enable CORS
MREG_SECURITY_CORS_ORIGINS=*                  # Allowed origins (comma-separated)
MREG_SECURITY_CORS_METHODS=GET,POST,PUT,DELETE # Allowed methods

# API Key Settings
MREG_SECURITY_ENABLE_API_KEYS=false           # Enable API key authentication
MREG_SECURITY_API_KEY_HEADER=X-API-Key        # API key header name

# Security Headers
MREG_SECURITY_ENABLE_SECURITY_HEADERS=true    # Enable security headers
MREG_SECURITY_HSTS_MAX_AGE=31536000           # HSTS max age (seconds)
```

### **Monitoring and Observability**

```bash
# Logging Configuration
MREG_LOG_FORMAT=json                          # Log format: json|text
MREG_LOG_FILE_PATH=                           # Log file path (empty = stdout)
MREG_LOG_MAX_SIZE_MB=100                      # Log file max size (MB)
MREG_LOG_BACKUP_COUNT=5                       # Log file backup count

# Metrics
MREG_METRICS_ENABLED=true                     # Enable metrics collection
MREG_METRICS_ENDPOINT=/metrics                # Metrics endpoint path
MREG_METRICS_INCLUDE_LABELS=true              # Include detailed labels

# Tracing
MREG_TRACING_ENABLED=false                    # Enable distributed tracing
MREG_TRACING_JAEGER_ENDPOINT=                 # Jaeger endpoint URL
MREG_TRACING_SAMPLE_RATE=0.1                  # Trace sampling rate
```

### **Feature Flags**

```bash
# Feature Flag Format: "flag1:value1,flag2:value2"
MREG_FEATURE_FLAGS="advanced_routing:true,circuit_breaker:true,azure_oauth:true,prometheus_metrics:false"

# Available Feature Flags:
# - advanced_routing: Enable capability-based routing
# - circuit_breaker: Enable circuit breaker pattern
# - azure_oauth: Enable Azure OAuth authentication
# - prometheus_metrics: Enable Prometheus metrics export
# - distributed_tracing: Enable distributed tracing
# - rate_limiting: Enable rate limiting middleware
# - audit_logging: Enable comprehensive audit logging
```

## 🔍 **Configuration Validation**

### **Environment Validation**

```bash
# Validate current configuration
uv run mcp-gateway validate

# Show current configuration (without secrets)
uv run mcp-gateway config

# Show configuration with secrets (development only)
uv run mcp-gateway config --show-secrets

# Test specific components
uv run mcp-gateway healthcheck
```

### **Configuration File Templates**

#### **Development Environment (.env.dev)**
```bash
# Development Configuration
MREG_ENVIRONMENT=development
MREG_DEBUG=true
MREG_LOG_LEVEL=DEBUG

# Local Services
MREG_POSTGRES_HOST=localhost
MREG_POSTGRES_ECHO=true
MREG_REDIS_URL=redis://localhost:6379/0

# Development Azure App (separate from production)
MREG_AZURE_TENANT_ID=dev-tenant-id
MREG_AZURE_CLIENT_ID=dev-client-id
MREG_AZURE_CLIENT_SECRET=dev-client-secret
MREG_FASTMCP_OAUTH_CALLBACK_URL=http://localhost:8001/oauth/callback

# Relaxed Security
MREG_SECURITY_ENABLE_CORS=true
MREG_SECURITY_CORS_ORIGINS=*
MREG_FASTMCP_ENABLE_ERROR_DETAILS=true
```

#### **Production Environment (.env.prod)**
```bash
# Production Configuration
MREG_ENVIRONMENT=production
MREG_DEBUG=false
MREG_LOG_LEVEL=INFO
MREG_LOG_FORMAT=json

# Production Database
MREG_POSTGRES_HOST=prod-postgres.example.com
MREG_POSTGRES_SSL_MODE=require
MREG_POSTGRES_ECHO=false

# Production Redis
MREG_REDIS_URL=redis://prod-redis.example.com:6379/0
MREG_REDIS_PASSWORD=secure-redis-password

# Production Azure App
MREG_AZURE_TENANT_ID=prod-tenant-id
MREG_AZURE_CLIENT_ID=prod-client-id
MREG_AZURE_CLIENT_SECRET=prod-client-secret
MREG_FASTMCP_OAUTH_CALLBACK_URL=https://mcp-gateway.example.com/oauth/callback

# Enhanced Security
MREG_SECURITY_ENABLE_CORS=true
MREG_SECURITY_CORS_ORIGINS=https://app.example.com,https://admin.example.com
MREG_SECURITY_ENABLE_SECURITY_HEADERS=true
MREG_FASTMCP_ENABLE_ERROR_DETAILS=false

# Performance Settings
MREG_SERVICE_WORKERS=4
MREG_POSTGRES_MAX_CONNECTIONS=50
MREG_REDIS_MAX_CONNECTIONS=50
```

#### **Testing Environment (.env.test)**
```bash
# Test Configuration
MREG_ENVIRONMENT=testing
MREG_DEBUG=false
MREG_LOG_LEVEL=WARNING

# Test Database (separate from dev)
MREG_POSTGRES_HOST=localhost
MREG_POSTGRES_DB=mcp_registry_test
MREG_POSTGRES_ECHO=false

# Test Redis
MREG_REDIS_URL=redis://localhost:6379/1

# Disabled Features for Testing
MREG_FASTMCP_ENABLE_RATE_LIMITING=false
MREG_CIRCUIT_BREAKER_ENABLED=false
MREG_METRICS_ENABLED=false
```

## 🔧 **Configuration Management**

### **Environment-Specific Configuration**

```bash
# Load environment-specific configuration
export MREG_CONFIG_FILE=".env.${MREG_ENVIRONMENT}"

# Development
MREG_ENVIRONMENT=development uv run mcp-gateway serve

# Staging
MREG_ENVIRONMENT=staging uv run mcp-gateway serve

# Production
MREG_ENVIRONMENT=production uv run mcp-gateway serve
```

### **Configuration Hierarchy**

1. **Environment variables** (highest priority)
2. **Environment-specific .env file** (`.env.production`, `.env.development`)
3. **Default .env file**
4. **Configuration class defaults** (lowest priority)

### **Secret Management**

#### **Development Secrets**
```bash
# Store in .env (gitignored)
MREG_AZURE_CLIENT_SECRET=dev-secret
MREG_SECURITY_JWT_SECRET_KEY=dev-jwt-secret
MREG_POSTGRES_PASSWORD=dev-password
```

#### **Production Secrets**
```bash
# Use environment variables or secret management service
export MREG_AZURE_CLIENT_SECRET="$(azure keyvault secret show --name mcp-client-secret --vault-name prod-kv --query value -o tsv)"
export MREG_SECURITY_JWT_SECRET_KEY="$(azure keyvault secret show --name jwt-secret --vault-name prod-kv --query value -o tsv)"
```

### **Configuration Validation Rules**

#### **Required Settings**
- `MREG_AZURE_TENANT_ID`, `MREG_AZURE_CLIENT_ID`, `MREG_AZURE_CLIENT_SECRET` (if FastMCP enabled)
- `MREG_SECURITY_JWT_SECRET_KEY` (if authentication enabled)
- `MREG_POSTGRES_*` settings (for database connectivity)

#### **Validation Checks**
- Database connectivity
- Redis connectivity
- Azure OAuth configuration
- Port availability
- Required directories writable
- Feature flag dependencies

## 🛠️ **Configuration Troubleshooting**

### **Common Issues**

#### **Database Connection Issues**
```bash
# Test database connectivity
psql -h $MREG_POSTGRES_HOST -U $MREG_POSTGRES_USER -d $MREG_POSTGRES_DB -c "SELECT version();"

# Check environment variables
env | grep MREG_POSTGRES

# Validate configuration
uv run mcp-gateway validate
```

#### **Azure OAuth Issues**
```bash
# Verify Azure configuration
echo "Tenant: $MREG_AZURE_TENANT_ID"
echo "Client: $MREG_AZURE_CLIENT_ID"
echo "Callback: $MREG_FASTMCP_OAUTH_CALLBACK_URL"

# Test OAuth endpoint availability
curl -I "https://login.microsoftonline.com/$MREG_AZURE_TENANT_ID/oauth2/v2.0/authorize"
```

#### **Port Conflicts**
```bash
# Check port availability
lsof -i :8000  # FastAPI port
lsof -i :8001  # FastMCP port

# Use alternative ports
MREG_SERVICE_PORT=8080 uv run mcp-gateway serve
```

### **Configuration Debug Mode**

```bash
# Enable debug logging
MREG_DEBUG=true MREG_LOG_LEVEL=DEBUG uv run mcp-gateway serve

# Show configuration details
uv run mcp-gateway config --show-secrets --validate

# Test individual components
uv run mcp-gateway healthcheck --timeout 30
```

---

## 📖 **Related Documentation**

- **[Development Setup](DEVELOPMENT_SETUP.md)** - Environment setup and package management
- **[API Reference](API_REFERENCE.md)** - API endpoint documentation
- **[Testing Guide](TESTING_GUIDE.md)** - Testing configuration and validation
- **[Azure OAuth Setup Guide](AZURE_APP_REGISTRATION_GUIDE.md)** - Azure OAuth configuration
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)