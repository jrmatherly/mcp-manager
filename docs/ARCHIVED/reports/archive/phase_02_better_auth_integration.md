# Phase 2: Better-Auth Integration

**Phase**: 2 of 6  
**Duration**: 1-2 weeks  
**Status**: 🔄 **READY FOR IMPLEMENTATION**  
**Dependencies**: [Phase 1: Foundation Setup](./phase_01_foundation_setup.md)  

---

## 🎯 **Phase Objectives**

Implement Better-Auth server with Microsoft Azure OAuth integration, creating a seamless authentication bridge with the MCP Registry Gateway's FastMCP OAuth Proxy system.

### **Key Deliverables**
- 🔄 Better-Auth server setup with Azure OAuth provider
- 🔄 Azure App Registration configuration
- 🔄 JWT token bridge for FastMCP compatibility
- 🔄 Authentication context and hooks for React
- 🔄 Protected route implementation
- 🔄 Basic authentication flow (login/logout)

---

---

## 🔄 **UPDATED IMPLEMENTATION ARCHITECTURE**

### **Current State Assessment** ✅

**✅ COMPLETED (Phase 1 + Better-Auth Implementation)**:
- React + TypeScript foundation at `/frontend/` ✅ (ACTUAL FRONTEND PROJECT)
- Better-Auth implementation complete:
  - `AuthContext.tsx` - Better-Auth context provider ✅
  - `LoginPage.tsx` - Microsoft OAuth login page ✅
  - `SignupPage.tsx` - User registration page ✅
  - `ProtectedRoute.tsx` - Route protection component ✅
  - `client.ts` - Better-Auth client configuration ✅
  - `token-bridge.ts` - JWT token bridge for FastMCP ✅
- API client architecture with authentication integration ✅
- Azure App Registration pre-configured ✅

**🔄 REMAINING (Server Configuration)**:
- Better-Auth server startup configuration within Vite (port 3000)
- Database schema creation in shared PostgreSQL (auth schema)
- Environment configuration validation and testing
- Production deployment configuration

### **Architecture Clarification** ⚠️

**CORRECT ARCHITECTURE (2 Servers, Not 3)** ✅:
- **Frontend (Port 3000)**: React app + Better-Auth server endpoints (`/api/auth/*`) running in `/frontend/`
- **Backend (Port 8000)**: MCP Registry Gateway unified server
- **Database**: Shared PostgreSQL with separate `auth` schema
- **Authentication**: Better-Auth components implemented in `/frontend/`

**REFERENCE-ONLY DIRECTORY (DO NOT MODIFY)** ⚠️:
- `/example_frontend/` - EXAMPLE ONLY for styling and reference patterns
- All ACTUAL implementation is in `/frontend/` directory
- Better-Auth server runs WITHIN `/frontend/` project using Vite

---

## 🏗️ **Implementation Steps**

### **Step 1: Azure App Registration Setup**

**Prerequisites**: Azure account with sufficient permissions to create app registrations.

```bash
# Follow the comprehensive Azure setup guide
# Reference: /docs/project_context/AZURE_APP_REGISTRATION_GUIDE.md

# Required Azure configuration:
# 1. Create new App Registration
# 2. Configure redirect URIs
# 3. Generate client secret
# 4. Set API permissions
# 5. Configure token configuration
```

**Azure App Registration Configuration**:

```yaml
# Azure App Registration Settings
name: "MCP Registry Gateway Frontend"
redirect_uris:
  - "http://localhost:3000/api/auth/callback/microsoft"  # Development
  - "https://your-domain.com/api/auth/callback/microsoft" # Production

api_permissions:
  - "Microsoft Graph: User.Read"
  - "Microsoft Graph: email"
  - "Microsoft Graph: openid"
  - "Microsoft Graph: profile"

token_configuration:
  - "email"
  - "family_name"
  - "given_name"
  - "upn"
```

**Environment Variables**:

