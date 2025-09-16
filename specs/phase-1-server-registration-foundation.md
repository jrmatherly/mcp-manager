# Spec Requirements Document (SRD)
# Phase 1: Server Registration Foundation

**Project**: MCP Registry Gateway  
**Version**: 1.0  
**Date**: September 15, 2025  
**Status**: Not Started  
**Priority**: P0 (Critical Foundation)  
**Timeline**: 3-4 weeks  

## Executive Summary

Phase 1 establishes the foundational server registration infrastructure for the MCP Registry Gateway, enabling administrators to register, manage, and monitor MCP servers with enterprise-grade security and multi-tenancy support. This phase represents 65% foundational readiness with critical missing components for production deployment.

## 1. Overview and Objectives

### 1.1 Project Context
The MCP Registry Gateway serves as an enterprise-grade registry, gateway, and proxy system for Model Context Protocol (MCP) servers. Phase 1 focuses exclusively on server registration capabilities, building upon the existing authentication and database infrastructure.

### 1.2 Business Objectives
- **Enable MCP Server Discovery**: Provide centralized registration for MCP servers across organizations
- **Establish Security Foundation**: Implement robust API key management with enterprise security patterns
- **Multi-Tenant Support**: Enable organizations to manage their own server ecosystems
- **Audit Compliance**: Implement comprehensive logging for enterprise compliance requirements
- **Operational Visibility**: Provide health monitoring and status tracking for registered servers

### 1.3 Technical Objectives
- Implement MCP server registration API endpoints with full CRUD operations
- Deploy enhanced API key management with security best practices
- Create intuitive server management UI components for administrative workflows
- Establish audit logging infrastructure for compliance and monitoring
- Build request/response structured logging for operational insights
- Implement basic authentication framework for MCP proxy operations

## 2. User Stories

### 2.1 Primary User Stories

**Epic: Server Administrator Workflows**

**US-001: Register New MCP Server**
```
As a server administrator
I want to register a new MCP server in the registry
So that it can be discovered and used by authorized clients

Acceptance Criteria:
- Can provide server details (name, endpoint, transport type, auth config)
- System validates server connectivity during registration
- Auto-generates secure API key with mcp_ prefix
- Server appears in management dashboard immediately
- Registration event is logged for audit purposes
```

**US-002: Manage Server Configuration**
```
As a server administrator
I want to update server configuration and settings
So that I can maintain optimal server operations

Acceptance Criteria:
- Can modify server metadata (name, description, version)
- Can update authentication configuration
- Can change server status (active/inactive/maintenance)
- Changes are validated before applying
- Configuration changes trigger audit log entries
```

**US-003: Monitor Server Health**
```
As a server administrator
I want to monitor the health status of registered servers
So that I can ensure reliable service availability

Acceptance Criteria:
- Can view real-time health status indicators
- Can manually trigger health checks
- System performs automatic health monitoring
- Health events are logged with timestamps
- Unhealthy servers are visually highlighted
```

**US-004: Manage API Keys**
```
As a server administrator
I want to manage API keys for server access
So that I can control and rotate access credentials securely

Acceptance Criteria:
- Can generate new API keys with 90-day expiration
- Can revoke existing API keys immediately
- Can view key usage statistics and last used timestamps
- Keys follow security pattern (mcp_ prefix, 64 characters)
- Key operations are logged for security audit
```

### 2.2 Secondary User Stories

**Epic: Client Developer Workflows**

**US-005: Discover Available Servers**
```
As a client developer
I want to browse available MCP servers
So that I can integrate relevant capabilities into my application

Acceptance Criteria:
- Can view list of active, authorized servers
- Can see server capabilities and tool descriptions
- Can access server documentation and examples
- Access is restricted to authorized servers only
- Server discovery events are logged
```

**US-006: Access Server Documentation**
```
As a client developer
I want to access comprehensive server documentation
So that I can successfully integrate with MCP servers

Acceptance Criteria:
- Can view server API documentation
- Can see available tools and resources
- Can access usage examples and code samples
- Documentation is automatically updated
- Access requires valid authentication
```

## 3. Spec Scope (Phase 1 Deliverables)

### 3.1 Backend API Endpoints

**Server Management API (`/api/servers`)**
- `POST /api/servers` - Register new MCP server
- `GET /api/servers` - List servers (tenant-filtered)
- `GET /api/servers/{id}` - Get server details
- `PUT /api/servers/{id}` - Update server configuration
- `DELETE /api/servers/{id}` - Remove server registration
- `POST /api/servers/{id}/health-check` - Manual health check
- `GET /api/servers/{id}/health` - Get health status

