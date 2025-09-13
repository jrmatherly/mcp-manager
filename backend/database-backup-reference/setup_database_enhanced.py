#!/usr/bin/env python3
"""
Enhanced Database Setup Script for MCP Registry Gateway.

This script provides comprehensive database setup with performance optimizations:
1. Creates the PostgreSQL database if it doesn't exist
2. Verifies all database connections are working
3. Creates all database tables with new models
4. Optionally applies performance improvements (indexes, functions, views)
5. Seeds initial data for development

Usage:
    python setup_database_enhanced.py                    # Basic setup
    python setup_database_enhanced.py --with-performance # Include performance optimization
    python setup_database_enhanced.py --seed-data        # Include sample data
    python setup_database_enhanced.py --full             # All features
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

import redis.asyncio as redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from mcp_registry_gateway.core.config import get_settings
from mcp_registry_gateway.db.models import (
    APIKeyScope,
    EnhancedAPIKey,
    MCPServer,
    ServerStatus,
    Tenant,
    TenantStatus,
    TransportType,
    User,
    UserRole,
)


# Add src to path for imports
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class EnhancedDatabaseSetup:
    """Enhanced database setup with performance optimization."""

    def __init__(
        self, include_performance: bool = False, include_seed_data: bool = False
    ):
        self.settings = get_settings()
        self.include_performance = include_performance
        self.include_seed_data = include_seed_data
        self.engine = None
        self.setup_steps_completed = []
        self.errors = []

    async def initialize(self):
        """Initialize database connection."""
        try:
            self.engine = create_async_engine(
                self.settings.database.postgres_url, echo=self.settings.is_debug
            )
            logger.info("Database engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database engine: {e}")
            raise

    async def close(self):
        """Close database connection."""
        if self.engine:
            await self.engine.dispose()
            logger.info("Database engine closed")

    async def create_database_if_not_exists(self):
        """Create the PostgreSQL database if it doesn't exist."""
        # Connect to postgres database to create our target database
        postgres_url = (
            f"postgresql+asyncpg://{self.settings.database.postgres_user}:"
            f"{self.settings.database.postgres_password.get_secret_value()}@"
            f"{self.settings.database.postgres_host}:{self.settings.database.postgres_port}/postgres"
        )

        print(
            f"🔗 Connecting to PostgreSQL server at {self.settings.database.postgres_host}:{self.settings.database.postgres_port}"
        )

        try:
            engine = create_async_engine(postgres_url, isolation_level="AUTOCOMMIT")

            async with engine.connect() as conn:
                # Check if database exists
                result = await conn.execute(
                    text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                    {"dbname": self.settings.database.postgres_db},
                )

                if not result.fetchone():
                    print(
                        f"📦 Creating database '{self.settings.database.postgres_db}'..."
                    )
                    await conn.execute(
                        text(f"CREATE DATABASE {self.settings.database.postgres_db}")
                    )
                    print(
                        f"✅ Database '{self.settings.database.postgres_db}' created successfully"
                    )
                else:
                    print(
                        f"✅ Database '{self.settings.database.postgres_db}' already exists"
                    )

            await engine.dispose()
            self.setup_steps_completed.append("database_creation")
            return True

        except Exception as e:
            print(f"❌ Failed to create database: {e}")
            print("💡 Make sure PostgreSQL is running and credentials are correct")
            self.errors.append(f"Database creation: {e}")
            return False

    async def test_postgresql_connection(self):
        """Test PostgreSQL connection with the application database."""
        print(
            f"🧪 Testing PostgreSQL connection to '{self.settings.database.postgres_db}'..."
        )

        try:
            async with self.engine.connect() as conn:
                result = await conn.execute(text("SELECT version()"))
                version = result.scalar()
                print("✅ PostgreSQL connection successful")
                print(f"   Version: {version}")

            self.setup_steps_completed.append("postgres_connection")
            return True

        except Exception as e:
            print(f"❌ PostgreSQL connection failed: {e}")
            self.errors.append(f"PostgreSQL connection: {e}")
            return False

    async def test_redis_connection(self):
        """Test Redis connection."""
        print(
            f"🧪 Testing Redis connection to {self.settings.database.redis_host}:{self.settings.database.redis_port}..."
        )

        try:
            client = redis.from_url(self.settings.database.redis_url)

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
            self.setup_steps_completed.append("redis_connection")
            return True

        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
            self.errors.append(f"Redis connection: {e}")
            return False

    async def create_tables(self):
        """Create database tables using SQLModel."""
        print("🏗️  Creating database tables...")

        try:
            from mcp_registry_gateway.db.database import get_database

            db = await get_database()
            await db.create_tables()

            print("✅ Database tables created successfully")
            self.setup_steps_completed.append("table_creation")
            return True

        except Exception as e:
            print(f"❌ Failed to create tables: {e}")
            self.errors.append(f"Table creation: {e}")
            return False

    async def verify_database_schema(self):
        """Verify that all expected tables were created."""
        print("🔍 Verifying database schema...")

        try:
            async with self.engine.connect() as conn:
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
                    self.errors.append(f"Missing tables: {missing_tables}")
                else:
                    print("✅ All expected tables found")

                self.setup_steps_completed.append("schema_verification")
                return len(missing_tables) == 0

        except Exception as e:
            print(f"❌ Failed to verify schema: {e}")
            self.errors.append(f"Schema verification: {e}")
            return False

    async def apply_performance_optimizations(self):
        """Apply performance optimizations using the migration script."""
        if not self.include_performance:
            print(
                "⏭️  Skipping performance optimizations (use --with-performance to include)"
            )
            return True

        print("🚀 Applying performance optimizations...")

        try:
            from db_performance_migration import DatabasePerformanceMigration

            migration = DatabasePerformanceMigration()
            success = await migration.run_migration()

            if success:
                print("✅ Performance optimizations applied successfully")
                self.setup_steps_completed.append("performance_optimization")
                return True
            else:
                print("⚠️  Performance optimizations completed with some errors")
                self.errors.extend(migration.errors)
                return False

        except Exception as e:
            print(f"❌ Failed to apply performance optimizations: {e}")
            self.errors.append(f"Performance optimization: {e}")
            return False

    async def seed_development_data(self):
        """Seed the database with sample data for development."""
        if not self.include_seed_data:
            print("⏭️  Skipping seed data (use --seed-data to include)")
            return True

        print("🌱 Seeding development data...")

        try:
            from mcp_registry_gateway.db.database import get_database

            db = await get_database()

            async with db.get_session() as session:
                # Create default tenant
                default_tenant = Tenant(
                    name="Default Organization",
                    description="Default tenant for development",
                    status=TenantStatus.ACTIVE,
                )
                session.add(default_tenant)
                await session.flush()  # Get the ID

                # Create admin user
                admin_user = User(
                    username="admin",
                    email="admin@example.com",
                    full_name="System Administrator",
                    role=UserRole.ADMIN,
                    is_active=True,
                    tenant_id=default_tenant.id,
                    auth_provider="azure",
                    auth_provider_id="admin-azure-id",
                )
                session.add(admin_user)

                # Create regular user
                regular_user = User(
                    username="user",
                    email="user@example.com",
                    full_name="Regular User",
                    role=UserRole.USER,
                    is_active=True,
                    tenant_id=default_tenant.id,
                    auth_provider="azure",
                    auth_provider_id="user-azure-id",
                )
                session.add(regular_user)
                await session.flush()  # Get the IDs

                # Create sample MCP server
                sample_server = MCPServer(
                    name="Sample MCP Server",
                    description="A sample server for development and testing",
                    version="1.0.0",
                    endpoint_url="http://localhost:3000/mcp",
                    transport_type=TransportType.HTTP,
                    capabilities={
                        "tools": ["list_files", "read_file", "search"],
                        "resources": ["file://"],
                    },
                    tags=["development", "files", "sample"],
                    health_status=ServerStatus.HEALTHY,
                    tenant_id=default_tenant.id,
                )
                session.add(sample_server)

                # Create enhanced API key for admin
                admin_api_key = EnhancedAPIKey(
                    name="Admin Development Key",
                    description="Development API key for admin user",
                    key_hash="dev_admin_key_hash_placeholder",  # In real use, this would be properly hashed
                    key_prefix="mreg_admin_",
                    salt="dev_salt_placeholder",
                    user_id=admin_user.id,
                    tenant_id=default_tenant.id,
                    scopes=[
                        APIKeyScope.ADMIN,
                        APIKeyScope.READ,
                        APIKeyScope.WRITE,
                        APIKeyScope.PROXY,
                    ],
                    rate_limit_per_hour=10000,
                    rate_limit_per_day=100000,
                    is_active=True,
                )
                session.add(admin_api_key)

                # Create regular API key
                user_api_key = EnhancedAPIKey(
                    name="User Development Key",
                    description="Development API key for regular user",
                    key_hash="dev_user_key_hash_placeholder",  # In real use, this would be properly hashed
                    key_prefix="mreg_user_",
                    salt="dev_salt_placeholder",
                    user_id=regular_user.id,
                    tenant_id=default_tenant.id,
                    scopes=[APIKeyScope.READ, APIKeyScope.PROXY],
                    rate_limit_per_hour=1000,
                    rate_limit_per_day=10000,
                    is_active=True,
                )
                session.add(user_api_key)

                await session.commit()

            print("✅ Development data seeded successfully")
            print("   - Default tenant created")
            print("   - Admin user: admin@example.com")
            print("   - Regular user: user@example.com")
            print("   - Sample MCP server added")
            print("   - Development API keys created")

            self.setup_steps_completed.append("seed_data")
            return True

        except Exception as e:
            print(f"❌ Failed to seed development data: {e}")
            self.errors.append(f"Seed data: {e}")
            return False

    async def run_full_setup(self):
        """Run the complete enhanced database setup."""
        logger.info("🚀 Starting enhanced database setup...")

        try:
            await self.initialize()

            # Define setup phases
            phases = [
                ("Database Creation", self.create_database_if_not_exists),
                ("PostgreSQL Connection Test", self.test_postgresql_connection),
                ("Redis Connection Test", self.test_redis_connection),
                ("Table Creation", self.create_tables),
                ("Schema Verification", self.verify_database_schema),
                ("Performance Optimization", self.apply_performance_optimizations),
                ("Development Data Seeding", self.seed_development_data),
            ]

            successful_phases = 0
            for phase_name, phase_func in phases:
                print(f"\n📋 Phase: {phase_name}")
                try:
                    if await phase_func():
                        successful_phases += 1
                        print(f"✅ {phase_name} completed successfully")
                    else:
                        print(f"⚠️ {phase_name} completed with issues")
                except Exception as e:
                    print(f"❌ {phase_name} failed: {e}")
                    self.errors.append(f"{phase_name}: {e}")

            # Final summary
            print("\n📊 Setup Summary:")
            print(f"   Successful phases: {successful_phases}/{len(phases)}")
            print(f"   Steps completed: {len(self.setup_steps_completed)}")
            print(f"   Errors encountered: {len(self.errors)}")

            if self.setup_steps_completed:
                print("\n✅ Completed steps:")
                for step in self.setup_steps_completed:
                    print(f"   - {step}")

            if self.errors:
                print("\n❌ Issues encountered:")
                for error in self.errors:
                    print(f"   - {error}")

            print("\n🎉 Enhanced database setup completed!")

            if len(self.errors) == 0:
                print("💡 You can now start the application with:")
                print("   uv run mcp-gateway serve --port 8000  # Unified server with all features")

                if self.include_performance:
                    print("\n📈 Performance features enabled:")
                    print("   - Essential indexes for fast queries")
                    print("   - Composite indexes for complex operations")
                    print("   - Performance monitoring functions")
                    print("   - Database maintenance views")

                if self.include_seed_data:
                    print("\n🌱 Development data available:")
                    print("   - Test users and API keys")
                    print("   - Sample MCP server")
                    print("   - Default tenant configuration")

            return len(self.errors) == 0

        except Exception as e:
            logger.error(f"❌ Setup failed with critical error: {e}")
            return False
        finally:
            await self.close()


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Enhanced database setup for MCP Registry Gateway",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python setup_database_enhanced.py                    # Basic setup
  python setup_database_enhanced.py --with-performance # Include performance optimization
  python setup_database_enhanced.py --seed-data        # Include sample data
  python setup_database_enhanced.py --full             # All features
        """,
    )

    parser.add_argument(
        "--with-performance",
        action="store_true",
        help="Apply performance optimizations (indexes, functions, views)",
    )

    parser.add_argument(
        "--seed-data", action="store_true", help="Seed database with development data"
    )

    parser.add_argument(
        "--full",
        action="store_true",
        help="Enable all features (performance optimization + seed data)",
    )

    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    return parser.parse_args()


async def main():
    """Run the enhanced database setup."""
    args = parse_arguments()

    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Determine features to enable
    include_performance = args.with_performance or args.full
    include_seed_data = args.seed_data or args.full

    print("🚀 MCP Registry Gateway Enhanced Database Setup")
    print("=" * 60)
    print(
        f"Performance optimization: {'✅ Enabled' if include_performance else '❌ Disabled'}"
    )
    print(
        f"Development data seeding: {'✅ Enabled' if include_seed_data else '❌ Disabled'}"
    )
    print("")

    setup = EnhancedDatabaseSetup(
        include_performance=include_performance, include_seed_data=include_seed_data
    )

    success = await setup.run_full_setup()

    if success:
        logger.info("✅ Enhanced setup completed successfully!")
        sys.exit(0)
    else:
        logger.error("❌ Enhanced setup completed with errors")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
