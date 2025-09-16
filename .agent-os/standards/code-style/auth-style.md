# Authentication Style Guide

## Context

Authentication and authorization patterns for the MCP Registry Gateway using Better-Auth, with multi-provider SSO, 6-tier RBAC, and three-layer token management.

## Architecture Overview

### Three-Layer Authentication
```
User Browser → Better-Auth JWT → Backend FastAPI → MCP Server OAuth
     ↓              ↓                  ↓              ↓
   Session      Frontend Auth      API Validation   OAuth Proxy
```

## Better-Auth Configuration

### Basic Setup
```typescript
// frontend/src/lib/auth.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/db"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, "Password Reset", url)
    }
  },
  
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET
    },
    microsoft: {
      clientId: env.AZURE_CLIENT_ID,
      clientSecret: env.AZURE_CLIENT_SECRET,
      tenant: env.AZURE_TENANT_ID
    }
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // Update every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5              // 5 minute cache
    }
  }
})
```

### Role-Based Access Control

#### 6-Tier Role Hierarchy
```typescript
// frontend/src/types/auth.ts
export enum UserRole {
  ADMIN = "admin",           // Full system access
  MANAGER = "manager",       // Team management
  DEVELOPER = "developer",   // Development tools
  ANALYST = "analyst",       // Read-only analytics
  VIEWER = "viewer",         // Basic read access
  GUEST = "guest"           // Minimal access
}

// Role hierarchy for inheritance
const ROLE_HIERARCHY = {
  admin: ["manager", "developer", "analyst", "viewer", "guest"],
  manager: ["developer", "analyst", "viewer", "guest"],
  developer: ["analyst", "viewer", "guest"],
  analyst: ["viewer", "guest"],
  viewer: ["guest"],
  guest: []
}

// Permission matrix
const PERMISSIONS = {
  "server.create": ["admin", "manager"],
  "server.update": ["admin", "manager", "developer"],
  "server.delete": ["admin"],
  "server.read": ["admin", "manager", "developer", "analyst", "viewer"],
  "user.manage": ["admin", "manager"],
  "analytics.view": ["admin", "manager", "analyst"],
  "api.full": ["admin", "developer"],
  "api.readonly": ["analyst", "viewer"]
}
```

### Azure AD Integration

#### Role Mapping
```typescript
// frontend/src/lib/auth/providers/azure.ts
function mapAzureRolesToBetterAuth(azureUser: AzureUser): UserRole {
  // Azure AD provides roles in multiple formats
  const roles = 
    azureUser.profile?.roles ||
    azureUser.profile?.appRoles ||
    azureUser.profile?.app_roles ||
    azureUser.profile?.groups ||
    []
  
  // Priority-based role assignment
  const rolePriority = {
    "admin": 6,
    "manager": 5,
    "developer": 4,
    "analyst": 3,
    "viewer": 2,
    "guest": 1
  }
  
  let highestRole = UserRole.GUEST
  let highestPriority = 1
  
  for (const role of roles) {
    const normalizedRole = role.toLowerCase()
    if (rolePriority[normalizedRole] > highestPriority) {
      highestRole = normalizedRole as UserRole
      highestPriority = rolePriority[normalizedRole]
    }
  }
  
  return highestRole
}
```

## Client-Side Protection

### Protected Routes
```typescript
// frontend/src/app/admin/layout.tsx
"use client"

import { useSession } from "@/hooks/useAuth"
import { redirect } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/loading"

export default function AdminLayout({ children }) {
  const { data: session, isLoading } = useSession()
  
  // Show loading state during auth check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }
  
  // Redirect non-admin users to dashboard
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard")
  }
  
  return <>{children}</>
}
```

### Auth Hooks
```typescript
// frontend/src/hooks/useAuth.ts
export function useAuth() {
  const { data: session, error, isLoading } = useSession()
  
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await auth.signIn.email(credentials)
      if (response.error) throw new Error(response.error)
      
      // Trigger session refresh
      await mutateSession()
      
      // Redirect based on role
      const role = response.data.user.role
      if (role === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      toast.error("Login failed")
      throw error
    }
  }, [])
  
  const logout = useCallback(async () => {
    await auth.signOut()
    router.push("/login")
  }, [])
  
  const hasPermission = useCallback((permission: string) => {
    if (!session) return false
    return PERMISSIONS[permission]?.includes(session.user.role)
  }, [session])
  
  return {
    user: session?.user,
    isLoading,
    isAuthenticated: !!session,
    login,
    logout,
    hasPermission
  }
}
```