```bash
# .env - Azure OAuth configuration
# Better-Auth Configuration
BETTER_AUTH_SECRET="your-32-character-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"
DATABASE_URL="postgresql://user:pass@localhost:5432/mcp_registry"

# Azure OAuth Configuration  
AZURE_CLIENT_ID="your-azure-client-id"
AZURE_CLIENT_SECRET="your-azure-client-secret"
AZURE_TENANT_ID="your-azure-tenant-id"

# MCP Registry Gateway Integration (Unified Server)
MCP_GATEWAY_URL="http://localhost:8000"
MCP_ENDPOINT="/mcp"
FASTMCP_JWT_SECRET="your-fastmcp-jwt-secret"

# Development Settings
NODE_ENV="development"
```

### **Step 2: Better-Auth Server Implementation**

```bash
# Create Better-Auth server project
mkdir better-auth-server
cd better-auth-server

# Initialize Node.js project
npm init -y

# Install Better-Auth dependencies
npm install better-auth
npm install better-auth-providers
npm install @better-auth/cli

# Install database and utilities
npm install pg @types/pg
npm install jsonwebtoken @types/jsonwebtoken
npm install express @types/express
npm install cors @types/cors
npm install dotenv

# Development dependencies
npm install -D typescript @types/node ts-node nodemon
```

```typescript
// src/auth.ts - Better-Auth server configuration
import { betterAuth } from 'better-auth';
import { microsoft } from 'better-auth/providers';
import { Pool } from 'pg';

// PostgreSQL connection (shared with MCP Registry Gateway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

export const auth = betterAuth({
  // Database configuration - shared PostgreSQL with separate schema
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/mcp_registry',
    schema: 'auth' // Separate schema in shared PostgreSQL instance
  },
  
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  
  providers: [
    microsoft({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID,
      redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/microsoft`,
      scope: 'openid profile email User.Read'
    })
  ],
  
  session: {
    cookieCache: {
      name: 'mcp-gateway-session',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    }
  },
  
  // User data configuration
  user: {
    additionalFields: {
      tenantId: {
        type: 'string',
        required: false
      },
      roles: {
        type: 'string[]',
        required: false,
        defaultValue: ['user']
      },
      mcpPermissions: {
        type: 'string[]',
        required: false,
        defaultValue: []
      }
    }
  },
  
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  },
  
  // Security configuration
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    crossSubDomainCookies: {
      enabled: false // Enable in production with proper domain
    }
  }
});

// Export types for TypeScript
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
```

### **Step 3: JWT Token Bridge Implementation**

```typescript
// src/jwt-bridge.ts - Critical integration with FastMCP OAuth Proxy
import jwt from 'jsonwebtoken';
import type { Session, User } from './auth';

interface FastMCPTokenClaims {
  sub: string;
  email: string;
  name?: string;
  roles: string[];
  tenant_id?: string;
  // FastMCP-specific claims
  mcp_permissions: string[];
  server_access: string[];
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

export class BetterAuthFastMCPBridge {
  private readonly jwtSecret: string;
  private readonly issuer = 'better-auth-bridge';
  private readonly audience = 'fastmcp-oauth-proxy';

  constructor() {
    this.jwtSecret = process.env.FASTMCP_JWT_SECRET!;
    if (!this.jwtSecret) {
      throw new Error('FASTMCP_JWT_SECRET environment variable is required');
    }
  }

  /**
   * Convert Better-Auth session to FastMCP-compatible JWT token
   */
  async convertToFastMCPToken(session: Session): Promise<string> {
    const user = session.user;
    
    // Extract required claims for FastMCP compatibility
    const fastmcpClaims: FastMCPTokenClaims = {
      sub: user.id,
      email: user.email,
      name: user.name || user.email,
      roles: user.roles || ['user'],
      tenant_id: user.tenantId || 'default',
      // FastMCP-specific claims
      mcp_permissions: user.mcpPermissions || [],
      server_access: this.determineServerAccess(user),
      // Standard JWT claims
      iss: this.issuer,
      aud: this.audience,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
    };

    // Generate JWT with FastMCP-compatible structure
    return jwt.sign(fastmcpClaims, this.jwtSecret, {
      algorithm: 'HS256'
    });
  }

