# Database Consolidation Migration Strategy

## Overview
This document outlines the step-by-step migration plan to consolidate the MCP Manager database systems from dual backend SQLModel + frontend Drizzle to unified Drizzle ORM across the entire application.

## Migration Phases

### Phase 1: Schema Preparation & Validation

#### 1.1 Schema Analysis & Mapping
- **Duration**: 2-3 days
- **Goal**: Ensure consolidated schema satisfies all requirements

**Tasks:**
1. Validate Better-Auth compatibility with extended user schema
2. Map all SQLModel relationships to Drizzle foreign keys  
3. Test schema generation with Drizzle Kit
4. Verify all existing queries can be translated

**Validation Steps:**
```typescript
// Test Better-Auth with extended schema
const testAuth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", 
    schema: { ...consolidatedSchema, user: consolidatedSchema.user }
  }),
  // ... rest of config
});

// Verify schema compilation
await drizzleKit.generate();
await drizzleKit.push(); // Test schema in development
```

#### 1.2 Migration Script Development
- **Duration**: 3-4 days
- **Goal**: Create reliable data migration tools

**Scripts to Create:**
1. `export-sqlmodel-data.py` - Export all backend data to JSON
2. `transform-data.ts` - Transform data to match new schema
3. `import-to-drizzle.ts` - Import transformed data
4. `validate-migration.ts` - Compare data integrity
5. `rollback-migration.ts` - Emergency rollback procedures

### Phase 2: Staging Environment Migration

#### 2.1 Environment Setup
- **Duration**: 1-2 days
- **Goal**: Create isolated staging environment for testing

**Setup Requirements:**
1. Staging PostgreSQL database with production data copy
2. Staging frontend and backend applications
3. Monitoring and logging for migration validation
4. Backup and restore procedures

#### 2.2 Test Migration Execution
- **Duration**: 3-5 days 
- **Goal**: Execute and validate complete migration process

**Migration Process:**
```bash
# 1. Backup existing database
pg_dump production_db > pre_migration_backup.sql

# 2. Export SQLModel data
cd backend && uv run python scripts/export-sqlmodel-data.py

# 3. Generate new schema
cd frontend && npm run db:generate

# 4. Apply new schema to staging DB
npm run db:migrate

# 5. Transform and import data
npm run migrate:import-data

# 6. Validate data integrity
npm run migrate:validate

# 7. Test application functionality
npm run test:integration
```

**Validation Criteria:**
- ✅ All records migrated with zero data loss
- ✅ All foreign key relationships maintained
- ✅ Better-Auth authentication functions correctly
- ✅ All backend API endpoints respond correctly
- ✅ Performance benchmarks within acceptable range

### Phase 3: Backend Refactoring

#### 3.1 Python Drizzle Integration
- **Duration**: 5-7 days
- **Goal**: Replace SQLModel with Drizzle in Python backend

**Approach Options:**

**Option A: Python Drizzle Client (Preferred)**
```python
# Using drizzle-orm Python bindings (if available)
from drizzle_orm import drizzle
from drizzle_orm.postgresql import PostgresConfig

db = drizzle(PostgresConfig(
    connection_string=settings.database_url,
    pool_config={"min_size": 5, "max_size": 50}
))

# Query example
users = await db.select().from(user_table).where(user_table.role == "admin")
```

**Option B: Direct PostgreSQL Queries**
```python
# Use asyncpg with typed query builders
import asyncpg
from typing import List
from models import User

class UserRepository:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
    
    async def get_users_by_role(self, role: str) -> List[User]:
        query = """
        SELECT id, name, email, role, created_at 
        FROM "user" 
        WHERE role = $1
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, role)
            return [User(**row) for row in rows]
```

**Option C: Hybrid Approach (Recommended)**
```python
# Use Pydantic models with asyncpg for type safety
from pydantic import BaseModel
from datetime import datetime

class User(BaseModel):
    id: str
    name: str  
    email: str
    role: str
    created_at: datetime
    
    @classmethod
    async def find_by_role(cls, db: asyncpg.Pool, role: str) -> List['User']:
        # Direct SQL with Pydantic validation
        query = "SELECT * FROM \"user\" WHERE role = $1"
        async with db.acquire() as conn:
            rows = await conn.fetch(query, role)
            return [cls(**row) for row in rows]
```

#### 3.2 FastAPI Dependency Updates
- **Duration**: 2-3 days
- **Goal**: Update all FastAPI routes and dependencies

**Refactoring Steps:**
1. Replace SQLModel session dependencies
2. Update query methods to use new schema
3. Maintain API response compatibility
4. Update authentication middleware

**Example Refactoring:**
```python
# Before (SQLModel)
@router.get("/users", response_model=List[UserResponse])
async def get_users(
    session: AsyncSession = Depends(get_session)
):
    stmt = select(User).where(User.is_active == True)
    result = await session.execute(stmt)
    return result.scalars().all()

# After (Drizzle schema + asyncpg)
@router.get("/users", response_model=List[UserResponse])
async def get_users(
    db: asyncpg.Pool = Depends(get_database_pool)
):
    return await User.find_active(db)
```

### Phase 4: Production Deployment

