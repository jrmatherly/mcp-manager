# Database Schema Documentation

This directory contains the complete Drizzle ORM schema implementation for the MCP Registry Gateway. The schema supports a dual authentication architecture with Better-Auth integration, comprehensive performance optimization, and unified frontend/backend compatibility.

## 🏗️ Architecture Overview

### Dual Authentication System
- **FastMCP Backend**: Azure OAuth/Entra ID authentication with `api_token` table
- **Better-Auth Frontend**: Multi-provider authentication with `apiKey` table
- **Unified User Management**: Shared user tables with cross-system compatibility

### Performance Optimization
- **38 Strategic Indexes**: Essential + composite indexes for 40-90% query performance improvement
- **3 Database Functions**: Real-time analytics and monitoring capabilities (`get_server_stats`, `calculate_usage_metrics`, `check_system_health`)
- **3 Monitoring Views**: Operational visibility (`server_performance_view`, `usage_analytics_view`, `health_status_view`)
- **Redis Integration**: Secondary caching layer for frequently accessed data

## 📋 Schema Organization

The schema is organized into domain-specific modules for maintainability and clarity:

- **`auth.ts`** - Better-Auth compatible authentication tables (user, session, account, verification)
- **`tenant.ts`** - Multi-tenancy support with organization management and RBAC
- **`mcp.ts`** - MCP server, tool, resource, and prompt management
- **`api.ts`** - API token management for MCP Registry (`api_token` table)
- **`better-auth-api-key.ts`** - Better-Auth API key plugin (`apiKey` table)
- **`audit.ts`** - Comprehensive audit logging, error tracking, and compliance
- **`admin.ts`** - System configuration, feature flags, and maintenance windows
- **`backend-compat.ts`** - Backend compatibility tables for SQLModel/SQLAlchemy integration
- **`index.ts`** - Schema consolidation with relations and type exports

## 🏗️ Architecture Principles

### Multi-Tenancy First
- **Tenant Isolation**: All tenant-specific data is properly scoped
- **Flexible Membership**: Support for multiple users per tenant with roles
- **Resource Quotas**: Configurable limits per tenant and plan type

### Authentication Architecture
- **Better-Auth Integration**: Complete compatibility with Better-Auth plugin ecosystem
- **Multi-Provider Support**: GitHub, Google, and Microsoft/Entra ID authentication
- **Dual Token System**: Separate `api_token` (MCP Registry) and `apiKey` (Better-Auth) tables
- **Enterprise Extensions**: 2FA, session management, and granular permissions without breaking compatibility

### Enterprise Features
- **Multi-Tenancy**: Complete tenant isolation with configurable resource quotas
- **RBAC**: Role-based access control with fine-grained permissions
- **Comprehensive Audit Trail**: Full compliance logging for enterprise requirements
- **Advanced Rate Limiting**: Multi-level limits (global, tenant, user, token) with violation tracking
- **Feature Flags**: Gradual rollouts, A/B testing, and tenant-specific configurations

### Database Optimization
- **38 Performance Indexes**: Strategic indexing covering all major query patterns
  - Composite indexes for complex queries (40-90% performance improvement)
  - Covering indexes for read-heavy operations
  - Partial indexes for filtered queries
- **Database Functions**: Real-time analytics and monitoring with PostgreSQL functions
- **Materialized Views**: Pre-computed aggregations for dashboard performance
- **Connection Management**: Optimized pooling and timeout configurations
- **Redis Caching**: Secondary storage for session data and frequently accessed metrics

## 📊 Core Entities

### Authentication & Users
```typescript
user: {
  id: string (PK)
  email: string (unique)
  role: "admin" | "server_owner" | "user"
  tenantId?: string (FK)
  // Better-Auth standard fields
  name: string
  emailVerified: boolean
  image?: string
  // Enterprise extensions
  isActive: boolean
  lastLoginAt: timestamp
  banned: boolean
  twoFactorEnabled: boolean
  preferences: JSON
}

session: {
  id: string (PK)
  userId: string (FK)
  token: string (unique)
  expiresAt: timestamp
  // Extended security fields
  ipAddress: string
  userAgent: string
  deviceInfo: JSON
  isRevoked: boolean
}
```