**API Key Management API (`/api/api-keys`)**
- `POST /api/api-keys` - Generate new API key
- `GET /api/api-keys` - List API keys (tenant-filtered)
- `DELETE /api/api-keys/{id}` - Revoke API key
- `POST /api/api-keys/{id}/rotate` - Rotate API key
- `GET /api/api-keys/{id}/usage` - Get usage statistics

### 3.2 Database Schema Enhancements

**Enhanced MCP Server Table**
```sql
-- Existing table with additional fields for Phase 1
ALTER TABLE mcp_server ADD COLUMN IF NOT EXISTS:
  api_key_id UUID REFERENCES api_token(id),
  health_check_interval INTEGER DEFAULT 300,
  last_health_check TIMESTAMP,
  health_check_failures INTEGER DEFAULT 0,
  auto_health_check BOOLEAN DEFAULT true;
```

**API Token Security Enhancements**
```sql
-- Enhanced security fields
ALTER TABLE api_token ADD COLUMN IF NOT EXISTS:
  key_prefix TEXT NOT NULL DEFAULT 'mcp_',
  key_length INTEGER NOT NULL DEFAULT 64,
  rotation_policy JSONB DEFAULT '{"days": 90, "auto_rotate": false}',
  usage_stats JSONB DEFAULT '{"requests": 0, "last_used": null}',
  security_metadata JSONB DEFAULT '{}';
```

### 3.3 Frontend UI Components

**Server Management Dashboard**
- Server list view with status indicators
- Server registration form modal
- Server configuration editor
- Health status monitoring panel
- API key management interface

**Component Structure**
```
frontend/src/components/server-management/
├── server-list.tsx              # Main server listing
├── server-card.tsx              # Individual server card (exists)
├── server-form-modal.tsx        # Registration/edit form
├── server-health-panel.tsx      # Health monitoring
├── api-key-manager.tsx          # API key operations
└── server-stats-widget.tsx      # Usage statistics
```

### 3.4 Security Infrastructure

**API Key Security Pattern**
- Prefix: `mcp_` (4 characters)
- Length: 64 characters total (60 random + 4 prefix)
- Character set: alphanumeric (a-zA-Z0-9)
- Expiration: 90 days default
- Storage: SHA-256 hashed in database

**Authentication Middleware Enhancement**
- Extend existing Better-Auth integration
- Add API key validation for MCP proxy requests
- Implement rate limiting based on API key
- Add request context logging

### 3.5 Audit Logging System

**Structured Logging Framework**
```typescript
interface AuditLogEntry {
  event_type: 'server_registered' | 'server_updated' | 'api_key_generated' | 'health_check_performed';
  actor_id: string;
  tenant_id: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}
```

**Request/Response Logging**
- All API requests logged with correlation IDs
- Response times and status codes tracked
- Error conditions captured with stack traces
- Performance metrics aggregated for monitoring

## 4. Out of Scope (Deferred to Later Phases)

### 4.1 Advanced Features (Phase 2+)
- Server discovery algorithms and recommendations
- Advanced monitoring and alerting systems
- Server dependency mapping and visualization
- Automated failover and load balancing
- Advanced security features (mTLS, certificate management)

### 4.2 Integration Features (Phase 3+)
- Third-party authentication providers beyond Azure AD
- Webhook notifications for server events
- Integration with external monitoring systems
- Advanced analytics and reporting dashboards
- Server marketplace and rating system

### 4.3 Advanced Administration (Phase 4+)
- Bulk server management operations
- Server template and provisioning automation
- Advanced role-based access control
- Server compliance and policy enforcement
- Multi-region server deployment support

## 5. Technical Requirements

### 5.1 Backend Requirements

**Technology Stack**
- Python 3.10+ with FastAPI 0.114.2+
- FastMCP 0.4.0+ for MCP protocol handling
- PostgreSQL 17+ for data persistence
- Redis 8+ for session and cache management
- UV package manager for dependency management

**Performance Requirements**
- Server registration: <2 seconds response time
- Server listing: <500ms response time
- Health checks: <10 seconds timeout
- API throughput: 1000 requests/minute per tenant
- Database connection pooling with 10-50 connections

**Security Requirements**
- All API endpoints require authentication
- API keys use cryptographically secure random generation
- Input validation using Pydantic models
- SQL injection prevention through ORM usage
- Rate limiting: Admin (1000 RPM), User (100 RPM)

### 5.2 Frontend Requirements

**Technology Stack**
- Next.js 15.5.3 with React 19.1.1
- TypeScript 5.9.2 for type safety
- TailwindCSS v4 for styling with theme-aware dark mode
- Drizzle ORM for database operations
- Better-Auth for authentication

