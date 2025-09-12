"""
CLI entry point for MCP Registry Gateway.

Provides command-line interface for running and managing the gateway service.
"""

import asyncio
import logging
import sys
from pathlib import Path

import typer
import uvicorn
from rich.console import Console
from rich.logging import RichHandler

from .core.config import get_settings


app = typer.Typer(name="mcp-gateway", help="MCP Registry Gateway CLI")
console = Console()


def setup_logging(level: str = "INFO") -> None:
    """Setup logging configuration."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[RichHandler(console=console, show_time=False, show_path=False)],
    )


@app.command()
def serve(
    host: str = typer.Option("0.0.0.0", help="Host to bind to"),
    port: int = typer.Option(8000, help="Port to bind to"),
    workers: int = typer.Option(1, help="Number of worker processes"),
    log_level: str = typer.Option("info", help="Log level"),
    reload: bool = typer.Option(False, help="Enable auto-reload for development"),
    access_log: bool = typer.Option(True, help="Enable access logs"),
):
    """
    Start the unified MCP Registry Gateway server.

    Runs the unified FastAPI + FastMCP application in a single process.
    Includes REST API endpoints at /api/v1/* and authenticated MCP operations at /mcp/*.
    """
    settings = get_settings()
    setup_logging(log_level.upper())

    console.print(f"🚀 Starting Unified MCP Registry Gateway v{settings.app_version}")
    console.print(f"📊 Environment: {settings.environment}")
    console.print("🏗️  Architecture: Single-Server Unified")
    console.print(f"🌐 Server: http://{host}:{port}")
    console.print(f"📚 API Docs: http://{host}:{port}{settings.docs_url}")

    # Show service information
    console.print("\n📋 Available Services:")
    console.print(f"  🔧 REST API: http://{host}:{port}/api/v1/*")

    if settings.fastmcp.enabled:
        console.print(f"  🎯 MCP Server: http://{host}:{port}/mcp/*")
        if settings.fastmcp.azure_tenant_id:
            console.print(f"  🔐 OAuth Login: http://{host}:{port}/mcp/oauth/login")
            console.print("  ✅ Authentication: Azure OAuth Enabled")
        else:
            console.print(
                "  ⚠️  Authentication: Disabled (Azure credentials not configured)"
            )
    else:
        console.print("  ❌ MCP Server: Disabled")

    console.print(f"  📊 Health Check: http://{host}:{port}/health")
    console.print(f"  📈 Metrics: http://{host}:{port}/metrics")

    # Update settings from CLI args if provided
    if host != "0.0.0.0":
        settings.service.host = host
    if port != 8000:
        settings.service.port = port
    if workers != 1:
        settings.service.workers = workers

    # Configure uvicorn for unified architecture
    config = uvicorn.Config(
        app="mcp_registry_gateway.unified_app:app",
        host=host,
        port=port,
        workers=workers if not reload else 1,  # Single worker for reload mode
        log_level=log_level.lower(),
        access_log=access_log,
        reload=reload,
        reload_dirs=["src"] if reload else None,
    )

    server = uvicorn.Server(config)

    try:
        server.run()
    except KeyboardInterrupt:
        console.print("\n👋 Shutting down gracefully...")
    except Exception as e:
        console.print(f"❌ Server error: {e}")
        sys.exit(1)


@app.command()
def healthcheck(
    url: str = typer.Option("http://localhost:8000", help="Gateway URL"),
    timeout: int = typer.Option(30, help="Request timeout in seconds"),
):
    """
    Check the health of the MCP Registry Gateway.

    Performs a health check against the running gateway service.
    """
    import httpx

    async def check_health():
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(f"{url}/health")

                if response.status_code == 200:
                    data = response.json()
                    console.print("✅ Gateway is healthy")
                    console.print(f"📊 Status: {data.get('status', 'unknown')}")
                    console.print(f"🕐 Timestamp: {data.get('timestamp', 'unknown')}")
                    console.print(f"🏷️  Version: {data.get('version', 'unknown')}")

                    # Show component health
                    components = data.get("components", {})
                    if components:
                        console.print("\n📋 Component Status:")
                        for component, details in components.items():
                            status = details.get("status", "unknown")
                            icon = "✅" if status == "healthy" else "❌"
                            console.print(f"  {icon} {component}: {status}")

                    return 0
                else:
                    console.print(
                        f"❌ Health check failed: HTTP {response.status_code}"
                    )
                    console.print(f"📄 Response: {response.text}")
                    return 1

        except httpx.TimeoutException:
            console.print(f"❌ Health check timed out after {timeout}s")
            return 1
        except httpx.ConnectError:
            console.print(f"❌ Cannot connect to gateway at {url}")
            return 1
        except Exception as e:
            console.print(f"❌ Health check error: {e}")
            return 1

    exit_code = asyncio.run(check_health())
    sys.exit(exit_code)


@app.command()
def config(
    show_secrets: bool = typer.Option(False, help="Show secret values"),
):
    """
    Display current configuration.

    Shows the current gateway configuration with optional secret values.
    """
    settings = get_settings()

    console.print("📋 MCP Registry Gateway Configuration\n")

    # Application settings
    console.print("🏷️  Application:")
    console.print(f"  Name: {settings.app_name}")
    console.print(f"  Version: {settings.app_version}")
    console.print(f"  Environment: {settings.environment}")
    console.print(f"  Debug: {settings.debug}")

    # Service settings
    console.print("\n🌐 Service:")
    console.print(f"  Host: {settings.service.host}")
    console.print(f"  Port: {settings.service.port}")
    console.print(f"  Workers: {settings.service.workers}")
    console.print(f"  Multi-tenancy: {settings.service.enable_multi_tenancy}")

    # Database settings
    console.print("\n💾 Database:")
    console.print(f"  PostgreSQL Host: {settings.database.postgres_host}")
    console.print(f"  PostgreSQL Port: {settings.database.postgres_port}")
    console.print(f"  PostgreSQL DB: {settings.database.postgres_db}")
    console.print(f"  Redis Host: {settings.database.redis_host}")
    console.print(f"  Redis Port: {settings.database.redis_port}")
    if show_secrets:
        console.print(
            f"  PostgreSQL Password: {settings.database.postgres_password.get_secret_value()}"
        )
        if settings.database.redis_password:
            console.print(
                f"  Redis Password: {settings.database.redis_password.get_secret_value()}"
            )

    # Security settings
    console.print("\n🔒 Security:")
    console.print(f"  CORS Enabled: {settings.security.enable_cors}")
    console.print(f"  CORS Origins: {settings.security.cors_origins}")
    console.print(f"  OAuth Providers: {settings.security.oauth_providers}")
    if show_secrets:
        console.print(
            f"  JWT Secret: {settings.security.jwt_secret_key.get_secret_value()}"
        )

    # Monitoring settings
    console.print("\n📊 Monitoring:")
    console.print(f"  Metrics Enabled: {settings.monitoring.enable_metrics}")
    console.print(f"  Log Level: {settings.monitoring.log_level}")
    console.print(f"  Tracing Enabled: {settings.monitoring.enable_tracing}")

    # Feature flags
    console.print("\n🚩 Feature Flags:")
    for flag, enabled in settings.feature_flags.items():
        icon = "✅" if enabled else "❌"
        console.print(f"  {icon} {flag}")


@app.command()
def init_db(
    drop_existing: bool = typer.Option(False, help="Drop existing tables"),
):
    """
    Initialize the database.

    Creates all necessary database tables and initial data.
    """

    async def init_database():
        try:
            console.print("📊 Initializing database...")

            from .db.database import get_database

            db = await get_database()

            if drop_existing:
                console.print("⚠️  Dropping existing tables...")
                # In a real implementation, you'd add drop table functionality
                console.print("❌ Drop tables not implemented yet")

            console.print("📋 Creating tables...")
            await db.create_tables()

            console.print("✅ Database initialized successfully")

        except Exception as e:
            console.print(f"❌ Database initialization failed: {e}")
            sys.exit(1)

    asyncio.run(init_database())


@app.command()
def optimize_db(
    dry_run: bool = typer.Option(
        False, help="Show what would be done without executing"
    ),
    force: bool = typer.Option(False, help="Force optimization without confirmation"),
):
    """
    Optimize database performance with indexes and monitoring.

    This command applies performance improvements to the database:
    - Essential indexes for existing queries
    - Composite indexes for complex query patterns
    - Performance monitoring functions
    - Database maintenance views
    - Table statistics updates
    """

    async def run_optimization():
        try:
            console.print("🚀 Database Performance Optimization")
            console.print("=" * 50)

            if dry_run:
                console.print("🔍 DRY RUN MODE - No changes will be made")
                console.print("")

            if not force and not dry_run:
                console.print(
                    "⚠️  This will modify your database schema by adding indexes and functions."
                )
                console.print("💡 Use --dry-run to see what would be done first.")

                if not typer.confirm("Do you want to continue?"):
                    console.print("❌ Operation cancelled")
                    return 1

            # Import and run the performance migration
            script_path = Path(__file__).parent.parent.parent / "scripts"
            sys.path.insert(0, str(script_path))

            from db_performance_migration import DatabasePerformanceMigration

            migration = DatabasePerformanceMigration()

            if dry_run:
                console.print("📋 Performance optimizations that would be applied:")
                console.print("   ✅ Essential indexes (25+ indexes)")
                console.print("   ✅ Composite indexes (5+ complex query indexes)")
                console.print("   ✅ Performance monitoring functions (3 functions)")
                console.print("   ✅ Database maintenance views (3 views)")
                console.print("   ✅ Table statistics updates")
                console.print("")
                console.print("💡 Run without --dry-run to apply these optimizations")
                return 0

            success = await migration.run_migration()

            # The migration script now provides comprehensive output
            # Just return the appropriate exit code
            return 0 if success else 1

        except Exception as e:
            console.print(f"❌ Database optimization failed: {e}")
            return 1

    result = asyncio.run(run_optimization())
    sys.exit(result)


@app.command()
def setup_enhanced(
    with_performance: bool = typer.Option(
        False, help="Include performance optimizations"
    ),
    seed_data: bool = typer.Option(False, help="Include development seed data"),
    full: bool = typer.Option(
        False, help="Enable all features (performance + seed data)"
    ),
    verbose: bool = typer.Option(False, help="Enable verbose logging"),
):
    """
    Enhanced database setup with performance optimizations and seed data.

    This command provides comprehensive database setup:
    - Creates database and tables
    - Verifies all connections
    - Optionally applies performance optimizations
    - Optionally seeds development data
    """

    async def run_enhanced_setup():
        try:
            # Import the enhanced setup
            script_path = Path(__file__).parent.parent.parent / "scripts"
            sys.path.insert(0, str(script_path))

            from setup_database_enhanced import EnhancedDatabaseSetup

            # Determine features to enable
            include_performance = with_performance or full
            include_seed_data = seed_data or full

            # Configure logging
            if verbose:
                import logging

                logging.getLogger().setLevel(logging.DEBUG)

            console.print("🚀 MCP Registry Gateway Enhanced Database Setup")
            console.print("=" * 60)
            console.print(
                f"Performance optimization: {'✅ Enabled' if include_performance else '❌ Disabled'}"
            )
            console.print(
                f"Development data seeding: {'✅ Enabled' if include_seed_data else '❌ Disabled'}"
            )
            console.print("")

            setup = EnhancedDatabaseSetup(
                include_performance=include_performance,
                include_seed_data=include_seed_data,
            )

            success = await setup.run_full_setup()

            if success:
                console.print("✅ Enhanced database setup completed successfully!")
                return 0
            else:
                console.print("❌ Enhanced database setup completed with errors")
                return 1

        except Exception as e:
            console.print(f"❌ Enhanced database setup failed: {e}")
            return 1

    result = asyncio.run(run_enhanced_setup())
    sys.exit(result)


@app.command()
def register_server(
    name: str = typer.Argument(..., help="Server name"),
    url: str = typer.Argument(..., help="Server endpoint URL"),
    transport: str = typer.Option(
        "http", help="Transport type (http, websocket, stdio, sse)"
    ),
    version: str = typer.Option("1.0.0", help="Server version"),
    description: str | None = typer.Option(None, help="Server description"),
    tags: str | None = typer.Option(None, help="Comma-separated tags"),
    tenant_id: str | None = typer.Option(None, help="Tenant ID"),
):
    """
    Register a new MCP server.

    Registers a server with the gateway registry.
    """

    async def register():
        try:
            console.print(f"📝 Registering server: {name}")

            from .db.models import TransportType
            from .services.registry import get_registry_service

            # Parse transport type
            try:
                transport_type = TransportType(transport.lower())
            except ValueError:
                console.print(f"❌ Invalid transport type: {transport}")
                console.print(f"Valid types: {[t.value for t in TransportType]}")
                sys.exit(1)

            # Parse tags
            tag_list = []
            if tags:
                tag_list = [tag.strip() for tag in tags.split(",")]

            registry = await get_registry_service()

            server = await registry.register_server(
                name=name,
                endpoint_url=url,
                transport_type=transport_type,
                version=version,
                description=description,
                tags=tag_list,
                tenant_id=tenant_id,
            )

            console.print("✅ Server registered successfully:")
            console.print(f"  ID: {server.id}")
            console.print(f"  Name: {server.name}")
            console.print(f"  URL: {server.endpoint_url}")
            console.print(f"  Transport: {server.transport_type.value}")
            console.print(f"  Health: {server.health_status.value}")

        except Exception as e:
            console.print(f"❌ Server registration failed: {e}")
            sys.exit(1)

    asyncio.run(register())


@app.command()
def demo(
    gateway_url: str = typer.Option(
        "http://localhost:8000", help="Gateway URL for the demo"
    ),
    skip_health_check: bool = typer.Option(
        False, help="Skip initial health check (for advanced users)"
    ),
):
    """
    Run the MCP Registry Gateway demonstration.

    This command runs the complete gateway demonstration showing:
    - Server registration and discovery
    - Intelligent request routing
    - Load balancing and health monitoring
    - Real-time metrics and observability
    - Unified architecture with FastMCP integration

    Make sure the unified gateway is running before starting the demo:
    uv run mcp-gateway serve --port 8000
    """
    import subprocess

    try:
        # Find the demo script
        project_root = Path(__file__).parent.parent.parent
        demo_script = project_root / "examples" / "demo_gateway.py"

        if not demo_script.exists():
            console.print(f"❌ Demo script not found at: {demo_script}")
            console.print(f"📂 Project root detected as: {project_root}")
            console.print(
                "Make sure you're running from a valid fastmcp-manager installation."
            )
            console.print("Expected structure: <project_root>/examples/demo_gateway.py")
            sys.exit(1)

        console.print("🚀 Starting MCP Registry Gateway Demo")
        console.print(f"📍 Gateway URL: {gateway_url}")
        console.print(f"📂 Demo script: {demo_script}")

        if not skip_health_check:
            console.print("🔍 Performing health check first...")

            # Quick health check using our existing healthcheck command
            # We'll use subprocess to avoid circular imports
            try:
                import httpx

                async def quick_health_check():
                    try:
                        async with httpx.AsyncClient(timeout=10) as client:
                            response = await client.get(f"{gateway_url}/health")
                            return response.status_code == 200
                    except Exception:
                        return False

                if not asyncio.run(quick_health_check()):
                    console.print(f"❌ Gateway health check failed at {gateway_url}")
                    console.print("Please start the unified gateway first:")
                    console.print("  uv run mcp-gateway serve --port 8000")
                    console.print("\nOr use --skip-health-check to bypass this check.")
                    sys.exit(1)

                console.print("✅ Gateway is healthy, starting demo...")

            except ImportError:
                console.print("⚠️  Cannot verify gateway health (httpx not available)")
                console.print("Proceeding with demo anyway...")

        # Set environment variable for gateway URL
        import os

        env = os.environ.copy()
        if gateway_url != "http://localhost:8000":
            env["GATEWAY_BASE_URL"] = gateway_url

        # Run the demo script
        result = subprocess.run(
            [sys.executable, str(demo_script)],
            env=env,
            cwd=project_root,
        )

        sys.exit(result.returncode)

    except KeyboardInterrupt:
        console.print("\n👋 Demo interrupted by user")
        sys.exit(0)
    except Exception as e:
        console.print(f"❌ Demo failed: {e}")
        sys.exit(1)


@app.command()
def fastmcp(
    host: str = typer.Option("0.0.0.0", help="Host to bind to"),
    port: int = typer.Option(
        8000, help="Port to bind to (unified architecture uses single port)"
    ),
    log_level: str = typer.Option("info", help="Log level"),
):
    """
    Legacy compatibility command for separate FastMCP server.

    DEPRECATED: Use 'serve' command instead.
    The unified architecture runs both FastAPI and FastMCP in a single process.
    This command now redirects to the unified server for backward compatibility.
    """
    console.print(
        "⚠️  [yellow]DEPRECATED:[/yellow] The separate fastmcp command is deprecated."
    )
    console.print("📦 Using unified architecture instead...")
    console.print("🔄 Redirecting to unified server command...")
    console.print("")
    console.print(
        "💡 [blue]Tip:[/blue] Use 'uv run mcp-gateway serve' directly for the unified server."
    )
    console.print("")

    # Redirect to the unified serve command
    serve(host=host, port=port, log_level=log_level)


@app.command()
def validate(
    integrity_check: bool = typer.Option(
        False, help="Also run configuration integrity check"
    ),
):
    """
    Validate environment variables and configuration settings.

    Performs comprehensive validation of environment variables against
    configuration classes and checks for deprecated or missing variables.
    """
    from .utils.validation import (
        validate_configuration_integrity,
        validate_environment_variables,
    )

    console.print("🔍 Starting configuration validation...\n")

    # Run environment variable validation
    env_valid = validate_environment_variables()

    # Run integrity check if requested
    if integrity_check:
        console.print("\n" + "=" * 60)
        console.print("🔧 Running configuration integrity check...\n")
        integrity_valid = validate_configuration_integrity()

        if env_valid and integrity_valid:
            console.print("\n🎉 All validation checks passed!", style="bold green")
        else:
            console.print("\n⚠️  Some validation checks failed", style="bold yellow")
            sys.exit(1)
    else:
        if env_valid:
            console.print("\n🎉 Environment validation passed!", style="bold green")
        else:
            console.print("\n❌ Environment validation failed", style="bold red")
            sys.exit(1)


def main() -> None:
    """Main CLI entry point."""
    app()


if __name__ == "__main__":
    main()