  /**
   * Validate token compatibility with FastMCP OAuth Proxy
   */
  async validateTokenCompat(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as FastMCPTokenClaims;
      
      // Ensure required FastMCP claims are present
      return !!(
        decoded.sub && 
        decoded.email && 
        decoded.roles &&
        decoded.iss === this.issuer &&
        decoded.aud === this.audience
      );
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Handle token refresh coordination
   */
  async coordinateTokenRefresh(userId: string): Promise<void> {
    // Implementation for coordinating token refresh between Better-Auth and FastMCP
    console.log(`Coordinating token refresh for user: ${userId}`);
    // TODO: Implement refresh coordination logic
  }

  /**
   * Determine server access permissions based on user roles
   */
  private determineServerAccess(user: User): string[] {
    const baseAccess = ['mcp:user:read'];
    
    if (user.roles?.includes('admin')) {
      return [...baseAccess, 'mcp:admin:*'];
    }
    
    if (user.roles?.includes('server_owner')) {
      return [...baseAccess, 'mcp:server:own'];
    }
    
    return baseAccess;
  }
}

// Create singleton instance
export const jwtBridge = new BetterAuthFastMCPBridge();
```

### **Step 4: Express Server Setup**

```typescript
// src/server.ts - Express server with Better-Auth integration
import express from 'express';
import cors from 'cors';
import { auth, type Session } from './auth';
import { jwtBridge } from './jwt-bridge';
import { toNodeHandler } from 'better-auth/node';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Better-Auth server
    'http://localhost:8000'  // MCP Gateway unified server
  ],
  credentials: true
}));

app.use(express.json());

// Better-Auth routes
app.all('/api/auth/*', toNodeHandler(auth));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'better-auth-server',
    timestamp: new Date().toISOString()
  });
});

// JWT token bridge endpoint (for MCP operations)
app.post('/api/mcp-token', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any
    });

    if (!session) {
      return res.status(401).json({ error: 'No active session' });
    }

    // Convert Better-Auth session to FastMCP-compatible JWT
    const mcpToken = await jwtBridge.convertToFastMCPToken(session);
    
    res.json({ 
      token: mcpToken,
      expires_in: 3600, // 1 hour
      token_type: 'Bearer'
    });
  } catch (error) {
    console.error('MCP token generation failed:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
});

// User info endpoint
app.get('/api/user', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any
    });

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      user: session.user,
      session: {
        id: session.id,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error('User info fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Better-Auth server running on http://localhost:${PORT}`);
  console.log(`OAuth callback: http://localhost:${PORT}/api/auth/callback/microsoft`);
});

export { app };
```

### **Step 5: Database Schema Setup**

```sql
-- migrations/001_better_auth_schema.sql
-- Create separate auth schema in shared PostgreSQL instance

CREATE SCHEMA IF NOT EXISTS auth;

-- Better-Auth will create its own tables in the auth schema:
-- auth.user, auth.session, auth.account, auth.verification

-- Cross-schema reference for audit logs
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS better_auth_user_id UUID;

-- Add foreign key constraint (optional, for referential integrity)
ALTER TABLE public.audit_logs 
ADD CONSTRAINT fk_audit_logs_better_auth_user 
FOREIGN KEY (better_auth_user_id) REFERENCES auth.user(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_better_auth_user_id 
ON public.audit_logs(better_auth_user_id);
```

```bash
# Run database migration
psql $DATABASE_URL -f migrations/001_better_auth_schema.sql
```

### **Step 6: React Authentication Integration**

```bash
# Install Better-Auth React dependencies in frontend
cd ../mcp-registry-frontend
npm install better-auth
npm install @better-auth/react
```

```typescript
// src/lib/auth/auth-client.ts - Better-Auth client configuration
import { createAuthClient } from '@better-auth/react';

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:3000',
  sessionStorage: {
    prefix: 'mcp-gateway',
    storage: 'localStorage' // Better persistence than sessionStorage
  }
});

// Export auth client and hooks
export { authClient };
export const { 
  useSession, 
  signIn, 
  signOut, 
  getSession,
  useUser
} = authClient;
```

```typescript
// src/lib/auth/auth-context.tsx - Authentication context provider
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, useUser } from './auth-client';
import type { User } from '@better-auth/react';

interface AuthContextValue {
  // Authentication status
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  
  // Token management
  accessToken: string | null;
  mcpToken: string | null;
  tokenExpiry: Date | null;
  
