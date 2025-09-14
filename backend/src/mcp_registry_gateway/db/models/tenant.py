"""
Multi-tenancy models for MCP Registry Gateway.
"""

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from .base import TenantStatus, UUIDModel


if TYPE_CHECKING:
    from .auth import User
    from .registry import MCPServer


class Tenant(UUIDModel, table=True):
    """Tenant model for multi-tenancy support."""

    __tablename__ = "tenants"

    name: str = Field(max_length=255, index=True)
    description: str | None = None
    status: TenantStatus = Field(default=TenantStatus.ACTIVE)
    settings: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    servers: list["MCPServer"] = Relationship(back_populates="tenant")
    users: list["User"] = Relationship(back_populates="tenant")
