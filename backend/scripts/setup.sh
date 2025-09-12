#!/bin/bash

# MCP Registry Gateway Setup Script

set -e

echo "🚀 MCP Registry Gateway Setup"
echo "=============================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration values"
fi

# Install dependencies
echo "Installing dependencies..."
uv sync --all-groups

echo "Installing global development tools..."
# Install standalone CLI tools globally
uv tool install ruff
uv tool install mypy  
uv tool install pytest
uv tool install coverage

# Check PostgreSQL connection (optional)
if command -v psql &> /dev/null; then
    echo "🗄️  Checking PostgreSQL..."
    # Uncomment and modify if you want to create database
    # psql -U postgres -c "CREATE DATABASE mcp_registry IF NOT EXISTS;"
else
    echo "⚠️  PostgreSQL client not found. Please ensure PostgreSQL is running."
fi

# Check Redis connection (optional)
if command -v redis-cli &> /dev/null; then
    echo "📮 Checking Redis..."
    redis-cli ping > /dev/null 2>&1 && echo "✅ Redis is running" || echo "⚠️  Redis is not running"
else
    echo "⚠️  Redis client not found. Please ensure Redis is running."
fi

# Initialize database tables
echo "🗃️  Initializing database..."
uv run mcp-gateway init-db

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Ensure PostgreSQL and Redis are running"
echo "3. Start server: uv run mcp-gateway serve --port 8001"
echo "4. Run demo: uv run mcp-demo"
echo ""
echo "For development:"
echo "  uv run mcp-gateway serve --log-level debug --reload"