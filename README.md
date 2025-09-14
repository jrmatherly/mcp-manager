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

- **Backend**: Python FastAPI with FastMCP integration in `/backend`
- **Frontend**: Next.js 15.5.3 with React 19.1.1 application in `/frontend`
- **Database**: PostgreSQL with Drizzle ORM (unified database management in frontend)
- **Authentication**: Better-Auth with session management and role-based access control
- **Logging**: Centralized logging utility with environment-aware configuration

## Key Features

### Database & Performance
- **Unified Database Management**: All database operations consolidated in the frontend using Drizzle ORM
- **Production-Ready Optimization**: 38 strategic indexes, 3 analytics functions, 3 monitoring views
- **Real-Time Analytics**: Performance monitoring, health summaries, and usage analytics
- **Multi-Tenant Architecture**: Isolated tenant configurations with shared infrastructure
- **Advanced Security**: Enhanced API keys, audit logging, circuit breakers

### Development Experience
- **Type-Safe**: Complete TypeScript support with Drizzle-generated types
- **Comprehensive Testing**: Database optimization tests, integration tests, unit tests
- **Modern Stack**: Next.js 15, React 19, Tailwind CSS v4, Better-Auth with Microsoft/Entra ID
- **Production-Ready Logging**: Structured logging utility replacing all console.log statements
- **Unified Database Management**: All database operations consolidated in frontend with TypeScript
- **Migration Management**: Automated database migrations with rollback support

## Database Schema

The application uses a comprehensive, production-optimized database schema including:

### Core Tables
- **Auth**: Better-Auth compatible user management, sessions, accounts, verification
- **Admin**: System configuration, feature flags, maintenance windows, announcements
- **Audit**: Comprehensive audit logs, error tracking, system events, security events
- **API**: Enhanced API keys with security, rate limiting, webhooks, and usage tracking
- **MCP**: Server registry, tool definitions, resource management, and protocol support
- **Tenant**: Multi-tenancy support with isolated configurations

### Performance Optimizations (Recently Implemented)
- **38 Strategic Indexes**: 33 essential + 5 composite indexes for 40-90% query performance improvement
- **3 Database Functions**: Real-time analytics (`get_server_health_summary`, `get_request_performance_summary`, `get_tenant_usage_summary`)
- **3 Monitoring Views**: Operational visibility (`database_size_summary`, `index_usage_summary`, `performance_monitoring`)
- **Consolidated SQL Management**: All SQL files moved from `frontend/src/db/sql/` to `frontend/drizzle/sql/`
- **Full Text Search**: Advanced search capabilities across servers, tools, and resources
- **Time-Series Optimization**: Specialized indexes for metrics and request logs

### Schema Compatibility
- **Better-Auth Integration**: Full compatibility with Better-Auth authentication flows
- **Backend Compatibility**: Schema alignment with Python FastAPI backend
- **Type Safety**: Complete TypeScript types generated from Drizzle schema
