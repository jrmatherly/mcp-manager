# Security & Configuration Guide

## Security

### Authentication & Authorization

**Backend Security:**
- JWT tokens with RS256 algorithm for production
- Azure OAuth integration for enterprise SSO
- Role-based access control (RBAC) with tiered permissions
- Rate limiting: Admin (1000 RPM), Server Owner (500 RPM), User (100 RPM), Anonymous (20 RPM)

**Frontend Security:**
- Better-Auth for secure session management with Redis caching
- Multi-provider SSO (Google, GitHub, Microsoft/Entra ID) with automatic role mapping
- httpOnly cookies for token storage
- CSRF protection on state-changing operations
- Content Security Policy (CSP) headers
- API key authentication with rate limiting
- Client-side route protection with role-based access control
- Azure AD group-to-role mapping for enterprise authentication
- T3 Env for type-safe environment variable validation

### Data Validation

**Backend Validation:**
```python
# Always validate with Pydantic models
class ServerRegistration(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    endpoint: HttpUrl
    api_key: SecretStr
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Name must be alphanumeric with hyphens/underscores")
        return v
```

**Frontend Validation:**
```typescript
// Use Zod for runtime validation
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["admin", "user", "server_owner"])
});

// Validate before API calls
const validatedData = userSchema.parse(formData);
```

### Secret Management

- Never commit `.env` files (use `.env.example` as template)
- Use environment variable prefixes: `DB_`, `SECURITY_`, `SERVICE_`, `MONITORING_`, `MREG_`
- Store secrets in secure vaults for production
- Rotate API keys and tokens regularly

### Security Best Practices

- SQL injection prevention via parameterized queries (SQLModel)
- XSS prevention with React's automatic escaping
- Input sanitization on all user inputs
- Rate limiting on all public endpoints
- Audit logging for sensitive operations
- Regular dependency updates for security patches

## Configuration

### Backend Environment Variables

Required environment variables with prefix system:

```bash
# Application Settings (APP_ prefix)
APP_NAME="MCP Registry Gateway"
APP_VERSION="0.1.0"
ENVIRONMENT=development
DEBUG=false

# Database Settings (DB_ prefix)
DB_POSTGRES_HOST=localhost
DB_POSTGRES_PORT=5432
DB_POSTGRES_USER=mcp_user
DB_POSTGRES_PASSWORD=secure_password
DB_POSTGRES_DB=mcp_registry
DB_REDIS_HOST=localhost
DB_REDIS_PORT=6379

# Security Settings (SECURITY_ prefix)
SECURITY_JWT_SECRET_KEY=your-jwt-secret-change-this
SECURITY_JWT_ALGORITHM=HS256
SECURITY_JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
SECURITY_AZURE_TENANT_ID=your-tenant-id
SECURITY_AZURE_CLIENT_ID=your-client-id
SECURITY_AZURE_CLIENT_SECRET=your-client-secret

# Service Settings (SERVICE_ prefix)
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8000
SERVICE_WORKERS=1

# FastMCP Settings (MREG_ prefix)
MREG_FASTMCP_ENABLED=true
MREG_FASTMCP_PORT=8001
MREG_FASTMCP_HOST=0.0.0.0
```

### Frontend Environment Variables

Create `.env.local` for Next.js with T3 Env type-safe validation:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MCP_URL=http://localhost:8001

# Better-Auth Configuration
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_URL=http://localhost:3000

# OAuth Providers (all optional - enable only what you need)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft/Azure SSO (Enterprise SSO support with role mapping)
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=common  # 'common' for multi-tenant, or your tenant ID

# Email Verification
RESEND_API_KEY=your-resend-api-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mcp_registry

# Logging Configuration
LOG_LEVEL=debug  # Server-side logging level
NEXT_PUBLIC_LOG_LEVEL=info  # Client-side logging level
NEXT_PUBLIC_LOG_BROWSER=true  # Enable browser logging in development
```

### T3 Env Configuration

The project uses T3 Env for type-safe environment variable validation:

```typescript
// /src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Server-only variables (never sent to client)
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    AZURE_CLIENT_SECRET: z.string().min(1),
    RESEND_API_KEY: z.string().min(1).optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  },
  client: {
    // Client-side variables (must be prefixed with NEXT_PUBLIC_)
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    NEXT_PUBLIC_LOG_BROWSER: z.string().transform(val => val === "true").default("false"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL,
  },
});
```

### Azure AD Role Mapping Configuration

Configure Azure AD groups to Better-Auth role mappings:

```typescript
// /lib/auth/config.ts
export const APP_ROLE_MAPPINGS = {
  azure: [
    // Azure AD Security Groups (customize for your organization)
    { azureRole: "SG WLH Admins", betterAuthRole: "admin", description: "WLH Admin Security Group" },
    { azureRole: "SG MEM SSC Users", betterAuthRole: "user", description: "MEM SSC Users Security Group" },

    // Azure AD app roles (if using Azure app role assignments)
    { azureRole: "admin", betterAuthRole: "admin", description: "MCP Registry Gateway Administrator" },
    { azureRole: "Server Owner", betterAuthRole: "server_owner", description: "MCP Server Owner" },
    { azureRole: "User", betterAuthRole: "user", description: "Standard user role" },
  ] as AzureRoleMapping[],
};
```

### Development Environment Setup

1. **Backend Setup:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit backend/.env with your values
   uv sync
   uv run alembic upgrade head
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit frontend/.env.local with your values
   npm install
   npm run db:migrate
   ```

3. **Docker Setup:**
   ```bash
   # From project root
   cp .env.example .env
   # Edit root .env for Docker Compose variables
   docker-compose up -d
   ```

**Note on Environment Files:**
- `backend/.env` - Backend application configuration (takes precedence)
- Root `.env` - Docker Compose and fallback configuration
- `frontend/.env.local` - Frontend Next.js configuration

### Authentication Security Best Practices

#### Microsoft OAuth Security
- **Role Claim Validation**: Verify Azure AD group memberships and app role assignments
- **Token Verification**: Validate OAuth tokens and extract role information securely
- **Role Mapping**: Map Azure AD groups/roles to application-specific roles
- **Session Persistence**: Store role information in secure session storage

#### Client-Side Security
- **Route Protection**: Use client-side components for authentication checking
- **Graceful Degradation**: Redirect unauthorized users appropriately
- **Loading States**: Show proper loading indicators during authentication checks
- **Error Handling**: Log authentication failures for security monitoring

#### Environment Variable Security
- **Type Safety**: Use T3 Env for runtime validation of environment variables
- **Server/Client Separation**: Ensure sensitive variables stay server-side only
- **Validation**: Validate environment variables at build time
- **Documentation**: Clear documentation of required vs optional variables

### Dependencies and Version Requirements

**Backend:**
- Python: >= 3.10, < 3.13
- FastAPI: >= 0.114.2
- FastMCP: >= 0.4.0
- PostgreSQL: >= 13
- Redis: >= 6

**Frontend:**
- Node.js: >= 22.0.0
- Next.js: 15.5.3
- React: 19.1.1
- TypeScript: 5.9.2
- Better-Auth: 1.3.9+
- Drizzle ORM: 0.44.5+
- T3 Env: Latest (type-safe environment variables)
- Zod: Latest (validation schemas)
