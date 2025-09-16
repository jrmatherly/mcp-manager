# Technical Stack

> Last Updated: 2025-09-15
> Version: 1.0.0

## Application Framework

- **Framework:** Next.js
- **Version:** 15.5.3
- **Justification:** Full-stack React framework with API routes, built-in optimization, and enterprise-grade performance

## Database

- **Primary Database:** PostgreSQL
- **Version:** 17
- **Justification:** Enterprise-grade ACID compliance, advanced indexing, and JSON support for flexible schema evolution

## JavaScript

- **Framework:** React
- **Version:** 19.1.1
- **Import Strategy:** Node.js ES Modules
- **Justification:** Component-based architecture with hooks for complex state management and real-time updates

## CSS Framework

- **Framework:** TailwindCSS
- **Version:** v4
- **Justification:** Utility-first CSS with theme-aware design system, dark mode support, and glassmorphism effects

## UI Component System

- **Component Library:** Custom glassmorphism design system
- **Icons:** Lucide React
- **Fonts:** System fonts for optimal performance
- **Justification:** Consistent enterprise UI with modern aesthetic and accessibility compliance

## Backend Architecture

- **API Framework:** FastAPI (Python)
- **Version:** ≥0.114.2
- **Package Manager:** UV (Python package management)
- **Authentication:** Better-Auth with multi-provider OAuth
- **Justification:** High-performance async API with automatic OpenAPI documentation and type safety

## Database Management

- **ORM:** Drizzle ORM (TypeScript)
- **Migration Strategy:** Automated with rollback support
- **Performance:** 38 strategic indexes, 3 analytics functions, 3 monitoring views
- **Health Monitoring:** Automated performance scoring and optimization
- **Justification:** Type-safe database operations with enterprise performance optimization

## Authentication & Security

- **Authentication System:** Better-Auth
- **OAuth Providers:** Microsoft Azure AD, Google, GitHub
- **Session Management:** JWT with configurable timeout
- **Role Management:** 6-tier hierarchy with Azure AD group mapping
- **API Security:** Rate limiting, audit logging, multi-tenant isolation

## Development & Testing

- **Testing Framework:** Vitest (frontend), pytest (backend)
- **Type Checking:** TypeScript 5.9.2, mypy (Python)
- **Code Quality:** ESLint, Ruff (Python), automated quality gates
- **Environment Management:** T3 Env for type-safe configuration

## Deployment & Infrastructure

- **Containerization:** Docker with Docker Compose orchestration
- **Application Hosting:** Docker-ready (cloud-agnostic)
- **Database Hosting:** PostgreSQL (self-hosted or cloud)
- **Asset Hosting:** Next.js static assets with CDN-ready optimization
- **Environment Configuration:** Multi-stage with production security hardening

## Monitoring & Analytics

- **Metrics:** Prometheus with custom business metrics
- **Logging:** Structured logging with audit trail compliance
- **Health Monitoring:** Database performance scoring and automated alerts
- **Analytics:** Real-time usage analytics and access pattern monitoring

## Performance Optimization

- **Database:** 38 performance indexes, query optimization, connection pooling
- **Frontend:** Next.js optimization, React 19 concurrent features, lazy loading
- **Caching:** Multi-layer caching strategy with Redis integration ready
- **Rate Limiting:** Role-based limits (1000 RPM admin → 20 RPM anonymous)

## Security Architecture

- **Access Control:** Role-based with Azure AD integration
- **Data Protection:** Multi-tenant isolation, audit logging, encryption at rest
- **Compliance:** GDPR-ready audit trails, access analytics, compliance reporting
- **API Security:** Authentication middleware, request validation, security headers