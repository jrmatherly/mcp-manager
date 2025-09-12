# API Reference - MCP Registry Gateway

This document provides comprehensive API endpoint documentation for both FastAPI and FastMCP servers in the MCP Registry Gateway.

> **📖 Part of**: [AI Assistant Guide](../../AGENTS.md) | **🏠 Return to**: [Project Context](README.md)

---

## 📚 **API Endpoints**

### **Core Proxy Functionality**
- `POST /mcp` - Simple MCP JSON-RPC proxy  
- `POST /mcp/proxy` - Advanced routing with preferences and capabilities

### **Registry Management**
- `POST /api/v1/servers` - Register MCP server  
- `GET /api/v1/servers` - List all registered servers  
- `GET /api/v1/servers/{id}` - Get specific server details  
- `DELETE /api/v1/servers/{id}` - Unregister server

### **Service Discovery**
- `GET /api/v1/discovery/tools?tools=...` - Find servers by tool capabilities  
- `GET /api/v1/discovery/resources?resources=...` - Find servers by resource types

### **System Monitoring**
- `GET /health` - Comprehensive health check with component status  
- `GET /api/v1/admin/stats` - System statistics and metrics  
- `GET /api/v1/router/metrics` - Load balancer performance metrics  
- `GET /api/v1/proxy/active-requests` - Real-time request monitoring

### **Enhanced Monitoring & Analytics (NEW - Priority 1)**
- `GET /metrics` - **Prometheus metrics endpoint** with comprehensive user analytics
- `GET /api/v1/admin/multi-user-status` - Multi-user system status and capacity metrics
- `GET /api/v1/admin/tenant-fairness/{tenant_id}` - Tenant fairness allocation analytics
- `GET /api/v1/admin/connection-pool-status` - Connection pool performance and scaling status
- `GET /api/v1/admin/token-refresh-status` - Background token refresh service analytics
- `GET /api/v1/admin/rate-limiting-performance` - Rate limiting fairness and DDoS protection metrics
- `GET /api/v1/admin/user-activity/{user_id}` - Individual user behavior pattern analytics
- `GET /api/v1/admin/tenant-analytics/{tenant_id}` - Comprehensive tenant resource utilization

### **FastMCP Endpoints (NEW - Authenticated)**
- `POST /mcp` - MCP JSON-RPC with Azure OAuth authentication  
- `GET /oauth/login` - Azure OAuth login initiation  
- `GET /oauth/callback` - OAuth callback handler  
- `GET /oauth/userinfo` - User information endpoint  

### **MCP Tools (NEW - Structured Responses with Role-based Access)**
- `list_servers` - List servers with tenant filtering → **ServerListResponse** (all users)  
- `register_server` - Register servers with user context → **ServerRegistrationResponse** (admin only)  
- `proxy_request` - Authenticated MCP proxy → **ProxyRequestResponse** (user, admin)  
- `health_check` - System health with auth status → **HealthCheckResponse** (all users)  

### **MCP Resources (NEW - Structured Responses, Admin Only)**
- `config://server` - Server configuration → **ConfigurationResponse** (admin access only)

### **API Documentation**
- `GET /docs` - Interactive Swagger UI documentation (FastAPI)  
- `GET /redoc` - ReDoc documentation interface (FastAPI)  
- `GET /openapi.json` - OpenAPI specification (FastAPI)  
- FastMCP tools documented via MCP protocol introspection

## 🔍 **Detailed Endpoint Documentation**

### **FastAPI Endpoints (Port 8000)**

#### **Health and Status**

**GET /health**
```bash
curl -X GET http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00Z",
  "components": {
    "database": "healthy",
    "redis": "healthy",
    "servers": "2 active"
  }
}
```

#### **Server Registry**

**POST /api/v1/servers** - Register MCP Server
```bash
curl -X POST http://localhost:8000/api/v1/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "example-server",
    "transport": "http",
    "url": "http://localhost:3000",
    "capabilities": ["list_files", "read_file"]
  }'
```

**GET /api/v1/servers** - List Servers
```bash
curl -X GET http://localhost:8000/api/v1/servers
```

Response:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "example-server",
    "transport": "http",
    "url": "http://localhost:3000",
    "status": "active",
    "capabilities": ["list_files", "read_file"],
    "created_at": "2025-01-10T12:00:00Z"
  }
]
```

**DELETE /api/v1/servers/{id}** - Unregister Server
```bash
curl -X DELETE http://localhost:8000/api/v1/servers/550e8400-e29b-41d4-a716-446655440000
```

#### **Service Discovery**

**GET /api/v1/discovery/tools** - Find by Tools
```bash
curl -X GET "http://localhost:8000/api/v1/discovery/tools?tools=list_files,read_file"
```

**GET /api/v1/discovery/resources** - Find by Resources
```bash
curl -X GET "http://localhost:8000/api/v1/discovery/resources?resources=file,directory"
```

#### **MCP Proxy**

**POST /mcp** - Simple Proxy
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/list",
    "params": {}
  }'
```

**POST /mcp/proxy** - Advanced Proxy
```bash
curl -X POST http://localhost:8000/mcp/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "jsonrpc": "2.0",
      "id": "1",
      "method": "tools/list",
      "params": {}
    },
    "preferences": {
      "load_balancer": "round_robin"
    }
  }'
```

