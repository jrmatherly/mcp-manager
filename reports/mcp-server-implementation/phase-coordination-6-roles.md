# Cross-Phase Coordination: 6-Role RBAC Implementation

**Purpose**: Coordinate breaking changes across all phases for successful 6-role RBAC implementation
**Timeline**: Must be executed in strict dependency order
**Risk Level**: Critical - Any phase dependency failure will break the entire system

## Phase Dependencies Matrix

### Phase 1 → Phase 3 Dependencies

**API Endpoint Compatibility**:
- Phase 1 endpoints must accept new role values without rejection
- Session management must prepare for role change handling
- Rate limiting must support 6-tier role hierarchy

**Required Phase 1 Updates**:
```python
# backend/src/mcp_registry_gateway/middleware/rate_limiter.py
ROLE_RATE_LIMITS = {
    'admin': 1000,      # requests per minute
    'manager': 750,     # NEW: manager role
    'developer': 500,   # migrated from server_owner
    'analyst': 250,     # NEW: analyst role
    'viewer': 100,      # migrated from user
    'guest': 20         # NEW: guest role
}

# Update validation to accept all 6 roles
def validate_user_role(role: str) -> bool:
    return role in ['admin', 'manager', 'developer', 'analyst', 'viewer', 'guest']
```

**Session Token Validation**:
- JWT tokens must validate new role values
- API key authentication must map to new roles
- Better-Auth session must accept expanded role enum

### Phase 2 → Phase 3 Dependencies

**OAuth Token Structure**:
- OAuth tokens must contain new role claims
- Azure AD mapping must support 6-level hierarchy
- Token refresh must maintain role synchronization

**Required Phase 2 Updates**:
```typescript
// OAuth callback handler updates required
export async function handleOAuth2Callback(authCode: string) {
  const tokenData = await exchangeCodeForToken(authCode);
  
  // Map Azure AD groups to 6-role hierarchy
  const mappedRole = mapAzureGroupsToRole(tokenData.groups);
  
  // Ensure role is valid for 6-tier system
  if (!['admin', 'manager', 'developer', 'analyst', 'viewer', 'guest'].includes(mappedRole)) {
    throw new Error(`Invalid role mapping: ${mappedRole}`);
  }
  
  return {
    ...tokenData,
    role: mappedRole,
    roleLevel: getRoleLevel(mappedRole)
  };
}
```

**Azure AD Configuration**:
- Group mappings must be updated before Phase 3 deployment
- OAuth scopes must include group membership claims
- Role priority logic must handle 6-tier hierarchy

### Phase 3 → Phase 4 Dependencies

**Monitoring System Updates**:
- Metrics collection must track 6 role types
- Audit logs must categorize by new roles
- Performance monitoring must segment by role level

**Required Phase 4 Preparation**:
```typescript
// Monitoring metrics must be prepared for 6 roles
interface RoleMetrics {
  admin: UserRoleMetrics;
  manager: UserRoleMetrics;    // NEW
  developer: UserRoleMetrics;  // replaces server_owner
  analyst: UserRoleMetrics;    // NEW
  viewer: UserRoleMetrics;     // replaces user
  guest: UserRoleMetrics;      // NEW
}

// Dashboard queries must handle new role names
const roleDistributionQuery = `
  SELECT role, COUNT(*) as user_count
  FROM "user"
  WHERE role IN ('admin', 'manager', 'developer', 'analyst', 'viewer', 'guest')
  GROUP BY role
`;
```

## Critical Synchronization Points

### 1. Database Migration Checkpoint

**MANDATORY**: Database migration must complete successfully before any code deployment.

**Validation Sequence**:
```sql
-- 1. Verify backup table exists
SELECT COUNT(*) FROM role_migration_backup_20241215;

-- 2. Verify role constraint update
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'user' AND constraint_name = 'user_role_check';

-- 3. Verify no legacy roles remain
SELECT role, COUNT(*) FROM "user" 
WHERE role IN ('server_owner', 'user') 
GROUP BY role;

-- 4. Verify migration audit log
SELECT COUNT(*) FROM audit_logs 
WHERE action = 'role.migration.6_hierarchy';
```

**Rollback Criteria**:
- Any validation query fails
- Migration audit log is missing
- Database constraint update fails
- Backup table is empty or corrupt

### 2. Frontend/Backend Simultaneous Deployment

**CRITICAL**: Frontend TypeScript and Backend Python must deploy simultaneously to prevent type mismatches.

