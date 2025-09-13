# MCP Registry Gateway

Enterprise-grade MCP (Model Context Protocol) Registry, Gateway, and Proxy System with unified database management, multi-tenancy support, and comprehensive authentication via Better-Auth.

## Quick Start

### Development Setup

1. **Backend Development:**
   ```bash
   cd backend
   uv sync
   uv run mcp-gateway serve --reload --port 8000
   ```

2. **Frontend Development:**
   ```bash
   cd frontend
   npm install
   npm run dev  # Uses --turbopack for faster development
   ```

3. **Docker Development:**
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

- **Unified Database Management**: All database operations consolidated in the frontend using Drizzle ORM
- **Comprehensive Schema**: Admin controls, audit logging, API management, and MCP server registry
- **Type-Safe**: Full TypeScript support with strict typing throughout
- **Production-Ready Logging**: Structured logging with context and environment awareness
- **Modern UI Components**: Radix UI primitives with Tailwind CSS styling

## Database Schema

The application uses a comprehensive database schema including:
- **Admin**: System configuration, feature flags, maintenance windows, announcements
- **Audit**: Audit logs, error tracking, system events, security events
- **API**: API keys, rate limiting, webhooks, and usage tracking
- **MCP**: Server registry, tool definitions, resource management, and protocol support
- **Auth**: User management, sessions, roles, and permissions (via Better-Auth)

For detailed documentation, see the project files and configuration examples.