### Multi-Tenancy
```typescript
tenant: {
  id: string (PK)
  name: string
  slug: string (unique)
  status: "active" | "suspended" | "pending" | "cancelled"
  planType: "free" | "starter" | "professional" | "enterprise"
  // + Resource quotas and feature flags
  // + Billing integration fields
}

tenantMember: {
  tenantId: string (FK)
  userId: string (FK) 
  role: "owner" | "admin" | "member" | "readonly"
  // + Granular permissions
}
```

### MCP Registry
```typescript
mcpServer: {
  id: string (PK)
  name: string
  endpointUrl: string
  transportType: "http" | "websocket" | "stdio" | "sse"
  status: "active" | "inactive" | "error" | "maintenance"
  tenantId?: string (FK) // null = global/public
  // + Health monitoring, capabilities, metrics
}

mcpTool: {
  serverId: string (FK)
  name: string
  inputSchema: JSONSchema
  // + Usage metrics and categorization
}
```

### API Management (Dual System)
```typescript
// MCP Registry API tokens
apiToken: {
  id: uuid (PK)
  name: string
  tokenHash: string (unique)
  userId: string (FK)
  tenantId?: string (FK)
  scopes: string[]
  type: "personal" | "service" | "integration" | "webhook"
  rateLimit?: CustomLimits
  allowedIps: string[]
  isActive: boolean
  expiresAt: timestamp
}

// Better-Auth API keys
apiKey: {
  id: string (PK)
  name?: string
  key: string (hashed)
  userId: string (FK)
  enabled: boolean
  rateLimitEnabled: boolean
  rateLimitMax?: number
  remaining?: number
  expiresAt?: timestamp
  permissions?: string
}

apiUsage: {
  tokenId?: uuid (FK)
  serverId?: string (FK)
  path: string
  method: string
  statusCode: number
  responseTime: number
  requestSize: number
  responseSize: number
  // Geographic and client tracking
  ipAddress: string
  country: string
  userAgent: string
}
```

### Audit & Compliance
```typescript
auditLog: {
  eventType: string
  action: "CREATE" | "READ" | "UPDATE" | "DELETE" | "EXECUTE"
  actorId?: string
  resourceType: string
  resourceId?: string
  changes?: { before?, after?, fields? }
  // + Risk assessment and compliance flags
}
```

## 🔧 Database Operations

### Migration Commands
```bash
# Generate migrations from schema changes
npm run db:generate

# Apply pending migrations (includes 38 indexes + 3 functions + 3 views)
npm run db:migrate

# Push schema directly (development)
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

### Database Optimization Commands
```bash
# Apply performance optimizations (indexes, functions, views)
npm run db:optimize

# Run database health check
npm run db:health

# Execute maintenance tasks (cleanup, vacuum, analyze)
npm run db:maintenance

# Analyze query performance and suggest optimizations
npm run db:analyze
```

### Development Utilities
```bash
# Seed database with initial data
npm run db:seed

# Reset database (development only)
npm run db:reset

# Reset and seed in one command
npm run db:reset-and-seed

# Introspect existing database
npm run db:introspect
```

### Manual Operations
```typescript
import { db } from "./db";
import { user, tenant, mcpServer } from "./schema";

// Query with relations
const usersWithTenants = await db.query.user.findMany({
  with: {
    tenant: true,
    sessions: true
  }
});

// Complex filtering
const activeServers = await db.select()
  .from(mcpServer)
  .where(
    and(
      eq(mcpServer.status, 'active'),
      eq(mcpServer.tenantId, tenantId)
    )
  );
