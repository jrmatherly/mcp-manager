📋 FastMCP-Integrated API Key Management Implementation Plan

✅ FastMCP Backend Integration Findings

After comprehensive analysis of the FastMCP backend, the authentication architecture requires a **dual-system approach**:

1. **FastMCP Backend (Python)**: Azure OAuth + API key validation middleware
2. **Better-Auth Frontend (Next.js)**: API key management + MCP OAuth provider
3. **Shared Database**: Both systems use the same PostgreSQL database
4. **Validation Flow**: FastMCP validates API keys against Better-Auth database tables

## 🏗️ Dual Authentication Architecture

```
Frontend (Next.js)          Backend (FastMCP)
┌──────────────┐           ┌──────────────┐
│ Better-Auth  │           │   FastMCP    │
│              │           │              │
│ • Sessions   │           │ • Azure OAuth│
│ • API Keys   │◄──────────┤ • Validates  │
│ • MCP OAuth  │  Database │   API Keys   │
│ • Management │  Queries  │ • Middleware │
└──────────────┘           └──────────────┘
        │                           │
        └───────────┬───────────────┘
                    ▼
            ┌──────────────┐
            │  PostgreSQL  │
            │              │
            │ • api_keys   │
            │ • sessions   │
            │ • users      │
            │ • usage_logs │
            └──────────────┘
```

## 🚀 Updated Phased Implementation Strategy

### Phase 1: Better-Auth Foundation + FastMCP Integration (Week 1-3)

#### Better-Auth Setup (Frontend)
- ✅ Configure Better-Auth with API Key plugin
- ✅ Create database schema for API keys
- ✅ Implement API key CRUD operations
- ✅ Add API key generation UI
- ✅ Configure MCP OAuth provider (not in FastMCP)

#### FastMCP Integration (Backend)
- 🔧 Create API key validation middleware for FastMCP
- 🔧 Implement database queries to Better-Auth tables
- 🔧 Add API key authentication to existing OAuth flow
- 🔧 Update rate limiting middleware for API keys

### Phase 2: Unified Authentication & Rate Limiting (Week 4-5)

#### Authentication Unification
- 🔧 Implement multi-auth support (Azure OAuth + API Keys)
- 🔧 Create unified user context extraction
- 🔧 Add API key scoping validation
- 🔧 Test authentication flow across both systems

#### Rate Limiting Integration
- 🔧 Extend FastMCP rate limiting for API keys
- 🔧 Add Redis caching for API key validation
- 🔧 Implement per-key rate limiting
- 🔧 Create rate limit monitoring dashboard

### Phase 3: Security & Monitoring (Week 6-7)

#### Security Implementation
- 🔧 API key hashing with argon2id
- 🔧 IP whitelisting per key
- 🔧 Scope-based permissions
- 🔧 Key rotation automation

#### Monitoring & Analytics
- 🔧 Usage tracking across both systems
- 🔧 Unified audit logging
- 🔧 Performance monitoring
- 🔧 Admin management interface

### Phase 4: Advanced Features & Testing (Week 8-9)

#### Advanced Features
- 🔧 Bearer token support for CI/CD
- 🔧 Advanced scoping system
- 🔧 Webhook authentication
- 🔧 Bulk operations

#### Comprehensive Testing
- 🔧 Integration tests for dual-system auth
- 🔧 Performance testing with Redis caching
- 🔧 Security audit and penetration testing
- 🔧 Load testing for rate limiting

## 🔧 Technical Implementation Details

### FastMCP API Key Validation Middleware

