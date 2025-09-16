# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-15-server-registration-foundation/spec.md

## Technical Requirements

### Backend Implementation

- **API Framework**: FastAPI with Pydantic validation models for all request/response schemas
- **Authentication Middleware**: Integration with Better-Auth session validation for all `/mcp/*` endpoints
- **Database Operations**: Drizzle ORM queries through frontend API, operational updates via SQLAlchemy
- **API Key Generation**: Cryptographically secure 64-character keys with `mcp_` prefix using secrets.token_urlsafe()
- **Rate Limiting**: Redis-backed rate limiting with role-based limits (Admin: 1000 RPM, User: 100 RPM)
- **Health Checks**: Async health monitoring with 10-second timeout and exponential backoff for failures
- **Audit Logging**: Structured JSON logs with correlation IDs, stored in audit_logs table with 7-year retention

### Frontend Implementation

- **Component Architecture**: React 19.1.1 functional components with TypeScript strict mode
- **State Management**: React Context for server state, React Query for API cache management
- **UI Framework**: TailwindCSS v4 with glassmorphism design system and dark mode support
- **Form Handling**: React Hook Form with Zod validation schemas matching backend Pydantic models
- **Real-time Updates**: WebSocket connection for health status updates (fallback to polling)
- **Table Components**: Tanstack Table v8 for server listings with sorting, filtering, and pagination
- **Toast Notifications**: Error handling with user-friendly toast messages for all operations

### Database Schema

- **New Tables**: mcp_servers, mcp_api_keys, mcp_server_health, audit_logs (if not exists)
- **Indexes**: Composite index on (tenant_id, status) for server queries, index on api_key_hash for lookups
- **Constraints**: Unique constraint on (tenant_id, server_name), foreign key constraints with CASCADE
- **Migration Strategy**: Drizzle migrations with rollback support, versioned migration files

### Security Requirements

- **Input Validation**: All inputs sanitized with DOMPurify (frontend) and Pydantic (backend)
- **SQL Injection Protection**: Parameterized queries only, no raw SQL execution
- **XSS Prevention**: React's automatic escaping + Content Security Policy headers
- **API Key Storage**: SHA-256 hashed keys in database, never store plaintext
- **CORS Configuration**: Strict origin validation, credentials required for API calls
- **Session Management**: 60-minute session timeout with automatic renewal on activity

### Performance Criteria

- **API Response Times**: <200ms for simple queries, <500ms for complex operations
- **Dashboard Load Time**: Initial render <2 seconds, subsequent navigations <500ms
- **Concurrent Users**: Support 100+ concurrent admin users per tenant
- **Database Query Performance**: All queries <10ms with proper indexing
- **Health Check Efficiency**: Parallel health checks with max 10-second timeout
- **Pagination**: 50 servers per page default, configurable up to 200

## External Dependencies

**react-hook-form** - Performant forms with easy validation
**Justification:** Reduces boilerplate for complex server configuration forms, integrates well with our Zod schemas

**@tanstack/react-table** - Powerful table component for server listings
**Justification:** Provides sorting, filtering, pagination out of the box with excellent TypeScript support

**react-hot-toast** - Lightweight toast notifications
**Justification:** User-friendly error/success feedback with minimal bundle impact

**dompurify** - XSS sanitization library
**Justification:** Additional security layer for user-provided server descriptions and configurations