"""
Configuration management for MCP Registry Gateway.

Provides environment-based configuration with validation and type safety.
"""

from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, field_validator
from pydantic.types import SecretStr
from pydantic_settings import BaseSettings


# Path to project root (3 levels up from this file: core/config.py -> src/pkg/ -> src/ -> project_root/)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
ENV_FILE = PROJECT_ROOT / ".env"


class DatabaseSettings(BaseSettings):
    """Database configuration settings."""

    # PostgreSQL for registry data
    postgres_host: str = Field(default="localhost", env="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, env="POSTGRES_PORT")
    postgres_user: str = Field(default="postgres", env="POSTGRES_USER")
    postgres_password: SecretStr = Field(..., env="POSTGRES_PASSWORD")
    postgres_db: str = Field(default="mcp_registry", env="POSTGRES_DB")
    postgres_ssl_mode: str = Field(default="prefer", env="POSTGRES_SSL_MODE")

    # Redis for sessions and caching
    redis_host: str = Field(default="localhost", env="REDIS_HOST")
    redis_port: int = Field(default=6379, env="REDIS_PORT")
    redis_password: SecretStr | None = Field(default=None, env="REDIS_PASSWORD")
    redis_db: int = Field(default=0, env="REDIS_DB")
    redis_ssl: bool = Field(default=False, env="REDIS_SSL")

    # TimescaleDB for metrics (optional)
    timescale_host: str | None = Field(default=None, env="TIMESCALE_HOST")
    timescale_port: int | None = Field(default=None, env="TIMESCALE_PORT")
    timescale_user: str | None = Field(default=None, env="TIMESCALE_USER")
    timescale_password: SecretStr | None = Field(default=None, env="TIMESCALE_PASSWORD")
    timescale_db: str | None = Field(default=None, env="TIMESCALE_DB")

    @field_validator("timescale_host", "timescale_user", "timescale_db", mode="before")
    @classmethod
    def empty_str_to_none_str(cls, v: Any) -> str | None:
        """Convert empty strings to None for optional string fields."""
        if v == "":
            return None
        return v

    @field_validator("timescale_port", mode="before")
    @classmethod
    def empty_str_to_none_int(cls, v: Any) -> int | None:
        """Convert empty strings to None for optional integer fields."""
        if v == "" or v is None:
            return None
        return v

    @field_validator("timescale_password", mode="before")
    @classmethod
    def empty_str_to_none_secret(cls, v: Any) -> SecretStr | None:
        """Convert empty strings to None for optional SecretStr fields."""
        if v == "" or v is None:
            return None
        return SecretStr(v) if isinstance(v, str) else v

    # Connection pooling (optimized for multi-user Azure OAuth production load)
    pool_size: int = Field(default=20, env="DB_POOL_SIZE")  # Core pool connections
    max_overflow: int = Field(
        default=30, env="DB_MAX_OVERFLOW"
    )  # Additional connections
    pool_timeout: int = Field(default=10, env="DB_POOL_TIMEOUT")  # Connection wait time
    pool_recycle: int = Field(
        default=3600, env="DB_POOL_RECYCLE"
    )  # 1 hour connection recycling
    pool_pre_ping: bool = Field(
        default=True, env="DB_POOL_PRE_PING"
    )  # Connection health check
    max_connections: int = Field(
        default=50, env="DB_MAX_CONNECTIONS"
    )  # Backward compatibility
    min_connections: int = Field(
        default=5, env="DB_MIN_CONNECTIONS"
    )  # Backward compatibility
    connection_timeout: int = Field(
        default=30, env="DB_CONNECTION_TIMEOUT"
    )  # Backward compatibility

    # Advanced Connection Pool Tuning (Priority 1 Enhancement)
    enable_adaptive_pool_sizing: bool = Field(
        default=True, env="DB_ENABLE_ADAPTIVE_POOL_SIZING"
    )
    adaptive_pool_check_interval: int = Field(
        default=30,
        env="DB_ADAPTIVE_POOL_CHECK_INTERVAL",  # seconds
    )
    adaptive_pool_scale_threshold_high: float = Field(
        default=0.8, env="DB_ADAPTIVE_POOL_SCALE_THRESHOLD_HIGH"
    )  # Scale up when 80% utilized
    adaptive_pool_scale_threshold_low: float = Field(
        default=0.3, env="DB_ADAPTIVE_POOL_SCALE_THRESHOLD_LOW"
    )  # Scale down when 30% utilized
    adaptive_pool_max_size: int = Field(default=100, env="DB_ADAPTIVE_POOL_MAX_SIZE")
    adaptive_pool_min_size: int = Field(default=5, env="DB_ADAPTIVE_POOL_MIN_SIZE")

    # Separate Pools for Different Operations
    enable_operation_specific_pools: bool = Field(
        default=True, env="DB_ENABLE_OPERATION_SPECIFIC_POOLS"
    )
    read_pool_size: int = Field(
        default=15,
        env="DB_READ_POOL_SIZE",  # Optimized for read-heavy operations
    )
    write_pool_size: int = Field(
        default=10,
        env="DB_WRITE_POOL_SIZE",  # Optimized for write operations
    )
    analytics_pool_size: int = Field(
        default=5,
        env="DB_ANALYTICS_POOL_SIZE",  # Long-running analytics queries
    )

    # Connection Health Monitoring
    enable_connection_health_monitoring: bool = Field(
        default=True, env="DB_ENABLE_CONNECTION_HEALTH_MONITORING"
    )
    connection_health_check_interval: int = Field(
        default=60,
        env="DB_CONNECTION_HEALTH_CHECK_INTERVAL",  # seconds
    )
    max_connection_age_seconds: int = Field(
        default=7200,
        env="DB_MAX_CONNECTION_AGE_SECONDS",  # 2 hours
    )
    connection_idle_timeout: int = Field(
        default=300,
        env="DB_CONNECTION_IDLE_TIMEOUT",  # 5 minutes
    )

    # Predictive Scaling Configuration
    enable_predictive_scaling: bool = Field(
        default=False,
        env="DB_ENABLE_PREDICTIVE_SCALING",  # Conservative default
    )
    predictive_scaling_window_minutes: int = Field(
        default=15, env="DB_PREDICTIVE_SCALING_WINDOW_MINUTES"
    )
    predictive_scaling_history_hours: int = Field(
        default=24, env="DB_PREDICTIVE_SCALING_HISTORY_HOURS"
    )

    # Redis Connection Pool Tuning
    redis_max_connections: int = Field(default=50, env="DB_REDIS_MAX_CONNECTIONS")
    redis_connection_timeout: int = Field(default=5, env="DB_REDIS_CONNECTION_TIMEOUT")
    redis_socket_timeout: int = Field(default=5, env="DB_REDIS_SOCKET_TIMEOUT")
    redis_retry_on_timeout: bool = Field(default=True, env="DB_REDIS_RETRY_ON_TIMEOUT")
    redis_health_check_interval: int = Field(
        default=30, env="DB_REDIS_HEALTH_CHECK_INTERVAL"
    )

    @property
    def postgres_url(self) -> str:
        """Get PostgreSQL connection URL for asyncpg driver."""
        password = self.postgres_password.get_secret_value()
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{password}@"
            f"{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            f"?ssl={self.postgres_ssl_mode}"
        )

    @property
    def redis_url(self) -> str:
        """Get Redis connection URL."""
        auth_part = ""
        if self.redis_password:
            password = self.redis_password.get_secret_value()
            auth_part = f":{password}@"

        protocol = "rediss" if self.redis_ssl else "redis"
        return f"{protocol}://{auth_part}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def timescale_url(self) -> str | None:
        """Get TimescaleDB connection URL if configured."""
        if not all([self.timescale_host, self.timescale_user, self.timescale_password]):
            return None

        password = self.timescale_password.get_secret_value()  # type: ignore
        return (
            f"postgresql://{self.timescale_user}:{password}@"
            f"{self.timescale_host}:{self.timescale_port}/{self.timescale_db}"
        )

    class Config:
        env_prefix = "DB_"
        case_sensitive = False
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"