```python
# backend/src/mcp_registry_gateway/middleware/api_key_validation.py
from fastmcp.server.middleware import MiddlewareContext, CallNext
from sqlalchemy import select, and_
from argon2 import PasswordHasher
import hashlib
import hmac

class APIKeyValidationMiddleware(BaseMiddleware):
    """Validate API keys against Better-Auth database tables."""

    def __init__(self, db_session_factory):
        super().__init__()
        self.db_session = db_session_factory
        self.hasher = PasswordHasher()

    async def on_request(self, context: MiddlewareContext, call_next: CallNext):
        """Validate API key from headers."""

        api_key = self._extract_api_key(context)
        if not api_key:
            return await call_next(context)  # No API key, continue with OAuth

        # Hash and validate against Better-Auth tables
        key_hash = self._hash_api_key(api_key)

        async with self.db_session() as session:
            result = await session.execute(
                select(api_keys, users)
                .join(users, api_keys.c.user_id == users.c.id)
                .where(
                    and_(
                        api_keys.c.key_hash == key_hash,
                        api_keys.c.expires_at > datetime.now(),
                        api_keys.c.is_active == True,
                        users.c.is_active == True
                    )
                )
            )

            api_key_data = result.first()
            if not api_key_data:
                raise FastMCPAuthenticationError("Invalid or expired API key")

            # Set user context for downstream middleware
            context.user_id = api_key_data.user_id
            context.tenant_id = api_key_data.tenant_id
            context.scopes = api_key_data.scopes
            context.auth_method = "api_key"

            # Log usage for analytics
            await self._log_api_key_usage(session, api_key_data.id, context)

        return await call_next(context)

    def _extract_api_key(self, context) -> str | None:
        """Extract API key from Authorization header or X-API-Key."""
        # Try Authorization: Bearer <key>
        auth_header = context.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:]

        # Try X-API-Key header
        return context.headers.get("x-api-key")

    def _hash_api_key(self, api_key: str) -> str:
        """Hash API key using same method as Better-Auth."""
        return hashlib.sha256(api_key.encode()).hexdigest()

    async def _log_api_key_usage(self, session, key_id: str, context):
        """Log API key usage for analytics."""
        await session.execute(
            insert(api_key_usage).values(
                key_id=key_id,
                endpoint=context.path,
                method=context.method,
                ip_address=context.client_ip,
                user_agent=context.headers.get("user-agent", ""),
                timestamp=datetime.now()
            )
        )
```

### Better-Auth Configuration with FastMCP Integration

```typescript
// frontend/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { apiKey, mcpProvider, admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: {
    provider: "postgres",
    url: process.env.DATABASE_URL!,
  },
  plugins: [
    apiKey({
      // API key configuration for FastMCP integration
      generateApiKey: async () => `mcp_${crypto.randomUUID().replace(/-/g, '')}`,
      expiresIn: 90 * 24 * 60 * 60, // 90 days
      prefix: "mcp_",
      keyLength: 32,

      // Hash configuration (must match FastMCP)
      hashFunction: (key: string) => {
        return crypto.createHash('sha256').update(key).digest('hex');
      },

      // Scoping system
      scopes: ["read", "write", "admin", "proxy", "metrics", "health"],

      // Rate limiting per key
      rateLimit: {
        requests: 1000,
        window: "1h",
        skipSuccessfulRequests: false,
      }
    }),

    // MCP OAuth provider for client applications
    mcpProvider({
      issuer: process.env.NEXT_PUBLIC_APP_URL!,
      discovery: true,
      scopes: ["mcp:server", "mcp:client", "mcp:admin"],

      // Integration with API keys
      allowApiKeyAuth: true,
      validateApiKeyScopes: true,
    }),

    // Admin interface for key management
    admin({
      baseURL: "/admin",
      admins: ["admin@example.com"], // Configure admin emails
    })
  ],

  // Session configuration
  session: {
    cookieName: "mcp-session",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
```

### Unified Rate Limiting with Redis

