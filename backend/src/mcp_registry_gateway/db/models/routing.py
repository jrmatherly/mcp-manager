"""
Routing and rule models for MCP Registry Gateway.
"""

from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field

from .base import UUIDModel


class RoutingRule(UUIDModel, table=True):
    """Custom routing rules for request routing."""

    __tablename__ = "routing_rules"

    name: str = Field(max_length=255)
    description: str | None = None

    # Rule conditions
    conditions: dict[str, Any] = Field(sa_type=JSON)

    # Target configuration
    target_servers: list[str] = Field(sa_type=JSON)  # Server IDs
    load_balancing_strategy: str = Field(default="round_robin", max_length=50)

    # Rule metadata
    priority: int = Field(default=100)  # Lower number = higher priority
    is_active: bool = Field(default=True)

    # Tenant relationship
    tenant_id: str | None = Field(foreign_key="tenants.id")


# Audit and Logging Models
