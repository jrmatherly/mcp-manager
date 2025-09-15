# Authentication Troubleshooting

## Backend Architecture Troubleshooting (Post-Remediation)

### Clean Startup Validation

**Expected Behavior**: Backend should start without warnings or error messages.

**Common Issues After Remediation**:

1. **Legacy Endpoint References (FIXED)**
   - ❌ **Old Issue**: Log showed "Legacy endpoints available at /legacy/mcp/* (deprecated)"
   - ✅ **Resolution**: All legacy routes completely removed from codebase
   - **Validation**: Check startup logs - should show no legacy endpoint messages

2. **Middleware Import Warnings (FIXED)**
   - ❌ **Old Issue**: "ErrorHandlingMiddleware not available, skipping"
   - ❌ **Old Issue**: "AuthenticationMiddleware requested but not available"
   - ✅ **Resolution**: All middleware imports are now direct, no conditional loading
   - **Validation**: Backend starts without middleware warnings

3. **Prometheus Metrics Conflicts (FIXED)**
   - ❌ **Old Issue**: "Duplicated timeseries in CollectorRegistry"
   - ✅ **Resolution**: Singleton pattern prevents duplicate metric registration
   - **Validation**: No Redis warnings about duplicated metrics

### Architecture Validation Commands

```bash
# Verify clean backend startup
cd backend
uv run mcp-gateway serve --reload --port 8000

# Expected output should NOT contain:
# - "Legacy endpoints available"
# - "ErrorHandlingMiddleware not available"
# - "AuthenticationMiddleware requested but not available"
# - "Duplicated timeseries in CollectorRegistry"

# Expected output SHOULD contain:
# - "Unified FastAPI application created successfully"
# - "MCP routes added to FastAPI application"
# - "Path-based authentication middleware added"
```

### Database Architecture Validation

```bash
# Frontend owns all database operations
cd frontend
npm run db:health                    # Should work
npm run db:setup:full               # Should create all tables

# Backend should connect but not create tables
cd backend
uv run mcp-gateway serve            # Should connect to existing database
```

**Key Architectural Principle**: Frontend creates schema, Backend uses operational updates only.

## Authentication Troubleshooting Guide

Comprehensive guide for diagnosing and resolving authentication issues in the MCP Registry Gateway.

## Common Authentication Issues

### 1. Microsoft OAuth Role Mapping Issues

#### Problem: User authenticates but has wrong role
**Symptoms**:
- User can log in but gets redirected from admin pages
- Database shows role as "user" instead of "admin"
- Azure AD shows user in correct group but role not reflected in application

**Diagnosis**:
```bash
# Check current session and role
curl http://localhost:3000/api/debug/session

# Check Azure AD group membership
# Log into Azure Portal → Users → [User] → Groups
```

**Solutions**:
1. **Verify Role Mapping Configuration**:
   ```typescript
   // Check /lib/auth/config.ts
   export const APP_ROLE_MAPPINGS = {
     azure: [
       { azureRole: "SG WLH Admins", betterAuthRole: "admin" },
       { azureRole: "SG MEM SSC Users", betterAuthRole: "user" },
       // Ensure your Azure AD group names match exactly
     ],
   };
   ```

2. **Check OAuth Token Claims**:
   ```typescript
   // Add logging to see what roles are in the token
   // Check logs for "Processing Microsoft OAuth profile"
   // Look for roles, appRoles, or groups in the profile
   ```

3. **Force Role Resync**:
   ```bash
   # User needs to log out and log back in to refresh role
   # Or manually update database:
   ```
   ```sql
   UPDATE "user" SET role = 'admin' WHERE email = 'user@example.com';
   ```

#### Problem: No roles found in Microsoft profile
**Symptoms**:
- Logs show "No roles found in Microsoft profile"
- All users get default "user" role regardless of Azure AD groups

**Diagnosis**:
1. **Check Azure AD App Registration**:
   - Go to Azure Portal → App Registrations → [Your App]
   - Check "Token configuration" → Ensure group claims are enabled
   - Check "API permissions" → Ensure adequate permissions

2. **Check OAuth Scopes**:
   ```typescript
   // In auth configuration, ensure scopes include groups
   scopes: ["openid", "profile", "email", "User.Read"]
   // May need to add "Directory.Read.All" for group access
   ```

**Solutions**:
1. **Enable Group Claims in Azure AD**:
   - Azure Portal → App Registrations → [Your App] → Token configuration
   - Add "Groups" claim
   - Select "Security groups" or "All groups"

