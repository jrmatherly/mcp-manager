# Better Auth Specialist Agents

**Comprehensive specialist documentation for Better Auth authentication framework**

This directory contains project-specific specialist agent documentation designed to provide expert-level guidance for every aspect of Better Auth implementation, from core authentication to advanced enterprise features.

## 🎯 Agent Overview

### Architecture Summary
Better Auth is a **framework-agnostic TypeScript authentication library** that provides:
- **Core Authentication**: Email/password, session management, user registration
- **Social Integration**: OAuth providers (Google, GitHub, Apple, Microsoft, etc.)
- **Advanced Features**: 2FA, magic links, passkeys, organization management
- **Database Flexibility**: Multiple adapter support (Drizzle, Prisma, Kysely)
- **Security Focus**: Built-in CSRF protection, rate limiting, audit logging

Each specialist agent provides deep expertise in their domain while understanding the complete Better Auth ecosystem.

## 📚 Available Specialist Agents

### Core Authentication Agents (Split from original Auth Core Specialist)

#### 1. [Auth Setup Specialist](./auth-setup-specialist.md) 🚀 **INSTALLATION & SETUP**
**Role**: Better Auth installation, project setup, CLI operations, initial configuration  
**Key Expertise**:
- `betterAuth()` initialization and configuration
- CLI operations (init, generate, migrate, info, secret)
- Environment variable setup
- Database schema creation
- Framework route handler setup

**When to Use**: Installation, project setup, CLI commands, environment configuration, initial setup issues

#### 2. [Auth Client Specialist](./auth-client-specialist.md) 💻 **CLIENT-SIDE EXPERT**
**Role**: Client library integration, framework-specific hooks, client-side authentication flows  
**Key Expertise**:
- Framework-agnostic client setup (React, Vue, Svelte, Solid)
- Client hooks (useSession, useUser, framework-specific patterns)
- Better-Fetch integration and client configuration
- Client-side session management
- Sign-up/sign-in flow implementation

**When to Use**: Client library setup, framework hooks, client-side authentication, form handling

#### 3. [Auth Server Specialist](./auth-server-specialist.md) 🖥️ **SERVER-SIDE EXPERT**
**Role**: Server-side API usage, authentication routes, server-side patterns  
**Key Expertise**:
- Server-side API structure through `auth.api`
- Authentication API routes and middleware
- Protected route patterns
- Server-side session management
- APIError handling and Better-Call integration

**When to Use**: Server API usage, protected routes, middleware patterns, server-side session management

#### 4. [Auth TypeScript Specialist](./auth-typescript-specialist.md) 📘 **TYPESCRIPT & PERFORMANCE**
**Role**: TypeScript integration, type safety, performance optimization  
**Key Expertise**:
- Full TypeScript integration and type safety
- $Infer patterns for client-server type synchronization
- Strict mode requirements and type inference
- Performance optimization strategies
- Cookie-based session caching (30-40% improvement)

**When to Use**: TypeScript issues, type safety, performance optimization, caching strategies

#### 5. [Auth Config Specialist](./auth-config-specialist.md) ⚙️ **CONFIGURATION & TROUBLESHOOTING**
**Role**: Configuration reference, troubleshooting, advanced settings  
**Key Expertise**:
- Complete configuration reference and options
- Telemetry configuration and privacy settings
- Comprehensive troubleshooting and FAQ
- Common integration issues and solutions
- Quality standards and best practices

**When to Use**: Configuration reference, troubleshooting, FAQ, telemetry setup, common issues

### Domain-Specific Agents

#### 6. [Auth OAuth Specialist](./auth-oauth-specialist.md) 🔗 **OAUTH PROVIDER EXPERT**
**Role**: OAuth provider configuration, OAuth flows, and API authentication patterns  
**Key Expertise**:
- Google, GitHub, Apple, Microsoft OAuth configuration
- OAuth Proxy plugin and Generic OAuth plugin
- Bearer token API authentication for mobile/SPA
- Provider-specific configuration and token management
- Custom OAuth provider implementation

