# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-15-server-registration-foundation/spec.md

## Endpoints

### POST /api/mcp/servers

**Purpose:** Register a new MCP server in the gateway
**Parameters:**
- Body: `{ server_name, display_name, description, endpoint_url, server_type, configuration?, capabilities? }`
**Response:**
```json
{
  "id": "uuid",
  "server_name": "string",
  "display_name": "string",
  "status": "inactive",
  "api_key": "mcp_xxx...xxx",
  "created_at": "2025-09-15T10:00:00Z"
}
```
**Errors:** 400 (validation), 401 (unauthorized), 409 (duplicate name), 500 (server error)

### GET /api/mcp/servers

**Purpose:** List all registered MCP servers for the tenant
**Parameters:**
- Query: `?page=1&limit=50&status=active&search=query`
**Response:**
```json
{
  "servers": [
    {
      "id": "uuid",
      "server_name": "string",
      "display_name": "string",
      "status": "active",
      "health_status": "healthy",
      "last_health_check": "2025-09-15T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```
**Errors:** 401 (unauthorized), 500 (server error)

### GET /api/mcp/servers/{server_id}

**Purpose:** Get detailed information about a specific MCP server
**Parameters:**
- Path: `server_id` (UUID)
**Response:**
```json
{
  "id": "uuid",
  "server_name": "string",
  "display_name": "string",
  "description": "string",
  "endpoint_url": "string",
  "server_type": "external",
  "status": "active",
  "configuration": {},
  "capabilities": [],
  "health_check_enabled": true,
  "health_check_interval": 60,
  "last_health_check": "2025-09-15T10:00:00Z",
  "last_health_status": "healthy",
  "created_at": "2025-09-15T10:00:00Z",
  "created_by": "user_name"
}
```
**Errors:** 401 (unauthorized), 404 (not found), 500 (server error)

### PUT /api/mcp/servers/{server_id}

**Purpose:** Update MCP server configuration
**Parameters:**
- Path: `server_id` (UUID)
- Body: `{ display_name?, description?, endpoint_url?, configuration?, status? }`
**Response:**
```json
{
  "id": "uuid",
  "server_name": "string",
  "updated_fields": ["display_name", "configuration"],
  "updated_at": "2025-09-15T10:00:00Z"
}
```
**Errors:** 400 (validation), 401 (unauthorized), 404 (not found), 500 (server error)

### DELETE /api/mcp/servers/{server_id}

**Purpose:** Remove MCP server from registry (soft delete)
**Parameters:**
- Path: `server_id` (UUID)
**Response:**
```json
{
  "message": "Server successfully removed",
  "deleted_at": "2025-09-15T10:00:00Z"
}
```
**Errors:** 401 (unauthorized), 404 (not found), 409 (has active connections), 500 (server error)

### POST /api/mcp/servers/{server_id}/health-check

**Purpose:** Trigger immediate health check for a server
**Parameters:**
- Path: `server_id` (UUID)
**Response:**
```json
{
  "server_id": "uuid",
  "status": "healthy",
  "response_time_ms": 145,
  "checked_at": "2025-09-15T10:00:00Z"
}
```
**Errors:** 401 (unauthorized), 404 (not found), 503 (server unreachable), 500 (server error)

### POST /api/mcp/api-keys

**Purpose:** Generate new API key for server access
**Parameters:**
- Body: `{ key_name, server_id?, permissions?, rate_limit?, expires_in_days? }`
**Response:**
```json
{
  "id": "uuid",
  "key_name": "string",
  "api_key": "mcp_abcd1234...xyz789",
  "key_hint": "...z789",
  "expires_at": "2026-01-15T10:00:00Z",
  "permissions": [],
  "rate_limit": 1000
}
```
**Errors:** 400 (validation), 401 (unauthorized), 403 (forbidden), 500 (server error)

### GET /api/mcp/api-keys

**Purpose:** List all API keys for the current user/tenant
**Parameters:**
- Query: `?page=1&limit=50&status=active`
**Response:**
```json
{
  "api_keys": [
    {
      "id": "uuid",
      "key_name": "string",
      "key_hint": "...z789",
      "server_id": "uuid",
      "status": "active",
      "expires_at": "2026-01-15T10:00:00Z",
      "last_used_at": "2025-09-14T10:00:00Z",
      "usage_count": 1234
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50
}
```
**Errors:** 401 (unauthorized), 500 (server error)

### POST /api/mcp/api-keys/{key_id}/rotate

**Purpose:** Rotate an existing API key
**Parameters:**
- Path: `key_id` (UUID)
**Response:**
```json
{
  "old_key_id": "uuid",
  "new_key_id": "uuid",
  "new_api_key": "mcp_newkey1234...abc789",
  "expires_at": "2026-01-15T10:00:00Z",
  "message": "Key rotated successfully. Old key will remain valid for 24 hours."
}
```
**Errors:** 401 (unauthorized), 404 (not found), 500 (server error)

### DELETE /api/mcp/api-keys/{key_id}

**Purpose:** Revoke an API key immediately
**Parameters:**
- Path: `key_id` (UUID)
- Body: `{ reason?: string }`
**Response:**
```json
{
  "message": "API key revoked successfully",
  "revoked_at": "2025-09-15T10:00:00Z"
}
```
**Errors:** 401 (unauthorized), 404 (not found), 500 (server error)

## Controller Logic

### ServerController

**Actions:**
- `create_server()`: Validate input, check uniqueness, generate initial API key, store in database
- `list_servers()`: Filter by tenant, apply pagination, include health status
- `get_server()`: Verify ownership, return full details with recent health history
- `update_server()`: Validate changes, update timestamp, log audit event
- `delete_server()`: Check for active connections, soft delete, revoke associated API keys
- `health_check()`: Async HTTP request with timeout, store result, update server status

### APIKeyController

**Actions:**
- `generate_key()`: Create secure 64-char key, hash for storage, set expiry date
- `list_keys()`: Filter by user/tenant, exclude revoked unless requested
- `rotate_key()`: Generate new key, mark old for delayed revocation, notify user
- `revoke_key()`: Immediate invalidation, log reason, audit trail

### Error Handling

**Standard Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "correlation_id": "uuid",
    "timestamp": "2025-09-15T10:00:00Z"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Invalid input parameters
- `AUTHENTICATION_REQUIRED`: Missing or invalid session
- `PERMISSION_DENIED`: Insufficient privileges
- `RESOURCE_NOT_FOUND`: Server or key doesn't exist
- `DUPLICATE_RESOURCE`: Name already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_UNREACHABLE`: Health check failed
- `INTERNAL_ERROR`: Unexpected server error

## Integration Points

### Better-Auth Session Validation
```python
@require_auth
async def endpoint(request: Request, session: Session = Depends(get_session)):
    # Session includes user_id, tenant_id, roles
    validate_permission(session, "mcp:servers:write")
```

### Audit Logging
```python
async def log_audit_event(
    session: Session,
    resource_type: str,
    resource_id: str,
    operation: str,
    details: dict
):
    # Store in audit_logs table with correlation ID
```

### Rate Limiting
```python
@rate_limit(key=lambda req: req.session.user_id)
async def endpoint(request: Request):
    # Redis-backed rate limiting per user/role
```