  // User permissions
  roles: string[];
  tenantId: string | null;
  canAccessAdmin: boolean;
  
  // Auth methods
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getMCPToken: () => Promise<string | null>;
  
  // Utility methods
  hasRole: (role: string) => boolean;
  canAccessTool: (toolName: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const { data: user } = useUser();
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);

  const isAuthenticated = !!session && !!user;
  const isLoading = isPending;

  // Extract user context
  const roles = user?.roles || ['user'];
  const tenantId = user?.tenantId || null;
  const canAccessAdmin = roles.includes('admin');

  const login = async () => {
    try {
      const { signIn } = await import('./auth-client');
      await signIn.social({
        provider: 'microsoft',
        callbackURL: '/dashboard'
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { signOut } = await import('./auth-client');
      await signOut();
      setMcpToken(null);
      setTokenExpiry(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getMCPToken = async (): Promise<string | null> => {
    try {
      // Check if current token is still valid
      if (mcpToken && tokenExpiry && new Date() < tokenExpiry) {
        return mcpToken;
      }

      // Fetch new MCP token from Better-Auth server
      const response = await fetch('http://localhost:3000/api/mcp-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get MCP token');
      }

      const data = await response.json();
      setMcpToken(data.token);
      setTokenExpiry(new Date(Date.now() + data.expires_in * 1000));
      
      return data.token;
    } catch (error) {
      console.error('Failed to get MCP token:', error);
      return null;
    }
  };

  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  const canAccessTool = (toolName: string): boolean => {
    // Implement tool-specific permission logic
    if (hasRole('admin')) return true;
    if (toolName.startsWith('admin_') && !hasRole('admin')) return false;
    return true;
  };

  const contextValue: AuthContextValue = {
    isAuthenticated,
    isLoading,
    user,
    accessToken: session?.token || null,
    mcpToken,
    tokenExpiry,
    roles,
    tenantId,
    canAccessAdmin,
    login,
    logout,
    getMCPToken,
    hasRole,
    canAccessTool
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### **Step 7: Protected Routes Implementation**

```tsx
// src/components/auth/ProtectedRoute.tsx - Route protection with role-based access
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AccessDenied } from '@/components/auth/AccessDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requireAuth?: boolean;
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  requireAuth = true,
  fallbackPath = '/login'
}: ProtectedRouteProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (requireAuth && !auth.isAuthenticated) {
    // Redirect to login with return URL
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => auth.hasRole(role));
    if (!hasRequiredRole) {
      return (
        <AccessDenied 
          requiredRoles={requiredRoles} 
          userRoles={auth.roles} 
        />
      );
    }
  }

  return <>{children}</>;
}
```

```tsx
// src/components/auth/LoginPage.tsx - Login page component
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/auth-context';
import { Microsoft } from 'lucide-react';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = (location.state as any)?.from || '/dashboard';

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [auth.isAuthenticated, navigate, from]);

  const handleLogin = async () => {
    try {
      await auth.login();
      // Navigation will be handled by useEffect after auth state changes
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">MCP Registry Gateway</CardTitle>
          <CardDescription>
            Sign in with your Microsoft account to access the MCP Registry Gateway
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleLogin}
            className="w-full"
            size="lg"
          >
            <Microsoft className="mr-2 h-5 w-5" />
            Sign in with Microsoft
          </Button>
          
          <div className="text-center text-sm text-gray-600">
            <p>Secure authentication powered by Azure Active Directory</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### **Step 8: Update API Client for Authentication**

```typescript
// src/lib/api/client.ts - Updated with authentication integration
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { ServerResponse, ServerFilters } from '@/types/api';

export class MCPRegistryApiClient {
  private publicClient: AxiosInstance;
  private authenticatedClient: AxiosInstance;
  private getMCPToken: (() => Promise<string | null>) | null = null;
  
  constructor() {
    this.setupPublicClient();
    this.setupAuthenticatedClient();
  }

  // Set the MCP token getter (called from auth context)
  public setMCPTokenGetter(getter: () => Promise<string | null>) {
    this.getMCPToken = getter;
  }

  private setupAuthenticatedClient() {
    this.authenticatedClient = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor for MCP token injection
    this.authenticatedClient.interceptors.request.use(async (config) => {
      if (this.getMCPToken) {
        const token = await this.getMCPToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Response interceptor for token refresh
    this.authenticatedClient.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (error.response?.status === 401 && this.getMCPToken) {
          try {
            // Force token refresh and retry
            const newToken = await this.getMCPToken();
            if (newToken) {
              const originalRequest = error.config;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.authenticatedClient.request(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  // Authenticated MCP tool methods
  public readonly mcp = {
    listServers: async (filters?: ServerFilters): Promise<ServerResponse[]> =>
      this.callMCPTool('list_servers', filters || {}),
    
    registerServer: async (data: any): Promise<any> =>
      this.callMCPTool('register_server', data),
    
    proxyRequest: async (data: any): Promise<any> =>
      this.callMCPTool('proxy_request', data),
    
    healthCheck: async (): Promise<any> =>
      this.callMCPTool('health_check', {})
  };

  private async callMCPTool<T>(toolName: string, args: any): Promise<T> {
    const response = await this.authenticatedClient.post('/mcp', {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    });

    if (response.data.error) {
      throw new Error(`MCP Tool Error: ${response.data.error.message}`);
    }

    return response.data.result;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ... rest of existing methods remain the same
}

// Create singleton instance
export const apiClient = new MCPRegistryApiClient();
```

### **Step 9: Update Main App with Authentication**

```tsx
// src/App.tsx - Updated with authentication integration
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth/auth-context';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/components/auth/LoginPage';
import { Navigation } from '@/components/layout/Navigation';
import { Toaster } from '@/components/ui/toaster';
import { apiClient } from '@/lib/api/client';

// Pages
import { HomePage } from '@/pages/HomePage';
import { ServersPage } from '@/pages/ServersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminPage } from '@/pages/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/servers" element={<ServersPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### **Step 10: Development Scripts and Configuration**

```json
// better-auth-server/package.json
{
  "name": "mcp-better-auth-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "migrate": "psql $DATABASE_URL -f migrations/001_better_auth_schema.sql",
    "test": "echo \"No tests yet\" && exit 1"
  },
  "dependencies": {
    "better-auth": "^1.0.0",
    "better-auth-providers": "^1.0.0",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/pg": "^8.10.0",
    "@types/jsonwebtoken": "^9.0.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0"
  }
}
```

```bash
# Development startup script
# start-dev.sh
#!/bin/bash

echo "Starting MCP Registry Gateway with Better-Auth..."

# Start PostgreSQL and Redis (if not running)
docker-compose up -d postgres redis

# Wait for database
echo "Waiting for database..."
sleep 3

# Run database migration
echo "Running Better-Auth database migration..."
cd better-auth-server && npm run migrate

# Start Better-Auth server
echo "Starting Better-Auth server..."
cd better-auth-server && npm run dev &
AUTH_PID=$!

# Start MCP Gateway (unified server)
echo "Starting MCP Registry Gateway..."
cd .. && uv run mcp-gateway serve --port 8000 &
MCP_PID=$!

# Start frontend development server
echo "Starting frontend development server..."
cd mcp-registry-frontend && npm run dev &
FRONTEND_PID=$!

echo "All services started:"
echo "- Better-Auth Server: http://localhost:3000"
echo "- MCP Registry Gateway: http://localhost:8000"
echo "- Frontend App: http://localhost:5173"

# Wait for any process to exit
wait $AUTH_PID $MCP_PID $FRONTEND_PID
```

---

## 🧪 **Testing & Validation**

### **Manual Testing Checklist**

- [ ] **Azure App Registration**: OAuth flow works with correct redirect URIs
- [ ] **Better-Auth Server**: Server starts and responds to health checks
- [ ] **Database Schema**: Auth schema created successfully in shared PostgreSQL
- [ ] **JWT Token Bridge**: MCP tokens generated and validated correctly
- [ ] **Authentication Flow**: Login/logout works with Microsoft OAuth
- [ ] **Protected Routes**: Routes protected based on authentication status
- [ ] **Role-based Access**: Admin routes restricted to admin users
- [ ] **API Integration**: Authenticated API calls work with MCP tokens

### **Integration Testing**

```typescript
// tests/auth-integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BetterAuthFastMCPBridge } from '../src/jwt-bridge';
import { auth } from '../src/auth';

describe('Better-Auth Integration', () => {
  let jwtBridge: BetterAuthFastMCPBridge;
  
  beforeAll(() => {
    jwtBridge = new BetterAuthFastMCPBridge();
  });

  it('should generate valid MCP token from session', async () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        roles: ['user'],
        tenantId: 'test-tenant'
      },
      id: 'test-session-id',
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    };

    const token = await jwtBridge.convertToFastMCPToken(mockSession as any);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const isValid = await jwtBridge.validateTokenCompat(token);
    expect(isValid).toBe(true);
  });

  it('should validate token compatibility', async () => {
    // Test with valid token structure
    const validToken = 'valid-jwt-token';
    // Implementation depends on test token generation
  });
});
```

### **End-to-End Testing**

```typescript
// cypress/e2e/auth-flow.cy.ts
describe('Authentication Flow', () => {
  it('should complete OAuth login flow', () => {
    // Visit login page
    cy.visit('/login');
    
    // Click Microsoft login button
    cy.get('[data-testid="microsoft-login-btn"]').click();
    
    // Mock Microsoft OAuth (in real test, use actual OAuth flow)
    cy.mockOAuthSuccess({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user']
      }
    });
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');
    
    // Should show user info
    cy.contains('Test User').should('be.visible');
  });

  it('should protect admin routes', () => {
    // Login as regular user
    cy.loginAs({ roles: ['user'] });
    
    // Try to access admin route
    cy.visit('/admin');
    
    // Should show access denied
    cy.contains('Access Denied').should('be.visible');
  });

  it('should make authenticated MCP calls', () => {
    // Login as admin
    cy.loginAs({ roles: ['admin'] });
    
    // Navigate to servers page
    cy.visit('/servers');
    
    // Click register server (requires authentication)
    cy.get('[data-testid="register-server-btn"]').click();
    
    // Should show server registration form
    cy.get('[data-testid="server-registration-form"]').should('be.visible');
  });
});
```

---

## 📊 **Success Metrics**

### **Authentication Metrics**

| Metric | Target | Test Criteria |
|--------|--------|---------------|
| **OAuth Flow Success** | 100% | Microsoft OAuth login completes without errors |
| **JWT Token Validity** | 100% | Generated MCP tokens pass validation |
| **Session Persistence** | 7 days | Sessions persist across browser restarts |
| **Token Refresh** | <100ms | Automatic token refresh on expiry |
| **Route Protection** | 100% | Unauthenticated users cannot access protected routes |
| **Role-based Access** | 100% | Admin routes blocked for non-admin users |

### **Integration Quality**

- **JWT Token Bridge**: Seamless conversion between Better-Auth and FastMCP tokens
- **Database Integration**: Shared PostgreSQL with proper schema separation
- **API Compatibility**: All authenticated MCP operations work correctly
- **Error Handling**: Graceful handling of authentication failures
- **Performance**: Authentication adds <50ms to request latency

---

## 🔗 **Dependencies Satisfied**

### **Phase 1 Prerequisites** ✅

- [x] **React + TypeScript Foundation**: Complete at `/frontend/` ✅
- [x] **API Client Architecture**: Dual-pattern client ready for authentication
- [x] **Component Library**: UI components ready for authentication forms
- [x] **Better-Auth Components**: Complete implementation including AuthContext, LoginPage, SignupPage, ProtectedRoute, client configuration, and JWT bridge ✅

### **Phase 2 Current Status** ✅🔄

- [x] **Better-Auth Implementation**: Complete with AuthContext, LoginPage, SignupPage, ProtectedRoute, client config, and JWT bridge ✅
- [x] **Azure App Registration**: Pre-configured per AZURE_APP_REGISTRATION_GUIDE.md  
- [x] **Project Structure**: React foundation with Better-Auth integration complete at `/frontend/` ✅
- [x] **Better-Auth Components**: Implemented in `/frontend/` ✅
- [ ] **Better-Auth Server Startup**: Configure within Vite dev server
- [ ] **Database Schema**: Create auth schema in shared PostgreSQL
- [x] **JWT Bridge**: Implemented at `/frontend/src/lib/auth/token-bridge.ts` ✅

### **External Dependencies**

- [x] **Azure Account**: Access to create App Registration
- [x] **PostgreSQL Database**: Shared instance with MCP Registry Gateway
- [x] **MCP Registry Gateway**: Unified server running on port 8000
- [x] **Environment Variables**: All required configuration values set

---

## 🚀 **Next Phase**

**Phase 2 Status**: ✅🔄 **FRONTEND COMPLETE, SERVER SETUP READY**  
**Remaining Tasks** (Server Configuration Only):
1. ✅ Better-Auth packages installed in `/frontend/`
2. ✅ Better-Auth components implemented in `/frontend/`
3. 🔄 Configure Better-Auth server startup within Vite (port 3000)
4. 🔄 Set up database schema in shared PostgreSQL (auth schema)
5. 🔄 Environment configuration validation and testing

**Next Phase**: [Phase 3: Enterprise Auth Features](./phase_03_enterprise_auth_features.md)

### **What Phase 3 Will Add**

1. **JWT Plugin**: Service-to-service authentication (15-20% performance improvement)
2. **API Key + Bearer Plugins**: Programmatic access for MCP servers
3. **Enhanced Rate Limiting**: Per-tenant fairness algorithm (99% fair allocation)
4. **Organization Plugin**: Multi-tenant isolation for enterprise deployment
5. **Admin Plugin**: Centralized user management with audit trails

### **Phase 2 Deliverables for Phase 3**

- ✅ React frontend foundation with Better-Auth implementation complete
- ✅ Azure App Registration pre-configured for port 3000
- ✅ Better-Auth components implemented in `/frontend/` (AuthContext, LoginPage, SignupPage, ProtectedRoute, client, token-bridge)
- ✅ JWT token bridge for FastMCP compatibility implemented
- 🔄 Better-Auth server startup configuration within Vite
- 🔄 Database schema setup in shared PostgreSQL
- 🔄 Environment configuration validation and testing

---

## 📋 **IMMEDIATE NEXT STEPS**

### **Step 1**: Update Azure App Registration
Update redirect URIs from port 3001 to port 3000:
- Development: `http://localhost:3000/api/auth/callback/microsoft`
- Production: `https://your-domain.com/api/auth/callback/microsoft`

### **Step 2**: Better-Auth Installation ✅ COMPLETE
```bash
# Already completed in /frontend/
cd /Users/jason/dev/AI/fastmcp-manager/frontend
# Packages installed: better-auth @better-auth/react and dependencies
# Components implemented: AuthContext, LoginPage, SignupPage, ProtectedRoute, client, token-bridge
```

### **Step 3**: Database Schema Setup
```bash
# Create auth schema in shared PostgreSQL instance
# Better-Auth will automatically create its tables: user, session, account, verification
psql $MREG_DATABASE_URL -c "CREATE SCHEMA IF NOT EXISTS auth;"

# Verify schema creation
psql $MREG_DATABASE_URL -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth';"

# Optional: Grant permissions if needed
psql $MREG_DATABASE_URL -c "GRANT ALL PRIVILEGES ON SCHEMA auth TO your_db_user;"
```

**Database Architecture**:
- **Shared PostgreSQL Instance**: Same database as MCP Registry Gateway
- **Separate Schema**: `auth` schema for Better-Auth tables
- **Cross-References**: Audit logs can reference auth.user via foreign key
- **Auto-Creation**: Better-Auth creates its own tables on first run

### **Step 4**: Configure Better-Auth Server
Add Better-Auth configuration to serve endpoints at `/api/auth/*` within Vite

### **Step 5**: JWT Bridge Implementation
Create token compatibility layer between Better-Auth and FastMCP OAuth Proxy

---

---

**Phase 2 Status**: ✅ Frontend Complete, 🔄 Server Setup Ready  
**Architecture**: Frontend (3000) + Better-Auth endpoints + MCP Gateway (8000)  
**Remaining Work**: Better-Auth server integration (2-3 days)  
**Database**: Shared PostgreSQL with separate `auth` schema  
**Next Phase**: [Phase 3: Enterprise Auth Features](./phase_03_enterprise_auth_features.md)