**User Experience Requirements**
- Responsive design for desktop and tablet
- Dark mode support with theme persistence
- Loading states for all async operations
- Error handling with user-friendly messages
- Accessibility compliance (WCAG 2.1 AA)

**Performance Requirements**
- Initial page load: <3 seconds
- Component interactions: <200ms response
- Form submissions: <1 second feedback
- Real-time updates for health status
- Optimistic UI updates where appropriate

### 5.3 Database Requirements

**Performance Optimizations**
- 38 strategic indexes for 40-90% query improvement
- 3 database functions for real-time analytics
- 3 monitoring views for operational visibility
- Automated health monitoring with performance scoring

**Data Integrity**
- Foreign key constraints for referential integrity
- Check constraints for data validation
- Unique constraints for business rules
- Audit trail for all data modifications

## 6. API Specifications

### 6.1 Server Registration API

**POST /api/servers**
```typescript
interface CreateServerRequest {
  name: string;           // Required, 1-100 characters
  description?: string;   // Optional, max 500 characters
  version: string;        // Required, semver format
  endpointUrl: string;    // Required, valid URL
  transportType: 'http' | 'websocket' | 'stdio' | 'sse';
  authType: 'none' | 'bearer' | 'api_key' | 'oauth' | 'custom';
  authConfig?: {
    apiKey?: string;
    bearerToken?: string;
    oauth?: {
      clientId?: string;
      clientSecret?: string;
      scope?: string;
    };
    custom?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  tags?: string[];        // Optional, for categorization
}

interface CreateServerResponse {
  id: string;
  name: string;
  description?: string;
  version: string;
  endpointUrl: string;
  transportType: string;
  authType: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  apiKey: string;         // Generated API key
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}
```

**Validation Rules**
- `name`: Required, 1-100 characters, alphanumeric with spaces and hyphens
- `endpointUrl`: Must be valid HTTP/HTTPS URL
- `version`: Must follow semantic versioning (x.y.z)
- `authConfig`: Validated based on `authType` selection
- `tags`: Maximum 10 tags, each 1-50 characters

**Error Responses**
```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Common error codes:
// 400: INVALID_REQUEST - Validation errors
// 401: UNAUTHORIZED - Authentication required
// 403: FORBIDDEN - Insufficient permissions
// 409: CONFLICT - Server name already exists
// 422: UNPROCESSABLE_ENTITY - Server endpoint unreachable
```

### 6.2 Server Management API

**GET /api/servers**
```typescript
interface ListServersQuery {
  page?: number;          // Default: 1
  limit?: number;         // Default: 20, max: 100
  status?: 'active' | 'inactive' | 'error' | 'maintenance';
  search?: string;        // Search by name or description
  tags?: string[];        // Filter by tags
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

interface ListServersResponse {
  servers: ServerResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status?: string;
    search?: string;
    tags?: string[];
  };
}
```

**PUT /api/servers/{id}**
```typescript
interface UpdateServerRequest {
  name?: string;
  description?: string;
  version?: string;
  endpointUrl?: string;
  authType?: 'none' | 'bearer' | 'api_key' | 'oauth' | 'custom';
  authConfig?: AuthConfig;
  status?: 'active' | 'inactive' | 'maintenance';
  metadata?: Record<string, unknown>;
  tags?: string[];
}

// Response: Same as CreateServerResponse
```

### 6.3 Health Check API

**POST /api/servers/{id}/health-check**
```typescript
interface HealthCheckRequest {
  timeout?: number;       // Default: 10 seconds, max: 30
  deep?: boolean;         // Default: false (quick check)
}

interface HealthCheckResponse {
  serverId: string;
  status: 'healthy' | 'unhealthy' | 'timeout';
  responseTime: number;   // Milliseconds
  timestamp: string;
  details: {
    connectivity: boolean;
    authentication: boolean;
    capabilities?: string[];
    tools?: number;       // Count of available tools
    resources?: number;   // Count of available resources
  };
  errors?: string[];
}
```

### 6.4 API Key Management API

**POST /api/api-keys**
```typescript
interface CreateApiKeyRequest {
  name: string;           // Required, 1-50 characters
  description?: string;   // Optional, max 200 characters
  expiresInDays?: number; // Default: 90, max: 365
  scopes?: string[];      // Default: ['server:read']
  serverId?: string;      // Optional, link to specific server
}

interface CreateApiKeyResponse {
  id: string;
  name: string;
  description?: string;
  key: string;            // Full API key (only shown once)
  keyPrefix: string;      // First 8 characters for identification
  scopes: string[];
  expiresAt: string;
  createdAt: string;
  serverId?: string;
  tenantId: string;
}
```

