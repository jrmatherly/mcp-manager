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
- Multi-provider SSO (Google, GitHub, Microsoft/Entra ID)
- httpOnly cookies for token storage
- CSRF protection on state-changing operations
- Content Security Policy (CSP) headers
- API key authentication with rate limiting

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

Create `.env.local` for Next.js:

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

# Microsoft/Azure SSO (Enterprise SSO support)
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=common  # 'common' for multi-tenant, or your tenant ID

# Email Verification
RESEND_API_KEY=your-resend-api-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mcp_registry
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
