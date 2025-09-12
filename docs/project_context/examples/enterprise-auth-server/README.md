# Enterprise MCP Server with Azure OAuth Authentication

Enterprise-grade MCP server implementation following **MCP Registry Gateway project patterns** with Azure OAuth Proxy authentication, role-based access control, and comprehensive middleware.

## Features

- **Azure OAuth Proxy Authentication**: Uses the corrected FastMCP OAuth Proxy architecture
- **Role-Based Access Control**: Admin/user permissions with tenant isolation
- **Middleware Chain**: Audit logging, rate limiting, and tool access control
- **FastMCPBaseModel Responses**: Structured responses with type validation
- **MREG_ Environment Variables**: Follows project configuration standards
- **Enterprise Security**: Production-ready authentication and authorization patterns

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Azure OAuth
Set up your Azure App Registration following the [Azure App Registration Guide](../../AZURE_APP_REGISTRATION_GUIDE.md).

### 3. Set Environment Variables
Following the project's MREG_ prefix standards:
```bash
# Required Azure OAuth configuration
export MREG_AZURE_TENANT_ID="your-tenant-id"
export MREG_AZURE_CLIENT_ID="your-client-id"
export MREG_AZURE_CLIENT_SECRET="your-client-secret"

# Optional configuration
export MREG_FASTMCP_OAUTH_CALLBACK_URL="http://localhost:8001/oauth/callback"
export MREG_FASTMCP_ENABLE_AUDIT_LOGGING="true"
export MREG_FASTMCP_ENABLE_RATE_LIMITING="true"
export MREG_FASTMCP_ENABLE_TOOL_ACCESS_CONTROL="true"
export MREG_FASTMCP_REQUESTS_PER_MINUTE="100"
```

### 4. Run the Server
```bash
python server.py
```

### 5. Configure Claude Desktop
Add to your MCP client configuration:
```json
{
  "mcp": {
    "servers": {
      "enterprise-auth-server": {
        "command": "python",
        "args": ["/path/to/enterprise-auth-server/server.py"],
        "transport": "stdio",
        "env": {
          "MREG_AZURE_TENANT_ID": "your-tenant-id",
          "MREG_AZURE_CLIENT_ID": "your-client-id",
          "MREG_AZURE_CLIENT_SECRET": "your-client-secret"
        }
      }
    }
  }
}
```

## Security Features

### Azure OAuth Proxy
- Azure AD OAuth 2.0 with PKCE support
- JWT token validation with Azure JWKS
- Tenant-specific authentication
- Secure token exchange flows

### Role-Based Access Control
- User and admin role separation
- Tenant isolation enforcement  
- Tool-level access control
- Context-aware authorization

### Middleware Chain
- Comprehensive audit logging to database
- Rate limiting with configurable thresholds
- Tool access control with role validation
- Error handling with security context

## Available Tools

### `_secure_query_data`
Secure data query with authentication and tenant isolation:
- Requires `user` or `admin` role
- Input validation and SQL injection protection
- Audit logging with user context
- Tenant-scoped data access

### `_admin_system_status`
Administrative system status with elevated permissions:
- Requires `admin` role
- System health and performance metrics
- Comprehensive audit trail
- Administrative access logging

### `_get_authentication_info`
Authentication information and Azure OAuth URLs:
- No authentication required (public endpoint)
- Provides Azure OAuth login URL
- Returns OAuth configuration metadata
- State parameter generation

## Authentication Flow

1. **Azure OAuth Initiation**: Call `_get_authentication_info` to get Azure OAuth URL
2. **User Authentication**: User authenticates with Azure AD
3. **OAuth Callback**: Azure redirects to FastMCP OAuth Proxy
4. **Token Validation**: FastMCP validates JWT tokens with Azure JWKS
5. **Context Creation**: User context created with roles and tenant information
6. **Tool Access**: Authenticated requests with role-based authorization
7. **Audit Logging**: Complete security event tracking with user context

## Project Integration

### Full MCP Registry Gateway Integration
For complete functionality, install the MCP Registry Gateway package:
```bash
pip install mcp-registry-gateway
```

This provides:
- Full Azure OAuth Proxy implementation
- Database-backed audit logging
- Production-ready middleware
- Configuration management
- Enhanced security features

### Standalone Mode
The example includes fallback implementations for standalone operation without the full project dependencies.

### Configuration Integration
Follows the project's environment variable patterns:
- **MREG_** prefix for all configuration
- **Azure OAuth** standard patterns
- **Middleware** configuration flags
- **Security** settings alignment

## Security Considerations

### Input Validation
All inputs are validated using Pydantic models with:
- Type checking and coercion
- Length and format validation
- SQL injection protection
- Data sanitization

### Rate Limiting
Configurable rate limits with:
- Per-user request throttling
- Configurable requests per minute
- Middleware-based enforcement
- Audit logging of limit violations

### Authentication Security
Azure OAuth security features:
- JWT token validation with Azure JWKS
- Tenant-specific authentication
- Role-based authorization
- Secure token handling

### Audit Requirements
Complete audit trail including:
- Authentication events with user context
- Authorization decisions
- Data access patterns with tenant isolation
- Tool usage tracking
- Security violations and rate limiting

## References

### Project Documentation
- [Azure App Registration Guide](../../AZURE_APP_REGISTRATION_GUIDE.md) - Complete Azure setup
- [FastMCP Integration Guide](../../fastmcp_project_context/) - FastMCP implementation patterns
- [Database Performance Guide](../../DATABASE_PERFORMANCE_GUIDE.md) - Database optimization

### Architecture Patterns
This example demonstrates the authentication patterns from the MCP Registry Gateway project:
- Azure OAuth Proxy architecture (corrected FastMCP implementation)
- Modular auth/ system integration
- Middleware chain composition
- FastMCPBaseModel structured responses
- MREG_ environment variable standards

### Next Steps
1. **Production Deployment**: Install full MCP Registry Gateway package
2. **Database Integration**: Add PostgreSQL audit logging
3. **Monitoring**: Integrate with project observability stack
4. **Scaling**: Use project's load balancing and health monitoring
5. **Security**: Apply project's security hardening patterns