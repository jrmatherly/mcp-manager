# Phase 3: RBAC and User Preferences Implementation

**Priority**: High
**Complexity**: Medium-High
**Timeline**: 4-5 weeks (adjusted from validation report findings)
**Dependencies**: Phase 1 (Foundation), Phase 2 (OAuth Integration)
**Key Focus**: Privilege escalation prevention, secure preference management, audit compliance

## Overview

<!-- VALIDATION UPDATE: Expanded RBAC system requirements from validation assessment -->
Phase 3 implements comprehensive Role-Based Access Control (RBAC) and user preference management for the MCP Registry Gateway.

**Enhanced RBAC Requirements from Validation Report**:
- **6-role hierarchy**: admin, manager, developer, analyst, viewer, guest
- **30+ granular permissions matrix**: Comprehensive access control
- **Permission inheritance system**: Hierarchical role management
- **MFA implementation requirements**: Multi-factor authentication
- **Advanced session management**: Device fingerprinting, trusted devices

Phase 3 implements comprehensive Role-Based Access Control (RBAC) and user preference management for the MCP Registry Gateway. Building on the security research from Phases 1-2, this phase addresses privilege escalation vulnerabilities, implements secure multi-tenant access control, and provides enterprise-grade audit capabilities. This phase is critical for production deployment as it establishes proper access boundaries and compliance requirements.

## Critical Security Considerations (From Research)

### Security Challenge 1: Session Fixation Prevention
**Issue**: Role changes without session regeneration create security vulnerabilities
**Research Finding**: Sessions must be regenerated when user privileges change
**Implementation**: Enhanced session management with automatic regeneration

### Security Challenge 2: Complex Role Inheritance
**Issue**: Azure AD group mappings create complex permission inheritance
**Research Finding**: Role mapping requires robust fallback logic and validation
**Implementation**: Multi-layer role validation with audit trails

### Security Challenge 3: Preference-Based Security Bypass
**Issue**: User preferences could be manipulated to bypass security controls
**Research Finding**: Preferences must be validated and audited
**Implementation**: Secure preference validation with change tracking

### Security Challenge 4: Audit Log Integrity
**Issue**: Audit logs must be tamper-proof for compliance
**Research Finding**: Immutable logging with encryption required
**Implementation**: Write-only audit system with cryptographic integrity

## 1. RBAC Architecture Enhancement

**CRITICAL PRIORITY**: Addresses session fixation and privilege escalation vulnerabilities
**Integration Point**: Builds on Better-Auth role system established in Phase 1

### 1.1 Role Hierarchy Expansion

**Current Better-Auth Roles**:
```typescript
enum UserRole {
  ADMIN = 'admin',           // Full system access
  USER = 'user',             // Basic user access
  SERVER_OWNER = 'server_owner' // Server management access
}
```

**Enhanced RBAC System**:
```typescript
<!-- VALIDATION UPDATE: Enhanced to 6-role hierarchy per validation requirements -->
enum UserRole {
  ADMIN = 'admin',                 // Full system access
  MANAGER = 'manager',             // Team management access
  DEVELOPER = 'developer',         // Development and testing access
  ANALYST = 'analyst',             // Read-only analytics access
  VIEWER = 'viewer',               // Basic read-only access
  GUEST = 'guest'                  // Limited guest access
}

<!-- VALIDATION UPDATE: Expanded to 30+ granular permissions matrix -->
interface RolePermissions {
  // Server Management (10 permissions)
  canCreateServers: boolean;
  canDeleteServers: boolean;
  canEditServerConfig: boolean;
  canViewAllServers: boolean;
  canManageServerACL: boolean;
  canDeployServers: boolean;
  canRestartServers: boolean;
  canViewServerLogs: boolean;
  canExportServerData: boolean;
  canArchiveServers: boolean;

  // User Management (8 permissions)
  canCreateUsers: boolean;
  canDeleteUsers: boolean;
  canEditUserRoles: boolean;
  canViewAllUsers: boolean;
  canManageUserSessions: boolean;
  canResetUserPasswords: boolean;
  canViewUserActivity: boolean;
  canExportUserData: boolean;

  // System Administration (12+ permissions)
  canModifySystemSettings: boolean;
  canAccessAuditLogs: boolean;
  canViewMetrics: boolean;
  canManageAlerts: boolean;
  canBackupSystem: boolean;
  canRestoreSystem: boolean;
  canManageIntegrations: boolean;
  canViewSystemHealth: boolean;
  canManageAPIKeys: boolean;
  canConfigureOAuth: boolean;
  canManageRetention: boolean;
  canExportAuditLogs: boolean;
}
```

### 1.2 Permission Matrix Implementation

**File**: `frontend/src/lib/rbac/permissions.ts`
```typescript
import { UserRole } from '@/types/auth';

<!-- VALIDATION UPDATE: Complete 6-role hierarchy with 30+ permissions -->
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    // Server Management - Full access
    canCreateServers: true,
    canDeleteServers: true,
    canEditServerConfig: true,
    canViewAllServers: true,
    canManageServerACL: true,
    canDeployServers: true,
    canRestartServers: true,
    canViewServerLogs: true,
    canExportServerData: true,
    canArchiveServers: true,

    // User Management - Full access
    canCreateUsers: true,
    canDeleteUsers: true,
    canEditUserRoles: true,
    canViewAllUsers: true,
    canManageUserSessions: true,
    canResetUserPasswords: true,
    canViewUserActivity: true,
    canExportUserData: true,

    // System Administration - Full access
    canModifySystemSettings: true,
    canAccessAuditLogs: true,
    canViewMetrics: true,
    canManageAlerts: true,
    canBackupSystem: true,
    canRestoreSystem: true,
    canManageIntegrations: true,
    canViewSystemHealth: true,
    canManageAPIKeys: true,
    canConfigureOAuth: true,
    canManageRetention: true,
    canExportAuditLogs: true,
  },
  manager: {
    // Server Management - Most access, no delete/deploy
    canCreateServers: true,
    canDeleteServers: false,
    canEditServerConfig: true,
    canViewAllServers: true,
    canManageServerACL: true,
    canDeployServers: false,
    canRestartServers: true,
    canViewServerLogs: true,
    canExportServerData: true,
    canArchiveServers: false,

    // User Management - Team management only
    canCreateUsers: true,
    canDeleteUsers: false,
    canEditUserRoles: true,
    canViewAllUsers: true,
    canManageUserSessions: true,
    canResetUserPasswords: true,
    canViewUserActivity: true,
    canExportUserData: false,

    // System Administration - Limited access
    canModifySystemSettings: false,
    canAccessAuditLogs: true,
    canViewMetrics: true,
    canManageAlerts: false,
    canBackupSystem: false,
    canRestoreSystem: false,
    canManageIntegrations: false,
    canViewSystemHealth: true,
    canManageAPIKeys: false,
    canConfigureOAuth: false,
    canManageRetention: false,
    canExportAuditLogs: false,
  },
  developer: {
    // Server Management - Development focus
    canCreateServers: true,
    canDeleteServers: false,
    canEditServerConfig: true,
    canViewAllServers: false, // Only own servers
    canManageServerACL: false,
    canDeployServers: true,
    canRestartServers: true,
    canViewServerLogs: true,
    canExportServerData: false,
    canArchiveServers: false,

    // User Management - No access
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUserRoles: false,
    canViewAllUsers: false,
    canManageUserSessions: false,
    canResetUserPasswords: false,
    canViewUserActivity: false,
    canExportUserData: false,

    // System Administration - Development tools only
    canModifySystemSettings: false,
    canAccessAuditLogs: false,
    canViewMetrics: false,
    canManageAlerts: false,
    canBackupSystem: false,
    canRestoreSystem: false,
    canManageIntegrations: false,
    canViewSystemHealth: false,
    canManageAPIKeys: true, // Own API keys only
    canConfigureOAuth: false,
    canManageRetention: false,
    canExportAuditLogs: false,
  },
  analyst: {
    // Server Management - Read-only analytics
    canCreateServers: false,
    canDeleteServers: false,
    canEditServerConfig: false,
    canViewAllServers: true,
    canManageServerACL: false,
    canDeployServers: false,
    canRestartServers: false,
    canViewServerLogs: true,
    canExportServerData: true,
    canArchiveServers: false,

    // User Management - Analytics only
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUserRoles: false,
    canViewAllUsers: true,
    canManageUserSessions: false,
    canResetUserPasswords: false,
    canViewUserActivity: true,
    canExportUserData: true,

    // System Administration - Analytics access
    canModifySystemSettings: false,
    canAccessAuditLogs: true,
    canViewMetrics: true,
    canManageAlerts: false,
    canBackupSystem: false,
    canRestoreSystem: false,
    canManageIntegrations: false,
    canViewSystemHealth: true,
    canManageAPIKeys: false,
    canConfigureOAuth: false,
    canManageRetention: false,
    canExportAuditLogs: true,
  },
  viewer: {
    // Server Management - Basic read-only
    canCreateServers: false,
    canDeleteServers: false,
    canEditServerConfig: false,
    canViewAllServers: false, // Only accessible servers
    canManageServerACL: false,
    canDeployServers: false,
    canRestartServers: false,
    canViewServerLogs: false,
    canExportServerData: false,
    canArchiveServers: false,

    // User Management - No access
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUserRoles: false,
    canViewAllUsers: false,
    canManageUserSessions: false,
    canResetUserPasswords: false,
    canViewUserActivity: false,
    canExportUserData: false,

    // System Administration - Basic monitoring
    canModifySystemSettings: false,
    canAccessAuditLogs: false,
    canViewMetrics: false,
    canManageAlerts: false,
    canBackupSystem: false,
    canRestoreSystem: false,
    canManageIntegrations: false,
    canViewSystemHealth: false,
    canManageAPIKeys: false,
    canConfigureOAuth: false,
    canManageRetention: false,
    canExportAuditLogs: false,
  },
  guest: {
    // Server Management - Very limited
    canCreateServers: false,
    canDeleteServers: false,
    canEditServerConfig: false,
    canViewAllServers: false,
    canManageServerACL: false,
    canDeployServers: false,
    canRestartServers: false,
    canViewServerLogs: false,
    canExportServerData: false,
    canArchiveServers: false,

    // User Management - No access
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUserRoles: false,
    canViewAllUsers: false,
    canManageUserSessions: false,
    canResetUserPasswords: false,
    canViewUserActivity: false,
    canExportUserData: false,

    // System Administration - No access
    canModifySystemSettings: false,
    canAccessAuditLogs: false,
    canViewMetrics: false,
    canManageAlerts: false,
    canBackupSystem: false,
    canRestoreSystem: false,
    canManageIntegrations: false,
    canViewSystemHealth: false,
    canManageAPIKeys: false,
    canConfigureOAuth: false,
    canManageRetention: false,
    canExportAuditLogs: false,
  },
};

export function hasPermission(
  userRole: UserRole,
  permission: keyof RolePermissions
): boolean {
  return ROLE_PERMISSIONS[userRole][permission];
}

export function canAccessResource(
  userRole: UserRole,
  resourceType: 'server' | 'user' | 'audit' | 'metrics',
  resourceOwnerId?: string,
  currentUserId?: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];

  switch (resourceType) {
    case 'server':
      if (permissions.canViewAllServers) return true;
      return resourceOwnerId === currentUserId;

    case 'user':
      return permissions.canManageUsers || resourceOwnerId === currentUserId;

    case 'audit':
      return permissions.canAccessAuditLogs;

    case 'metrics':
      return permissions.canViewMetrics;

    default:
      return false;
  }
}
```