```python
# backend/src/mcp_registry_gateway/middleware/unified_rate_limit.py
import redis.asyncio as redis
from typing import Dict, Optional
import json

class UnifiedRateLimitMiddleware(BaseMiddleware):
    """Rate limiting for both OAuth and API key authentication."""

    def __init__(self, redis_client: redis.Redis):
        super().__init__()
        self.redis = redis_client

        # Rate limit configurations
        self.limits = {
            "oauth": {"requests": 500, "window": 3600},      # 500 RPH for OAuth
            "api_key": {"requests": 1000, "window": 3600},   # 1000 RPH for API keys
            "admin": {"requests": 5000, "window": 3600},     # 5000 RPH for admins
        }

    async def on_request(self, context: MiddlewareContext, call_next: CallNext):
        """Apply rate limiting based on authentication method."""

        # Determine authentication method and user ID
        auth_method = getattr(context, "auth_method", "oauth")
        user_id = getattr(context, "user_id", "anonymous")
        scopes = getattr(context, "scopes", [])

        # Determine rate limit tier
        if "admin" in scopes:
            limit_tier = "admin"
        elif auth_method == "api_key":
            limit_tier = "api_key"
        else:
            limit_tier = "oauth"

        # Check rate limit
        rate_limit_key = f"rate_limit:{limit_tier}:{user_id}"
        current_count = await self._check_rate_limit(
            rate_limit_key,
            self.limits[limit_tier]["requests"],
            self.limits[limit_tier]["window"]
        )

        if current_count > self.limits[limit_tier]["requests"]:
            raise FastMCPRateLimitError(
                f"Rate limit exceeded: {current_count}/{self.limits[limit_tier]['requests']} requests per hour"
            )

        # Add rate limit headers
        context.response_headers = {
            "X-RateLimit-Limit": str(self.limits[limit_tier]["requests"]),
            "X-RateLimit-Remaining": str(self.limits[limit_tier]["requests"] - current_count),
            "X-RateLimit-Reset": str(int(time.time()) + self.limits[limit_tier]["window"]),
        }

        return await call_next(context)

    async def _check_rate_limit(self, key: str, limit: int, window: int) -> int:
        """Check and increment rate limit using Redis sliding window."""
        current_time = int(time.time())
        pipeline = self.redis.pipeline()

        # Remove old entries
        pipeline.zremrangebyscore(key, 0, current_time - window)

        # Count current requests
        pipeline.zcard(key)

        # Add current request
        pipeline.zadd(key, {str(uuid.uuid4()): current_time})

        # Set expiration
        pipeline.expire(key, window)

        results = await pipeline.execute()
        return results[1]  # Current count
```

## 🔒 Enhanced Security Implementation

### API Key Security Features

1. **Secure Key Generation**: 32-character keys with `mcp_` prefix
2. **Hashing**: SHA-256 hashing (compatible with Better-Auth)
3. **Scoping**: Granular permissions (read, write, admin, proxy, metrics, health)
4. **Expiration**: 90-day automatic expiration with renewal notifications
5. **IP Whitelisting**: Optional IP restrictions per key
6. **Usage Logging**: Comprehensive audit trail for all API key operations

### Rate Limiting Security

1. **Multi-Tier Limits**: Different limits for OAuth, API keys, and admin users
2. **Redis Backend**: Distributed rate limiting with sliding window algorithm
3. **DDoS Protection**: Automatic IP blocking for excessive requests
4. **Burst Allowance**: Configurable burst limits for legitimate high-volume usage

## 📊 Monitoring & Analytics

### Unified Dashboard Features

1. **Authentication Analytics**: OAuth vs API key usage patterns
2. **Rate Limiting Metrics**: Request counts, throttling events, blocked IPs
3. **Security Events**: Failed authentications, suspicious activity, key rotation alerts
4. **Performance Monitoring**: Response times, error rates, system health

### Database Analytics Views