## 7. Database Schema Changes

### 7.1 Enhanced MCP Server Schema

```sql
-- Phase 1 enhancements to existing mcp_server table
ALTER TABLE mcp_server ADD COLUMN IF NOT EXISTS (
  -- API Key relationship
  api_key_id UUID REFERENCES api_token(id),
  
  -- Health monitoring
  health_check_interval INTEGER DEFAULT 300, -- seconds
  last_health_check TIMESTAMP,
  health_check_failures INTEGER DEFAULT 0,
  auto_health_check BOOLEAN DEFAULT true,
  health_check_timeout INTEGER DEFAULT 10, -- seconds
  
  -- Metadata and categorization
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Performance tracking
  avg_response_time DECIMAL(10,3), -- milliseconds
  success_rate DECIMAL(5,2), -- percentage
  last_error_message TEXT,
  last_error_at TIMESTAMP,
  
  -- Versioning
  schema_version INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_server_tenant_status ON mcp_server(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mcp_server_health_status ON mcp_server(health_status);
CREATE INDEX IF NOT EXISTS idx_mcp_server_tags ON mcp_server USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_mcp_server_last_health_check ON mcp_server(last_health_check);
```

### 7.2 Enhanced API Token Schema

```sql
-- Phase 1 enhancements to existing api_token table
ALTER TABLE api_token ADD COLUMN IF NOT EXISTS (
  -- Security enhancements
  key_prefix TEXT NOT NULL DEFAULT 'mcp_',
  key_length INTEGER NOT NULL DEFAULT 64,
  key_hash TEXT NOT NULL, -- SHA-256 hash of the key
  
  -- Rotation and lifecycle
  rotation_policy JSONB DEFAULT '{"days": 90, "auto_rotate": false}',
  last_rotated TIMESTAMP,
  rotation_count INTEGER DEFAULT 0,
  
  -- Usage tracking
  usage_stats JSONB DEFAULT '{"requests": 0, "last_used": null, "bytes_transferred": 0}',
  rate_limit_config JSONB DEFAULT '{"requests_per_minute": 100}',
  
  -- Security metadata
  security_metadata JSONB DEFAULT '{}',
  created_ip INET,
  last_used_ip INET,
  
  -- Scoping and permissions
  scopes TEXT[] DEFAULT '{"server:read"}',
  linked_server_id TEXT REFERENCES mcp_server(id)
);

-- Indexes for security and performance
CREATE INDEX IF NOT EXISTS idx_api_token_key_hash ON api_token(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_token_prefix ON api_token(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_token_tenant_active ON api_token(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_token_expires_at ON api_token(expires_at);
```

### 7.3 New Server Health Check Table

```sql
-- New table for detailed health check history
CREATE TABLE IF NOT EXISTS mcp_server_health_check (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id TEXT NOT NULL REFERENCES mcp_server(id) ON DELETE CASCADE,
  
  -- Health check execution
  performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  performed_by UUID REFERENCES "user"(id), -- NULL for automatic checks
  check_type TEXT NOT NULL DEFAULT 'automatic', -- 'manual' | 'automatic' | 'scheduled'
  
  -- Results
  status TEXT NOT NULL, -- 'healthy' | 'unhealthy' | 'timeout' | 'error'
  response_time_ms INTEGER,
  
  -- Detailed results
  connectivity_check BOOLEAN,
  authentication_check BOOLEAN,
  capabilities_check BOOLEAN,
  tools_count INTEGER,
  resources_count INTEGER,
  
  -- Error information
  error_message TEXT,
  error_code TEXT,
  error_details JSONB,
  
  -- Metadata
  check_config JSONB DEFAULT '{}',
  tenant_id UUID NOT NULL REFERENCES tenant(id)
);

-- Indexes for health monitoring
CREATE INDEX IF NOT EXISTS idx_health_check_server_time ON mcp_server_health_check(server_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_check_status ON mcp_server_health_check(status, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_check_tenant ON mcp_server_health_check(tenant_id, performed_at DESC);
```

## 8. UI/UX Requirements

### 8.1 Design System Integration

**TailwindCSS v4 Theme System**
- Glassmorphism effects for modern aesthetic
- Theme-aware dark mode with system preference detection
- Consistent color palette with accessibility compliance
- Responsive breakpoints: mobile (320px), tablet (768px), desktop (1024px)

**Component Design Principles**
- Consistent spacing using Tailwind spacing scale
- Clear visual hierarchy with typography scale
- Interactive states (hover, focus, active, disabled)
- Loading states with skeleton components
- Error states with clear messaging

### 8.2 Server Management Dashboard