2. **Update OAuth Configuration**:
   ```typescript
   // Add additional scopes if needed
   scopes: ["openid", "profile", "email", "User.Read", "Directory.Read.All"]
   ```

3. **Use App Roles Instead of Groups**:
   - Azure Portal → App Registrations → [Your App] → App roles
   - Create app roles (admin, user, server_owner)
   - Assign users to app roles
   - Update role mapping to use app roles instead of groups

### 2. Client-Side Route Protection Issues

#### Problem: Admin routes accessible without authentication
**Symptoms**:
- Users can access /admin/* without logging in
- No redirect to login page
- Admin content renders without authentication check

**Diagnosis**:
```typescript
// Check if middleware is running
// Look for logs: "Admin layout: No session, redirecting to login"
// Check network tab for redirect responses
```

**Solutions**:
1. **Verify Middleware Configuration**:
   ```typescript
   // Check /middleware.ts
   export const config = {
     matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
   };
   ```

2. **Check Client Layout Implementation**:
   ```typescript
   // Ensure /admin/layout.tsx uses ClientAdminLayout
   import ClientAdminLayout from "./client-layout";
   
   export default function AdminLayout({ children }) {
     return <ClientAdminLayout>{children}</ClientAdminLayout>;
   }
   ```

3. **Verify Session Hook**:
   ```typescript
   // Check if useSession is working
   const { data: session, isPending } = useSession();
   console.log("Session data:", session, "Pending:", isPending);
   ```

#### Problem: Infinite redirect loops
**Symptoms**:
- Browser shows too many redirects error
- Network tab shows continuous redirect requests
- User can't access any protected routes

**Solutions**:
1. **Check Redirect Logic**:
   ```typescript
   // Ensure proper conditions in useEffect
   useEffect(() => {
     if (!isPending) { // Only act when not loading
       // Add redirect logic here
     }
   }, [session, isPending, router]);
   ```

2. **Verify Public Paths**:
   ```typescript
   // Check /lib/public-paths.ts
   export function isPublicPath(pathname: string): boolean {
     return PUBLIC_PATHS.some(path => {
       if (path.endsWith('*')) {
         return pathname.startsWith(path.slice(0, -1));
       }
       return pathname === path;
     });
   }
   ```

### 3. Environment Variable Issues

#### Problem: T3 Env validation errors
**Symptoms**:
- Build fails with environment variable validation errors
- Runtime errors about missing environment variables
- Variables not accessible in components

**Diagnosis**:
```bash
# Check environment variable loading
echo $DATABASE_URL
echo $NEXT_PUBLIC_API_URL

# Check Next.js environment loading
npm run build  # Will show T3 Env validation errors
```

**Solutions**:
1. **Verify Environment File Location**:
   ```bash
   # Frontend environment should be in frontend/.env.local
   ls -la frontend/.env.local
   
   # Check file permissions
   chmod 600 frontend/.env.local
   ```

2. **Check Variable Naming**:
   ```bash
   # Client variables must be prefixed with NEXT_PUBLIC_
   NEXT_PUBLIC_API_URL=http://localhost:8000  # ✅ Correct
   API_URL=http://localhost:8000              # ❌ Wrong for client
   ```

3. **Validate T3 Env Schema**:
   ```typescript
   // Check /src/env.ts matches your .env.local
   export const env = createEnv({
     server: {
       DATABASE_URL: z.string().url(),
       // Add all server-only variables here
     },
     client: {
       NEXT_PUBLIC_API_URL: z.string().url(),
       // Add all client variables here
     },
     runtimeEnv: {
       // Map all variables here
     },
   });
   ```

#### Problem: CLI scripts can't access environment variables
**Symptoms**:
- Database setup scripts fail with missing DATABASE_URL
- Migration scripts can't connect to database
- Error: "DATABASE_URL is not defined"

**Solutions**:
1. **Use dotenv/config for CLI scripts**:
   ```typescript
   // At top of CLI scripts (setup.ts, migrate.ts, etc.)
   import "dotenv/config";
   
   // Then access variables directly
   const dbUrl = process.env.DATABASE_URL!;
   ```

2. **Don't use T3 Env in CLI scripts**:
   ```typescript
   // ❌ Don't do this in CLI scripts
   import { env } from "../env";
   
   // ✅ Do this instead
   import "dotenv/config";
   const dbUrl = process.env.DATABASE_URL!;
   ```

## Debugging Tools and Commands

### Session Debugging
```bash
# Check current session status
curl http://localhost:3000/api/debug/session

# Expected response for authenticated user:
{
  "authenticated": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "admin"
  },
  "session": {
    "id": "session-id",
    "userId": "user-id",
    "expiresAt": "2024-01-15T10:00:00.000Z"
  }
}

# Response for unauthenticated user:
{
  "authenticated": false,
  "error": "No session found"
}
```

### Database Debugging
```sql
-- Check user roles in database
SELECT id, email, role, "createdAt", "updatedAt" FROM "user";

-- Check user sessions
SELECT * FROM "session" WHERE "userId" = 'your-user-id';

-- Check OAuth accounts
SELECT * FROM "account" WHERE "userId" = 'your-user-id';

-- Update user role manually
UPDATE "user" SET role = 'admin' WHERE email = 'admin@example.com';
```

### Log Analysis
```bash
# Watch authentication logs in development
npm run dev | grep -E "auth|OAuth|role|Admin"

# Key log messages to look for:
# - "Processing Microsoft OAuth profile"
# - "Azure AD role mapping completed"
# - "Admin layout: Access granted"
# - "Admin layout: User does not have admin role"
```

### Environment Validation
```typescript
// Quick environment check script
// Create: scripts/check-env.ts
import "dotenv/config";

const requiredVars = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing: ${varName}`);
  } else {
    console.log(`✅ Found: ${varName}`);
  }
});

// Run with: npx tsx scripts/check-env.ts
```

## Common Error Messages and Solutions

### "No session found"
**Cause**: User not authenticated or session expired
**Solution**: 
1. Check if user is logged in
2. Clear browser cookies and log in again
3. Check session expiration settings

### "User does not have admin role"
**Cause**: User authenticated but lacks admin privileges
**Solution**:
1. Check Azure AD group membership
2. Verify role mapping configuration
3. Update user role in database if needed

### "AZURE_CLIENT_SECRET is required when Azure is enabled"
**Cause**: Missing Azure OAuth configuration
**Solution**:
1. Add Azure credentials to .env.local
2. Verify T3 Env schema includes Azure variables
3. Restart development server

### "Checking permissions..." (infinite loading)
**Cause**: Session hook not resolving or error in auth check
**Solution**:
1. Check browser console for JavaScript errors
2. Verify Better-Auth client configuration
3. Check network tab for failed API requests

### "Too many redirects"
**Cause**: Redirect loop in authentication logic
**Solution**:
1. Check middleware redirect logic
2. Verify public paths configuration
3. Ensure loading states are handled properly

## Best Practices for Authentication Development

### 1. Environment Setup
- Use separate .env files for different environments
- Never commit .env files to version control
- Use .env.example as template
- Validate environment variables at build time

### 2. Role Management
- Map Azure AD groups to application roles consistently
- Use descriptive role names (admin, user, server_owner)
- Document role hierarchies and permissions
- Test role changes thoroughly

### 3. Error Handling
- Provide clear error messages for authentication failures
- Log authentication events for debugging
- Handle network failures gracefully
- Show appropriate loading states

### 4. Security Considerations
- Validate roles on both client and server side
- Use httpOnly cookies for session storage
- Implement proper CSRF protection
- Regularly rotate OAuth secrets

### 5. Testing
- Test authentication flows with different user roles
- Verify role mapping with actual Azure AD groups
- Test edge cases (expired sessions, network failures)
- Use debug endpoints for troubleshooting

## Production Deployment Checklist

### Environment Variables
- [ ] All required environment variables set
- [ ] Azure OAuth credentials configured
- [ ] Database connection string valid
- [ ] Redis connection configured
- [ ] Email service configured (if using)

### Azure AD Configuration
- [ ] App registration configured with correct redirect URIs
- [ ] Group claims enabled in token configuration
- [ ] Appropriate API permissions granted
- [ ] App roles defined (if using app roles instead of groups)
- [ ] Users assigned to appropriate groups/roles

### Application Configuration
- [ ] Role mappings match Azure AD groups
- [ ] Public paths configured correctly
- [ ] Middleware configuration validated
- [ ] Admin routes properly protected
- [ ] Debug endpoints disabled in production

### Security
- [ ] OAuth secrets properly secured
- [ ] Session configuration appropriate for production
- [ ] HTTPS enabled for all authentication flows
- [ ] CSRF protection enabled
- [ ] Rate limiting configured

### Monitoring
- [ ] Authentication logs monitored
- [ ] Failed login attempts tracked
- [ ] Role assignment changes logged
- [ ] Session health monitored
