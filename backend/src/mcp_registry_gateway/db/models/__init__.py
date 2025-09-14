"""
Database models for MCP Registry Gateway.

This module re-exports all models from their respective submodules for backward compatibility.
"""

# Base models and enums
# Audit and logging
from .audit import AuditLog, FastMCPAuditLog, RequestLog

# Authentication models
from .auth import APIKey, EnhancedAPIKey, Session, User
from .base import (
    APIKeyScope,
    CircuitBreakerState,
    LoadBalancingAlgorithm,
    ServerStatus,
    TenantStatus,
    TimestampedModel,
    TransportType,
    UserRole,
    UUIDModel,
    generate_uuid,
    utc_now,
)

# Better-Auth models (read-only)
from .better_auth import (
    BetterAuthAccount,
    BetterAuthApiKey,
    BetterAuthInvitation,
    BetterAuthOrganization,
    BetterAuthOrganizationMember,
    BetterAuthSession,
    BetterAuthUser,
    BetterAuthVerification,
    get_user_by_api_key,
)

# Core registry models
from .registry import (
    MCPServer,
    ServerAccessControl,
    ServerMetric,
    ServerResource,
    ServerTool,
)

# Routing and rules
from .routing import RoutingRule

# System configuration and monitoring
from .system import (
    CircuitBreaker,
    ConnectionPool,
    DataRetentionPolicy,
    MaterializedView,
    PerformanceAlert,
    RequestQueue,
    SystemConfig,
)

# Multi-tenancy models
from .tenant import Tenant


__all__ = [
    "APIKey",
    "APIKeyScope",
    # Audit
    "AuditLog",
    "BetterAuthAccount",
    "BetterAuthApiKey",
    "BetterAuthInvitation",
    "BetterAuthOrganization",
    "BetterAuthOrganizationMember",
    "BetterAuthSession",
    # Better-Auth
    "BetterAuthUser",
    "BetterAuthVerification",
    "CircuitBreaker",
    "CircuitBreakerState",
    "ConnectionPool",
    "DataRetentionPolicy",
    "EnhancedAPIKey",
    "FastMCPAuditLog",
    "LoadBalancingAlgorithm",
    # Registry
    "MCPServer",
    "MaterializedView",
    "PerformanceAlert",
    "RequestLog",
    "RequestQueue",
    # Routing
    "RoutingRule",
    "ServerAccessControl",
    "ServerMetric",
    "ServerResource",
    "ServerStatus",
    "ServerTool",
    "Session",
    # System
    "SystemConfig",
    # Tenant
    "Tenant",
    "TenantStatus",
    "TimestampedModel",
    # Base
    "TransportType",
    "UUIDModel",
    # Auth
    "User",
    "UserRole",
    "generate_uuid",
    "get_user_by_api_key",
    "utc_now",
]