**When to Use**: OAuth provider setup, Bearer token authentication, custom OAuth providers, token management

#### 7. [Auth Social Specialist](./auth-social-specialist.md) 🎨 **SOCIAL UI & UX EXPERT**
**Role**: Social provider implementations and user interface patterns  
**Key Expertise**:
- Social login UI components and multi-provider setups
- Account linking user interface and conflict resolution
- Provider management UI and social authentication UX
- Framework-specific social authentication components
- Social provider analytics and user behavior tracking

**When to Use**: Social login UI, account linking flows, social authentication UX, provider management interfaces

### Security Specialist Agents (Split from original Auth Security Specialist)

#### 8. [Auth JWT Specialist](./auth-jwt-specialist.md) 🔑 **JWT TOKEN EXPERT**
**Role**: JWT token security, JWKS configuration, token verification, and key management  
**Key Expertise**:
- JWT token verification and validation security
- JWKS security configuration and key management
- Private key encryption and algorithm configuration (EdDSA, ES256, RSA256, etc.)
- Custom JWT signing with KMS integration (Google KMS, AWS KMS, Azure Key Vault)
- Bearer token authentication security
- Token issuance and expiration management

**When to Use**: JWT security, JWKS configuration, token verification, Bearer tokens, key management, KMS integration

#### 9. [Auth Protection Specialist](./auth-protection-specialist.md) 🛡️ **PROTECTION MIDDLEWARE**
**Role**: CSRF protection, rate limiting, trusted origins, and security policies  
**Key Expertise**:
- CSRF protection implementation and configuration
- Rate limiting configuration and custom rules
- Trusted origins and wildcard patterns
- IP address security configuration
- Cookie security implementation
- Security headers and middleware

**When to Use**: CSRF protection, rate limiting, trusted origins, IP security, cookie security, security headers

#### 10. [Auth Password Specialist](./auth-password-specialist.md) 🔒 **PASSWORD & SESSION EXPERT**
**Role**: Password security, hashing, breach checking, and session management  
**Key Expertise**:
- Password strength validation and policies
- Password hashing implementation (Argon2id, bcrypt, scrypt)
- Password breach checking with Have I Been Pwned
- Session security and timeout management
- Password reset and recovery flows
- Account lockout policies

**When to Use**: Password policies, password hashing, breach checking, session security, password reset flows

#### 11. [Auth 2FA Specialist](./auth-2fa-specialist.md) 🛡️ **TWO-FACTOR AUTHENTICATION**
**Role**: Two-factor authentication implementation and security  
**Key Expertise**:
- TOTP (Time-based One-Time Password) with authenticator apps
- SMS-based 2FA with Twilio integration
- Email-based 2FA with custom templates
- Backup codes management and recovery procedures
- 2FA verification flows and user experience optimization

**When to Use**: 2FA setup, TOTP configuration, SMS verification, email 2FA, backup codes, 2FA security patterns

#### 12. [Auth Passwordless Specialist](./auth-passwordless-specialist.md) ✨ **PASSWORDLESS AUTHENTICATION**
**Role**: Passwordless authentication methods and modern security  
**Key Expertise**:
- Magic links with email delivery and secure tokens
- Email OTP (One-Time Password) implementation
- Passkey/WebAuthn configuration and biometric authentication
- Device-based authentication and cross-platform support
- Passwordless user experience optimization

**When to Use**: Magic links, email OTP, passkeys, WebAuthn, biometric authentication, passwordless flows

#### 13. [Auth Plugin Dev Specialist](./auth-plugin-dev-specialist.md) 🔧 **CUSTOM PLUGIN DEVELOPMENT**
**Role**: Custom plugin development and architecture  
**Key Expertise**:
- Custom plugin development and architecture patterns
- Plugin endpoint creation and database schema extensions
- Middleware systems and hook implementation
- OpenAPI documentation generation for plugins
- Plugin ecosystem integration and coordination

**When to Use**: Custom plugin development, plugin architecture, endpoint creation, OpenAPI documentation, advanced plugin patterns