**Layout Structure**
```
┌─────────────────────────────────────────────────────────┐
│ Header: MCP Registry Gateway                             │
├─────────────────────────────────────────────────────────┤
│ Navigation: Dashboard | Servers | API Keys | Settings   │
├─────────────────────────────────────────────────────────┤
│ Server Management                                       │
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │ + Add Server    │ │ 🔍 Search       │                │
│ └─────────────────┘ └─────────────────┘                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Server List                                         │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│ │ │ Server Card │ │ Server Card │ │ Server Card │     │ │
│ │ │ ● Online    │ │ ⚠ Warning   │ │ ● Offline   │     │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Server Card Components**
- Server name and description
- Health status indicator (green/yellow/red)
- Last health check timestamp
- Quick action buttons (start/stop/settings)
- Dropdown menu for advanced actions

### 8.3 Server Registration Form

**Modal Dialog Structure**
```
┌─────────────────────────────────────────┐
│ Register New MCP Server            ✕    │
├─────────────────────────────────────────┤
│ Basic Information                       │
│ Name: [__________________]              │
│ Description: [_________________]        │
│ Version: [__________]                   │
│                                         │
│ Connection Details                      │
│ Endpoint URL: [____________________]    │
│ Transport: [HTTP ▼]                     │
│                                         │
│ Authentication                          │
│ Type: [API Key ▼]                       │
│ Configuration: [___________________]    │
│                                         │
│ [Test Connection] [Cancel] [Register]   │
└─────────────────────────────────────────┘
```

**Form Validation**
- Real-time validation with error messages
- Endpoint connectivity testing
- Authentication configuration validation
- Progressive disclosure for advanced options

### 8.4 API Key Management Interface

**Key List Table**
```
┌──────────────────────────────────────────────────────────────┐
│ API Keys                                          + Generate │
├──────────────────────────────────────────────────────────────┤
│ Name          │ Prefix    │ Created    │ Expires   │ Actions │
│ Production    │ mcp_abc8  │ 2 days ago │ 88 days   │ ⋯       │
│ Development   │ mcp_def2  │ 1 week ago │ 83 days   │ ⋯       │
│ Testing       │ mcp_ghi5  │ 2 weeks    │ 76 days   │ ⋯       │
└──────────────────────────────────────────────────────────────┘
```

**Key Actions**
- Copy key to clipboard (with security warning)
- View usage statistics
- Rotate key (generates new key, invalidates old)
- Revoke key (immediate invalidation)
- Edit key metadata (name, description, scopes)

### 8.5 Health Monitoring Panel

**Real-time Status Grid**
```
┌─────────────────────────────────────────────────────────┐
│ Server Health Overview                                  │
├─────────────────────────────────────────────────────────┤
│ Total: 12  ● Healthy: 10  ⚠ Warning: 1  ● Down: 1      │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│ │ auth-server │ │ data-proc   │ │ ml-service  │         │
│ │ ● 250ms     │ │ ⚠ 2.1s      │ │ ● Down      │         │
│ │ 2 min ago   │ │ 1 min ago   │ │ 5 min ago   │         │
│ └─────────────┘ └─────────────┘ └─────────────┘         │
└─────────────────────────────────────────────────────────┘
```

**Health Check Details**
- Response time trends (sparkline charts)
- Success rate percentage
- Last error message
- Manual health check trigger
- Health check history log

### 8.6 Accessibility Requirements

**WCAG 2.1 AA Compliance**
- Semantic HTML structure with proper headings
- ARIA labels and descriptions for interactive elements
- Keyboard navigation support for all actions
- Color contrast ratio ≥4.5:1 for normal text
- Focus indicators for all interactive elements

**Screen Reader Support**
- Descriptive alt text for status indicators
- Live regions for dynamic content updates
- Proper form labels and error associations
- Table headers and data relationships

## 9. Security Requirements

### 9.1 Authentication and Authorization

**Three-Layer Security Architecture**
```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Better-Auth (Frontend)                    │
│ - Azure AD / Microsoft OAuth integration           │
│ - Role-based access control (admin/user)           │
│ - Session management with JWT tokens               │
└─────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────┐
│ Layer 2: FastAPI Middleware (Backend)              │
│ - JWT token validation                             │
│ - Rate limiting per user/tenant                    │
│ - Request/response logging                         │
└─────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────┐
│ Layer 3: MCP Server Authentication                 │
│ - API key validation (mcp_ prefix)                 │
│ - Per-server authentication configuration          │
│ - Connection security (TLS required)               │
└─────────────────────────────────────────────────────┘
```

**Role-Based Access Control**
```typescript
interface UserRole {
  role: 'admin' | 'user' | 'server_owner';
  permissions: {
    servers: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
      health_check: boolean;
    };
    api_keys: {
      create: boolean;
      read: boolean;
      delete: boolean;
      rotate: boolean;
    };
    audit_logs: {
      read: boolean;
    };
  };
}

