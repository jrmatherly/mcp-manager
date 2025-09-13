# Database Schema Documentation

This directory contains the complete Drizzle ORM schema implementation for the MCP Registry Gateway frontend. The schema consolidates both frontend and backend database requirements into a unified, type-safe PostgreSQL database design.

## 📋 Schema Organization

The schema is organized into domain-specific modules for maintainability and clarity:

- **`auth.ts`** - Authentication and user management (Better-Auth compatible)
- **`tenant.ts`** - Multi-tenancy support with organization management
- **`mcp.ts`** - MCP server, tool, resource, and prompt management
- **`api.ts`** - API tokens, rate limiting, and usage tracking
- **`audit.ts`** - Audit logging, error tracking, and compliance
- **`admin.ts`** - System configuration, feature flags, and maintenance

## 🏗️ Architecture Principles

### Multi-Tenancy First
- **Tenant Isolation**: All tenant-specific data is properly scoped
- **Flexible Membership**: Support for multiple users per tenant with roles
- **Resource Quotas**: Configurable limits per tenant and plan type

### Better-Auth Compatibility
- **Standard Tables**: `user`, `session`, `account`, `verification` match Better-Auth expectations
- **Extended Fields**: Additional enterprise features without breaking compatibility
- **Type Safety**: Full TypeScript support for all auth operations

### Enterprise Features
- **RBAC**: Role-based access control with granular permissions
- **Audit Trail**: Comprehensive logging for compliance requirements
- **Rate Limiting**: Configurable rate limits at multiple levels
- **Feature Flags**: Gradual rollouts and A/B testing support

### Performance Optimized
- **Strategic Indexes**: Optimized for common query patterns
- **Connection Pooling**: Proper PostgreSQL connection management
- **Partitioning Ready**: Schema designed for horizontal scaling

## 📊 Core Entities

### Authentication & Users
```typescript
user: {
  id: string (PK)
  email: string (unique)
  role: "admin" | "server_owner" | "user"
  tenantId?: string (FK)
  // + Better-Auth standard fields
  // + Enterprise extensions (2FA, banning, preferences)
}

session: {
  // Better-Auth compatible session management
  // + Extended security fields
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

### API Management
```typescript
apiToken: {
  tokenHash: string (unique)
  userId: string (FK)
  scopes: string[]
  rateLimit?: CustomLimits
  // + Security features (IP whitelist, expiration)
}

apiUsage: {
  tokenId?: uuid (FK)
  path: string
  statusCode: number
  responseTime?: number
  // + Geographic and client tracking
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

# Apply pending migrations
npm run db:migrate

# Push schema directly (development)
npm run db:push

# Open Drizzle Studio
npm run db:studio
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
- **Encrypted Secrets**: API tokens stored as SHA-256 hashes
- **PII Handling**: Personal data properly isolated and flagged
- **Audit Requirements**: All sensitive operations logged
- **Access Control**: Row-level security through tenant isolation

### Authentication
- **Session Management**: Better-Auth integration with extended security
- **2FA Support**: TOTP-based two-factor authentication
- **Token Security**: Proper rotation and expiration handling

### Rate Limiting
- **Multi-Level**: Global, tenant, user, and token-specific limits
- **Configurable**: Runtime adjustable rate limiting rules
- **Violation Tracking**: Comprehensive abuse monitoring

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

## 📈 Performance Tips

### Query Optimization
- Use `db.query.*` for relation queries
- Leverage prepared statements for repeated queries
- Use `select()` with specific columns for large datasets
- Add indexes for custom query patterns

### Connection Management
- Connection pool configured for 20 max connections
- Automatic connection cleanup after idle timeout
- Prepared statement caching enabled

### Monitoring
- Query performance metrics in `apiUsage` table
- Error tracking via `errorLog` table
- System health in `systemEvent` table

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

## 📚 Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better-Auth Integration Guide](https://better-auth.com/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)