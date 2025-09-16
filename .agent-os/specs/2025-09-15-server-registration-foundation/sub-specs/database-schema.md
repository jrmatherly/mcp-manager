# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-09-15-server-registration-foundation/spec.md

## Schema Changes

### New Tables

#### mcp_servers
```sql
CREATE TABLE mcp_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    server_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    endpoint_url VARCHAR(2048) NOT NULL,
    server_type VARCHAR(50) NOT NULL, -- 'internal', 'external', 'third_party'
    protocol_version VARCHAR(20) DEFAULT '1.0',
    status VARCHAR(20) NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'maintenance', 'error'
    configuration JSONB DEFAULT '{}',
    capabilities JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    health_check_enabled BOOLEAN DEFAULT true,
    health_check_interval INTEGER DEFAULT 60, -- seconds
    last_health_check TIMESTAMP WITH TIME ZONE,
    last_health_status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_tenant_server_name UNIQUE (tenant_id, server_name),
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

#### mcp_api_keys
```sql
CREATE TABLE mcp_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    server_id UUID,
    user_id UUID NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) DEFAULT 'mcp_',
    key_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    key_hint VARCHAR(8) NOT NULL, -- Last 4 characters for identification
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    rotation_days INTEGER DEFAULT 90,
    last_rotated_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'revoked', 'expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID,
    revoke_reason TEXT,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_server FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_revoked_by FOREIGN KEY (revoked_by) REFERENCES users(id)
);
```

#### mcp_server_health
```sql
CREATE TABLE mcp_server_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL,
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'unhealthy', 'unreachable'
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT fk_server FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
);
```

### New Indexes

```sql
-- Performance indexes for mcp_servers
CREATE INDEX idx_mcp_servers_tenant_status ON mcp_servers(tenant_id, status);
CREATE INDEX idx_mcp_servers_health_check ON mcp_servers(health_check_enabled, last_health_check);
CREATE INDEX idx_mcp_servers_created_at ON mcp_servers(created_at DESC);

-- Performance indexes for mcp_api_keys
CREATE INDEX idx_mcp_api_keys_key_hash ON mcp_api_keys(key_hash);
CREATE INDEX idx_mcp_api_keys_tenant_user ON mcp_api_keys(tenant_id, user_id);
CREATE INDEX idx_mcp_api_keys_expires_at ON mcp_api_keys(expires_at);
CREATE INDEX idx_mcp_api_keys_status ON mcp_api_keys(status);

-- Performance indexes for mcp_server_health
CREATE INDEX idx_mcp_server_health_server_timestamp ON mcp_server_health(server_id, check_timestamp DESC);
CREATE INDEX idx_mcp_server_health_status ON mcp_server_health(status);
```

### Modifications to Existing Tables

#### audit_logs table enhancement
```sql
-- Add specific columns for MCP operations if not exists
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS resource_id UUID,
ADD COLUMN IF NOT EXISTS operation_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS api_key_id UUID;

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_api_key ON audit_logs(api_key_id);
```

## Migration Scripts

### Up Migration
```typescript
// frontend/drizzle/migrations/001_mcp_server_registration.sql
-- Create mcp_servers table
CREATE TABLE IF NOT EXISTS mcp_servers ( ... );

-- Create mcp_api_keys table
CREATE TABLE IF NOT EXISTS mcp_api_keys ( ... );

-- Create mcp_server_health table
CREATE TABLE IF NOT EXISTS mcp_server_health ( ... );

-- Create all indexes
CREATE INDEX IF NOT EXISTS ...;

-- Add audit_logs enhancements
ALTER TABLE audit_logs ...;
```

### Down Migration
```typescript
// frontend/drizzle/migrations/001_mcp_server_registration_down.sql
DROP TABLE IF EXISTS mcp_server_health CASCADE;
DROP TABLE IF EXISTS mcp_api_keys CASCADE;
DROP TABLE IF EXISTS mcp_servers CASCADE;

-- Remove audit_logs columns
ALTER TABLE audit_logs
DROP COLUMN IF EXISTS resource_type,
DROP COLUMN IF EXISTS resource_id,
DROP COLUMN IF EXISTS operation_type,
DROP COLUMN IF EXISTS api_key_id;
```

## Rationale

### Design Decisions

- **UUID Primary Keys**: Globally unique identifiers for distributed systems compatibility
- **Soft Deletes**: deleted_at column preserves audit trail while removing from active use
- **JSONB Columns**: Flexible storage for configuration, capabilities, and metadata without schema changes
- **Tenant Isolation**: All tables include tenant_id for complete data isolation
- **Audit Trail**: created_by, updated_by, timestamps for complete change tracking

### Performance Considerations

- **Composite Indexes**: (tenant_id, status) index optimizes common query pattern
- **Partial Indexes**: Consider partial indexes for active records only
- **JSONB Indexing**: GIN indexes on JSONB columns if querying nested data
- **Partition Strategy**: Consider partitioning mcp_server_health by check_timestamp for large datasets

### Data Integrity Rules

- **Unique Constraints**: Prevent duplicate server names within tenant
- **Foreign Key Cascades**: Automatic cleanup of related records on deletion
- **Check Constraints**: Validate status values, ensure expiry dates are future
- **Not Null Constraints**: Enforce required fields at database level