// Role definitions
const ROLES = {
  admin: {
    servers: { create: true, read: true, update: true, delete: true, health_check: true },
    api_keys: { create: true, read: true, delete: true, rotate: true },
    audit_logs: { read: true }
  },
  server_owner: {
    servers: { create: true, read: true, update: true, delete: false, health_check: true },
    api_keys: { create: true, read: true, delete: false, rotate: true },
    audit_logs: { read: false }
  },
  user: {
    servers: { create: false, read: true, update: false, delete: false, health_check: false },
    api_keys: { create: false, read: true, delete: false, rotate: false },
    audit_logs: { read: false }
  }
};
```

### 9.2 API Key Security

**Generation Algorithm**
```python
import secrets
import hashlib
from datetime import datetime, timedelta

def generate_api_key() -> tuple[str, str]:
    """Generate secure API key with mcp_ prefix."""
    prefix = "mcp_"
    
    # Generate 60 cryptographically secure random characters
    random_part = secrets.token_urlsafe(45)[:60]  # Ensures 60 chars
    
    # Combine prefix and random part
    full_key = prefix + random_part
    
    # Create SHA-256 hash for storage
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    
    return full_key, key_hash

def create_api_key(
    name: str,
    tenant_id: str,
    expires_in_days: int = 90,
    scopes: list[str] = None
) -> dict:
    """Create new API key with security metadata."""
    full_key, key_hash = generate_api_key()
    
    expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    
    return {
        "id": str(uuid4()),
        "name": name,
        "key_hash": key_hash,
        "key_prefix": full_key[:8],  # First 8 chars for identification
        "tenant_id": tenant_id,
        "scopes": scopes or ["server:read"],
        "expires_at": expires_at,
        "created_at": datetime.utcnow(),
        "is_active": True,
        "usage_stats": {"requests": 0, "last_used": None}
    }
```

**Key Validation Middleware**
```python
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def validate_api_key(token: str = Depends(security)) -> dict:
    """Validate API key and return associated metadata."""
    if not token.credentials.startswith("mcp_"):
        raise HTTPException(401, "Invalid API key format")
    
    key_hash = hashlib.sha256(token.credentials.encode()).hexdigest()
    
    # Database lookup
    api_key = await get_api_key_by_hash(key_hash)
    if not api_key or not api_key.is_active:
        raise HTTPException(401, "Invalid or inactive API key")
    
    if api_key.expires_at < datetime.utcnow():
        raise HTTPException(401, "API key expired")
    
    # Update usage statistics
    await update_api_key_usage(api_key.id)
    
    return {
        "api_key_id": api_key.id,
        "tenant_id": api_key.tenant_id,
        "scopes": api_key.scopes
    }
```

### 9.3 Rate Limiting

**Rate Limiting Configuration**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Rate limits by user role
RATE_LIMITS = {
    "admin": "1000/minute",
    "server_owner": "500/minute", 
    "user": "100/minute",
    "anonymous": "20/minute"
}

limiter = Limiter(key_func=get_remote_address)

@limiter.limit("dynamic")
async def rate_limited_endpoint(request: Request, user: dict = Depends(get_current_user)):
    """Apply dynamic rate limiting based on user role."""
    user_role = user.get("role", "anonymous")
    limit = RATE_LIMITS.get(user_role, RATE_LIMITS["anonymous"])
    
    # Rate limiting is automatically applied by decorator
    # based on the returned limit value
    return {"message": "Success", "rate_limit": limit}
```

### 9.4 Input Validation and Sanitization

**Pydantic Models for Validation**
```python
from pydantic import BaseModel, validator, HttpUrl
from typing import Optional, List
import re

class CreateServerRequest(BaseModel):
    name: str
    description: Optional[str] = None
    version: str
    endpoint_url: HttpUrl
    transport_type: Literal["http", "websocket", "stdio", "sse"]
    auth_type: Literal["none", "bearer", "api_key", "oauth", "custom"]
    auth_config: Optional[dict] = None
    tags: Optional[List[str]] = None
    
    @validator("name")
    def validate_name(cls, v):
        if not re.match(r"^[a-zA-Z0-9\s\-_]{1,100}$", v):
            raise ValueError("Name must be 1-100 alphanumeric characters")
        return v.strip()
    
    @validator("version")
    def validate_version(cls, v):
        semver_pattern = r"^\d+\.\d+\.\d+$"
        if not re.match(semver_pattern, v):
            raise ValueError("Version must follow semantic versioning (x.y.z)")
        return v
    
    @validator("tags")
    def validate_tags(cls, v):
        if v and len(v) > 10:
            raise ValueError("Maximum 10 tags allowed")
        if v:
            for tag in v:
                if not re.match(r"^[a-zA-Z0-9\-_]{1,50}$", tag):
                    raise ValueError("Tags must be 1-50 alphanumeric characters")
        return v
```