### **FastMCP Endpoints (Port 8001) - Authenticated**

#### **Authentication Flow**

**GET /oauth/login** - Initiate OAuth
```bash
# Redirect to Azure OAuth
curl -X GET http://localhost:8000/oauth/login
```

**GET /oauth/callback** - OAuth Callback
```bash
# Handled by Azure OAuth flow
# Returns to application with authentication token
```

**GET /oauth/userinfo** - User Information
```bash
curl -X GET http://localhost:8000/oauth/userinfo \
  -H "Authorization: Bearer <access_token>"
```

Response:
```json
{
  "user_id": "user@example.com",
  "name": "John Doe",
  "roles": ["user"],
  "tenant_id": "example-tenant"
}
```

#### **MCP Tools (Authenticated)**

All MCP tools require Azure OAuth authentication and return structured responses.

**list_servers** - List Servers with Tenant Filtering
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "list_servers",
    "arguments": {}
  }
}
```

Response (ServerListResponse):
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 2 servers for tenant example-tenant"
      }
    ],
    "servers": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "example-server",
        "status": "active",
        "tenant_id": "example-tenant"
      }
    ],
    "total_count": 2,
    "status": "success"
  }
}
```

**register_server** - Register Server (Admin Only)
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "register_server",
    "arguments": {
      "name": "new-server",
      "transport": "http",
      "url": "http://localhost:4000",
      "capabilities": ["search", "index"]
    }
  }
}
```

**proxy_request** - Authenticated MCP Proxy
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "proxy_request",
    "arguments": {
      "target_method": "tools/list",
      "target_params": {},
      "server_preference": "example-server"
    }
  }
}
```

**health_check** - System Health with Auth Status
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "health_check",
    "arguments": {}
  }
}
```

#### **MCP Resources (Admin Only)**

**config://server** - Server Configuration
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "resources/read",
  "params": {
    "uri": "config://server"
  }
}
```

## 🔒 **Authentication and Authorization**

### **Authentication Methods**

#### **FastAPI (Port 8000) - No Authentication**
- Public access to registry management
- Health monitoring and metrics
- Service discovery endpoints

#### **FastMCP (Port 8001) - Azure OAuth Required**
- Azure Active Directory OAuth 2.0
- Role-based access control (RBAC)
- Tenant isolation

### **Role-Based Access**

| Role | MCP Tools Access | Resources Access |
|------|-----------------|------------------|
| **user** | list_servers, proxy_request, health_check | None |
| **admin** | All tools | config://server |
| **server_owner** | list_servers, proxy_request, health_check | None |

### **Authorization Headers**

```bash
# Azure OAuth Bearer Token
Authorization: Bearer <azure_access_token>

# Custom API Key (if configured)
X-API-Key: <api_key>
```

## 📈 **Response Formats**

### **FastAPI Responses**

Standard HTTP responses with JSON payload:
```json
{
  "data": {}, 
  "status": "success",
  "message": "Optional message"
}
```

Error responses:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {}
  }
}
```

### **FastMCP Responses (Structured)**

All FastMCP tools return structured responses using FastMCPBaseModel:

#### **ServerListResponse**
```json
{
  "content": [{
    "type": "text",
    "text": "Server list message"
  }],
  "servers": [...],
  "total_count": 0,
  "status": "success|error"
}
```

#### **ServerRegistrationResponse**
```json
{
  "content": [{
    "type": "text", 
    "text": "Registration result message"
  }],
  "server_id": "uuid",
  "registration_status": "success|failed",
  "status": "success|error"
}
```

#### **ProxyRequestResponse**
```json
{
  "content": [{
    "type": "text",
    "text": "Proxy result message"
  }],
  "proxy_result": {},
  "target_server": "server-name",
  "status": "success|error"
}
```

#### **HealthCheckResponse**
```json
{
  "content": [{
    "type": "text",
    "text": "System health summary"
  }],
  "health_status": {
    "overall": "healthy|degraded|unhealthy",
    "components": {},
    "auth_status": "authenticated"
  },
  "status": "success|error"
}
```

## 🛑 **Error Handling**

### **HTTP Status Codes**

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Service temporarily unavailable

### **Error Response Format**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error context"
    },
    "request_id": "unique-request-identifier"
  }
}
```

### **Common Error Codes**

- **VALIDATION_ERROR**: Request validation failed
- **AUTHENTICATION_REQUIRED**: Valid authentication token required
- **INSUFFICIENT_PERMISSIONS**: User lacks required permissions
- **SERVER_NOT_FOUND**: Requested server not registered
- **PROXY_ERROR**: Error proxying request to target server
- **RATE_LIMIT_EXCEEDED**: Request rate limit exceeded
- **INTERNAL_ERROR**: Unexpected server error

---

## 📖 **Related Documentation**

- **[Configuration Guide](CONFIGURATION_GUIDE.md)** - Environment variables and settings
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Environment setup and package management
- **[Testing Guide](TESTING_GUIDE.md)** - API testing strategies
- **[AI Assistant Guide](../../AGENTS.md)** - Main AI assistant documentation

---

**Last Updated**: 2025-01-10  
**Related**: [AI Assistant Guide](../../AGENTS.md) | [Project Context](README.md)