### Database Specialist Agents (Split from original Auth Database Specialist)

#### 14. [Auth Schema Specialist](./auth-schema-specialist.md) 📐 **SCHEMA DESIGN EXPERT**
**Role**: Database schema design, migrations, and table structure  
**Key Expertise**:
- Database schema design for Better Auth tables
- Schema generation with CLI commands
- Database migrations and versioning
- Custom schema modifications
- Table relationships and constraints
- Database initialization patterns

**When to Use**: Schema design, migrations, table structure, custom fields, schema generation

#### 15. [Auth Adapter Specialist](./auth-adapter-specialist.md) 🔌 **ADAPTER CONFIGURATION**
**Role**: Database adapter configuration and connection management  
**Key Expertise**:
- Drizzle, Prisma, Kysely adapter setup
- MongoDB adapter configuration
- Direct database connections
- Custom adapter development
- Connection pool management
- Redis secondary storage integration

**When to Use**: Adapter setup, ORM configuration, connection issues, custom adapters, Redis integration

#### 16. [Auth DB Performance Specialist](./auth-db-performance-specialist.md) ⚡ **PERFORMANCE OPTIMIZATION**
**Role**: Database performance optimization and monitoring  
**Key Expertise**:
- Database indexing strategies
- Query optimization techniques
- Connection pool tuning
- Performance monitoring and profiling
- Bulk operations and batch processing
- Database-specific optimizations

**When to Use**: Performance issues, indexing, query optimization, monitoring, bulk operations

#### 17. [Auth Provider Specialist](./auth-provider-specialist.md) 🏭 **OAUTH PROVIDER EXPERT**
**Role**: OAuth provider configuration, JWT OAuth provider mode, token issuance, MCP provider plugin  
**Key Expertise**:
- OAuth provider mode configuration for external clients
- JWT OAuth provider mode and token issuance
- JWKS discovery endpoint configuration
- MCP provider plugin integration
- OAuth-compliant token endpoints and flows
- Access token management and validation
- OAuth discovery metadata configuration
- Provider-side authentication and authorization

**When to Use**: Setting up Better Auth as OAuth provider, JWT token issuance, JWKS discovery, MCP provider integration, OAuth compliance

#### 18. [Auth OIDC Provider Specialist](./auth-oidc-provider-specialist.md) 🌐 **OPENID CONNECT PROVIDER EXPERT**
**Role**: Full OIDC provider implementation, client registration, consent management, PKCE flows  
**Key Expertise**:
- Complete OpenID Connect provider implementation
- Client registration (dynamic and trusted clients)
- Authorization Code Flow with PKCE support
- JWKS endpoint integration for token verification
- Consent screen management and user authorization
- UserInfo endpoint implementation
- OAuth application and token management
- Full OIDC compliance for external applications

**When to Use**: Building complete OIDC provider, client registration, consent screens, PKCE implementation, UserInfo endpoints, full OIDC specification compliance

#### 19. [Auth Admin Specialist](./auth-admin-specialist.md) 👨‍💼 **ADMIN OPERATIONS EXPERT**
**Role**: Administrative operations expert for user management and elevated permissions  
**Key Expertise**:
- User management operations (create, update, delete users)
- Role management and assignments (admin roles, permissions)
- User banning and unbanning with reason tracking
- Session management (view, revoke user sessions)
- User impersonation for support and debugging
- Administrative API endpoints and elevated permissions
- Audit logging for administrative actions
- Admin dashboard functionality and interfaces

**When to Use**: Admin operations, user management, role assignments, user banning, impersonation, audit logging

#### 20. [Auth Organization Specialist](./auth-organization-specialist.md) 🏛️ **MULTI-TENANT EXPERT**
**Role**: Multi-tenant organization management expert  
**Key Expertise**:
- Organization CRUD operations with lifecycle hooks
- Member management (invitations, roles, permissions)
- Team functionality within organizations
- Role-based access control with dynamic permissions
- Invitation system (send, accept, reject, manage)
- Multi-tenancy patterns and data isolation
- Organizational hierarchy and complex organizational structures
- Context-aware permission checking and access control