```

## 🔒 Security Considerations

### Data Protection
- **Token Security**: API tokens stored as SHA-256 hashes with salt
- **Dual Authentication**: Separate token systems for different use cases
- **PII Handling**: Personal data properly isolated and encrypted where required
- **Comprehensive Audit**: All sensitive operations logged with full context
- **Row-Level Security**: Tenant isolation with fine-grained access controls

### Authentication Providers
- **GitHub OAuth**: Standard OAuth 2.0 integration
- **Google OAuth**: Google Workspace and personal account support
- **Microsoft/Entra ID**: Enterprise Azure AD integration
- **API Key Authentication**: Better-Auth API key plugin with rate limiting
- **2FA Support**: TOTP-based two-factor authentication with backup codes

### Advanced Rate Limiting
- **Multi-Tier Limits**: Admin (1000 RPM), Server Owner (500 RPM), User (100 RPM), Anonymous (20 RPM)
- **Token-Specific Overrides**: Custom limits per API token
- **Violation Tracking**: Comprehensive abuse monitoring with automated responses
- **Burst Handling**: Configurable burst capacity for traffic spikes
- **Geographic Limits**: IP-based restrictions and allowlists

## 🏃‍♂️ Getting Started

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Configure database connection
DATABASE_URL="postgresql://user:pass@localhost:5432/mcp_registry"
```

### 2. Database Setup
```bash
# Install dependencies
npm install

# Generate initial migration
npm run db:generate

# Create database and apply migrations
npm run db:migrate

# Seed with development data
npm run db:seed
```

### 3. Development Workflow
```bash
# Start development server
npm run dev

# Open database studio
npm run db:studio
```

## 📈 Performance & Optimization

### Database Performance Features
- **38 Strategic Indexes**: Covering all major query patterns with composite indexes
- **3 Analytics Functions**:
  - `get_server_stats(server_id)`: Real-time server performance metrics
  - `calculate_usage_metrics(tenant_id, period)`: Usage analytics aggregation
  - `check_system_health()`: Comprehensive system health assessment
- **3 Monitoring Views**:
  - `server_performance_view`: Server response times, error rates, uptime
  - `usage_analytics_view`: API usage patterns and trends
  - `health_status_view`: System-wide health indicators
- **Redis Caching**: Session data, frequently accessed metrics, and computed results

### Query Optimization
- Use `db.query.*` for relation queries (leverages prepared statements)
- Leverage covering indexes for read-heavy operations
- Use `select()` with specific columns to avoid unnecessary data transfer
- Utilize materialized views for complex dashboard queries

### Connection Management
- Connection pool configured for 20 max connections (development), 100+ (production)
- Automatic connection cleanup after 5-minute idle timeout
- Prepared statement caching with LRU eviction
- Connection health checks every 30 seconds

### Performance Monitoring
- Real-time query performance metrics in `apiUsage` table
- Database optimization test suite with performance validation
- Automated performance alerts for degraded response times
- Historical performance data in `serverMetrics` table

## 🔄 Migration Strategy

### Schema Changes
1. Update schema files
2. Run `npm run db:generate`
3. Review generated migration
4. Test in development
5. Apply to staging/production

### Data Migrations
- Use custom migration scripts for data transformations
- Leverage `drizzle/` directory for complex migrations
- Always backup before production migrations

### Zero-Downtime Deployments
- Add columns with defaults first
- Migrate data in background
- Remove old columns in subsequent deployment

## 🧪 Testing & Validation

### Database Optimization Tests
The schema includes comprehensive test coverage in `frontend/tests/db-optimization.test.ts`:
- **Index Effectiveness**: Validates that all 38 indexes improve query performance
- **Function Performance**: Tests database functions for correctness and speed
- **View Accuracy**: Ensures monitoring views return accurate data
- **BigInt Compatibility**: Tests Vitest configuration with PostgreSQL BigInt types

### Test Commands
```bash
# Run database optimization tests
npm run test -- --testPathPattern=db-optimization

# Run full test suite with database integration
npm run test

# Generate test coverage report
npm run test:coverage
```

## 📚 Resources

### Documentation
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better-Auth Integration Guide](https://better-auth.com/)
- [Better-Auth API Key Plugin](https://www.better-auth.com/docs/plugins/api-key)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)

### Authentication Providers
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/oauth-apps)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)

### Database Optimization
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Query Performance Analysis](https://www.postgresql.org/docs/current/performance-tips.html)
- [Redis Caching Strategies](https://redis.io/docs/manual/patterns/)