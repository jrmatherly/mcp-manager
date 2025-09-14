"""
Authentication and authorization models for MCP Registry Gateway.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from .base import APIKeyScope, UserRole, UUIDModel, utc_now
from .tenant import Tenant


class User(UUIDModel, table=True):
    """User model for authentication and authorization."""

    __tablename__ = "users"

    username: str = Field(max_length=255, unique=True, index=True)
    email: str = Field(max_length=255, unique=True, index=True)
    full_name: str | None = Field(max_length=255)
    role: UserRole = Field(default=UserRole.USER)
    is_active: bool = Field(default=True)

    # External auth provider info
    auth_provider: str | None = Field(max_length=50)  # azure, github, etc.
    auth_provider_id: str | None = Field(max_length=255)

    # Tenant relationship
    tenant_id: str | None = Field(foreign_key="tenants.id")
    tenant: Tenant | None = Relationship(back_populates="users")

    # Additional metadata
    user_metadata: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)


class Session(UUIDModel, table=True):
    """User session model."""

    __tablename__ = "sessions"

    user_id: str = Field(foreign_key="users.id", index=True)
    session_token: str = Field(max_length=255, unique=True, index=True)

    # Session metadata
    ip_address: str | None = Field(max_length=45)  # IPv6 max length
    user_agent: str | None = Field(max_length=500)

    # Expiration
    expires_at: datetime

    # Session data
    session_data: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)

    # State
    is_active: bool = Field(default=True)
    last_activity: datetime = Field(default_factory=utc_now)


class APIKey(UUIDModel, table=True):
    """API key model for service authentication."""

    __tablename__ = "api_keys"

    name: str = Field(max_length=255)
    key_hash: str = Field(max_length=255, unique=True, index=True)
    key_prefix: str = Field(max_length=20, index=True)  # For identification

    # Ownership
    user_id: str | None = Field(foreign_key="users.id")
    tenant_id: str | None = Field(foreign_key="tenants.id")

    # Permissions and scope
    permissions: list[str] = Field(default_factory=list, sa_type=JSON)
    scopes: list[str] = Field(default_factory=list, sa_type=JSON)

    # State
    is_active: bool = Field(default=True)
    expires_at: datetime | None = None
    last_used: datetime | None = None

    # Usage statistics
    total_requests: int = Field(default=0)

    # Metadata
    api_key_metadata: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)


# Routing and Load Balancing Models


class EnhancedAPIKey(UUIDModel, table=True):
    """Enhanced API key model with better security and access control."""

    __tablename__ = "enhanced_api_keys"

    # Basic information
    name: str = Field(max_length=255, index=True)
    description: str | None = None

    # Key security
    key_hash: str = Field(max_length=255, unique=True, index=True)
    key_prefix: str = Field(max_length=20, index=True)  # For identification
    salt: str = Field(max_length=255)  # For additional security

    # Ownership and tenancy
    user_id: str | None = Field(foreign_key="users.id", index=True)
    tenant_id: str | None = Field(foreign_key="tenants.id", index=True)

    # Permissions and scopes
    scopes: list[APIKeyScope] = Field(default_factory=list, sa_type=JSON)
    allowed_servers: list[str] = Field(default_factory=list, sa_type=JSON)  # Server IDs
    allowed_methods: list[str] = Field(
        default_factory=list, sa_type=JSON
    )  # MCP methods

    # Access restrictions
    ip_whitelist: list[str] = Field(default_factory=list, sa_type=JSON)
    rate_limit_per_hour: int = Field(default=1000)
    rate_limit_per_day: int = Field(default=10000)

    # State and expiration
    is_active: bool = Field(default=True, index=True)
    expires_at: datetime | None = Field(index=True)
    last_used: datetime | None = Field(index=True)

    # Usage tracking
    total_requests: int = Field(default=0)
    total_errors: int = Field(default=0)
    last_success: datetime | None = None
    last_error: datetime | None = None

    # Security events
    failed_attempts: int = Field(default=0)
    last_failed_attempt: datetime | None = None
    is_locked: bool = Field(default=False, index=True)
    locked_until: datetime | None = None