**When to Use**: Multi-tenant apps, organization management, team features, RBAC, invitation systems

#### 21. [Auth SSO Specialist](./auth-sso-specialist.md) 🏢 **ENTERPRISE SSO EXPERT**

**Role**: Enterprise Single Sign-On implementation with OIDC, OAuth2, and SAML 2.0 support  

**Key Expertise**:
- SSO plugin comprehensive implementation with user provisioning
- OIDC and OAuth2 provider integration for enterprise SSO  
- SAML 2.0 Service Provider configuration and metadata management
- Dynamic SSO provider registration and domain-based authentication
- User and organization provisioning workflows
- Enterprise SSO security patterns and certificate validation
- Multi-provider SSO setup and organization management integration
- SSO troubleshooting and performance optimization

**When to Use**: Enterprise SSO integration, SAML configuration, domain-based authentication, user provisioning, organization management with SSO, multi-provider enterprise setup

## 🚀 Quick Start Guide

### 1. Initial Setup Consultation
Start with the **Auth Setup Specialist** for foundational setup:
```bash
# Initialize Better Auth project
npx @better-auth/cli init

# Generate database schema
npx @better-auth/cli generate

# Start development
npm run dev
```

### 2. Social Authentication Setup
Consult **Auth OAuth Specialist** for OAuth providers:
```bash
# Configure environment variables for providers
GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_ID=your-github-client-id

# Test OAuth flows
curl -X GET "http://localhost:3000/api/auth/signin/google"
```

### 3. Security Configuration
Use **Auth Security Specialist** for security hardening:
```bash
# Configure security settings
BETTER_AUTH_SECRET=your-secret-key
ENABLE_RATE_LIMITING=true
ENABLE_CSRF_PROTECTION=true
```

### 4. Advanced Features
Leverage **Auth Plugin Specialist** for enhanced functionality:
```bash
# Enable advanced plugins
ENABLE_2FA=true
ENABLE_MAGIC_LINK=true
ENABLE_ORGANIZATIONS=true
```

## 📋 Agent Coordination Matrix

### Common Workflow Patterns

| Task Category | Primary Agent | Supporting Agents | Coordination Pattern |
|---------------|---------------|------------------|---------------------|
| **Initial Setup** | Auth Setup Specialist | Database Specialist | Setup → Database → Security |
| **Client Implementation** | Auth Client Specialist | TypeScript, Server | Client → TypeScript → Server |
| **Server Implementation** | Auth Server Specialist | TypeScript, Security | Server → TypeScript → Security |
| **Social Login** | Auth OAuth Specialist | Auth Social Specialist, Security | OAuth → Social UI → Security |
| **Security Hardening** | Auth Security Specialist | Server, Database | Security → Server → Database |
| **TypeScript Issues** | Auth TypeScript Specialist | Client, Server | TypeScript → Client/Server → Config |
| **Configuration Issues** | Auth Config Specialist | Setup, TypeScript | Config → Setup → TypeScript |
| **2FA Setup** | Auth 2FA Specialist | Client, Security | 2FA → Client → Security |
| **Passwordless Auth** | Auth Passwordless Specialist | Client, Security | Passwordless → Client → Security |
| **Custom Plugins** | Auth Plugin Dev Specialist | Security, Database | Plugin Dev → Security → Database |
| **Database Issues** | Auth Database Specialist | Setup, Plugin Dev | Database → Setup → Plugin Dev |
| **Admin Operations** | Auth Admin Specialist | Server, Security | Admin → Server → Security |
| **Organization Management** | Auth Organization Specialist | Database, Security | Organization → Database → Security |
| **OAuth Provider Setup** | Auth Provider Specialist | Security, Server | Provider → Security → Server |
| **OIDC Provider Setup** | Auth OIDC Provider Specialist | Security, Database, Provider | OIDC Provider → Security → Database |
| **Enterprise SSO Setup** | Auth SSO Specialist | Security, Plugin, Database | SSO → Security → Plugin → Database |
| **JWT Token Management** | Auth Security Specialist | Provider Specialists | Security ↔ Provider ↔ OIDC Provider (coordinated) |