**Deployment Sequence**:
```bash
#!/bin/bash
# Synchronized deployment script

echo "Starting synchronized 6-role deployment..."

# 1. Validate database migration completed
psql $DATABASE_URL -c "SELECT COUNT(*) FROM role_migration_backup_20241215;" || exit 1

# 2. Deploy backend with new role definitions
cd backend
uv run python -c "from src.mcp_registry_gateway.auth.roles import UserRole; print('Backend roles ready')"
if [ $? -ne 0 ]; then
  echo "Backend role validation failed"
  exit 1
fi

# 3. Deploy frontend with updated TypeScript types
cd ../frontend
npm run typecheck || {
  echo "Frontend TypeScript validation failed"
  exit 1
}

# 4. Restart services simultaneously
docker-compose down
docker-compose up -d

# 5. Validate both services accept new roles
sleep 10
curl -f "http://localhost:8000/health" || exit 1
curl -f "http://localhost:3000/api/health" || exit 1

echo "6-role deployment successful"
```

### 3. Azure AD Configuration Update

**TIMING**: Must occur before OAuth tokens are issued with new role claims.

**Configuration Checklist**:
- [ ] Azure AD groups created for: manager, analyst, guest
- [ ] Legacy "MCP-Server-Owners" group mapped to developer
- [ ] Group membership scope added to OAuth application
- [ ] Role priority hierarchy configured
- [ ] Test tokens validated with new role structure

**Validation Script**:
```bash
#!/bin/bash
# Validate Azure AD configuration

# Test OAuth token with new role structure
TEST_TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&scope=openid profile email&grant_type=client_credentials")

echo "Testing role mapping with new hierarchy..."
node -e "
  const token = JSON.parse('$TEST_TOKEN');
  const decoded = JSON.parse(Buffer.from(token.access_token.split('.')[1], 'base64').toString());
  const roles = ['admin', 'manager', 'developer', 'analyst', 'viewer', 'guest'];
  console.log('Token supports roles:', roles.every(role => decoded.roles?.includes(role)));
"
```

## Implementation Timeline

### Week 1: Phase 1 Preparation
- [ ] Update rate limiting for 6 roles
- [ ] Modify API validation to accept new roles
- [ ] Test session management with placeholder roles
- [ ] Validate JWT token structure changes

### Week 2: Phase 2 Enhancement
- [ ] Update OAuth token structure
- [ ] Configure Azure AD group mappings
- [ ] Implement role priority logic
- [ ] Test end-to-end OAuth flow with new roles

### Week 3-4: Phase 3 Implementation
- [ ] Execute database migration
- [ ] Deploy TypeScript type updates
- [ ] Update Backend Python role definitions
- [ ] Test role-based access control

### Week 5: Phase 4 Coordination
- [ ] Update monitoring for 6 roles
- [ ] Configure role-specific dashboards
- [ ] Test migration progress tracking
- [ ] Validate performance metrics segmentation

## Risk Mitigation Strategies

### High-Risk Scenarios

**Scenario 1: Database Migration Failure**
```sql
-- Emergency rollback procedure
BEGIN TRANSACTION;

-- Restore from backup
DELETE FROM "user";
INSERT INTO "user" SELECT * FROM role_migration_backup_20241215;

-- Restore old constraint
ALTER TABLE "user" DROP CONSTRAINT user_role_check;
ALTER TABLE "user" ADD CONSTRAINT user_role_check 
  CHECK (role IN ('admin', 'server_owner', 'user'));

COMMIT;
```

**Scenario 2: TypeScript Compilation Failure**
```bash
# Automated rollback to previous type definitions
git checkout HEAD~1 -- frontend/src/types/better-auth.ts
npm run build
if [ $? -eq 0 ]; then
  echo "Rollback successful"
else
  echo "Manual intervention required"
fi
```

**Scenario 3: OAuth Token Validation Failure**
```typescript
// Graceful degradation to legacy roles
function validateRoleWithFallback(role: string): string {
  const newRoles = ['admin', 'manager', 'developer', 'analyst', 'viewer', 'guest'];
  const legacyRoles = ['admin', 'server_owner', 'user'];
  
  if (newRoles.includes(role)) {
    return role;
  }
  
  // Fallback mapping
  const fallbackMap = {
    'server_owner': 'developer',
    'user': 'viewer'
  };
  
  return fallbackMap[role] || 'guest';
}
```

### Medium-Risk Scenarios

**Scenario 4: Performance Degradation**
- Monitor response times during migration
- Implement circuit breakers for role validation
- Cache role permissions to reduce database load

**Scenario 5: User Access Disruption**
- Maintain session continuity during role migration
- Provide clear user communication about changes
- Implement graceful degradation for unsupported clients

## Validation Checkpoints

### Pre-Migration Validation

