# Database Schema Style Guide

## Context

Database schema design and management patterns for the MCP Registry Gateway using Drizzle ORM with PostgreSQL, emphasizing the frontend-owns-schema architecture.

## Architecture Principles

### Frontend Owns Schema
```
Frontend (TypeScript/Drizzle)     Backend (Python/FastAPI)
         ↓                                ↓
   Schema Definition              Operational Updates Only
   Table Creation                 No DDL Operations
   Migrations                     Read/Write Data
   Index Management               Update Metrics
```

## Drizzle Schema Organization

### File Structure
```
frontend/src/db/
├── schema/
│   ├── index.ts          # Barrel export
│   ├── auth.ts           # Authentication tables
│   ├── mcp.ts            # MCP server tables
│   ├── analytics.ts      # Analytics tables
│   └── types.ts          # Shared types
├── migrations/
│   ├── 0001_initial.sql
│   ├── 0002_add_indexes.sql
│   └── meta/
├── seed.ts               # Seed data
├── client.ts             # Database client
└── queries/              # Prepared queries
```

### Table Definitions

#### Naming Conventions
```typescript
// Table names: plural, snake_case
export const users = pgTable("users", {
  // Column names: snake_case
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
})

// Index names: idx_{table}_{columns}
export const usersEmailIdx = index("idx_users_email").on(users.email)

// Foreign key names: fk_{table}_{column}_{referenced_table}
export const userRoleFK = foreignKey({
  columns: [users.role_id],
  foreignColumns: [roles.id],
  name: "fk_users_role_id_roles"
})
```

#### Column Types
```typescript
import { 
  pgTable, 
  text, 
  integer, 
  boolean, 
  timestamp, 
  jsonb,
  uuid,
  decimal,
  pgEnum
} from "drizzle-orm/pg-core"

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "developer",
  "analyst",
  "viewer",
  "guest"
])

// Common patterns
export const baseColumns = {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
}

// Table with base columns
export const mcp_servers = pgTable("mcp_servers", {
  ...baseColumns,
  
  // Required fields
  name: text("name").notNull(),
  url: text("url").notNull(),
  tenant_id: text("tenant_id").notNull(),
  
  // Optional fields
  description: text("description"),
  
  // JSON fields
  configuration: jsonb("configuration").$type<ServerConfig>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  // Enums
  status: text("status", { 
    enum: ["active", "inactive", "maintenance"] 
  }).default("inactive").notNull(),
  
  // Computed fields
  is_public: boolean("is_public").default(false).notNull(),
  
  // Timestamps
  last_health_check: timestamp("last_health_check", { withTimezone: true }),
  expires_at: timestamp("expires_at", { withTimezone: true })
})
```

### Relationships

#### One-to-Many
```typescript
// Users have many sessions
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull()
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull()
})

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions)
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id]
  })
}))
```

#### Many-to-Many
```typescript
// Users belong to many organizations
export const users_organizations = pgTable("users_organizations", {
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organization_id: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull(),
  joined_at: timestamp("joined_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.organization_id] })
}))
```

### Indexes

#### Performance Indexes
```typescript
export const mcpServersIndexes = {
  // Single column index
  tenantIdx: index("idx_mcp_servers_tenant_id").on(mcp_servers.tenant_id),
  
  // Composite index
  tenantStatusIdx: index("idx_mcp_servers_tenant_status").on(
    mcp_servers.tenant_id,
    mcp_servers.status
  ),
  
  // Partial index
  activeServersIdx: index("idx_mcp_servers_active")
    .on(mcp_servers.tenant_id)
    .where(sql`status = 'active'`),
  
  // GIN index for JSONB
  configIdx: index("idx_mcp_servers_config")
    .using("gin")
    .on(mcp_servers.configuration),
  
  // Full text search
  searchIdx: index("idx_mcp_servers_search")
    .using("gin")
    .on(sql`to_tsvector('english', name || ' ' || coalesce(description, ''))`)
}
```

### Constraints