### Permission Guards
```typescript
// frontend/src/components/auth/PermissionGuard.tsx
interface PermissionGuardProps {
  permission: string
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({ 
  permission, 
  fallback = null, 
  children 
}: PermissionGuardProps) {
  const { hasPermission } = useAuth()
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Usage
<PermissionGuard permission="server.create" fallback={<UpgradePrompt />}>
  <CreateServerButton />
</PermissionGuard>
```

## Backend Validation

### JWT Token Validation
```python
# backend/src/mcp_registry_gateway/middleware/auth_middleware.py
from fastapi import HTTPException, status
from jose import JWTError, jwt

async def validate_token(token: str) -> dict:
    """Validate Better-Auth JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"]
        )
        
        # Validate token claims
        if payload.get("exp", 0) < time.time():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def get_current_user(
    authorization: str = Header(None)
) -> User:
    """Extract and validate user from JWT."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    token = authorization.split(" ")[1]
    payload = await validate_token(token)
    
    # Get user from database
    user = await get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user
```

### Role-Based Endpoints
```python
# backend/src/mcp_registry_gateway/dependencies.py
from typing import Annotated

def require_role(*allowed_roles: str):
    """Dependency to require specific roles."""
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)]
    ):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# Usage in endpoints
@router.post("/servers")
async def create_server(
    request: CreateServerRequest,
    user: Annotated[User, Depends(require_role("admin", "manager"))]
):
    """Create a new MCP server (admin/manager only)."""
    pass

@router.get("/analytics")
async def get_analytics(
    user: Annotated[User, Depends(require_role("admin", "manager", "analyst"))]
):
    """Get analytics data (admin/manager/analyst only)."""
    pass
```

## OAuth Proxy for MCP Servers

### FastMCP OAuth Configuration
```python
# backend/src/mcp_registry_gateway/oauth/proxy.py
from fastmcp import FastMCP
from fastmcp.oauth import OAuthProxy

class MCPOAuthProxy:
    """OAuth proxy for MCP server authentication."""
    
    def __init__(self):
        self.proxy = OAuthProxy(
            client_id=settings.MCP_CLIENT_ID,
            client_secret=settings.MCP_CLIENT_SECRET,
            redirect_uri=f"{settings.BASE_URL}/oauth/callback",
            scopes=["mcp.servers.read", "mcp.servers.write"]
        )
    
    async def get_authorization_url(
        self,
        server_id: str,
        state: str
    ) -> str:
        """Generate OAuth authorization URL."""
        return self.proxy.get_authorization_url(
            server_id=server_id,
            state=state,
            code_challenge=generate_pkce_challenge(),
            code_challenge_method="S256"
        )
    
    async def exchange_code(
        self,
        code: str,
        code_verifier: str
    ) -> OAuthToken:
        """Exchange authorization code for tokens."""
        return await self.proxy.exchange_code(
            code=code,
            code_verifier=code_verifier
        )
```

## Session Management

### Session Storage
```typescript
// frontend/src/lib/auth/session.ts
interface SessionData {
  user: User
  accessToken: string
  refreshToken?: string
  expiresAt: number
  permissions: string[]
}

// Redis-backed session storage
export class SessionManager {
  private redis: Redis
  
  async createSession(user: User, token: string): Promise<string> {
    const sessionId = generateSessionId()
    const sessionData: SessionData = {
      user,
      accessToken: token,
      expiresAt: Date.now() + SESSION_DURATION,
      permissions: getUserPermissions(user.role)
    }
    
    await this.redis.setex(
      `session:${sessionId}`,
      SESSION_DURATION,
      JSON.stringify(sessionData)
    )
    
    return sessionId
  }
  
  async refreshSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) throw new Error("Session not found")
    
    // Extend expiration
    session.expiresAt = Date.now() + SESSION_DURATION
    await this.redis.setex(
      `session:${sessionId}`,
      SESSION_DURATION,
      JSON.stringify(session)
    )
  }
  
  async invalidateSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`)
  }
}
```

### Session Regeneration
```typescript
// Regenerate session on role change
async function handleRoleChange(userId: string, newRole: UserRole) {
  // Invalidate all existing sessions
  const sessions = await getActiveSessionsForUser(userId)
  for (const session of sessions) {
    await sessionManager.invalidateSession(session.id)
  }
  
  // Create new session with updated role
  const user = await getUserById(userId)
  user.role = newRole
  const newSession = await sessionManager.createSession(user, generateToken())
  
  // Audit log
  await auditLog.create({
    action: "role.changed",
    actor: getCurrentUser(),
    target: userId,
    details: { oldRole: user.role, newRole }
  })
  
  return newSession
}
```

## Security Best Practices

### Token Security
```typescript
// Secure token storage
const TOKEN_STORAGE = {
  // Never store in localStorage (XSS vulnerable)
  localStorage: false,
  
  // HTTP-only cookies (preferred)
  cookie: {
    httpOnly: true,
    secure: true,      // HTTPS only
    sameSite: "lax",   // CSRF protection
    maxAge: 60 * 60 * 24 * 7  // 7 days
  },
  
  // Session storage (temporary)
  sessionStorage: true  // Cleared on tab close
}
```

### CSRF Protection
```typescript
// CSRF token generation
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Validate CSRF token
export function validateCSRFToken(
  token: string,
  sessionToken: string
): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  )
}
```

### Rate Limiting
```python
# backend/src/mcp_registry_gateway/middleware/rate_limit.py
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