### 9.5 Audit Logging

**Comprehensive Audit Trail**
```python
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any

class AuditEventType(Enum):
    SERVER_REGISTERED = "server_registered"
    SERVER_UPDATED = "server_updated"
    SERVER_DELETED = "server_deleted"
    API_KEY_GENERATED = "api_key_generated"
    API_KEY_ROTATED = "api_key_rotated"
    API_KEY_REVOKED = "api_key_revoked"
    HEALTH_CHECK_PERFORMED = "health_check_performed"
    AUTHENTICATION_FAILED = "authentication_failed"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"

@dataclass
class AuditLogEntry:
    event_type: AuditEventType
    actor_id: str  # User ID who performed the action
    tenant_id: str
    resource_id: str  # Server ID, API key ID, etc.
    resource_type: str  # 'server', 'api_key', etc.
    action: str  # 'create', 'update', 'delete', etc.
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
async def log_audit_event(
    event_type: AuditEventType,
    actor_id: str,
    tenant_id: str,
    resource_id: str,
    resource_type: str,
    action: str,
    request: Optional[Request] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """Log audit event to database and external systems."""
    entry = AuditLogEntry(
        event_type=event_type,
        actor_id=actor_id,
        tenant_id=tenant_id,
        resource_id=resource_id,
        resource_type=resource_type,
        action=action,
        timestamp=datetime.utcnow(),
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
        metadata=metadata or {}
    )
    
    # Store in database
    await store_audit_log(entry)
    
    # Optional: Send to external logging system
    # await send_to_external_logging(entry)
```

## 10. Success Criteria and Deliverables

### 10.1 Functional Success Criteria

**Core Functionality**
- ✅ **Server Registration**: Admins can register new MCP servers with all required fields
- ✅ **Server Management**: Complete CRUD operations for server configuration
- ✅ **Health Monitoring**: Manual and automatic health checks with status reporting
- ✅ **API Key Management**: Generate, rotate, and revoke API keys with proper security
- ✅ **Multi-Tenant Support**: Proper tenant isolation for all server operations
- ✅ **Audit Logging**: Complete audit trail for all administrative actions

**User Experience**
- ✅ **Intuitive Dashboard**: Clean, responsive interface for server management
- ✅ **Real-time Updates**: Live health status and activity indicators
- ✅ **Error Handling**: Clear error messages and recovery guidance
- ✅ **Performance**: All operations complete within specified time limits
- ✅ **Accessibility**: WCAG 2.1 AA compliance for all UI components

### 10.2 Technical Success Criteria

**Performance Benchmarks**
- Server registration: <2 seconds end-to-end
- Server listing: <500ms with pagination
- Health checks: <10 seconds timeout with proper error handling
- API throughput: 1000 requests/minute per tenant
- Database queries: <100ms for standard operations

**Security Validation**
- All API endpoints require proper authentication
- API keys use cryptographically secure generation
- Rate limiting enforced based on user roles
- Input validation prevents injection attacks
- Audit logs capture all security-relevant events

**Quality Assurance**
- 80% minimum test coverage for backend APIs
- 85% minimum test coverage for frontend components
- Zero critical security vulnerabilities
- Zero high-priority accessibility issues
- Performance requirements met under load testing

### 10.3 Documentation Deliverables

**Technical Documentation**
- API reference documentation with examples
- Database schema documentation with relationships
- Security implementation guide
- Deployment and configuration guide
- Troubleshooting and monitoring guide

**User Documentation**
- Administrator user guide for server management
- API key management best practices
- Health monitoring and troubleshooting guide
- Client integration examples and tutorials

### 10.4 Code Deliverables

**Backend Implementation**
```
backend/src/mcp_registry_gateway/
├── api/
│   ├── servers.py              # Server management endpoints
│   ├── api_keys.py             # API key management endpoints
│   └── health.py               # Health check endpoints
├── services/
│   ├── server_service.py       # Server business logic
│   ├── api_key_service.py      # API key operations
│   └── health_service.py       # Health monitoring logic
├── middleware/
│   ├── auth_middleware.py      # Enhanced authentication
│   ├── rate_limit_middleware.py # Rate limiting
│   └── audit_middleware.py     # Audit logging
└── tests/
    ├── test_servers_api.py     # Server API tests
    ├── test_api_keys.py        # API key tests
    └── test_health_checks.py   # Health monitoring tests
```

