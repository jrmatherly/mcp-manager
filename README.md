# MCP Registry Gateway

Enterprise-grade MCP (Model Context Protocol) Registry, Gateway, and Proxy System with unified database management, multi-tenancy support, and comprehensive authentication via Better-Auth.

## Quick Start

For detailed setup instructions, see **[QUICKSTART.md](./QUICKSTART.md)**.

### Development Setup (TL;DR)

1. **Prerequisites:** Node.js ≥22, PostgreSQL ≥17, Redis ≥8

2. **Backend Development:**
   ```bash
   cd backend
   uv sync
   uv run mcp-gateway serve --reload --port 8000
   ```

3. **Frontend Development:**
   ```bash
   cd frontend
   npm install
   npm run db:setup:full    # Complete database setup with optimizations
   npm run dev              # Uses --turbopack for faster development
   ```

4. **Docker Development:**
   ```bash
   docker-compose up -d
   ```

## Architecture

The system follows a clean separation-of-concerns architecture:

### Frontend (TypeScript/Next.js)
- **Next.js 15.5.3** with React 19.1.1 application in `/frontend`
- **Database Management**: PostgreSQL schema definition and management via Drizzle ORM
- **Authentication**: Better-Auth with multi-provider OAuth and session management
- **User Interface**: Admin dashboards, user management, and system configuration
- **Database Operations**: All DDL operations, migrations, and schema modifications

### Backend (Python/FastAPI)
- **FastAPI** with FastMCP integration for MCP protocol handling in `/backend`
- **Operational Updates**: Database operational updates (health status, metrics, logging)
- **MCP Gateway**: Server proxy, routing, and protocol translation
- **Monitoring**: Prometheus metrics, health checks, and system observability
- **Connection Management**: Database connection pooling and read operations only

### Key Architectural Principles
- **No Overlap**: Frontend owns schema, Backend owns operations
- **Single Responsibility**: Each stack has clearly defined, non-overlapping responsibilities
- **Clean Integration**: Both systems work with the same PostgreSQL database without conflicts
- **Modern Stack**: TypeScript for type safety, Python for high-performance operations

## Key Features

### Database & Performance
- **Unified Database Management**: All database operations consolidated in the frontend using Drizzle ORM
- **Production-Ready Optimization**: 38 strategic indexes, 3 analytics functions, 3 monitoring views
- **Real-Time Analytics**: Performance monitoring, health summaries, and usage analytics
- **Database Health Monitoring**: Comprehensive health checks with `npm run db:health`
- **Multi-Tenant Architecture**: Isolated tenant configurations with shared infrastructure
- **Advanced Security**: Enhanced API keys, audit logging, circuit breakers

### Development Experience
- **Type-Safe**: Complete TypeScript support with Drizzle-generated types
- **Theme-Aware UI**: Comprehensive dark mode support with glassmorphism design system
- **TailwindCSS v4**: Enhanced performance with PostCSS integration and semantic color tokens
- **Enhanced Shadows**: Custom shadow utilities for dark mode visibility with glow effects
- **Comprehensive Testing**: Database optimization tests, integration tests, unit tests, theme testing
- **Modern Stack**: Next.js 15, React 19, Tailwind CSS v4, Better-Auth with Microsoft SSO
- **Production-Ready Logging**: Structured logging utility replacing all console.log statements
- **Automated Database Setup**: Complete setup with `npm run db:setup:full`
- **Migration Management**: Automated database migrations with rollback support
- **Clean Architecture**: No legacy code, deprecated endpoints, or backward compatibility layers
- **Singleton Patterns**: Middleware components prevent metric registration conflicts
- **Path-Based Security**: Authentication protects only necessary endpoints (`/mcp/*`)

### Authentication & Security
- **Multi-Provider SSO**: Google, GitHub, and Microsoft/Entra ID integration
- **Session Management**: Better-Auth with Redis caching for high performance
- **API Key Management**: Enhanced API keys with rate limiting and metadata
- **Role-Based Access**: Admin, server owner, and user roles with proper permissions

## Database Schema

The application uses a comprehensive, production-optimized database schema including:

### Core Tables
- **Auth**: Better-Auth compatible user management, sessions, accounts, verification
- **Admin**: System configuration, feature flags, maintenance windows, announcements
- **Audit**: Comprehensive audit logs, error tracking, system events, security events
- **API**: Enhanced API keys with security, rate limiting, webhooks, and usage tracking
- **MCP**: Server registry, tool definitions, resource management, and protocol support
- **Tenant**: Multi-tenancy support with isolated configurations

### Performance Optimizations
- **38 Strategic Indexes**: 33 essential + 5 composite indexes for 40-90% query performance improvement
- **3 Database Functions**: Real-time analytics (`get_server_health_summary`, `get_request_performance_summary`, `get_tenant_usage_summary`)
- **3 Monitoring Views**: Operational visibility (`database_size_summary`, `index_usage_summary`, `performance_monitoring`)
- **Automated Health Monitoring**: Database health checks with performance scoring
- **Full Text Search**: Advanced search capabilities across servers, tools, and resources
- **Time-Series Optimization**: Specialized indexes for metrics and request logs
- **Maintenance Automation**: Scheduled optimization tasks and analytics updates

### Schema Architecture
- **Frontend-Managed Schema**: All table definitions, indexes, and DDL operations in TypeScript
- **Better-Auth Integration**: Full compatibility with Better-Auth authentication flows
- **Backend Operational Layer**: Python backend performs only operational updates and reads
- **Type Safety**: Complete TypeScript types generated from Drizzle schema
- **No Schema Conflicts**: Clear separation prevents competing migrations or duplicate operations
- **Production Optimizations**: 38 strategic indexes and 3 monitoring views managed by frontend

## Recent Improvements

### Theme-Aware UI Enhancements
The application now features a comprehensive theme-aware UI system with significant improvements:

✅ **Enhanced Dark Mode Support**: Seamless theme switching with persistent user preferences
✅ **TailwindCSS v4 Migration**: Upgraded to v4 with PostCSS integration for better performance
✅ **Custom Shadow System**: Enhanced shadow utilities with glow effects for dark mode visibility
✅ **Semantic Color Tokens**: Migrated from hardcoded colors to theme-aware semantic tokens
✅ **Glassmorphism Design**: Modern glass-like UI effects with browser fallbacks
✅ **Logo Background Fix**: Resolved white background issues in dark mode
✅ **Interactive States**: Improved hover, focus, and active states across all themes
✅ **Performance Optimization**: Device-aware glass effects with mobile-first approach
✅ **Comprehensive Testing**: Theme testing patterns for both light and dark modes

### Key Achievements
- **100% Shadow Visibility**: All card shadows now visible in dark mode with enhanced glow effects
- **Semantic Color System**: Complete migration to theme-aware color tokens (`bg-card`, `text-foreground`, etc.)
- **Enhanced User Experience**: Smooth theme transitions with no layout shifts
- **Accessibility Compliance**: WCAG AA compliance maintained across all theme variants
- **Developer Experience**: Comprehensive documentation and testing patterns for theme-aware development
