#!/usr/bin/env python3
"""
Database setup script for MCP Registry Gateway.

Creates the PostgreSQL database if it doesn't exist and verifies
all database connections are working.
"""

import asyncio
import sys
from pathlib import Path

import redis.asyncio as redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from mcp_registry_gateway.core.config import get_settings


# Add src to path for imports
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))


async def create_database_if_not_exists():
    """Create the PostgreSQL database if it doesn't exist."""
    settings = get_settings()

    # Connect to postgres database to create our target database
    postgres_url = (
        f"postgresql+asyncpg://{settings.database.postgres_user}:"
        f"{settings.database.postgres_password.get_secret_value()}@"
        f"{settings.database.postgres_host}:{settings.database.postgres_port}/postgres"
    )

    print(
        f"🔗 Connecting to PostgreSQL server at {settings.database.postgres_host}:{settings.database.postgres_port}"
    )

    try:
        engine = create_async_engine(postgres_url, isolation_level="AUTOCOMMIT")

        async with engine.connect() as conn:
            # Check if database exists
            result = await conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": settings.database.postgres_db},
            )

            if not result.fetchone():
                print(f"📦 Creating database '{settings.database.postgres_db}'...")
                await conn.execute(
                    text(f"CREATE DATABASE {settings.database.postgres_db}")
                )
                print(
                    f"✅ Database '{settings.database.postgres_db}' created successfully"
                )
            else:
                print(f"✅ Database '{settings.database.postgres_db}' already exists")

        await engine.dispose()

    except Exception as e:
        print(f"❌ Failed to create database: {e}")
        print("💡 Make sure PostgreSQL is running and credentials are correct")
        return False

    return True


async def test_postgresql_connection():
    """Test PostgreSQL connection with the application database."""
    settings = get_settings()

    print(f"🧪 Testing PostgreSQL connection to '{settings.database.postgres_db}'...")

    try:
        engine = create_async_engine(settings.database.postgres_url)

        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print("✅ PostgreSQL connection successful")
            print(f"   Version: {version}")

        await engine.dispose()
        return True

    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False


async def test_redis_connection():
    """Test Redis connection."""
    settings = get_settings()

    print(
        f"🧪 Testing Redis connection to {settings.database.redis_host}:{settings.database.redis_port}..."
    )

    try:
        client = redis.from_url(settings.database.redis_url)

        # Test basic operations
        await client.ping()
        await client.set("test_key", "test_value", ex=10)
        value = await client.get("test_key")
        if value != b"test_value":
            raise RuntimeError(
                f"Redis test failed: expected b'test_value', got {value}"
            )
        await client.delete("test_key")

        info = await client.info()
        print("✅ Redis connection successful")
        print(f"   Version: {info.get('redis_version', 'unknown')}")
        print(f"   Memory usage: {info.get('used_memory_human', 'unknown')}")

        await client.aclose()
        return True

    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False


async def create_tables():
    """Create database tables using SQLModel."""
    print("🏗️  Creating database tables...")

    try:
        from mcp_registry_gateway.db.database import get_database

        db = await get_database()
        await db.create_tables()

        print("✅ Database tables created successfully")
        return True

    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        return False


async def verify_database_schema():
    """Verify that all expected tables were created."""
    settings = get_settings()

    print("🔍 Verifying database schema...")

    try:
        engine = create_async_engine(settings.database.postgres_url)

        async with engine.connect() as conn:
            # Get list of tables
            result = await conn.execute(
                text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """)
            )

            tables = [row[0] for row in result.fetchall()]

            expected_tables = [
                "api_keys",
                "audit_logs",
                "circuit_breakers",
                "connection_pools",
                "data_retention_policies",
                "enhanced_api_keys",
                "fastmcp_audit_log",
                "materialized_views",
                "mcp_servers",
                "performance_alerts",
                "request_logs",
                "request_queues",
                "routing_rules",
                "server_access_control",
                "server_metrics",
                "server_resources",
                "server_tools",
                "sessions",
                "system_configs",
                "tenants",
                "users",
            ]

            print(f"   Found {len(tables)} tables: {', '.join(tables)}")

            missing_tables = set(expected_tables) - set(tables)
            if missing_tables:
                print(f"⚠️  Missing tables: {', '.join(missing_tables)}")
            else:
                print("✅ All expected tables found")

        await engine.dispose()
        return len(missing_tables) == 0

    except Exception as e:
        print(f"❌ Failed to verify schema: {e}")
        return False


async def main():
    """Run complete database setup and verification."""
    print("🚀 MCP Registry Gateway Database Setup")
    print("=" * 50)

    # Step 1: Create database if needed
    if not await create_database_if_not_exists():
        sys.exit(1)

    print()

    # Step 2: Test PostgreSQL connection
    if not await test_postgresql_connection():
        sys.exit(1)

    print()

    # Step 3: Test Redis connection
    if not await test_redis_connection():
        sys.exit(1)

    print()

    # Step 4: Create tables
    if not await create_tables():
        sys.exit(1)

    print()

    # Step 5: Verify schema
    if not await verify_database_schema():
        print("⚠️  Schema verification failed, but setup may still work")

    print()
    print("🎉 Database setup completed successfully!")
    print("💡 You can now start the application with: uv run mcp-gateway serve")


if __name__ == "__main__":
    asyncio.run(main())