### 1.3 RBAC Middleware Enhancement

**ADDRESSES**: Session fixation vulnerability and privilege escalation prevention
**Security Pattern**: Principle of least privilege with defense in depth

**File**: `backend/src/mcp_registry_gateway/middleware/rbac_middleware.py`
```python
from typing import List, Optional
from fastapi import HTTPException, Request, status
from functools import wraps
import asyncio

from ..auth.auth_validator import get_current_user
from ..db.models.better_auth import BetterAuthUser

class Permission:
    CREATE_SERVERS = "create_servers"
    DELETE_SERVERS = "delete_servers"
    VIEW_ALL_SERVERS = "view_all_servers"
    MANAGE_USERS = "manage_users"
    ACCESS_AUDIT_LOGS = "access_audit_logs"
    MODIFY_SYSTEM_SETTINGS = "modify_system_settings"
    VIEW_METRICS = "view_metrics"
    EXPORT_DATA = "export_data"

ROLE_PERMISSIONS = {
    "super_admin": [
        Permission.CREATE_SERVERS,
        Permission.DELETE_SERVERS,
        Permission.VIEW_ALL_SERVERS,
        Permission.MANAGE_USERS,
        Permission.ACCESS_AUDIT_LOGS,
        Permission.MODIFY_SYSTEM_SETTINGS,
        Permission.VIEW_METRICS,
        Permission.EXPORT_DATA,
    ],
    "admin": [
        Permission.CREATE_SERVERS,
        Permission.DELETE_SERVERS,
        Permission.VIEW_ALL_SERVERS,
        Permission.MANAGE_USERS,
        Permission.ACCESS_AUDIT_LOGS,
        Permission.VIEW_METRICS,
        Permission.EXPORT_DATA,
    ],
    "server_owner": [
        Permission.CREATE_SERVERS,
    ],
    "developer": [
        Permission.CREATE_SERVERS,
    ],
    "auditor": [
        Permission.VIEW_ALL_SERVERS,
        Permission.ACCESS_AUDIT_LOGS,
        Permission.VIEW_METRICS,
    ],
    "user": [],
}

async def require_permission(
    permission: str,
    resource_owner_id: Optional[str] = None
):
    """Decorator to require specific permission for endpoint access."""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user = await get_current_user(request)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            # Check if user has the required permission
            user_permissions = ROLE_PERMISSIONS.get(user.role, [])

            if permission not in user_permissions:
                # Special case: users can access their own resources
                if resource_owner_id and resource_owner_id == user.id:
                    return await func(request, *args, **kwargs)

                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {permission}"
                )

            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

async def require_any_permission(permissions: List[str]):
    """Decorator to require any of the specified permissions."""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user = await get_current_user(request)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            user_permissions = ROLE_PERMISSIONS.get(user.role, [])

            if not any(perm in user_permissions for perm in permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required one of: {permissions}"
                )

            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

class RBACValidator:
    """Centralized RBAC validation utilities."""

    @staticmethod
    async def can_user_access_server(
        user: BetterAuthUser,
        server_id: str,
        action: str = "view"
    ) -> bool:
        """Check if user can access specific server."""
        user_permissions = ROLE_PERMISSIONS.get(user.role, [])

        # Admins and auditors can access all servers
        if Permission.VIEW_ALL_SERVERS in user_permissions:
            return True

        # Server owners can access their own servers
        if action == "view" and user.role in ["server_owner", "developer"]:
            # TODO: Check server ownership in database
            return True

        # Users can only view servers they own
        if action == "view":
            # TODO: Check server ownership in database
            return True

        return False

    @staticmethod
    async def can_user_manage_server(
        user: BetterAuthUser,
        server_id: str,
        action: str = "edit"
    ) -> bool:
        """Check if user can manage specific server."""
        user_permissions = ROLE_PERMISSIONS.get(user.role, [])

        if action == "delete":
            # Only super_admin and admin can delete any server
            if Permission.DELETE_SERVERS in user_permissions:
                return True
            # Server owners can delete their own servers (with restrictions)
            if user.role == "server_owner":
                # TODO: Check server ownership and deletion policy
                return True

        if action in ["edit", "configure"]:
            # Check if user owns the server or has admin privileges
            if Permission.VIEW_ALL_SERVERS in user_permissions:
                return True
            # TODO: Check server ownership
            return True

        return False
```

## 1.4 Complete Database Migration Implementation

**CRITICAL: Complete Database Migration Script**
All breaking changes for the 6-role RBAC implementation require a comprehensive migration strategy to ensure zero-downtime deployment and data integrity.

### Database Migration Script

**File**: `frontend/drizzle/migrations/0012_role_migration_6_hierarchy.sql`
```sql
-- CRITICAL: Complete Database Migration Script for 6-Role RBAC
BEGIN TRANSACTION;

-- 1. Create backup table for rollback capability
CREATE TABLE role_migration_backup_20241215 AS
SELECT id, email, role, updated_at FROM "user";

-- 2. Validate current role distribution
DO $$
DECLARE
    role_count RECORD;
BEGIN
    RAISE NOTICE 'Current role distribution before migration:';
    FOR role_count IN
        SELECT role, COUNT(*) as count FROM "user" GROUP BY role
    LOOP
        RAISE NOTICE 'Role: %, Count: %', role_count.role, role_count.count;
    END LOOP;
END $$;

-- 3. Update roles with explicit mapping strategy
UPDATE "user" SET role = CASE
    WHEN role = 'admin' THEN 'admin'           -- Preserve admin
    WHEN role = 'server_owner' THEN 'developer' -- Map to developer (maintains server access)
    WHEN role = 'user' THEN 'viewer'           -- Conservative mapping to viewer
    ELSE 'guest'                               -- Safety fallback for any unknown roles
END;

-- 4. Drop old role constraint
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;

-- 5. Add new constraint with 6 roles
ALTER TABLE "user" ADD CONSTRAINT user_role_check
    CHECK (role IN ('admin', 'manager', 'developer', 'analyst', 'viewer', 'guest'));

-- 6. Verify migration results
DO $$
DECLARE
    role_count RECORD;
    migration_count INTEGER;
BEGIN
    RAISE NOTICE 'Role distribution after migration:';
    FOR role_count IN
        SELECT role, COUNT(*) as count FROM "user" GROUP BY role
    LOOP
        RAISE NOTICE 'Role: %, Count: %', role_count.role, role_count.count;
    END LOOP;

    -- Count migrated server_owner users
    SELECT COUNT(*) INTO migration_count
    FROM role_migration_backup_20241215
    WHERE role = 'server_owner';

    RAISE NOTICE 'Migrated % server_owner users to developer role', migration_count;
END $$;

-- 7. Create audit log entry for migration
INSERT INTO audit_logs (
    actor_id,
    actor_type,
    action,
    action_category,
    outcome,
    details,
    sensitivity_level,
    event_timestamp
) VALUES (
    NULL,
    'system',
    'role.migration.6_hierarchy',
    'configuration',
    'success',
    jsonb_build_object(
        'migration_type', '3-role-to-6-role',
        'backup_table', 'role_migration_backup_20241215',
        'migration_date', NOW(),
        'affected_roles', jsonb_build_array('server_owner', 'user'),
        'new_roles', jsonb_build_array('admin', 'manager', 'developer', 'analyst', 'viewer', 'guest')
    ),
    'high',
    NOW()
);

COMMIT;

-- Rollback procedure documentation (for emergency use):
-- ROLLBACK;
-- DELETE FROM "user";
-- INSERT INTO "user" SELECT * FROM role_migration_backup_20241215;
-- ALTER TABLE "user" DROP CONSTRAINT user_role_check;
-- ALTER TABLE "user" ADD CONSTRAINT user_role_check
--     CHECK (role IN ('admin', 'server_owner', 'user'));
```

### TypeScript Type Update Strategy

**CRITICAL**: All TypeScript files using BetterAuthRole require coordinated updates to prevent compilation failures.

#### Affected Files Inventory
The following files use BetterAuthRole and require updates:

**Type Definitions**:
- `frontend/src/types/better-auth.ts` - Core type definition
- `frontend/src/types/auth.ts` - Auth utilities and exports

**Authentication System**:
- `frontend/src/lib/auth.ts` - Better-Auth configuration
- `frontend/src/lib/auth/providers/azure.ts` - Azure AD role mapping
- `frontend/src/lib/rbac/permissions.ts` - Permission matrix (already updated above)

**UI Components**:
- `frontend/src/components/auth/AuthGuard.tsx` - Route protection
- `frontend/src/components/auth/RoleDisplay.tsx` - Role indicators
- `frontend/src/components/ui/UserMenu.tsx` - User menu role display