**Frontend Implementation**
```
frontend/src/components/server-management/
├── server-list.tsx             # Main server listing
├── server-form-modal.tsx       # Registration/edit form
├── server-health-panel.tsx     # Health monitoring
├── api-key-manager.tsx         # API key operations
├── server-stats-widget.tsx     # Usage statistics
└── __tests__/
    ├── server-list.test.tsx    # Component tests
    ├── server-form.test.tsx    # Form validation tests
    └── api-key-manager.test.tsx # Key management tests
```

**Database Migrations**
```
frontend/drizzle/migrations/
├── 0001_enhance_mcp_server_table.sql      # Server table enhancements
├── 0002_enhance_api_token_table.sql       # API token security upgrades
├── 0003_create_health_check_table.sql     # Health monitoring table
└── 0004_add_performance_indexes.sql       # Performance optimization indexes
```

### 10.5 Testing Deliverables

**Automated Test Suite**
- Unit tests for all business logic components
- Integration tests for API endpoints
- End-to-end tests for user workflows
- Performance tests for load scenarios
- Security tests for authentication and authorization

**Manual Testing Plans**
- User acceptance testing scenarios
- Accessibility testing checklist
- Cross-browser compatibility testing
- Mobile responsive design testing
- Security penetration testing plan

### 10.6 Deployment Artifacts

**Docker Configuration**
- Updated docker-compose.yml with new services
- Environment variable templates
- Health check configurations
- Resource limit specifications

**Infrastructure as Code**
- Database migration scripts
- Index creation and optimization scripts
- Monitoring and alerting configurations
- Backup and recovery procedures

### 10.7 Phase 1 Completion Checklist

**Backend Development**
- [ ] Server management API endpoints implemented
- [ ] API key management system deployed
- [ ] Health check infrastructure operational
- [ ] Audit logging framework active
- [ ] Authentication middleware enhanced
- [ ] Rate limiting system functional
- [ ] Database schema migrations applied
- [ ] Performance indexes optimized
- [ ] Unit and integration tests passing
- [ ] API documentation complete

**Frontend Development**
- [ ] Server management dashboard implemented
- [ ] Server registration form functional
- [ ] Health monitoring panel operational
- [ ] API key management interface complete
- [ ] Real-time status updates working
- [ ] Dark mode and responsive design implemented
- [ ] Accessibility requirements met
- [ ] Component tests passing
- [ ] User experience tested and validated

**Quality Assurance**
- [ ] Security review completed
- [ ] Performance testing passed
- [ ] Accessibility audit passed
- [ ] Code review and approval
- [ ] Documentation review complete
- [ ] Deployment testing successful
- [ ] User acceptance testing approved

**Deployment Readiness**
- [ ] Production environment configured
- [ ] Database migrations tested
- [ ] Monitoring and alerting operational
- [ ] Backup and recovery procedures verified
- [ ] Security configurations validated
- [ ] Performance benchmarks met
- [ ] Documentation published

---

## Appendices

### Appendix A: Risk Assessment

**High-Risk Items**
- Database migration complexity with existing data
- Authentication system integration with Better-Auth
- Health check performance impact on MCP servers
- Multi-tenant data isolation validation

**Mitigation Strategies**
- Comprehensive testing in staging environment
- Rollback procedures for all database changes
- Performance monitoring and alerting
- Security audit and penetration testing

### Appendix B: Dependencies

**External Dependencies**
- Better-Auth system operational
- PostgreSQL 17+ with existing schema
- Azure AD integration functional
- TailwindCSS v4 design system

**Internal Dependencies**
- Database optimization (38 indexes) completed
- Frontend authentication patterns established
- Logging infrastructure operational
- Docker deployment environment ready

### Appendix C: Future Considerations

**Phase 2 Preparation**
- Server discovery algorithm design
- Advanced monitoring system architecture
- Integration webhook framework
- Performance optimization strategies

**Scalability Planning**
- Database sharding strategies
- Microservice decomposition options
- Caching layer implementation
- Global distribution considerations

---

**Document Approval**

| Role | Name | Date | Signature |
|------|------|------|----------|
| Technical Lead | [Name] | [Date] | [Digital Signature] |
| Product Owner | [Name] | [Date] | [Digital Signature] |
| Security Lead | [Name] | [Date] | [Digital Signature] |
| QA Lead | [Name] | [Date] | [Digital Signature] |

**Change History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-09-15 | Claude Code | Initial SRD creation |

**Next Review Date**: September 22, 2025