class SecuritySettings(BaseSettings):
    """Security and authentication configuration."""

    # JWT Configuration
    jwt_secret_key: SecretStr = Field(..., env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(
        default=30, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    jwt_refresh_token_expire_days: int = Field(
        default=30, env="JWT_REFRESH_TOKEN_EXPIRE_DAYS"
    )

    # OAuth Configuration
    oauth_providers: str | list[str] = Field(default=["azure", "github"])

    # Azure AD
    azure_tenant_id: str | None = Field(default=None, env="AZURE_TENANT_ID")
    azure_client_id: str | None = Field(default=None, env="AZURE_CLIENT_ID")
    azure_client_secret: SecretStr | None = Field(
        default=None, env="AZURE_CLIENT_SECRET"
    )

    # GitHub OAuth
    github_client_id: str | None = Field(default=None, env="GITHUB_CLIENT_ID")
    github_client_secret: SecretStr | None = Field(
        default=None, env="GITHUB_CLIENT_SECRET"
    )

    # Security Headers
    enable_cors: bool = Field(default=True, env="ENABLE_CORS")
    cors_origins: str | list[str] = Field(default=["http://localhost:3000"])
    cors_credentials: bool = Field(default=True, env="CORS_CREDENTIALS")

    # Rate Limiting
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW")  # seconds

    # API Keys for MCP server registration
    admin_api_key: SecretStr | None = Field(default=None, env="ADMIN_API_KEY")
    server_registration_keys: str | list[str] = Field(default=[])

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS origins from environment or use default."""
        import os

        # Check environment variable directly
        env_value = os.getenv("SECURITY_CORS_ORIGINS")
        if env_value:
            # Handle both JSON array format and comma-separated format
            if env_value.startswith("[") and env_value.endswith("]"):
                import json

                try:
                    return json.loads(env_value)
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in env_value.split(",") if origin.strip()]
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return v
        return ["http://localhost:3000"]  # fallback

    @field_validator("oauth_providers", mode="before")
    @classmethod
    def parse_oauth_providers(cls, v: Any) -> list[str]:
        """Parse OAuth providers from environment or use default."""
        import os

        # Check environment variable directly
        env_value = os.getenv("SECURITY_OAUTH_PROVIDERS")
        if env_value:
            return [
                provider.strip()
                for provider in env_value.split(",")
                if provider.strip()
            ]
        if isinstance(v, str):
            return [provider.strip() for provider in v.split(",") if provider.strip()]
        if isinstance(v, list):
            return v
        return ["azure", "github"]  # fallback

    @field_validator("server_registration_keys", mode="before")
    @classmethod
    def parse_registration_keys(cls, v: Any) -> list[str]:
        """Parse server registration keys from environment or use default."""
        import os

        # Check environment variable directly
        env_value = os.getenv("SECURITY_SERVER_REGISTRATION_KEYS")
        if env_value:
            return [key.strip() for key in env_value.split(",") if key.strip()]
        if isinstance(v, str):
            return [key.strip() for key in v.split(",") if key.strip()]
        if isinstance(v, list):
            return v
        return []  # fallback

    class Config:
        env_prefix = "SECURITY_"
        case_sensitive = False
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"


class ServiceSettings(BaseSettings):
    """Service-specific configuration."""

    # Server Configuration
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    workers: int = Field(default=1, env="WORKERS")
    reload: bool = Field(default=False, env="RELOAD")

    # Service Discovery
    registry_refresh_interval: int = Field(
        default=60, env="REGISTRY_REFRESH_INTERVAL"
    )  # seconds
    health_check_interval: int = Field(
        default=30, env="HEALTH_CHECK_INTERVAL"
    )  # seconds
    health_check_timeout: int = Field(default=10, env="HEALTH_CHECK_TIMEOUT")  # seconds

    # Request Routing
    max_connections_per_server: int = Field(
        default=50, env="MAX_CONNECTIONS_PER_SERVER"
    )
    request_timeout: int = Field(default=30, env="REQUEST_TIMEOUT")  # seconds
    connection_pool_size: int = Field(default=100, env="CONNECTION_POOL_SIZE")

    # Circuit Breaker
    circuit_breaker_threshold: int = Field(default=5, env="CIRCUIT_BREAKER_THRESHOLD")
    circuit_breaker_timeout: int = Field(
        default=60, env="CIRCUIT_BREAKER_TIMEOUT"
    )  # seconds
    circuit_breaker_recovery_timeout: int = Field(
        default=30, env="CIRCUIT_BREAKER_RECOVERY_TIMEOUT"
    )

    # Load Balancing
    load_balancing_strategy: str = Field(
        default="round_robin", env="LOAD_BALANCING_STRATEGY"
    )
    health_check_weight: float = Field(default=0.3, env="HEALTH_CHECK_WEIGHT")
    latency_weight: float = Field(default=0.4, env="LATENCY_WEIGHT")
    capacity_weight: float = Field(default=0.3, env="CAPACITY_WEIGHT")

    # Multi-tenancy
    enable_multi_tenancy: bool = Field(default=True, env="ENABLE_MULTI_TENANCY")
    default_tenant_id: str | None = Field(default=None, env="DEFAULT_TENANT_ID")
    tenant_isolation_strict: bool = Field(default=True, env="TENANT_ISOLATION_STRICT")

    @field_validator("load_balancing_strategy")
    @classmethod
    def validate_load_balancing_strategy(cls, v: str) -> str:
        """Validate load balancing strategy."""
        allowed = {
            "round_robin",
            "weighted",
            "least_connections",
            "random",
            "consistent_hash",
        }
        if v not in allowed:
            raise ValueError(
                f"Invalid load balancing strategy: {v}. Must be one of {allowed}"
            )
        return v

    @field_validator("health_check_weight", "latency_weight", "capacity_weight")
    @classmethod
    def validate_weights(cls, v: float) -> float:
        """Validate weight values are between 0 and 1."""
        if not 0 <= v <= 1:
            raise ValueError("Weight values must be between 0 and 1")
        return v

    class Config:
        env_prefix = "SERVICE_"
        case_sensitive = False
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"


class MonitoringSettings(BaseSettings):
    """Monitoring and observability configuration."""

    # Metrics
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")
    metrics_export_interval: int = Field(
        default=60, env="METRICS_EXPORT_INTERVAL"
    )  # seconds
    prometheus_port: int = Field(default=9090, env="PROMETHEUS_PORT")

    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(
        default="structured", env="LOG_FORMAT"
    )  # structured or plain
    log_to_file: bool = Field(default=False, env="LOG_TO_FILE")
    log_file_path: str | None = Field(default=None, env="LOG_FILE_PATH")
    log_rotation_size: str = Field(default="10MB", env="LOG_ROTATION_SIZE")
    log_retention_days: int = Field(default=30, env="LOG_RETENTION_DAYS")

    # Distributed Tracing
    enable_tracing: bool = Field(default=False, env="ENABLE_TRACING")
    jaeger_endpoint: str | None = Field(default=None, env="JAEGER_ENDPOINT")
    trace_sample_rate: float = Field(default=0.1, env="TRACE_SAMPLE_RATE")

    # Error Tracking
    sentry_dsn: str | None = Field(default=None, env="SENTRY_DSN")
    sentry_environment: str = Field(default="development", env="SENTRY_ENVIRONMENT")
    sentry_sample_rate: float = Field(default=1.0, env="SENTRY_SAMPLE_RATE")

    # Health Checks
    enable_health_checks: bool = Field(default=True, env="ENABLE_HEALTH_CHECKS")
    health_check_endpoints: str | list[str] = Field(
        default=["/health", "/ready", "/metrics"]
    )

    @field_validator("health_check_endpoints", mode="before")
    @classmethod
    def parse_health_check_endpoints(cls, v: Any) -> list[str]:
        """Parse health check endpoints from environment or use default."""
        import os

        # Check environment variable directly
        env_value = os.getenv("MONITORING_HEALTH_CHECK_ENDPOINTS")
        if env_value:
            return [
                endpoint.strip()
                for endpoint in env_value.split(",")
                if endpoint.strip()
            ]
        if isinstance(v, str):
            return [endpoint.strip() for endpoint in v.split(",") if endpoint.strip()]
        if isinstance(v, list):
            return v
        return ["/health", "/ready", "/metrics"]  # fallback

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if v.upper() not in allowed:
            raise ValueError(f"Invalid log level: {v}. Must be one of {allowed}")
        return v.upper()

    @field_validator("log_format")
    @classmethod
    def validate_log_format(cls, v: str) -> str:
        """Validate log format."""
        allowed = {"structured", "plain"}
        if v not in allowed:
            raise ValueError(f"Invalid log format: {v}. Must be one of {allowed}")
        return v

    @field_validator("trace_sample_rate", "sentry_sample_rate")
    @classmethod
    def validate_sample_rate(cls, v: float) -> float:
        """Validate sample rate is between 0 and 1."""
        if not 0 <= v <= 1:
            raise ValueError("Sample rate must be between 0 and 1")
        return v

    class Config:
        env_prefix = "MONITORING_"
        case_sensitive = False
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"


class FastMCPSettings(BaseSettings):
    """FastMCP server and authentication configuration."""

    # FastMCP Server Configuration
    enabled: bool = Field(default=True, env="MREG_FASTMCP_ENABLED")
    port: int = Field(default=8001, env="MREG_FASTMCP_PORT")
    host: str = Field(default="0.0.0.0", env="MREG_FASTMCP_HOST")

    # OAuth Proxy Configuration
    oauth_callback_url: str = Field(
        default="http://localhost:8001/oauth/callback",
        env="MREG_FASTMCP_OAUTH_CALLBACK_URL",
    )
    oauth_scopes: list[str] = Field(
        default=["User.Read", "profile", "openid", "email"],
        env="MREG_FASTMCP_OAUTH_SCOPES",
    )

    # Azure OAuth Configuration (MREG_ prefix to avoid conflicts)
    azure_tenant_id: str | None = Field(default=None, env="MREG_AZURE_TENANT_ID")
    azure_client_id: str | None = Field(default=None, env="MREG_AZURE_CLIENT_ID")
    azure_client_secret: SecretStr | None = Field(
        default=None, env="MREG_AZURE_CLIENT_SECRET"
    )

    # Azure Application Insights (for distributed tracing)
    azure_instrumentation_key: str | None = Field(
        default=None, env="MREG_AZURE_INSTRUMENTATION_KEY"
    )

    # Middleware Configuration
    enable_auth_middleware: bool = Field(
        default=True, env="MREG_FASTMCP_ENABLE_AUTH_MIDDLEWARE"
    )
    enable_tool_access_control: bool = Field(
        default=True, env="MREG_FASTMCP_ENABLE_TOOL_ACCESS_CONTROL"
    )
    enable_audit_logging: bool = Field(
        default=True, env="MREG_FASTMCP_ENABLE_AUDIT_LOGGING"
    )
    enable_rate_limiting: bool = Field(
        default=True, env="MREG_FASTMCP_ENABLE_RATE_LIMITING"
    )

    # Tool Access Control Rules
    tool_permissions: dict[str, list[str]] = Field(
        default={
            "register_server": ["admin"],
            "delete_server": ["admin", "server_owner"],
            "proxy_request": ["user", "admin"],
            "list_servers": [],  # Public access
            "health_check": [],  # Public access
        }
    )

    # Rate Limiting Configuration
    requests_per_minute: int = Field(
        default=100, env="MREG_FASTMCP_REQUESTS_PER_MINUTE"
    )

    # Advanced Rate Limiting Settings
    enable_distributed_rate_limiting: bool = Field(
        default=True, env="MREG_FASTMCP_ENABLE_DISTRIBUTED_RATE_LIMITING"
    )
    enable_per_tenant_limits: bool = Field(
        default=True, env="MREG_FASTMCP_ENABLE_PER_TENANT_LIMITS"
    )

    # Tiered Rate Limits by User Role
    rate_limit_admin_rpm: int = Field(
        default=1000, env="MREG_FASTMCP_RATE_LIMIT_ADMIN_RPM"
    )
    rate_limit_user_rpm: int = Field(
        default=100, env="MREG_FASTMCP_RATE_LIMIT_USER_RPM"
    )
    rate_limit_server_owner_rpm: int = Field(
        default=500, env="MREG_FASTMCP_RATE_LIMIT_SERVER_OWNER_RPM"
    )
    rate_limit_anonymous_rpm: int = Field(
        default=20, env="MREG_FASTMCP_RATE_LIMIT_ANONYMOUS_RPM"
    )

    # Per-Tenant Rate Limits (multipliers of individual limits)
    rate_limit_tenant_multiplier: float = Field(
        default=10.0, env="MREG_FASTMCP_RATE_LIMIT_TENANT_MULTIPLIER"
    )
    rate_limit_global_rpm: int = Field(
        default=10000, env="MREG_FASTMCP_RATE_LIMIT_GLOBAL_RPM"
    )

    # Rate Limit Window Settings
    rate_limit_window_seconds: int = Field(
        default=60, env="MREG_FASTMCP_RATE_LIMIT_WINDOW_SECONDS"
    )
    rate_limit_burst_factor: float = Field(
        default=2.0, env="MREG_FASTMCP_RATE_LIMIT_BURST_FACTOR"
    )

    # Rate Limit Storage Settings
    rate_limit_redis_key_ttl: int = Field(
        default=120, env="MREG_FASTMCP_RATE_LIMIT_REDIS_KEY_TTL"
    )
    rate_limit_cleanup_interval: int = Field(
        default=300, env="MREG_FASTMCP_RATE_LIMIT_CLEANUP_INTERVAL"
    )

    # DDoS Protection Settings
    enable_ddos_protection: bool = Field(
        default=True, env="MREG_FASTMCP_ENABLE_DDOS_PROTECTION"
    )
    ddos_detection_threshold: int = Field(
        default=1000, env="MREG_FASTMCP_DDOS_DETECTION_THRESHOLD"
    )
    ddos_ban_duration_seconds: int = Field(
        default=3600, env="MREG_FASTMCP_DDOS_BAN_DURATION_SECONDS"
    )

    @property
    def cache_url(self) -> str:
        """Get Redis cache URL - will be set by parent Settings object."""
        # Fallback to environment variable (parent will set this properly)
        import os

        return os.getenv("MREG_REDIS_URL", "redis://localhost:6379/0")

    @field_validator("oauth_scopes", mode="before")
    @classmethod
    def parse_oauth_scopes(cls, v: Any) -> list[str]:
        """Parse OAuth scopes from environment or use default."""
        import os

        # Check environment variable directly
        env_value = os.getenv("MREG_FASTMCP_OAUTH_SCOPES")
        if env_value:
            return [scope.strip() for scope in env_value.split(",") if scope.strip()]
        if isinstance(v, str):
            return [scope.strip() for scope in v.split(",") if scope.strip()]
        if isinstance(v, list):
            return v
        return ["User.Read", "profile", "openid", "email"]  # fallback

    class Config:
        env_prefix = "MREG_"
        case_sensitive = False
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"


class Settings(BaseSettings):
    """Main application settings combining all configuration sections."""

    # Application Info
    app_name: str = Field(default="MCP Registry Gateway", env="APP_NAME")
    app_version: str = Field(default="0.1.0", env="APP_VERSION")
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")

    # Component Settings
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    service: ServiceSettings = Field(default_factory=ServiceSettings)
    monitoring: MonitoringSettings = Field(default_factory=MonitoringSettings)
    fastmcp: FastMCPSettings = Field(default_factory=FastMCPSettings)

    # Feature Flags
    feature_flags: str | dict[str, bool] = Field(
        default={
            "advanced_routing": True,
            "circuit_breaker": True,
            "connection_pooling": True,
            "distributed_tracing": False,
            "auto_scaling": False,
            "webhook_notifications": False,
        }
    )

    # Development Settings
    docs_url: str | None = Field(default="/docs", env="DOCS_URL")
    redoc_url: str | None = Field(default="/redoc", env="REDOC_URL")
    openapi_url: str | None = Field(default="/openapi.json", env="OPENAPI_URL")

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment setting."""
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"Invalid environment: {v}. Must be one of {allowed}")
        return v

    @field_validator("feature_flags", mode="before")
    @classmethod
    def parse_feature_flags(cls, v: Any) -> dict[str, bool]:
        """Parse feature flags from environment or use default."""
        import os

        # Check environment variable directly
        env_value = os.getenv("FEATURE_FLAGS")
        if env_value:
            # Parse from comma-separated string like "feature1:true,feature2:false"
            flags = {}
            for flag_pair in env_value.split(","):
                if ":" in flag_pair:
                    key, value = flag_pair.split(":", 1)
                    flags[key.strip()] = value.strip().lower() in (
                        "true",
                        "1",
                        "yes",
                        "on",
                    )
            return flags
        if isinstance(v, str):
            # Parse from comma-separated string like "feature1:true,feature2:false"
            flags = {}
            for flag_pair in v.split(","):
                if ":" in flag_pair:
                    key, value = flag_pair.split(":", 1)
                    flags[key.strip()] = value.strip().lower() in (
                        "true",
                        "1",
                        "yes",
                        "on",
                    )
            return flags
        elif isinstance(v, dict):
            return v
        return {
            "advanced_routing": True,
            "circuit_breaker": True,
            "connection_pooling": True,
            "distributed_tracing": False,
            "auto_scaling": False,
            "webhook_notifications": False,
        }

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == "production"

    @property
    def is_debug(self) -> bool:
        """Check if debug mode is enabled."""
        return self.debug or self.is_development

    class Config:
        env_file = str(ENV_FILE)
        env_file_encoding = "utf-8"
        case_sensitive = False
        # Allow extra fields for forward compatibility
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """
    Get application settings with caching.

    This function uses LRU cache to ensure settings are loaded only once
    and reused across the application.

    Returns:
        Settings: Cached application settings instance
    """
    return Settings()


def override_settings(**_kwargs: Any) -> None:
    """
    Override settings for testing purposes.

    This function clears the settings cache and allows for temporary
    setting overrides during testing.

    Args:
        **kwargs: Settings to override
    """
    get_settings.cache_clear()
    # In a real implementation, you'd want to temporarily patch the settings
    # This is a simplified version for demonstration