```bash
#!/bin/bash
# Pre-migration validation checklist

echo "Validating 6-role migration readiness..."

# 1. Database backup verification
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"user\"" > user_count_pre.txt
echo "✓ User count recorded: $(cat user_count_pre.txt)"

# 2. Azure AD configuration
curl -f "$AZURE_AD_ENDPOINT/groups" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.value[] | select(.displayName | contains("MCP"))' > azure_groups.json
echo "✓ Azure AD groups validated"

# 3. TypeScript compilation
cd frontend && npm run typecheck
echo "✓ TypeScript types validated"

# 4. Backend role definitions
cd ../backend && uv run python -c "from src.mcp_registry_gateway.auth.roles import ROLE_PERMISSIONS; print(f'Roles defined: {len(ROLE_PERMISSIONS)}')"
echo "✓ Backend roles validated"

echo "Pre-migration validation complete"
```

### Post-Migration Validation

```bash
#!/bin/bash
# Post-migration validation checklist

echo "Validating 6-role migration success..."

# 1. Database state verification
psql $DATABASE_URL -c "SELECT role, COUNT(*) FROM \"user\" GROUP BY role;"
echo "✓ Role distribution verified"

# 2. API endpoint testing
for role in admin manager developer analyst viewer guest; do
  curl -f "http://localhost:3000/api/test-role/$role" || echo "⚠ Role $role validation failed"
done
echo "✓ API endpoints tested"

# 3. Authentication flow testing
curl -f "http://localhost:3000/api/auth/session" | jq '.user.role'
echo "✓ Authentication flow verified"

# 4. Monitoring system validation
curl -f "http://localhost:3000/api/metrics/roles" | jq 'keys | length'
echo "✓ Monitoring system updated"

echo "Post-migration validation complete"
```

## Emergency Procedures

### Complete System Rollback

**Trigger Conditions**:
- Migration validation fails
- System-wide authentication failure
- Data corruption detected
- Performance degradation >50%

**Rollback Procedure**:
```bash
#!/bin/bash
# EMERGENCY: Complete 6-role rollback

echo "EMERGENCY ROLLBACK: Reverting to 3-role system"

# 1. Database rollback
psql $DATABASE_URL -f rollback_to_3_roles.sql

# 2. Code rollback
git checkout production-stable -- .

# 3. Service restart
docker-compose down
docker-compose up -d

# 4. Validation
curl -f "http://localhost:3000/api/health" && echo "Rollback successful"
```

### Partial Feature Rollback

**Feature Flags for Gradual Rollback**:
```typescript
// Environment-controlled feature flags
export const FEATURE_FLAGS = {
  SIX_ROLE_RBAC: process.env.ENABLE_6_ROLE_RBAC === 'true',
  ROLE_MIGRATION_UI: process.env.ENABLE_MIGRATION_UI === 'true',
  NEW_ROLE_PERMISSIONS: process.env.ENABLE_NEW_PERMISSIONS === 'true',
};

// Conditional role validation
function validateRole(role: string): boolean {
  if (FEATURE_FLAGS.SIX_ROLE_RBAC) {
    return ['admin', 'manager', 'developer', 'analyst', 'viewer', 'guest'].includes(role);
  }
  return ['admin', 'server_owner', 'user'].includes(role);
}
```

## Success Criteria

### Phase Completion Checkpoints

**Phase 1 → Phase 3 Ready**:
- [ ] All API endpoints accept 6-role values
- [ ] Rate limiting configured for new hierarchy
- [ ] Session management handles role changes
- [ ] JWT validation supports new role structure

**Phase 2 → Phase 3 Ready**:
- [ ] OAuth tokens contain new role claims
- [ ] Azure AD mappings configured and tested
- [ ] Role synchronization logic implemented
- [ ] Token refresh maintains role consistency

**Phase 3 → Phase 4 Ready**:
- [ ] Database migration completed successfully
- [ ] All users migrated to new roles
- [ ] TypeScript compilation successful
- [ ] Role-based access control functional

**Phase 4 Integration Complete**:
- [ ] Monitoring tracks all 6 roles
- [ ] Dashboards display role-specific metrics
- [ ] Audit logs categorize by new roles
- [ ] Performance monitoring segments by role level

### System-Wide Validation

**End-to-End Testing Checklist**:
- [ ] User can authenticate with new role structure
- [ ] Role-based permissions enforced correctly
- [ ] OAuth flow works with 6-tier hierarchy
- [ ] Session management prevents privilege escalation
- [ ] Audit logs capture all role-related events
- [ ] Monitoring provides role-specific insights
- [ ] Migration process documented and repeatable

**Performance Benchmarks**:
- [ ] Authentication latency < 200ms with new roles
- [ ] Role validation overhead < 10ms per request
- [ ] Database migration completed in < 30 minutes
- [ ] Zero data loss during migration process
- [ ] System availability > 99.9% during transition

---

**Status**: Cross-phase coordination plan ready for implementation
**Next Steps**: Execute phases in strict dependency order with validation checkpoints
**Critical Success Factor**: All synchronization points must be validated before proceeding to next phase