### Agent Delegation Rules
1. **Start with Setup Specialist** for installation and configuration questions
2. **Use Client/Server Specialists** for implementation-specific guidance
3. **Route to TypeScript Specialist** for type safety and performance
4. **Use Config Specialist** for troubleshooting and configuration reference
5. **Coordinate through Security** for security-related concerns
6. **Use Database Specialist** for data modeling and performance

## 🔧 Implementation Status Reference

### ✅ Better Auth Features Covered
All specialist agents document **comprehensive Better Auth functionality**:

- **Core Authentication**: Email/password, session management ✅
- **Social Providers**: Google, GitHub, Apple, Microsoft, Discord, Facebook ✅
- **Security Features**: CSRF protection, rate limiting, password policies, JWT security ✅
- **JWT Token Management**: JWT plugin, token verification, JWKS security, OAuth provider mode ✅
- **OAuth Provider**: Acting as OAuth server, token issuance, discovery endpoints ✅
- **OIDC Provider**: Full OpenID Connect provider, client registration, consent management, PKCE flows ✅
- **Enterprise SSO**: OIDC, OAuth2, and SAML 2.0 integration with user and organization provisioning ✅
- **Advanced Plugins**: 2FA, magic links, passkeys, organizations ✅
- **Database Support**: Drizzle, Prisma, Kysely adapters ✅
- **TypeScript Integration**: Full type safety and validation ✅

### 🔄 Enhancement Areas
Areas for additional development:

- **Custom Plugin Development**: Advanced plugin creation patterns
- **Performance Optimization**: Advanced caching strategies
- **Monitoring Integration**: Comprehensive observability
- **Testing Patterns**: Authentication testing frameworks

## 📖 Usage Patterns

### For New Team Members
1. **Start with**: [Auth Setup Specialist](./auth-setup-specialist.md) - Foundation understanding
2. **Follow with**: [Auth OAuth Specialist](./auth-oauth-specialist.md) - OAuth configuration
3. **Then**: [Auth Social Specialist](./auth-social-specialist.md) - Social authentication UI
4. **Deep dive**: Relevant specialist based on project requirements

### For Specific Issues
```bash
# Authentication setup issues
→ Auth Setup Specialist → Auth Adapter Specialist

# Social login problems  
→ Auth OAuth Specialist → Auth Social Specialist → Auth Security Specialist

# Security concerns
→ Auth JWT Specialist → Auth Protection Specialist → Auth Password Specialist

# Advanced features
→ Auth Plugin Dev Specialist → Auth 2FA Specialist → Auth Passwordless Specialist

# Database/performance issues
→ Auth DB Performance Specialist → Auth Schema Specialist → Auth Adapter Specialist
```

### For Project Architecture
1. **Auth Setup Specialist**: Foundation and basic flows
2. **Auth OAuth Specialist**: OAuth provider configuration and API authentication
3. **Auth Social Specialist**: Social authentication UI and user experience
4. **Auth JWT Specialist**: Token security and API authentication
5. **Auth Schema Specialist**: Data modeling and database architecture

## 🎯 Quality Standards

### Agent Documentation Quality
- **Framework-Specific**: All examples use Better Auth patterns
- **Implementation-Ready**: Code examples are production-ready
- **TypeScript-First**: Full type safety and validation
- **Security-Focused**: Security best practices throughout

### Coordination Standards
- **Cross-Agent References**: Agents reference each other appropriately
- **Workflow Integration**: Clear delegation and escalation patterns
- **Context Preservation**: Consistent terminology and patterns
- **Documentation Links**: References to official Better Auth docs

## 📞 Quick Reference

### Health Check Commands
```bash
# Test Better Auth endpoints
curl -X GET http://localhost:3000/api/auth/session
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Database validation
npx @better-auth/cli generate --dry-run
```