#### Check Constraints
```typescript
export const mcp_servers = pgTable("mcp_servers", {
  // Column definitions...
}, (table) => ({
  // Check constraints
  validUrl: check(
    "check_valid_url",
    sql`url ~ '^https?://.*'`
  ),
  
  positiveTimeout: check(
    "check_positive_timeout",
    sql`timeout_ms > 0`
  ),
  
  validDateRange: check(
    "check_valid_date_range",
    sql`expires_at > created_at`
  )
}))
```

#### Unique Constraints
```typescript
export const uniqueConstraints = {
  // Single column unique
  uniqueEmail: unique().on(users.email),
  
  // Composite unique
  uniqueTenantServer: unique().on(
    mcp_servers.tenant_id,
    mcp_servers.name
  ),
  
  // Conditional unique
  uniqueActiveServer: unique("unique_active_server")
    .on(mcp_servers.tenant_id, mcp_servers.url)
    .where(sql`status = 'active'`)
}
```

## Migrations

### Migration Files
```sql
-- migrations/0001_create_users.sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "role" user_role NOT NULL DEFAULT 'viewer',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Add comments
COMMENT ON TABLE users IS 'System users with authentication';
COMMENT ON COLUMN users.role IS 'User role for RBAC';
```

### Migration Management
```typescript
// frontend/src/db/migrate.ts
import { migrate } from "drizzle-orm/postgres-js/migrator"
import { db } from "./client"

export async function runMigrations() {
  console.log("Running migrations...")
  
  try {
    await migrate(db, {
      migrationsFolder: "./src/db/migrations"
    })
    console.log("Migrations completed successfully")
  } catch (error) {
    console.error("Migration failed:", error)
    throw error
  }
}

// Run with: npm run db:migrate
```

## Type Safety

### Inferred Types
```typescript
import { InferSelectModel, InferInsertModel } from "drizzle-orm"

// Automatically infer types from schema
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
export type Session = InferSelectModel<typeof sessions>
export type MCPServer = InferSelectModel<typeof mcp_servers>

// Use in application code
function createUser(data: NewUser): Promise<User> {
  return db.insert(users).values(data).returning()
}
```

### Zod Validation
```typescript
import { createInsertSchema, createSelectSchema } from "drizzle-zod"

// Generate Zod schemas from Drizzle tables
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  name: z.string().min(1).max(100)
})

export const selectUserSchema = createSelectSchema(users)

// Custom refinements
export const createUserInput = insertUserSchema
  .omit({ id: true, created_at: true, updated_at: true })
  .extend({
    password: z.string().min(8),
    confirmPassword: z.string()
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  })
```

## Query Patterns

### Prepared Statements
```typescript
// frontend/src/db/queries/users.ts
import { placeholder } from "drizzle-orm"

// Prepare reusable queries
export const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, placeholder("id")))
  .prepare("getUserById")

export const getUsersByRole = db
  .select()
  .from(users)
  .where(eq(users.role, placeholder("role")))
  .limit(placeholder("limit"))
  .prepare("getUsersByRole")

// Usage
const user = await getUserById.execute({ id: "user-123" })
const admins = await getUsersByRole.execute({ role: "admin", limit: 10 })
```

### Complex Queries
```typescript
// Join with aggregation
const serversWithStats = await db
  .select({
    server: mcp_servers,
    requestCount: count(server_requests.id),
    avgResponseTime: avg(server_requests.response_time),
    lastRequest: max(server_requests.created_at)
  })
  .from(mcp_servers)
  .leftJoin(
    server_requests,
    eq(mcp_servers.id, server_requests.server_id)
  )
  .where(eq(mcp_servers.tenant_id, tenantId))
  .groupBy(mcp_servers.id)
  .having(gt(count(server_requests.id), 0))
  .orderBy(desc(count(server_requests.id)))

// Subquery
const activeUsers = db
  .select({ id: users.id })
  .from(users)
  .innerJoin(sessions, eq(users.id, sessions.user_id))
  .where(gt(sessions.expires_at, new Date()))
  .as("active_users")

const result = await db
  .select()
  .from(mcp_servers)
  .where(inArray(mcp_servers.created_by, activeUsers))
```