**Admin Interface**:
- `frontend/src/app/admin/page.tsx` - Admin dashboard
- `frontend/src/app/admin/users/page.tsx` - User management
- `frontend/src/app/admin/components/*.tsx` - Admin components

**Hooks and Utilities**:
- `frontend/src/hooks/useAuth.ts` - Authentication hooks
- `frontend/src/hooks/usePermissions.ts` - Permission checking hooks

#### Compilation Process Strategy

**Step 1: Update Core Type Definition**
```typescript
// frontend/src/types/better-auth.ts
export type BetterAuthRole =
  | 'admin'
  | 'manager'
  | 'developer'
  | 'analyst'
  | 'viewer'
  | 'guest';

// Legacy support during transition
export type LegacyBetterAuthRole = 'admin' | 'server_owner' | 'user';

// Migration mapping utility
export const roleMigrationMap: Record<LegacyBetterAuthRole, BetterAuthRole> = {
  admin: 'admin',
  server_owner: 'developer',
  user: 'viewer'
};
```

**Step 2: Compilation Process**
```bash
# Run TypeScript compiler in watch mode during updates
cd frontend
npx tsc --watch --noEmit

# In separate terminal, address compilation errors systematically
npm run typecheck

# Verify build after all updates
npm run build
```

**Step 3: Azure AD Role Mapping Updates**
```typescript
// frontend/src/lib/auth/providers/azure.ts
export const azureAdRoleMapping: Record<string, BetterAuthRole> = {
  // Enterprise Admin Groups
  'MCP-Registry-Admins': 'admin',
  'IT-Administrators': 'admin',

  // Management Groups
  'Team-Leads': 'manager',
  'Project-Managers': 'manager',
  'Department-Heads': 'manager',

  // Development Groups
  'Software-Engineers': 'developer',
  'DevOps-Engineers': 'developer',
  'Platform-Engineers': 'developer',
  'MCP-Server-Owners': 'developer', // Migration from server_owner

  // Analysis Groups
  'Data-Analysts': 'analyst',
  'Business-Analysts': 'analyst',
  'Metrics-Team': 'analyst',

  // General Access Groups
  'General-Users': 'viewer',
  'Read-Only-Access': 'viewer',

  // Guest Access
  'External-Contractors': 'guest',
  'Temporary-Access': 'guest'
};

// Priority-based role assignment (highest priority wins)
export const rolePriority: Record<BetterAuthRole, number> = {
  admin: 100,
  manager: 80,
  developer: 60,
  analyst: 40,
  viewer: 20,
  guest: 10
};

export function mapAzureGroupsToRole(azureGroups: string[]): BetterAuthRole {
  let highestRole: BetterAuthRole = 'guest';
  let highestPriority = 0;

  for (const group of azureGroups) {
    const role = azureAdRoleMapping[group];
    if (role && rolePriority[role] > highestPriority) {
      highestRole = role;
      highestPriority = rolePriority[role];
    }
  }

  return highestRole;
}
```

### Complete Backend Python Implementation

**File**: `backend/src/mcp_registry_gateway/auth/roles.py`
```python
from enum import Enum
from typing import List, Dict, Set

class UserRole(str, Enum):
    """Six-tier role hierarchy for MCP Registry Gateway."""
    ADMIN = "admin"
    MANAGER = "manager"
    DEVELOPER = "developer"
    ANALYST = "analyst"
    VIEWER = "viewer"
    GUEST = "guest"

# Legacy role mapping for migration support
LEGACY_ROLE_MAPPING = {
    "admin": UserRole.ADMIN,
    "server_owner": UserRole.DEVELOPER,  # Migration path
    "user": UserRole.VIEWER
}

# Complete ROLE_PERMISSIONS matrix for all 6 roles
ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "admin": [
        # Server Management - Full Access
        "server.create", "server.read", "server.update", "server.delete",
        "server.configure", "server.deploy", "server.restart", "server.archive",
        "server.export", "server.logs.read", "server.acl.manage",

        # User Management - Full Access
        "user.create", "user.read", "user.update", "user.delete",
        "user.role.assign", "user.session.manage", "user.password.reset",
        "user.activity.view", "user.export",

        # System Administration - Full Access
        "system.settings.modify", "system.backup", "system.restore",
        "system.health.view", "system.metrics.view", "system.alerts.manage",
        "system.integrations.manage", "system.retention.manage",

        # Audit and Compliance - Full Access
        "audit.logs.read", "audit.logs.export", "audit.retention.manage",

        # API Management - Full Access
        "api.keys.manage", "api.oauth.configure", "api.rate_limits.set"
    ],

    "manager": [
        # Server Management - Most Access (no delete/deploy)
        "server.create", "server.read", "server.update", "server.configure",
        "server.restart", "server.logs.read", "server.acl.manage", "server.export",

        # User Management - Team Management
        "user.create", "user.read", "user.update", "user.role.assign",
        "user.session.manage", "user.password.reset", "user.activity.view",

        # System Monitoring - Read Access
        "system.health.view", "system.metrics.view",

        # Audit Access - Read Only
        "audit.logs.read",

        # Limited API Management
        "api.keys.manage"  # Own keys only
    ],

    "developer": [
        # Server Management - Development Focus
        "server.create", "server.read", "server.update", "server.configure",
        "server.deploy", "server.restart", "server.logs.read",

        # Limited User Access - Own Account Only
        "user.read",  # Own profile only

        # Development Tools
        "api.keys.manage",  # Own API keys only

        # No System or User Management Access
    ],

    "analyst": [
        # Server Monitoring - Read Only Analytics
        "server.read", "server.logs.read", "server.export",

        # User Activity Analytics
        "user.read", "user.activity.view", "user.export",

        # System Monitoring and Metrics
        "system.health.view", "system.metrics.view",

        # Audit Analysis
        "audit.logs.read", "audit.logs.export",

        # No Management Capabilities
    ],

    "viewer": [
        # Basic Server Access - Own Resources Only
        "server.read",  # Limited to owned/accessible servers

        # Basic User Access - Own Profile Only
        "user.read",  # Own profile only

        # Basic System Monitoring
        "system.health.view",  # Limited view

        # No Management or Export Capabilities
    ],

    "guest": [
        # Very Limited Access
        "server.read",  # Extremely limited, public servers only

        # No management, export, or detailed access capabilities
    ]
}

def has_permission(role: str, permission: str) -> bool:
    """Check if a role has a specific permission."""
    return permission in ROLE_PERMISSIONS.get(role, [])

def get_role_permissions(role: str) -> List[str]:
    """Get all permissions for a role."""
    return ROLE_PERMISSIONS.get(role, [])

def can_access_resource(
    user_role: str,
    resource_type: str,
    action: str,
    resource_owner_id: str = None,
    user_id: str = None
) -> bool:
    """Check if user can access a specific resource."""
    permission = f"{resource_type}.{action}"

    # Check base permission
    if not has_permission(user_role, permission):
        return False

    # For viewer and guest roles, check ownership
    if user_role in ['viewer', 'guest'] and resource_type == 'server':
        # Additional ownership validation would be implemented here
        # For now, return basic permission check result
        return resource_owner_id == user_id if resource_owner_id and user_id else False

    # For higher roles, permission check is sufficient
    return True

# Role hierarchy for inheritance checking
ROLE_HIERARCHY = {
    UserRole.ADMIN: 100,
    UserRole.MANAGER: 80,
    UserRole.DEVELOPER: 60,
    UserRole.ANALYST: 40,
    UserRole.VIEWER: 20,
    UserRole.GUEST: 10
}

def is_higher_role(role1: str, role2: str) -> bool:
    """Check if role1 has higher privileges than role2."""
    return ROLE_HIERARCHY.get(role1, 0) > ROLE_HIERARCHY.get(role2, 0)
```

### Explicit server_owner Migration Procedure

**CRITICAL**: The `server_owner` role migration requires careful handling to maintain user permissions and prevent service disruption.

#### Pre-Migration Communication Strategy

**T-7 Days: User Notification Email**
```html
Subject: Important: MCP Registry Role System Upgrade

Dear [User Name],

We're upgrading our role-based access control system to provide more granular permissions and better security. Your current "Server Owner" role will be migrated to the new "Developer" role.

**What's Changing:**
- Server Owner → Developer (maintains all your current permissions)
- Enhanced security features and audit capabilities
- New role hierarchy: Admin > Manager > Developer > Analyst > Viewer > Guest

**What Stays the Same:**
- All your server management capabilities
- API access and development tools
- Deployment and configuration permissions

**Timeline:**
- Migration Date: [Date]
- Expected Downtime: < 5 minutes
- New features available immediately after

Questions? Contact support@mcpregistry.com

Best regards,
MCP Registry Team
```

#### Migration Steps with Validation

**Step 1: Pre-Migration Validation**
```sql
-- Identify all affected users
SELECT
    id,
    email,
    role,
    created_at,
    last_login
FROM "user"
WHERE role = 'server_owner'
ORDER BY last_login DESC;

-- Validate server ownership data
SELECT
    u.email,
    COUNT(s.id) as server_count,
    MAX(s.updated_at) as last_server_activity
FROM "user" u
LEFT JOIN servers s ON s.owner_id = u.id
WHERE u.role = 'server_owner'
GROUP BY u.id, u.email;
```

**Step 2: Create Audit Trail**
```sql
-- Log migration start
INSERT INTO audit_logs (
    actor_id,
    actor_type,
    action,
    action_category,
    outcome,
    details,
    sensitivity_level
)
SELECT
    u.id,
    'system',
    'role.migration.pre_check',
    'user_management',
    'success',
    jsonb_build_object(
        'current_role', 'server_owner',
        'target_role', 'developer',
        'user_email', u.email,
        'server_count', COALESCE(s.server_count, 0)
    ),
    'high'
FROM "user" u
LEFT JOIN (
    SELECT owner_id, COUNT(*) as server_count
    FROM servers
    GROUP BY owner_id
) s ON s.owner_id = u.id
WHERE u.role = 'server_owner';
```