```sql
-- API key usage summary view
CREATE VIEW api_key_usage_summary AS
SELECT
    ak.id,
    ak.name,
    ak.key_prefix,
    u.email,
    COUNT(aku.id) as total_requests,
    COUNT(DISTINCT DATE(aku.timestamp)) as active_days,
    MAX(aku.timestamp) as last_used,
    AVG(EXTRACT(EPOCH FROM (aku.response_time))) as avg_response_time
FROM api_keys ak
JOIN users u ON ak.user_id = u.id
LEFT JOIN api_key_usage aku ON ak.id = aku.key_id
WHERE ak.expires_at > NOW()
GROUP BY ak.id, ak.name, ak.key_prefix, u.email;

-- Rate limiting analysis view
CREATE VIEW rate_limit_analysis AS
SELECT
    DATE(timestamp) as date,
    auth_method,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status_code = 429) as throttled_requests,
    ROUND(COUNT(*) FILTER (WHERE status_code = 429) * 100.0 / COUNT(*), 2) as throttle_rate
FROM request_logs
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp), auth_method
ORDER BY date DESC, auth_method;

-- Security events summary
CREATE VIEW security_events AS
SELECT
    DATE(timestamp) as date,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
WHERE event_type IN ('auth_failure', 'rate_limit_exceeded', 'invalid_api_key', 'suspicious_activity')
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), event_type
ORDER BY date DESC, event_type;
```

## 🧪 Testing Strategy

### Integration Testing

1. **Dual Authentication Flow**: Test OAuth and API key authentication in both systems
2. **Database Consistency**: Validate data integrity across Better-Auth and FastMCP
3. **Rate Limiting Accuracy**: Test rate limits with various authentication methods
4. **Failover Scenarios**: Test behavior when Redis or database is unavailable

### Security Testing

1. **API Key Validation**: Test key hashing, expiration, and scoping
2. **Rate Limit Bypass**: Attempt to circumvent rate limiting
3. **Session Security**: Test session hijacking and CSRF protection
4. **Permission Boundaries**: Verify scope-based access control

### Performance Testing

1. **High Volume API Key Usage**: Test with 10,000+ requests per minute
2. **Database Performance**: Validate query performance under load
3. **Redis Performance**: Test rate limiting with high concurrency
4. **Memory Usage**: Monitor memory consumption during peak usage

## 📅 Updated Timeline & Resources

### Timeline: 9 weeks total
- **Phase 1** (Weeks 1-3): Better-Auth setup + FastMCP integration
- **Phase 2** (Weeks 4-5): Unified authentication & rate limiting
- **Phase 3** (Weeks 6-7): Security & monitoring implementation
- **Phase 4** (Weeks 8-9): Advanced features & comprehensive testing

### Resource Requirements
- **2 Senior Full-Stack Developers**: Better-Auth + FastMCP integration
- **1 Security Engineer**: Authentication security, rate limiting algorithms
- **1 Database Specialist**: Schema optimization, analytics views
- **1 DevOps Engineer**: Redis setup, monitoring infrastructure
- **1 QA Engineer**: Integration testing, security validation

## 🎯 Success Metrics

### Technical Metrics
- **Authentication Success Rate**: >99.9% for valid credentials
- **Rate Limiting Accuracy**: >99.5% correct enforcement
- **API Key Validation Performance**: <50ms average validation time
- **Database Query Performance**: <100ms for API key lookups
- **Redis Performance**: <10ms for rate limit checks

### Security Metrics
- **Zero Security Incidents**: No unauthorized access or data breaches
- **Key Rotation Compliance**: 95% of keys rotated within 90 days
- **Audit Completeness**: 100% of operations logged
- **Failed Authentication Tracking**: All failures logged and monitored

### Business Metrics
- **Developer Experience**: <5 minutes to generate and use API key
- **System Reliability**: 99.9% uptime for authentication services
- **Scalability**: Support 100,000+ API requests per hour
- **Migration Success**: Zero data loss during implementation

This comprehensive plan integrates the FastMCP backend findings with the Better-Auth frontend approach, creating a robust dual-system authentication architecture that maintains the power of FastMCP's OAuth implementation while adding comprehensive API key management capabilities.