### Transactions
```typescript
// Atomic operations
await db.transaction(async (tx) => {
  // Create user
  const [user] = await tx
    .insert(users)
    .values(userData)
    .returning()
  
  // Create default preferences
  await tx
    .insert(user_preferences)
    .values({
      user_id: user.id,
      theme: "light",
      notifications: true
    })
  
  // Create audit log
  await tx
    .insert(audit_logs)
    .values({
      action: "user.created",
      actor_id: currentUser.id,
      target_id: user.id,
      timestamp: new Date()
    })
  
  return user
})
```

## Performance Optimization

### Index Strategy
```typescript
// 38 strategic indexes for the MCP Registry Gateway
export const performanceIndexes = {
  // Primary lookups (most frequent)
  users_email: index().on(users.email),
  sessions_token: index().on(sessions.token),
  servers_tenant: index().on(mcp_servers.tenant_id),
  
  // Composite indexes (multi-column queries)
  servers_tenant_status: index().on(
    mcp_servers.tenant_id,
    mcp_servers.status
  ),
  
  // Covering indexes (include all needed columns)
  requests_covering: index().on(
    server_requests.server_id,
    server_requests.created_at
  ).include([
    server_requests.response_time,
    server_requests.status_code
  ]),
  
  // Partial indexes (filtered data)
  active_servers: index()
    .on(mcp_servers.id)
    .where(sql`status = 'active'`),
  
  // JSON indexes (JSONB columns)
  config_gin: index().using("gin").on(mcp_servers.configuration)
}
```

### Query Optimization
```typescript
// Use EXPLAIN to analyze queries
const explainResult = await db.execute(
  sql`EXPLAIN ANALYZE ${getUsersByRole.toSQL()}`
)

// Batch operations
const users = await db
  .insert(users)
  .values(userDataArray) // Insert multiple at once
  .onConflictDoUpdate({
    target: users.email,
    set: { updated_at: new Date() }
  })

// Use proper pagination
const paginatedResults = await db
  .select()
  .from(mcp_servers)
  .limit(pageSize)
  .offset((page - 1) * pageSize)
  .orderBy(mcp_servers.created_at)
```

## Testing Schema

### Schema Tests
```typescript
describe("Database Schema", () => {
  it("should create tables with correct structure", async () => {
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    expect(tables).toContainEqual({ table_name: "users" })
    expect(tables).toContainEqual({ table_name: "mcp_servers" })
  })
  
  it("should enforce unique constraints", async () => {
    const email = "test@example.com"
    await db.insert(users).values({ email, name: "Test" })
    
    await expect(
      db.insert(users).values({ email, name: "Duplicate" })
    ).rejects.toThrow(/unique constraint/)
  })
  
  it("should cascade deletes", async () => {
    const [user] = await db.insert(users).values(userData).returning()
    await db.insert(sessions).values({ user_id: user.id, token: "abc" })
    
    await db.delete(users).where(eq(users.id, user.id))
    
    const sessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.user_id, user.id))
    
    expect(sessions).toHaveLength(0)
  })
})
```

## Best Practices

### Do's
- ✓ Define schema in TypeScript (frontend only)
- ✓ Use meaningful table and column names
- ✓ Add appropriate indexes for queries
- ✓ Use transactions for atomic operations
- ✓ Include timestamps on all tables
- ✓ Use prepared statements for performance

### Don'ts
- ✗ Don't create tables from backend
- ✗ Don't use SELECT * in production
- ✗ Don't forget indexes on foreign keys
- ✗ Don't store sensitive data unencrypted
- ✗ Don't ignore query performance
- ✗ Don't skip migration testing

## Monitoring

### Database Health
```sql
-- Performance monitoring view
CREATE VIEW performance_monitoring AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
CREATE VIEW index_usage_summary AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```