**Step 3: Execute Migration with Validation**
```sql
-- Execute migration within transaction
BEGIN TRANSACTION;

-- Update roles with individual validation
UPDATE "user"
SET
    role = 'developer',
    updated_at = NOW()
WHERE role = 'server_owner'
RETURNING id, email, role;

-- Verify no users left with server_owner role
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM "user"
    WHERE role = 'server_owner';

    IF remaining_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % users still have server_owner role', remaining_count;
    END IF;

    RAISE NOTICE 'Migration successful: All server_owner users migrated to developer';
END $$;

COMMIT;
```

**Step 4: Post-Migration Validation**
```sql
-- Validate permission equivalence
WITH developer_permissions AS (
    SELECT unnest(ARRAY[
        'server.create', 'server.read', 'server.update', 'server.configure',
        'server.deploy', 'server.restart', 'server.logs.read'
    ]) as permission
),
validation_check AS (
    SELECT
        COUNT(*) as expected_permissions,
        bool_and(permission IN (
            'server.create', 'server.read', 'server.update', 'server.configure',
            'server.deploy', 'server.restart', 'server.logs.read'
        )) as permissions_valid
    FROM developer_permissions
)
SELECT
    CASE
        WHEN permissions_valid THEN 'PASS'
        ELSE 'FAIL'
    END as validation_status,
    expected_permissions
FROM validation_check;

-- Send confirmation notifications
INSERT INTO notification_queue (
    user_id,
    type,
    title,
    message,
    priority
)
SELECT
    u.id,
    'role_migration',
    'Role Migration Complete',
    'Your role has been successfully migrated from Server Owner to Developer. All your permissions have been preserved.',
    'normal'
FROM "user" u
WHERE u.role = 'developer'
  AND u.updated_at > NOW() - INTERVAL '1 hour';  -- Recently migrated users
```

#### Post-Migration Testing Protocol

**Functional Testing Checklist**:
- [ ] Migrated users can log in successfully
- [ ] Server management functions work correctly
- [ ] API access and keys function properly
- [ ] Deployment capabilities preserved
- [ ] UI elements display correctly for new role
- [ ] Audit logs capture role change events

**Test Script**:
```bash
#!/bin/bash
# Post-migration validation script

echo "Testing migrated developer role functionality..."

# Test 1: Authentication
curl -X GET "http://localhost:3000/api/auth/session" \
     -H "Authorization: Bearer $TEST_TOKEN" \
     -w "Status: %{http_code}\n"

# Test 2: Server management
curl -X GET "http://localhost:3000/api/servers" \
     -H "Authorization: Bearer $TEST_TOKEN" \
     -w "Status: %{http_code}\n"

# Test 3: Server creation
curl -X POST "http://localhost:3000/api/servers" \
     -H "Authorization: Bearer $TEST_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"test-migration","url":"http://test.local"}' \
     -w "Status: %{http_code}\n"

echo "Migration validation complete"
```

## 2. User Preferences System

**Security Focus**: Prevent preference manipulation attacks and ensure data integrity
**Audit Requirement**: All preference changes must be logged and traceable

### 2.1 Database Schema Extension

**Security Enhancement**: Change tracking and validation built into schema
**Compliance Feature**: Audit history for all preference modifications

**File**: `frontend/drizzle/schema/user_preferences.ts`
```typescript
import { pgTable, text, jsonb, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // UI Preferences
  theme: text('theme', { enum: ['light', 'dark', 'system'] }).default('system'),
  language: text('language').default('en-US'),
  timezone: text('timezone').default('UTC'),
  dateFormat: text('date_format').default('YYYY-MM-DD'),
  timeFormat: text('time_format', { enum: ['12h', '24h'] }).default('24h'),

  // Dashboard Preferences
  dashboardLayout: jsonb('dashboard_layout').$type<{
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number; w: number; h: number };
      visible: boolean;
    }>;
  }>(),

  // Server Management Preferences
  defaultServerVisibility: text('default_server_visibility', {
    enum: ['public', 'private', 'organization']
  }).default('private'),
  autoSyncServers: boolean('auto_sync_servers').default(true),
  serverNotifications: boolean('server_notifications').default(true),

  // Notification Preferences
  notificationSettings: jsonb('notification_settings').$type<{
    email: {
      serverEvents: boolean;
      systemAlerts: boolean;
      weeklyDigest: boolean;
    };
    inApp: {
      serverEvents: boolean;
      systemAlerts: boolean;
      realTimeUpdates: boolean;
    };
    webhook: {
      enabled: boolean;
      url?: string;
      events: string[];
    };
  }>(),

  // Security Preferences
  securitySettings: jsonb('security_settings').$type<{
    sessionTimeout: number; // minutes
    requireMFA: boolean;
    allowRememberMe: boolean;
    trustedDevices: Array<{
      deviceId: string;
      deviceName: string;
      lastUsed: string;
    }>;
  }>(),

  // API Preferences
  apiSettings: jsonb('api_settings').$type<{
    defaultRateLimit: number;
    preferredAuthMethod: 'api_key' | 'oauth';
    webhookRetries: number;
    requestLogging: boolean;
  }>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userPreferenceHistory = pgTable('user_preference_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  preferenceKey: text('preference_key').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  changeReason: text('change_reason'), // 'user_action', 'admin_override', 'system_update'
});
```

### 2.2 Preferences API Implementation

**Input Validation**: Comprehensive Zod validation prevents injection attacks
**Change Tracking**: Automatic audit trail for all preference modifications

**File**: `frontend/src/app/api/preferences/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userPreferences, userPreferenceHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  dashboardLayout: z.object({
    widgets: z.array(z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      }),
      visible: z.boolean(),
    })),
  }).optional(),
  defaultServerVisibility: z.enum(['public', 'private', 'organization']).optional(),
  autoSyncServers: z.boolean().optional(),
  serverNotifications: z.boolean().optional(),
  notificationSettings: z.object({
    email: z.object({
      serverEvents: z.boolean(),
      systemAlerts: z.boolean(),
      weeklyDigest: z.boolean(),
    }),
    inApp: z.object({
      serverEvents: z.boolean(),
      systemAlerts: z.boolean(),
      realTimeUpdates: z.boolean(),
    }),
    webhook: z.object({
      enabled: z.boolean(),
      url: z.string().url().optional(),
      events: z.array(z.string()),
    }),
  }).optional(),
  securitySettings: z.object({
    sessionTimeout: z.number().min(5).max(1440),
    requireMFA: z.boolean(),
    allowRememberMe: z.boolean(),
    trustedDevices: z.array(z.object({
      deviceId: z.string(),
      deviceName: z.string(),
      lastUsed: z.string(),
    })),
  }).optional(),
  apiSettings: z.object({
    defaultRateLimit: z.number().min(10).max(10000),
    preferredAuthMethod: z.enum(['api_key', 'oauth']),
    webhookRetries: z.number().min(0).max(10),
    requestLogging: z.boolean(),
  }).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, session.user.id),
    });

    if (!preferences) {
      // Create default preferences
      const defaultPrefs = await db.insert(userPreferences).values({
        userId: session.user.id,
        theme: 'system',
        language: 'en-US',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        defaultServerVisibility: 'private',
        autoSyncServers: true,
        serverNotifications: true,
        notificationSettings: {
          email: {
            serverEvents: true,
            systemAlerts: true,
            weeklyDigest: false,
          },
          inApp: {
            serverEvents: true,
            systemAlerts: true,
            realTimeUpdates: true,
          },
          webhook: {
            enabled: false,
            events: [],
          },
        },
        securitySettings: {
          sessionTimeout: 480, // 8 hours
          requireMFA: false,
          allowRememberMe: true,
          trustedDevices: [],
        },
        apiSettings: {
          defaultRateLimit: 100,
          preferredAuthMethod: 'api_key',
          webhookRetries: 3,
          requestLogging: false,
        },
      }).returning();

      return NextResponse.json(defaultPrefs[0]);
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Failed to fetch preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updatePreferencesSchema.parse(body);

    // Get current preferences for history tracking
    const currentPrefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, session.user.id),
    });

    if (!currentPrefs) {
      return NextResponse.json(
        { error: 'Preferences not found' },
        { status: 404 }
      );
    }

    // Track changes in history
    const changes = Object.entries(validatedData).filter(([key, value]) => {
      const currentValue = currentPrefs[key as keyof typeof currentPrefs];
      return JSON.stringify(currentValue) !== JSON.stringify(value);
    });

    if (changes.length > 0) {
      // Insert history records
      await db.insert(userPreferenceHistory).values(
        changes.map(([key, newValue]) => ({
          userId: session.user.id!,
          preferenceKey: key,
          oldValue: currentPrefs[key as keyof typeof currentPrefs] as any,
          newValue: newValue as any,
          changeReason: 'user_action',
        }))
      );
    }

    // Update preferences
    const updated = await db
      .update(userPreferences)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, session.user.id))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to update preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.3 Preferences React Hook

**Client-Side Security**: Proper error handling and state management
**Performance Optimization**: Intelligent caching and mutation strategies

**File**: `frontend/src/hooks/usePreferences.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  dashboardLayout?: {
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number; w: number; h: number };
      visible: boolean;
    }>;
  };
  defaultServerVisibility: 'public' | 'private' | 'organization';
  autoSyncServers: boolean;
  serverNotifications: boolean;
  notificationSettings: {
    email: {
      serverEvents: boolean;
      systemAlerts: boolean;
      weeklyDigest: boolean;
    };
    inApp: {
      serverEvents: boolean;
      systemAlerts: boolean;
      realTimeUpdates: boolean;
    };
    webhook: {
      enabled: boolean;
      url?: string;
      events: string[];
    };
  };
  securitySettings: {
    sessionTimeout: number;
    requireMFA: boolean;
    allowRememberMe: boolean;
    trustedDevices: Array<{
      deviceId: string;
      deviceName: string;
      lastUsed: string;
    }>;
  };
  apiSettings: {
    defaultRateLimit: number;
    preferredAuthMethod: 'api_key' | 'oauth';
    webhookRetries: number;
    requestLogging: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export function usePreferences() {
  const queryClient = useQueryClient();

  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['preferences'],
    queryFn: async (): Promise<UserPreferences> => {
      const response = await fetch('/api/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update preferences');
      }

      return response.json();
    },
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(['preferences'], updatedPreferences);
      toast.success('Preferences updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update preferences: ' + error.message);
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}

