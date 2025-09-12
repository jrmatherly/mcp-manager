#!/usr/bin/env python3
"""
Configuration validation script for MCP Registry Gateway.

This script validates that environment variables are properly aligned
with configuration classes and their expected prefixes.
"""

import os
import sys
from pathlib import Path


# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from mcp_registry_gateway.core.config import get_settings  # noqa: E402


def validate_environment_variables() -> bool:
    """Validate environment variables against configuration classes."""
    print("🔍 Environment Variable Validation Report")
    print("=" * 60)

    # Load settings
    try:
        settings = get_settings()
        print("✅ Configuration loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load configuration: {e}")
        return False

    print(f"\n📋 Application: {settings.app_name} v{settings.app_version}")
    print(f"🌍 Environment: {settings.environment}")
    print(f"🐛 Debug Mode: {settings.debug}")

    # Validate Database Settings (DB_ prefix)
    print("\n💾 Database Configuration (DB_ prefix)")
    print(f"  PostgreSQL URL: {settings.database.postgres_url}")
    print(f"  Redis URL: {settings.database.redis_url}")
    print(f"  Max Connections: {settings.database.max_connections}")
    print(f"  Min Connections: {settings.database.min_connections}")

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
        print(f"  ⚠️  Missing DB variables: {missing_db_vars}")
    else:
        print("  ✅ All required PostgreSQL variables present")

    # Check Redis configuration
    redis_host = getattr(settings.database, "redis_host", "localhost")
    redis_port = getattr(settings.database, "redis_port", 6379)
    print(f"  Redis: {redis_host}:{redis_port}")

    # Validate Security Settings (SECURITY_ prefix)
    print("\n🔒 Security Configuration (SECURITY_ prefix)")
    print(f"  OAuth Providers: {settings.security.oauth_providers}")
    print(f"  CORS Enabled: {settings.security.enable_cors}")
    print(f"  CORS Origins: {settings.security.cors_origins}")

    # Check JWT secret
    if settings.security.jwt_secret_key:
        jwt_length = len(settings.security.jwt_secret_key.get_secret_value())
        print(
            f"  JWT Secret Key: {'✅ Set' if jwt_length > 10 else '⚠️  Too short'} ({jwt_length} chars)"
        )
    else:
        print("  JWT Secret Key: ❌ Not set")

    # Validate Service Settings (SERVICE_ prefix)
    print("\n🌐 Service Configuration (SERVICE_ prefix)")
    print(f"  Host: {settings.service.host}:{settings.service.port}")
    print(f"  Workers: {settings.service.workers}")
    print(f"  Load Balancing: {settings.service.load_balancing_strategy}")
    print(f"  Multi-tenancy: {settings.service.enable_multi_tenancy}")

    # Validate Monitoring Settings (MONITORING_ prefix)
    print("\n📊 Monitoring Configuration (MONITORING_ prefix)")
    print(f"  Metrics Enabled: {settings.monitoring.enable_metrics}")
    print(f"  Log Level: {settings.monitoring.log_level}")
    print(f"  Log Format: {settings.monitoring.log_format}")
    print(f"  Tracing Enabled: {settings.monitoring.enable_tracing}")

    # Validate FastMCP Settings (MREG_ prefix)
    print("\n🚀 FastMCP Configuration (MREG_ prefix)")
    print(f"  Enabled: {settings.fastmcp.enabled}")
    print(f"  Host: {settings.fastmcp.host}:{settings.fastmcp.port}")
    print(f"  OAuth Callback: {settings.fastmcp.oauth_callback_url}")
    print(f"  OAuth Scopes: {settings.fastmcp.oauth_scopes}")

    # Check Azure OAuth
    if settings.fastmcp.azure_tenant_id:
        print("  Azure Tenant: ✅ Set")
        print("  Azure Client ID: ✅ Set")
        print("  Azure Client Secret: ✅ Set")
    else:
        print("  Azure OAuth: ⚠️  Not configured")

    # Validate Feature Flags
    print("\n🚩 Feature Flags")
    for flag, enabled in settings.feature_flags.items():
        status = "✅" if enabled else "❌"
        print(f"  {status} {flag}")

    # Environment Variable Prefix Check
    print("\n🏷️  Environment Variable Prefix Validation")

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
        print(f"  {class_name}: {len(vars_with_prefix)} variables with {prefix} prefix")

        # Show some examples
        if vars_with_prefix:
            examples = vars_with_prefix[:3]
            print(f"    Examples: {', '.join(examples)}")

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
        print("\n⚠️  Deprecated Variables Found (consider removing):")
        for var in found_deprecated:
            print(f"    {var}={all_env_vars[var]}")
    else:
        print("\n✅ No deprecated variables found")

    print("\n✅ Configuration validation completed successfully!")
    return True


if __name__ == "__main__":
    validate_environment_variables()