#### 4.1 Pre-Deployment Preparation
- **Duration**: 2-3 days
- **Goal**: Final preparation and risk mitigation

**Pre-Deployment Checklist:**
- [ ] All staging tests passed
- [ ] Performance benchmarks validated
- [ ] Rollback procedures tested
- [ ] Monitoring and alerting configured
- [ ] Team communication plan finalized
- [ ] Maintenance window scheduled

#### 4.2 Production Migration
- **Duration**: 4-6 hours (maintenance window)
- **Goal**: Execute production migration with minimal downtime

**Migration Timeline:**
```
Hour 0: Start maintenance mode
Hour 0-1: Database backup and preparation
Hour 1-2: Schema migration and data transformation
Hour 2-3: Data validation and integrity checks
Hour 3-4: Application deployment and testing
Hour 4-5: Smoke tests and monitoring
Hour 5-6: Go-live decision and monitoring
```

**Migration Commands:**
```bash
# 1. Enable maintenance mode
kubectl scale deployment frontend --replicas=0
kubectl scale deployment backend --replicas=0

# 2. Backup database
pg_dump $DATABASE_URL > production_backup_$(date +%Y%m%d_%H%M).sql

# 3. Run migration
cd frontend
npm run migrate:production

# 4. Validate migration
npm run migrate:validate:production

# 5. Deploy new applications  
kubectl apply -f k8s/
kubectl scale deployment frontend --replicas=3
kubectl scale deployment backend --replicas=3

# 6. Run health checks
./scripts/health-check.sh

# 7. Disable maintenance mode (if successful)
```

## Risk Management

### Risk Assessment Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data Loss | Low | Critical | Full backup + staged validation |
| Extended Downtime | Medium | High | Rollback procedures + practice runs |
| Auth System Failure | Low | High | Better-Auth compatibility testing |
| Performance Degradation | Medium | Medium | Benchmark testing + monitoring |
| API Compatibility Issues | Medium | High | Comprehensive integration testing |

### Rollback Procedures

#### Immediate Rollback (< 1 hour)
```bash
# 1. Stop new applications
kubectl scale deployment frontend --replicas=0
kubectl scale deployment backend --replicas=0

# 2. Restore database backup
psql $DATABASE_URL < production_backup_latest.sql

# 3. Deploy old applications
kubectl apply -f k8s/legacy/
kubectl scale deployment frontend-legacy --replicas=3  
kubectl scale deployment backend-legacy --replicas=3

# 4. Verify functionality
./scripts/health-check-legacy.sh
```

#### Extended Rollback (Data Issues Discovered Later)
1. Identify data inconsistencies
2. Stop write operations
3. Restore from backup to rollback timestamp
4. Replay critical transactions manually
5. Validate data integrity
6. Resume operations

### Monitoring & Validation

#### Real-time Monitoring During Migration
- Database connection counts and query performance
- API response times and error rates
- Authentication success/failure rates
- Frontend application load times
- User session validation

#### Post-Migration Validation
```typescript
// Automated validation checks
const validationChecks = [
  validateUserCounts(),
  validateAuthenticationFlows(),
  validateApiEndpoints(), 
  validateDataIntegrity(),
  validatePerformanceBenchmarks(),
];

for (const check of validationChecks) {
  const result = await check.run();
  if (!result.passed) {
    throw new Error(`Validation failed: ${result.message}`);
  }
}
```

## Success Criteria

### Technical Success Criteria
- [ ] Zero data loss during migration
- [ ] All API endpoints maintain < 500ms response time
- [ ] Authentication success rate > 99.9%
- [ ] Database query performance within 10% of baseline
- [ ] All integration tests pass

### Business Success Criteria  
- [ ] User experience remains unchanged
- [ ] No authentication or authorization failures
- [ ] System availability > 99.9% during migration window
- [ ] All enterprise features (multi-tenancy, audit, etc.) functional
- [ ] Better-Auth integration maintained

## Post-Migration Tasks

### Immediate (Week 1)
1. Monitor system performance and error rates
2. Validate all user-facing features
3. Run comprehensive data integrity checks
4. Update documentation and runbooks
5. Team knowledge transfer sessions

### Short-term (Month 1)
1. Remove SQLModel dependencies from backend
2. Clean up migration scripts and temporary code
3. Optimize new Drizzle queries for performance
4. Update development and deployment workflows
5. Create new database maintenance procedures

### Long-term (Month 2-3)
1. Implement enhanced features enabled by unified schema
2. Optimize database indexes for new query patterns
3. Develop advanced monitoring and alerting
4. Create disaster recovery procedures for new architecture
5. Performance tuning and capacity planning

## Communication Plan

### Stakeholder Communication
- **Development Team**: Daily standups during migration phases
- **Operations Team**: Weekly status updates and readiness reviews
- **Business Stakeholders**: Milestone updates and go/no-go decisions
- **End Users**: Maintenance window notifications and status updates

### Documentation Updates
1. API documentation for any endpoint changes
2. Development setup instructions for new schema
3. Database administration procedures
4. Troubleshooting guides for new architecture
5. Security and compliance documentation updates

This migration strategy ensures a systematic, low-risk approach to consolidating the database architecture while maintaining all existing functionality and Better-Auth integration.