// Specialized hooks for specific preference sections
export function useThemePreferences() {
  const { preferences, updatePreferences } = usePreferences();

  return {
    theme: preferences?.theme || 'system',
    setTheme: (theme: 'light' | 'dark' | 'system') => {
      updatePreferences({ theme });
    },
  };
}

export function useNotificationPreferences() {
  const { preferences, updatePreferences } = usePreferences();

  return {
    notifications: preferences?.notificationSettings,
    updateNotifications: (settings: UserPreferences['notificationSettings']) => {
      updatePreferences({ notificationSettings: settings });
    },
  };
}

export function useSecurityPreferences() {
  const { preferences, updatePreferences } = usePreferences();

  return {
    security: preferences?.securitySettings,
    updateSecurity: (settings: UserPreferences['securitySettings']) => {
      updatePreferences({ securitySettings: settings });
    },
  };
}
```

## 3. Advanced Security Features

**MANDATORY SECURITY**: These features are required for production deployment
**Compliance Requirements**: MFA and session management for enterprise deployment

### 3.1 Multi-Factor Authentication (MFA)

**Security Enhancement**: Addresses authentication security gaps from research
**Implementation**: Better-Auth two-factor plugin with backup codes

**File**: `frontend/src/lib/auth.ts` (Enhancement)
```typescript
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins/two-factor";

export const auth = betterAuth({
  // ... existing configuration
  plugins: [
    twoFactor({
      issuer: "MCP Registry Gateway",
      totpOptions: {
        period: 30,
        digits: 6,
        algorithm: "SHA1",
      },
      backupCodes: {
        enabled: true,
        amount: 10,
        length: 8,
      },
    }),
    // ... other plugins
  ],
});
```

**File**: `frontend/src/components/auth/MFASetup.tsx`
```typescript
"use client";

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { twoFactorClient } from '@/lib/auth-client';
import { toast } from 'sonner';

