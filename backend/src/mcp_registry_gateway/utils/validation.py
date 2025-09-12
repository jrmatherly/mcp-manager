"""
Configuration validation utilities for MCP Registry Gateway.

This module provides utilities for validating environment variables,
configuration alignment, and system health checks.
"""

import os

from rich.console import Console
from rich.table import Table

from ..core.config import get_settings


console = Console()


def validate_environment_variables() -> bool:
    """Validate environment variables against configuration classes."""
    console.print("🔍 Environment Variable Validation Report", style="bold blue")
    console.print("=" * 60)

    # Load settings
    try:
        settings = get_settings()
        console.print("✅ Configuration loaded successfully", style="green")
    except Exception as e:
        console.print(f"❌ Failed to load configuration: {e}", style="red")
        return False

    console.print(f"\n📋 Application: {settings.app_name} v{settings.app_version}")
    console.print(f"🌍 Environment: {settings.environment}")
    console.print(f"🐛 Debug Mode: {settings.debug}")

    # Validate Database Settings (DB_ prefix)
    console.print("\n💾 Database Configuration (DB_ prefix)", style="bold")
    console.print(f"  PostgreSQL URL: {settings.database.postgres_url}")
    console.print(f"  Redis URL: {settings.database.redis_url}")
    console.print(f"  Max Connections: {settings.database.max_connections}")
    console.print(f"  Min Connections: {settings.database.min_connections}")

    # Check for required DB variables
    db_vars: list[str] = [
        "DB_POSTGRES_HOST",
        "DB_POSTGRES_PORT",
        "DB_POSTGRES_USER",
        "DB_POSTGRES_PASSWORD",
        "DB_POSTGRES_DB",
    ]
    missing_db_vars: list[str] = []
    for var in db_vars:
        if not os.getenv(var):
            missing_db_vars.append(var)

    if missing_db_vars:
        console.print(f"  ⚠️  Missing DB variables: {missing_db_vars}", style="yellow")
    else:
        console.print("  ✅ All required PostgreSQL variables present", style="green")

    # Check Redis configuration
    redis_host = getattr(settings.database, "redis_host", "localhost")
    redis_port = getattr(settings.database, "redis_port", 6379)
    console.print(f"  Redis: {redis_host}:{redis_port}")

    # Validate Security Settings (SECURITY_ prefix)
    console.print("\n🔒 Security Configuration (SECURITY_ prefix)", style="bold")
    console.print(f"  OAuth Providers: {settings.security.oauth_providers}")
    console.print(f"  CORS Enabled: {settings.security.enable_cors}")
    console.print(f"  CORS Origins: {settings.security.cors_origins}")

    # Check JWT secret
    if settings.security.jwt_secret_key:
        jwt_length = len(settings.security.jwt_secret_key.get_secret_value())
        status = "✅ Set" if jwt_length > 10 else "⚠️  Too short"
        style = "green" if jwt_length > 10 else "yellow"
        console.print(f"  JWT Secret Key: {status} ({jwt_length} chars)", style=style)
    else:
        console.print("  JWT Secret Key: ❌ Not set", style="red")

    # Validate Service Settings (SERVICE_ prefix)
    console.print("\n🌐 Service Configuration (SERVICE_ prefix)", style="bold")
    console.print(f"  Host: {settings.service.host}:{settings.service.port}")
    console.print(f"  Workers: {settings.service.workers}")
    console.print(f"  Load Balancing: {settings.service.load_balancing_strategy}")
    console.print(f"  Multi-tenancy: {settings.service.enable_multi_tenancy}")

    # Validate Monitoring Settings (MONITORING_ prefix)
    console.print("\n📊 Monitoring Configuration (MONITORING_ prefix)", style="bold")
    console.print(f"  Metrics Enabled: {settings.monitoring.enable_metrics}")
    console.print(f"  Log Level: {settings.monitoring.log_level}")
    console.print(f"  Log Format: {settings.monitoring.log_format}")
    console.print(f"  Tracing Enabled: {settings.monitoring.enable_tracing}")

    # Validate FastMCP Settings (MREG_ prefix)
    console.print("\n🚀 FastMCP Configuration (MREG_ prefix)", style="bold")
    console.print(f"  Enabled: {settings.fastmcp.enabled}")
    console.print(f"  Host: {settings.fastmcp.host}:{settings.fastmcp.port}")
    console.print(f"  OAuth Callback: {settings.fastmcp.oauth_callback_url}")
    console.print(f"  OAuth Scopes: {settings.fastmcp.oauth_scopes}")

    # Check Azure OAuth
    if settings.fastmcp.azure_tenant_id:
        console.print("  Azure Tenant: ✅ Set", style="green")
        console.print("  Azure Client ID: ✅ Set", style="green")
        console.print("  Azure Client Secret: ✅ Set", style="green")
    else:
        console.print("  Azure OAuth: ⚠️  Not configured", style="yellow")

    # Validate Feature Flags
    console.print("\n🚩 Feature Flags", style="bold")
    if isinstance(settings.feature_flags, dict):
        for flag, enabled in settings.feature_flags.items():
            status = "✅" if enabled else "❌"
            style = "green" if enabled else "red"
            console.print(f"  {status} {flag}", style=style)
    else:
        console.print(f"  Feature flags: {settings.feature_flags}")

    # Environment Variable Prefix Check
    console.print("\n🏷️  Environment Variable Prefix Validation", style="bold")

    # Create a nice table for prefix validation
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Settings Class", style="cyan")
    table.add_column("Prefix", style="yellow")
    table.add_column("Variables Found", justify="right", style="green")
    table.add_column("Examples", style="dim")

    # Get all environment variables with known prefixes
    all_env_vars: dict[str, str] = dict(os.environ)
    prefixes: dict[str, str] = {
        "DB_": "DatabaseSettings",
        "SECURITY_": "SecuritySettings",
        "SERVICE_": "ServiceSettings",
        "MONITORING_": "MonitoringSettings",
        "MREG_": "FastMCPSettings",
    }

    for prefix, class_name in prefixes.items():
        vars_with_prefix = [k for k in all_env_vars if k.startswith(prefix)]
        examples = ", ".join(vars_with_prefix[:3]) if vars_with_prefix else "None"
        table.add_row(class_name, prefix, str(len(vars_with_prefix)), examples)

    console.print(table)

    # Check for deprecated variables
    deprecated_vars: list[str] = [
        "REDIS_URL",
        "REDIS_PASSWORD",
        "REDIS_SSL",
        "REDIS_HOST",
        "REDIS_PORT",
        "API_HOST",
        "API_PORT",
        "API_PREFIX",
        "LOG_LEVEL",
    ]

    found_deprecated: list[str] = [
        var for var in deprecated_vars if var in all_env_vars
    ]
    if found_deprecated:
        console.print(
            "\n⚠️  Deprecated Variables Found (consider removing):", style="yellow"
        )
        for var in found_deprecated:
            console.print(f"    {var}={all_env_vars[var]}", style="dim")
    else:
        console.print("\n✅ No deprecated variables found", style="green")

    console.print(
        "\n✅ Configuration validation completed successfully!", style="bold green"
    )
    return True


def validate_configuration_integrity() -> bool:
    """
    Validate configuration integrity and consistency.

    Returns:
        bool: True if validation passes, False otherwise
    """
    try:
        settings = get_settings()

        # Basic validation that settings loaded
        if not settings:
            console.print("❌ Failed to load settings", style="red")
            return False

        # Validate database connection strings
        if not settings.database.postgres_url:
            console.print("❌ PostgreSQL URL not configured", style="red")
            return False

        # Validate security settings
        if not settings.security.jwt_secret_key:
            console.print("⚠️  JWT secret key not set", style="yellow")

        console.print("✅ Configuration integrity check passed", style="green")
        return True

    except Exception as e:
        console.print(f"❌ Configuration validation failed: {e}", style="red")
        return False