# Role-based rate limits
RATE_LIMITS = {
    "admin": 1000,      # 1000 requests per minute
    "manager": 500,     # 500 requests per minute
    "developer": 500,   # 500 requests per minute
    "analyst": 200,     # 200 requests per minute
    "viewer": 100,      # 100 requests per minute
    "guest": 20         # 20 requests per minute
}

async def get_rate_limit(user: User) -> int:
    return RATE_LIMITS.get(user.role, 20)

# Apply to endpoints
@router.get(
    "/data",
    dependencies=[Depends(RateLimiter(times=100, seconds=60))]
)
async def get_data():
    pass
```

## Audit Logging

### Authentication Events
```typescript
// Log all authentication events
export async function logAuthEvent(
  event: AuthEvent,
  user: User | null,
  details: Record<string, any>
) {
  await auditLog.create({
    timestamp: new Date(),
    event,
    userId: user?.id,
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
    details
  })
}

// Event types
enum AuthEvent {
  LOGIN_SUCCESS = "auth.login.success",
  LOGIN_FAILED = "auth.login.failed",
  LOGOUT = "auth.logout",
  SESSION_EXPIRED = "auth.session.expired",
  ROLE_CHANGED = "auth.role.changed",
  PASSWORD_RESET = "auth.password.reset",
  MFA_ENABLED = "auth.mfa.enabled",
  OAUTH_LINKED = "auth.oauth.linked"
}
```

## Testing Authentication

### Unit Tests
```typescript
describe("Authentication", () => {
  it("should validate JWT tokens", async () => {
    const token = generateToken(mockUser)
    const payload = await validateToken(token)
    expect(payload.sub).toBe(mockUser.id)
  })
  
  it("should enforce role hierarchy", () => {
    const admin = { role: "admin" }
    const viewer = { role: "viewer" }
    
    expect(hasPermission(admin, "server.create")).toBe(true)
    expect(hasPermission(viewer, "server.create")).toBe(false)
  })
  
  it("should regenerate session on role change", async () => {
    const oldSession = await createSession(user)
    await changeUserRole(user.id, "admin")
    const newSession = await getSession(user.id)
    
    expect(newSession.id).not.toBe(oldSession.id)
    expect(newSession.user.role).toBe("admin")
  })
})
```

### Integration Tests
```python
@pytest.mark.asyncio
async def test_protected_endpoint_requires_auth(client):
    response = await client.get("/api/admin/users")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_role_based_access(client, auth_headers):
    # Admin can access
    admin_headers = auth_headers("admin")
    response = await client.get("/api/admin/users", headers=admin_headers)
    assert response.status_code == 200
    
    # Viewer cannot access
    viewer_headers = auth_headers("viewer")
    response = await client.get("/api/admin/users", headers=viewer_headers)
    assert response.status_code == 403
```

## Best Practices

### Do's
- ✓ Use HTTP-only cookies for tokens
- ✓ Implement CSRF protection
- ✓ Regenerate sessions on privilege changes
- ✓ Log all authentication events
- ✓ Use PKCE for OAuth flows
- ✓ Implement rate limiting by role

### Don'ts
- ✗ Don't store tokens in localStorage
- ✗ Don't trust client-side role checks alone
- ✗ Don't skip token expiration validation
- ✗ Don't log sensitive information
- ✗ Don't use weak session IDs
- ✗ Don't allow unlimited login attempts