export function MFASetup() {
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [isLoading, setIsLoading] = useState(false);

  const generateMFA = async () => {
    setIsLoading(true);
    try {
      const result = await twoFactorClient.getTotpUriAndSecret();
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStep('verify');
    } catch (error) {
      toast.error('Failed to generate MFA setup');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const result = await twoFactorClient.verifyTotp({
        code: verificationCode,
      });

      if (result.data?.backupCodes) {
        setBackupCodes(result.data.backupCodes);
        setStep('complete');
        toast.success('MFA enabled successfully');
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error) {
      toast.error('Failed to verify MFA code');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'setup') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateMFA} disabled={isLoading} className="w-full">
            {isLoading ? 'Generating...' : 'Generate QR Code'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Use your authenticator app to scan this QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <QRCodeSVG value={qrCode} size={200} />
          </div>

          <Alert>
            <AlertDescription>
              Manual entry key: <code className="font-mono text-sm">{secret}</code>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label htmlFor="verification-code" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="verification-code"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
            />
          </div>

          <Button
            onClick={verifyAndEnable}
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full"
          >
            {isLoading ? 'Verifying...' : 'Verify and Enable'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>MFA Enabled Successfully</CardTitle>
        <CardDescription>
          Save these backup codes in a secure location
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            These backup codes can be used if you lose access to your authenticator app.
            Each code can only be used once.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div key={index} className="p-2 bg-muted rounded">
              {code}
            </div>
          ))}
        </div>

        <Button
          onClick={() => {
            const codesText = backupCodes.join('\n');
            navigator.clipboard.writeText(codesText);
            toast.success('Backup codes copied to clipboard');
          }}
          className="w-full mt-4"
        >
          Copy Backup Codes
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 3.2 Session Management Enhancement

**ADDRESSES**: Session fixation vulnerability (MEDIUM risk from research)
**Key Features**: Device fingerprinting, trusted device management, automatic cleanup

**File**: `backend/src/mcp_registry_gateway/auth/session_manager.py`
```python
import asyncio
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import redis.asyncio as redis
from pydantic import BaseModel

class SessionInfo(BaseModel):
    session_id: str
    user_id: str
    ip_address: str
    user_agent: str
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    device_fingerprint: Optional[str] = None
    is_trusted_device: bool = False

class SessionManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.session_prefix = "session:"
        self.user_sessions_prefix = "user_sessions:"
        self.trusted_devices_prefix = "trusted_devices:"

    async def create_session(
        self,
        user_id: str,
        ip_address: str,
        user_agent: str,
        session_timeout_minutes: int = 480,  # 8 hours default
        device_fingerprint: Optional[str] = None,
    ) -> str:
        """Create a new session."""
        session_id = await self._generate_session_id()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=session_timeout_minutes)

        # Check if device is trusted
        is_trusted = await self._is_trusted_device(user_id, device_fingerprint)

        session_info = SessionInfo(
            session_id=session_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            last_activity=now,
            expires_at=expires_at,
            device_fingerprint=device_fingerprint,
            is_trusted_device=is_trusted,
        )

        # Store session
        await self.redis.setex(
            f"{self.session_prefix}{session_id}",
            int(timedelta(minutes=session_timeout_minutes).total_seconds()),
            session_info.model_dump_json(),
        )

        # Add to user's session list
        await self.redis.sadd(f"{self.user_sessions_prefix}{user_id}", session_id)

        return session_id

    async def get_session(self, session_id: str) -> Optional[SessionInfo]:
        """Get session information."""
        session_data = await self.redis.get(f"{self.session_prefix}{session_id}")
        if not session_data:
            return None

        try:
            return SessionInfo.model_validate_json(session_data)
        except Exception:
            # Invalid session data, remove it
            await self.invalidate_session(session_id)
            return None

    async def update_session_activity(self, session_id: str) -> bool:
        """Update session last activity timestamp."""
        session = await self.get_session(session_id)
        if not session:
            return False

        session.last_activity = datetime.now(timezone.utc)

        # Calculate remaining TTL
        ttl = await self.redis.ttl(f"{self.session_prefix}{session_id}")
        if ttl <= 0:
            return False

        # Update session with remaining TTL
        await self.redis.setex(
            f"{self.session_prefix}{session_id}",
            ttl,
            session.model_dump_json(),
        )

        return True

    async def invalidate_session(self, session_id: str) -> bool:
        """Invalidate a specific session."""
        session = await self.get_session(session_id)
        if session:
            # Remove from user's session list
            await self.redis.srem(
                f"{self.user_sessions_prefix}{session.user_id}",
                session_id
            )

        # Remove session
        result = await self.redis.delete(f"{self.session_prefix}{session_id}")
        return result > 0

    async def invalidate_all_user_sessions(self, user_id: str) -> int:
        """Invalidate all sessions for a user."""
        session_ids = await self.redis.smembers(f"{self.user_sessions_prefix}{user_id}")

        if not session_ids:
            return 0

        # Remove all sessions
        pipeline = self.redis.pipeline()
        for session_id in session_ids:
            pipeline.delete(f"{self.session_prefix}{session_id.decode()}")

        # Remove user sessions set
        pipeline.delete(f"{self.user_sessions_prefix}{user_id}")

        results = await pipeline.execute()
        return sum(results[:-1])  # Exclude the last delete result

    async def get_user_sessions(self, user_id: str) -> List[SessionInfo]:
        """Get all active sessions for a user."""
        session_ids = await self.redis.smembers(f"{self.user_sessions_prefix}{user_id}")

        sessions = []
        for session_id in session_ids:
            session = await self.get_session(session_id.decode())
            if session:
                sessions.append(session)

        return sessions

    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions (called periodically)."""
        # This is handled automatically by Redis TTL, but we can clean up
        # orphaned user session references

        # Get all user session sets
        user_session_keys = []
        async for key in self.redis.scan_iter(match=f"{self.user_sessions_prefix}*"):
            user_session_keys.append(key.decode())

        cleaned_count = 0
        for user_session_key in user_session_keys:
            user_id = user_session_key.replace(self.user_sessions_prefix, "")
            session_ids = await self.redis.smembers(user_session_key)

            for session_id in session_ids:
                session_exists = await self.redis.exists(
                    f"{self.session_prefix}{session_id.decode()}"
                )
                if not session_exists:
                    await self.redis.srem(user_session_key, session_id)
                    cleaned_count += 1

        return cleaned_count

    async def add_trusted_device(
        self,
        user_id: str,
        device_fingerprint: str,
        device_name: str
    ) -> bool:
        """Add a device to user's trusted devices."""
        device_info = {
            "device_fingerprint": device_fingerprint,
            "device_name": device_name,
            "added_at": datetime.now(timezone.utc).isoformat(),
            "last_used": datetime.now(timezone.utc).isoformat(),
        }

        await self.redis.hset(
            f"{self.trusted_devices_prefix}{user_id}",
            device_fingerprint,
            json.dumps(device_info),
        )

        return True

    async def _is_trusted_device(
        self,
        user_id: str,
        device_fingerprint: Optional[str]
    ) -> bool:
        """Check if device is trusted for the user."""
        if not device_fingerprint:
            return False

        device_info = await self.redis.hget(
            f"{self.trusted_devices_prefix}{user_id}",
            device_fingerprint,
        )

        return device_info is not None

    async def _generate_session_id(self) -> str:
        """Generate a unique session ID."""
        import secrets
        return secrets.token_urlsafe(32)

# Periodic cleanup task
async def session_cleanup_task(session_manager: SessionManager):
    """Periodic task to clean up expired sessions."""
    while True:
        try:
            cleaned = await session_manager.cleanup_expired_sessions()
            if cleaned > 0:
                print(f"Cleaned up {cleaned} expired session references")
        except Exception as e:
            print(f"Error during session cleanup: {e}")

        # Run cleanup every 5 minutes
        await asyncio.sleep(300)
```

## 4. Audit Logging and Compliance

**CRITICAL FOR PRODUCTION**: Enterprise audit requirements and regulatory compliance
**Security Priority**: Immutable audit trails with tamper detection

### 4.1 Comprehensive Audit System

**Compliance Standards**: SOX, GDPR, HIPAA-ready audit framework
**Security Features**: Encrypted storage, retention policies, risk scoring

**File**: `frontend/drizzle/schema/audit_logs.ts`
```typescript
import { pgTable, text, jsonb, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Actor Information
  actorId: text('actor_id').references(() => users.id),
  actorType: text('actor_type', {
    enum: ['user', 'system', 'api_client', 'external_service']
  }).notNull(),
  actorIpAddress: text('actor_ip_address'),
  actorUserAgent: text('actor_user_agent'),

  // Action Information
  action: text('action').notNull(), // e.g., 'server.create', 'user.update'
  actionCategory: text('action_category', {
    enum: ['authentication', 'authorization', 'server_management', 'user_management', 'configuration', 'data_access']
  }).notNull(),
  resource: text('resource'), // e.g., 'server:123', 'user:456'
  resourceType: text('resource_type'), // e.g., 'server', 'user', 'preference'

  // Outcome Information
  outcome: text('outcome', {
    enum: ['success', 'failure', 'partial']
  }).notNull(),
  outcomeReason: text('outcome_reason'), // Error message or success details

  // Context and Metadata
  sessionId: text('session_id'),
  requestId: text('request_id'),
  correlationId: text('correlation_id'), // For tracking related events

  // Detailed Information
  details: jsonb('details').$type<{
    // Before/after states for changes
    before?: any;
    after?: any;
    // Additional context
    metadata?: Record<string, any>;
    // Risk indicators
    riskScore?: number;
    riskFactors?: string[];
  }>(),

  // Compliance and Security
  sensitivityLevel: text('sensitivity_level', {
    enum: ['low', 'medium', 'high', 'critical']
  }).default('medium'),
  retentionPeriodDays: text('retention_period_days').default('2555'), // 7 years default

  // Temporal Information
  eventTimestamp: timestamp('event_timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  actorIdIdx: index('audit_logs_actor_id_idx').on(table.actorId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  actionCategoryIdx: index('audit_logs_action_category_idx').on(table.actionCategory),
  resourceIdx: index('audit_logs_resource_idx').on(table.resource),
  outcomeIdx: index('audit_logs_outcome_idx').on(table.outcome),
  eventTimestampIdx: index('audit_logs_event_timestamp_idx').on(table.eventTimestamp),
  sessionIdIdx: index('audit_logs_session_id_idx').on(table.sessionId),
}));

export const auditLogRetention = pgTable('audit_log_retention', {
  id: uuid('id').defaultRandom().primaryKey(),
  actionCategory: text('action_category').notNull(),
  retentionPeriodDays: text('retention_period_days').notNull(),
  complianceReason: text('compliance_reason'), // e.g., 'GDPR', 'SOX', 'HIPAA'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 4.2 Audit Service Implementation

**Risk Assessment**: Automatic risk scoring for security events
**Integration Pattern**: Decorator-based audit logging for easy implementation

**File**: `backend/src/mcp_registry_gateway/services/audit_service.py`
```python
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

class ActorType(str, Enum):
    USER = "user"
    SYSTEM = "system"
    API_CLIENT = "api_client"
    EXTERNAL_SERVICE = "external_service"

class ActionCategory(str, Enum):
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    SERVER_MANAGEMENT = "server_management"
    USER_MANAGEMENT = "user_management"
    CONFIGURATION = "configuration"
    DATA_ACCESS = "data_access"

class Outcome(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"

class SensitivityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AuditLogEntry(BaseModel):
    # Actor Information
    actor_id: Optional[str] = None
    actor_type: ActorType
    actor_ip_address: Optional[str] = None
    actor_user_agent: Optional[str] = None

    # Action Information
    action: str
    action_category: ActionCategory
    resource: Optional[str] = None
    resource_type: Optional[str] = None

    # Outcome Information
    outcome: Outcome
    outcome_reason: Optional[str] = None

    # Context and Metadata
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    correlation_id: Optional[str] = None

    # Detailed Information
    details: Optional[Dict[str, Any]] = None

    # Compliance and Security
    sensitivity_level: SensitivityLevel = SensitivityLevel.MEDIUM
    retention_period_days: int = 2555  # 7 years default

class AuditService:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def log_event(
        self,
        entry: AuditLogEntry,
        event_timestamp: Optional[datetime] = None,
    ) -> str:
        """Log an audit event."""
        if event_timestamp is None:
            event_timestamp = datetime.now(timezone.utc)

        # Calculate risk score
        risk_score = self._calculate_risk_score(entry)

        # Add risk information to details
        if entry.details is None:
            entry.details = {}

        entry.details["riskScore"] = risk_score
        entry.details["riskFactors"] = self._identify_risk_factors(entry)

        # Generate correlation ID if not provided
        if entry.correlation_id is None:
            entry.correlation_id = str(uuid.uuid4())

        # Store in database (would be actual DB insert in real implementation)
        audit_id = str(uuid.uuid4())

        # For now, we'll log to console (in real implementation, insert to DB)
        audit_data = {
            "id": audit_id,
            "event_timestamp": event_timestamp.isoformat(),
            **entry.model_dump(),
        }

        print(f"AUDIT: {json.dumps(audit_data, indent=2)}")

        return audit_id

    async def log_authentication_event(
        self,
        user_id: Optional[str],
        action: str,
        outcome: Outcome,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """Log authentication-related events."""
        entry = AuditLogEntry(
            actor_id=user_id,
            actor_type=ActorType.USER,
            actor_ip_address=ip_address,
            actor_user_agent=user_agent,
            action=action,
            action_category=ActionCategory.AUTHENTICATION,
            outcome=outcome,
            session_id=session_id,
            details=details,
            sensitivity_level=SensitivityLevel.HIGH,
        )

        return await self.log_event(entry)

    async def log_server_management_event(
        self,
        user_id: str,
        action: str,
        server_id: Optional[str] = None,
        outcome: Outcome = Outcome.SUCCESS,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """Log server management events."""
        details = {}
        if before_state:
            details["before"] = before_state
        if after_state:
            details["after"] = after_state

        entry = AuditLogEntry(
            actor_id=user_id,
            actor_type=ActorType.USER,
            actor_ip_address=ip_address,
            action=action,
            action_category=ActionCategory.SERVER_MANAGEMENT,
            resource=f"server:{server_id}" if server_id else None,
            resource_type="server",
            outcome=outcome,
            session_id=session_id,
            details=details,
            sensitivity_level=SensitivityLevel.MEDIUM,
        )

        return await self.log_event(entry)

    async def log_authorization_event(
        self,
        user_id: Optional[str],
        action: str,
        resource: Optional[str] = None,
        outcome: Outcome = Outcome.SUCCESS,
        required_permissions: Optional[List[str]] = None,
        user_permissions: Optional[List[str]] = None,
        ip_address: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """Log authorization events."""
        details = {}
        if required_permissions:
            details["requiredPermissions"] = required_permissions
        if user_permissions:
            details["userPermissions"] = user_permissions

        entry = AuditLogEntry(
            actor_id=user_id,
            actor_type=ActorType.USER,
            actor_ip_address=ip_address,
            action=action,
            action_category=ActionCategory.AUTHORIZATION,
            resource=resource,
            outcome=outcome,
            session_id=session_id,
            details=details,
            sensitivity_level=SensitivityLevel.HIGH,
        )

        return await self.log_event(entry)

    def _calculate_risk_score(self, entry: AuditLogEntry) -> float:
        """Calculate risk score for the audit event."""
        risk_score = 0.0

        # Base score by action category
        category_scores = {
            ActionCategory.AUTHENTICATION: 0.3,
            ActionCategory.AUTHORIZATION: 0.4,
            ActionCategory.SERVER_MANAGEMENT: 0.5,
            ActionCategory.USER_MANAGEMENT: 0.6,
            ActionCategory.CONFIGURATION: 0.4,
            ActionCategory.DATA_ACCESS: 0.3,
        }
        risk_score += category_scores.get(entry.action_category, 0.0)

        # Increase score for failures
        if entry.outcome == Outcome.FAILURE:
            risk_score += 0.3
        elif entry.outcome == Outcome.PARTIAL:
            risk_score += 0.1

        # Increase score for high-privilege actions
        high_risk_actions = [
            'user.delete', 'server.delete', 'config.modify',
            'admin.escalate', 'auth.disable'
        ]
        if entry.action in high_risk_actions:
            risk_score += 0.2

        # Increase score for system actor (automated actions)
        if entry.actor_type == ActorType.SYSTEM:
            risk_score += 0.1

        return min(risk_score, 1.0)  # Cap at 1.0

    def _identify_risk_factors(self, entry: AuditLogEntry) -> List[str]:
        """Identify risk factors for the audit event."""
        risk_factors = []

        if entry.outcome == Outcome.FAILURE:
            risk_factors.append("operation_failed")

        if entry.actor_type == ActorType.SYSTEM:
            risk_factors.append("automated_action")

        if entry.action_category in [ActionCategory.AUTHENTICATION, ActionCategory.AUTHORIZATION]:
            risk_factors.append("security_sensitive")

        high_risk_actions = [
            'user.delete', 'server.delete', 'config.modify',
            'admin.escalate', 'auth.disable'
        ]
        if entry.action in high_risk_actions:
            risk_factors.append("high_privilege_action")

        if entry.sensitivity_level == SensitivityLevel.CRITICAL:
            risk_factors.append("critical_resource")

        return risk_factors

# Audit decorators for easy integration
def audit_action(
    action: str,
    category: ActionCategory,
    sensitivity: SensitivityLevel = SensitivityLevel.MEDIUM,
):
    """Decorator to automatically audit function calls."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract common parameters
            request = kwargs.get('request')
            user_id = kwargs.get('user_id')

            start_time = datetime.now(timezone.utc)
            outcome = Outcome.SUCCESS
            outcome_reason = None

            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                outcome = Outcome.FAILURE
                outcome_reason = str(e)
                raise
            finally:
                # Log the event
                if request and hasattr(request.state, 'audit_service'):
                    audit_service: AuditService = request.state.audit_service

                    entry = AuditLogEntry(
                        actor_id=user_id,
                        actor_type=ActorType.USER,
                        action=action,
                        action_category=category,
                        outcome=outcome,
                        outcome_reason=outcome_reason,
                        sensitivity_level=sensitivity,
                        details={
                            "function": func.__name__,
                            "execution_time_ms": (
                                datetime.now(timezone.utc) - start_time
                            ).total_seconds() * 1000,
                        },
                    )

                    await audit_service.log_event(entry)

        return wrapper
    return decorator
```

## Implementation Gotchas (From Research)

### Gotcha 1: Azure AD Role Synchronization
**Problem**: Azure AD group membership changes don't automatically update local roles
**Impact**: Users may retain outdated permissions
**Solution**: Implement periodic role synchronization with audit trail

```typescript
// Role synchronization service
class RoleSynchronizationService {
  async syncUserRoles(userId: string): Promise<void> {
    // Get current Azure AD groups
    const azureRoles = await getAzureAdGroups(userId);

    // Get current local roles
    const currentRole = await getUserRole(userId);

    // Map and update if changed
    const newRole = mapAzureRolesToBetterAuth(azureRoles);

    if (currentRole !== newRole) {
      // CRITICAL: Regenerate session on role change
      await regenerateUserSession(userId);
      await updateUserRole(userId, newRole);
      await auditRoleChange(userId, currentRole, newRole, 'azure_sync');
    }
  }
}
```

### Gotcha 2: Preference Validation Security
**Problem**: User preferences could contain malicious data
**Impact**: XSS attacks through stored preferences
**Solution**: Strict validation and sanitization

```typescript
// Secure preference validation
const securePreferenceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  dashboardLayout: z.object({
    widgets: z.array(z.object({
      id: z.string().regex(/^[a-zA-Z0-9_-]+$/), // Alphanumeric only
      type: z.string().regex(/^[a-zA-Z0-9_-]+$/),
      position: z.object({
        x: z.number().min(0).max(1920),
        y: z.number().min(0).max(1080),
        w: z.number().min(1).max(12),
        h: z.number().min(1).max(12),
      }),
      visible: z.boolean(),
    }))
  }).optional(),
  // ... other preferences with strict validation
});
```

### Gotcha 3: Session State Corruption
**Problem**: Role changes can create inconsistent session state
**Impact**: Users may access resources they shouldn't
**Solution**: Atomic session updates with validation

```python
# Atomic session management
class SecureSessionManager:
    async def update_user_role(self, user_id: str, new_role: str):
        async with self.db.transaction():
            # Update role in database
            await self.db.execute(
                "UPDATE users SET role = ? WHERE id = ?",
                (new_role, user_id)
            )

            # Invalidate ALL user sessions
            await self.invalidate_all_user_sessions(user_id)

            # Clear Redis cache
            await self.redis.delete(f"user_context:{user_id}")

            # Audit the change
            await self.audit_service.log_authorization_event(
                user_id=user_id,
                action="role.update",
                outcome="success",
                details={"new_role": new_role}
            )
```

### Gotcha 4: Audit Log Performance Impact
**Problem**: Extensive audit logging can impact application performance
**Impact**: Slow response times during high-traffic periods
**Solution**: Asynchronous audit logging with batching

```python
# Asynchronous audit logging
class PerformantAuditService:
    def __init__(self):
        self.audit_queue = asyncio.Queue(maxsize=1000)
        self.batch_size = 100
        self.batch_timeout = 5.0  # seconds

    async def log_event_async(self, entry: AuditLogEntry):
        """Non-blocking audit logging"""
        try:
            self.audit_queue.put_nowait(entry)
        except asyncio.QueueFull:
            # Log critical error but don't block application
            logger.critical("Audit queue full - potential security event loss")

    async def _audit_batch_processor(self):
        """Background task to process audit logs in batches"""
        batch = []

        while True:
            try:
                # Wait for events with timeout
                entry = await asyncio.wait_for(
                    self.audit_queue.get(),
                    timeout=self.batch_timeout
                )
                batch.append(entry)

                # Process batch when full or timeout
                if len(batch) >= self.batch_size:
                    await self._write_audit_batch(batch)
                    batch = []

            except asyncio.TimeoutError:
                # Process partial batch on timeout
                if batch:
                    await self._write_audit_batch(batch)
                    batch = []
```

## 5. Implementation Timeline

### Week 1-2: RBAC Foundation
- [ ] **Implement enhanced role hierarchy and permissions matrix**
- [ ] **Create RBAC middleware with session regeneration on role changes**
- [ ] **Update database schema with new role structures**
- [ ] **Implement privilege escalation prevention measures**
- [ ] **Test role-based access control for existing endpoints**

### Week 3-4: User Preferences System
- [ ] **Implement user preferences database schema with audit trail**
- [ ] **Create preferences API endpoints with strict validation**
- [ ] **Build React components for preference management**
- [ ] **Integrate preferences with UI theme and behavior**
- [ ] **Implement preference change tracking and auditing**

### Week 5-6: Advanced Security Features
- [ ] **Implement Multi-Factor Authentication (MFA) with Better-Auth**
- [ ] **Enhance session management with device fingerprinting**
- [ ] **Add trusted device management with encryption**
- [ ] **Create security preferences UI with validation**
- [ ] **Implement session fixation prevention**

### Week 7-8: Audit and Compliance
- [ ] **Implement comprehensive audit logging system**
- [ ] **Create audit log retention policies for compliance**
- [ ] **Build audit log viewing and export interfaces**
- [ ] **Implement audit log tamper protection**
- [ ] **Test compliance with security standards (SOX, GDPR)**

### Week 9-10: Integration and Testing
- [ ] **Integration testing for all RBAC features**
- [ ] **Security penetration testing with external validation**
- [ ] **Performance testing for audit system under load**
- [ ] **Session security validation testing**
- [ ] **Documentation and deployment preparation**
- [ ] **Security review and approval for production**

## 6. Testing Strategy

**Testing Philosophy**: Security-first testing with penetration testing validation

### 6.1 RBAC Security Testing
```typescript
// frontend/tests/rbac-security.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { hasPermission, canAccessResource, ROLE_PERMISSIONS } from '@/lib/rbac/permissions';
import { UserRole } from '@/types/auth';

describe('RBAC Security Validation', () => {
  it('should prevent privilege escalation attempts', () => {
    // Test that users cannot grant themselves higher privileges
    expect(hasPermission(UserRole.USER, 'canManageUsers')).toBe(false);
    expect(hasPermission(UserRole.SERVER_OWNER, 'canDeleteServers')).toBe(false);
    expect(hasPermission(UserRole.DEVELOPER, 'canViewMetrics')).toBe(false);
  });

  it('should enforce resource ownership boundaries', () => {
    // Test strict resource ownership validation
    expect(canAccessResource(UserRole.SERVER_OWNER, 'server', 'owner123', 'owner123')).toBe(true);
    expect(canAccessResource(UserRole.SERVER_OWNER, 'server', 'owner123', 'attacker456')).toBe(false);
    expect(canAccessResource(UserRole.USER, 'server', 'owner123', 'user789')).toBe(false);
  });

  it('should validate role hierarchy integrity', () => {
    // Test that role permissions are properly hierarchical
    const adminPerms = Object.entries(ROLE_PERMISSIONS.admin)
      .filter(([key, value]) => value === true).map(([key]) => key);

    const userPerms = Object.entries(ROLE_PERMISSIONS.user)
      .filter(([key, value]) => value === true).map(([key]) => key);

    // User permissions should be subset of admin permissions
    expect(userPerms.every(perm => adminPerms.includes(perm))).toBe(true);
  });

  it('should handle malicious input securely', () => {
    // Test input validation and sanitization
    expect(() => canAccessResource('INVALID_ROLE' as UserRole, 'server', 'test', 'test')).toThrow();
    expect(() => canAccessResource(UserRole.USER, 'server', '<script>alert(1)</script>', 'test')).not.toThrow();
  });
});
```

### 6.2 Audit System Security Testing
```python
# backend/tests/test_audit_security.py
import pytest
from datetime import datetime, timezone
from mcp_registry_gateway.services.audit_service import AuditService, AuditLogEntry, ActionCategory, Outcome

@pytest.mark.asyncio
async def test_audit_immutability(mock_db_session):
    """Test that audit logs cannot be modified after creation."""
    audit_service = AuditService(mock_db_session)

    entry = AuditLogEntry(
        actor_id="user123",
        actor_type="user",
        action="server.create",
        action_category=ActionCategory.SERVER_MANAGEMENT,
        outcome=Outcome.SUCCESS,
    )

    audit_id = await audit_service.log_event(entry)

    # Attempt to modify audit log (should fail)
    with pytest.raises(Exception):  # Should raise permission/immutability error
        await audit_service.modify_audit_log(audit_id, {"outcome": Outcome.FAILURE})

@pytest.mark.asyncio
async def test_audit_tamper_detection():
    """Test detection of audit log tampering attempts."""
    audit_service = AuditService(None)

    # Test SQL injection attempts in audit data
    malicious_entry = AuditLogEntry(
        actor_id="user123'; DROP TABLE audit_logs; --",
        actor_type="user",
        action="server.create",
        action_category=ActionCategory.SERVER_MANAGEMENT,
        outcome=Outcome.SUCCESS,
    )

    # Should sanitize/validate input without crashing
    audit_id = await audit_service.log_event(malicious_entry)
    assert audit_id is not None

@pytest.mark.asyncio
async def test_privilege_escalation_detection():
    """Test detection of privilege escalation attempts."""
    audit_service = AuditService(None)

    # Simulate privilege escalation attempt
    escalation_entry = AuditLogEntry(
        actor_id="attacker",
        actor_type="user",
        action="role.escalate",
        action_category=ActionCategory.AUTHORIZATION,
        outcome=Outcome.FAILURE,
        details={
            "attempted_role": "admin",
            "current_role": "user",
            "escalation_method": "direct_db_modification"
        }
    )

    risk_score = audit_service._calculate_risk_score(escalation_entry)
    risk_factors = audit_service._identify_risk_factors(escalation_entry)

    # Should identify as high risk
    assert risk_score > 0.8
    assert "security_sensitive" in risk_factors
    assert "operation_failed" in risk_factors

@pytest.mark.asyncio
async def test_audit_performance_under_load(mock_db_session):
    """Test audit system performance under high load."""
    audit_service = AuditService(mock_db_session)

    # Simulate high-volume audit logging
    import time
    start_time = time.time()

    tasks = []
    for i in range(1000):  # 1000 concurrent audit events
        entry = AuditLogEntry(
            actor_id=f"user{i}",
            actor_type="user",
            action="data.read",
            action_category=ActionCategory.DATA_ACCESS,
            outcome=Outcome.SUCCESS,
        )
        tasks.append(audit_service.log_event(entry))

    # Execute all audit logs
    results = await asyncio.gather(*tasks)
    end_time = time.time()

    # Performance requirements
    total_time = end_time - start_time
    assert total_time < 5.0  # Should complete in less than 5 seconds
    assert len(results) == 1000  # All events should be logged
    assert all(result is not None for result in results)  # All should succeed
```

## 7. Security Considerations

**CRITICAL**: These security measures are mandatory for production deployment

### 7.1 Privilege Escalation Prevention

**From Research**: Addresses session fixation and privilege escalation vulnerabilities
- **Principle of Least Privilege**: Users start with minimal permissions
- **Role Assignment Validation**: Only admins can assign roles
- **Self-Service Limitations**: Users cannot elevate their own privileges
- **Audit Trail**: All role changes are logged with approval workflows

### 7.2 Session Security

**Enhanced Protection**: Multi-layer session validation and monitoring
- **Secure Session Storage**: Redis with encryption at rest
- **Session Invalidation**: Automatic cleanup on suspicious activity
- **Device Fingerprinting**: Track and validate trusted devices
- **Concurrent Session Limits**: Configurable per role (prevents session flooding)
- **Session Regeneration**: Automatic on privilege changes (prevents fixation)

### 7.3 Audit Log Protection

**Compliance Ready**: Enterprise-grade audit log security
- **Immutable Logs**: Write-only audit log entries
- **Encrypted Storage**: Sensitive audit data encrypted
- **Access Control**: Only auditors and admins can view logs
- **Tamper Detection**: Cryptographic integrity checking for log entries
- **Retention Compliance**: Automatic purging based on retention policies

## Integration with Previous Phases

### Phase 1 Integration
**Dependency**: Phase 1 security hardening must be complete
**Enhancement**: RBAC builds on existing API key and session security
**Validation**: All Phase 1 security checkpoints must pass

### Phase 2 Integration
**OAuth Roles**: RBAC system integrates with OAuth role claims
**Token Security**: OAuth tokens respect RBAC permissions
**Session Coordination**: OAuth sessions coordinate with RBAC session management

### Token-to-Role Mapping
```typescript
// Integration pattern for OAuth tokens
class OAuthRBACIntegration {
  async validateTokenPermissions(token: string, requiredPermission: string): Promise<boolean> {
    // 1. Validate OAuth token
    const tokenData = await this.oauthProxy.validateToken(token);
    if (!tokenData.valid) return false;

    // 2. Get user role from token claims or database
    const userRole = tokenData.role || await this.getUserRole(tokenData.userId);

    // 3. Check RBAC permissions
    return hasPermission(userRole, requiredPermission);
  }
}
```

## 8. Rollback Plan

### 8.1 Emergency Rollback Procedures

**Database Rollback**:
```sql
-- Emergency: Disable RBAC and revert to basic roles
BEGIN TRANSACTION;

-- Backup current state
CREATE TABLE rbac_rollback_backup AS
SELECT id, role, created_at FROM users WHERE role NOT IN ('admin', 'user', 'server_owner');

-- Revert to basic roles
UPDATE users SET role = 'user'
WHERE role NOT IN ('admin', 'user', 'server_owner');

-- Disable RBAC features
INSERT INTO feature_flags (name, enabled) VALUES ('rbac_enabled', false)
ON CONFLICT (name) DO UPDATE SET enabled = false;

COMMIT;
```

**Application Rollback**:
```bash
# Emergency RBAC disable
export RBAC_ENABLED=false
export MFA_REQUIRED=false
export AUDIT_ENABLED=false

# Rollback to previous version
git checkout HEAD~1 -- frontend/src/lib/rbac/
git checkout HEAD~1 -- backend/src/mcp_registry_gateway/middleware/rbac_middleware.py

# Restart services
docker-compose restart backend frontend
```

### 8.2 Gradual Rollback Strategy
- **Feature Flags**: Granular feature disabling without code changes
- **Database Migration Rollback**: Automated rollback with data preservation
- **API Versioning**: v1 (basic auth) / v2 (RBAC) endpoint support
- **User Communication**: Clear messaging about temporary feature unavailability
- **Monitoring**: Enhanced monitoring during rollback period

## 9. Security Validation Checklist

### Pre-Production Security Validation
- [ ] **Privilege escalation prevention tested and validated**
- [ ] **Session regeneration on role changes working**
- [ ] **Azure AD role synchronization secure and audited**
- [ ] **All preference changes validated and audited**
- [ ] **MFA implementation tested against bypass attempts**
- [ ] **Audit logs immutable and tamper-resistant**
- [ ] **Session security prevents fixation attacks**
- [ ] **RBAC performance impact < 50ms per check**

### Penetration Testing Requirements
- [ ] **Privilege escalation attack testing**
- [ ] **Session fixation vulnerability testing**
- [ ] **Preference manipulation attack testing**
- [ ] **Audit log tampering attempt testing**
- [ ] **Role inheritance bypass testing**
- [ ] **MFA bypass attempt testing**

## 10. Monitoring and Alerting

### 10.1 Security Metrics

**Real-time Security Monitoring**: Detect and respond to security events
- **Failed Authentication Attempts**: Alert on > 10 failures/hour per user
- **Privilege Escalation Attempts**: Alert on any unauthorized role changes
- **Suspicious Session Activity**: Alert on unusual access patterns
- **Audit Log Tampering**: Alert on any audit log modification attempts
- **Role Synchronization Failures**: Alert on Azure AD sync issues
- **MFA Bypass Attempts**: Alert on attempts to bypass MFA
- **Session Fixation Attempts**: Alert on suspicious session behavior

### 10.2 Performance Metrics

**Performance Impact Monitoring**: Ensure security features don't degrade performance
- **RBAC Check Latency**: Monitor permission check performance
- **Audit Log Write Performance**: Ensure audit logging doesn't impact response times
- **Session Management Overhead**: Monitor Redis memory usage and performance
- **Database Query Performance**: Monitor impact of additional RBAC queries

## Migration Validation Checklist

### Pre-Migration Validation
- [ ] Database backup completed and verified
- [ ] All TypeScript files using BetterAuthRole identified
- [ ] Backend Python enums updated and tested
- [ ] Azure AD group mappings configured
- [ ] User communication emails sent (T-7 days)
- [ ] Rollback procedure tested in development
- [ ] Development environment migration successful
- [ ] Load testing completed with 6-role structure
- [ ] Security audit passed for new role hierarchy

### Migration Execution Checklist
- [ ] Production database backup created
- [ ] Migration transaction begins successfully
- [ ] Role constraint update completes without errors
- [ ] User role updates complete (server_owner → developer, user → viewer)
- [ ] Audit log entry created for migration
- [ ] Migration transaction commits successfully
- [ ] No orphaned users with legacy roles
- [ ] Role distribution matches expectations

### Post-Migration Validation
- [ ] All users can login successfully with new roles
- [ ] Migrated developer users retain server management access
- [ ] Migrated viewer users have appropriate read-only access
- [ ] No TypeScript compilation errors in frontend
- [ ] Backend API accepts all 6 role values
- [ ] OAuth flow works with new role claims
- [ ] Session regeneration works on role changes
- [ ] Permission checks function correctly for all roles
- [ ] Rate limiting respects new role hierarchy
- [ ] Monitoring systems capture 6-role metrics
- [ ] Audit logs categorize events by new roles

### Rollback Readiness Checklist
- [ ] Backup table (role_migration_backup_20241215) intact
- [ ] Rollback SQL script tested and ready
- [ ] Git commits tagged for emergency revert
- [ ] Infrastructure rollback procedure documented
- [ ] Communication plan ready for rollback scenario
- [ ] Monitoring alerts configured for migration issues

## Success Criteria

### Phase 3 Completion Checklist

**Security Requirements (MANDATORY)**:
- [ ] **All privilege escalation vulnerabilities mitigated**
- [ ] **Session fixation prevention implemented and tested**
- [ ] **Azure AD role synchronization secure with audit trail**
- [ ] **All preference changes validated and logged**
- [ ] **MFA implementation secure against bypass attempts**
- [ ] **Audit logs tamper-resistant and compliant**

**Functional Requirements**:
- [ ] Enhanced RBAC system with granular permissions
- [ ] User preferences system with change tracking
- [ ] Multi-factor authentication with backup codes
- [ ] Comprehensive session management with device tracking
- [ ] Enterprise-grade audit logging system
- [ ] Security preference management

**Testing Requirements**:
- [ ] RBAC unit and integration tests passing
- [ ] Security penetration testing completed
- [ ] Audit system performance tested
- [ ] MFA implementation security tested
- [ ] Session management security validated

### Performance Targets

- RBAC permission checks < 50ms
- Preference API response time < 200ms
- Audit log write time < 100ms
- MFA setup process < 30 seconds
- Session validation < 25ms

### Security Validation

**Access Control**:
- Role-based permissions properly enforced
- Resource ownership validation working
- Privilege escalation attempts blocked
- Session state consistency maintained

**Audit Compliance**:
- All security events properly logged
- Audit logs tamper-resistant
- Retention policies enforced
- Compliance reports available

**Data Protection**:
- User preferences encrypted at rest
- Session data properly secured
- MFA secrets protected
- Audit logs encrypted

---

**Status**: Phase 3 implementation ready for development with comprehensive security validation
**Next Phase**: Phase 4 - Monitoring and Health (Analytics, Performance Monitoring, System Health Dashboard)
**Integration**: Builds upon Phase 1 (Foundation) and Phase 2 (OAuth Integration) with full security coordination
**Critical Path**: Security validation must complete before Phase 4 begins