### Configuration Validation
```bash
# Validate Better Auth configuration
node -e "
const { auth } = require('./lib/auth');
console.log('Better Auth configuration valid');
"

# Test database connection
node -e "
const { db } = require('./lib/db');
db.query('SELECT 1').then(() => console.log('Database connected'));
"
```

### Development Tools
```bash
# Better Auth CLI commands
npx @better-auth/cli init          # Initialize project
npx @better-auth/cli generate      # Generate schema
npx @better-auth/cli migrate       # Run migrations

# Development server with auth
npm run dev
```

## 📈 Success Metrics

### Agent Effectiveness Metrics
- **Resolution Time**: Average time to resolve authentication issues
- **Implementation Success**: Success rate of following agent recommendations
- **Cross-Agent Coordination**: Effectiveness of agent delegation patterns
- **Knowledge Completeness**: Coverage of Better Auth scenarios

### Better Auth Health Indicators
- **Authentication Success Rate**: Sign-up/sign-in success >95%
- **Social Provider Integration**: OAuth flow success >95%
- **Security Compliance**: Security audit compliance >95%
- **Performance Metrics**: Authentication response times <200ms

---

## 🤝 Contributing

When updating agent documentation:

1. **Maintain Better Auth Specificity**: All examples must use actual Better Auth patterns
2. **Validate Implementation**: Test all code examples against Better Auth
3. **Cross-Reference Updates**: Update related agents when patterns change
4. **Quality Standards**: Follow established documentation quality guidelines

## 📝 Version History

- **v1.0** (2025-01-11): Initial comprehensive Better Auth agent documentation
- **v1.1** (2025-01-11): Added OIDC Provider specialist agent with full OpenID Connect support
- **v2.0** (2025-01-11): Major restructuring - Phase 1 - Split auth-core-specialist into 5 focused agents
  - Created auth-setup-specialist (installation, CLI, environment)
  - Created auth-client-specialist (client libraries, hooks, frameworks)
  - Created auth-server-specialist (server API, routes, middleware)
  - Created auth-typescript-specialist (TypeScript, performance optimization)
  - Created auth-config-specialist (configuration reference, troubleshooting)
- **v2.1** (2025-01-11): Major restructuring - Phase 2 - Split auth-security-specialist into 3 focused agents
  - Created auth-jwt-specialist (JWT tokens, JWKS, Bearer authentication)
  - Created auth-protection-specialist (CSRF, rate limiting, security middleware)
  - Created auth-password-specialist (passwords, sessions, breach checking)
- **v2.2** (2025-01-11): Major restructuring - Phase 3a - Split auth-database-specialist into 3 focused agents
  - Created auth-schema-specialist (schema design, migrations, table structure)
  - Created auth-adapter-specialist (Drizzle, Prisma, Kysely adapters)
  - Created auth-db-performance-specialist (indexing, optimization, monitoring)
- **v2.3** (2025-01-11): Major restructuring - Phase 3b - Split auth-plugin-specialist into 3 focused agents
  - Created auth-2fa-specialist (TOTP, SMS, email 2FA, backup codes)
  - Created auth-passwordless-specialist (magic links, email OTP, passkeys/WebAuthn)
  - Created auth-plugin-dev-specialist (custom plugin development, OpenAPI documentation)
- **v2.4** (2025-01-11): OAuth Integration Split - Split auth-integration-specialist into 2 focused agents
  - Created auth-oauth-specialist (OAuth provider configuration, Bearer token API authentication, OAuth flows)
  - Created auth-social-specialist (Social provider implementations, UI components, account linking UX)
- **v2.5** (2025-01-11): Complete restructuring finalized - 21 focused specialist agents
  - All remaining agents copied from large-fullsized-subagents folder
  - Total agents: 21 (auth-admin, auth-organization, auth-sso, auth-oidc-provider added)
- **Framework**: Better Auth TypeScript authentication framework
- **Coverage**: 21 specialist agents providing comprehensive, focused expertise
- **Implementation**: Aligned with Claude Code Subagents best practices - focused scope, optimal size (500-1400 lines)

**Status**: ✅ **COMPLETE** - 21 Better Auth specialist agents fully restructured and optimized
