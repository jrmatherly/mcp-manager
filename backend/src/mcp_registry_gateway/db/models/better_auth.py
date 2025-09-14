"""
SQLAlchemy models for Better-Auth tables.

These models provide read-only access to Better-Auth tables for the FastMCP backend.
Better-Auth manages all writes to these tables from the frontend.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Boolean, Column, DateTime, Index, String, Text, or_
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()


class BetterAuthUser(Base):
    """Read-only model for Better-Auth user table."""

    __tablename__ = "user"

    id = Column(String, primary_key=True)
    email = Column(String, nullable=False, unique=True)
    emailVerified = Column(Boolean, default=False)
    name = Column(String)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)
    image = Column(Text)
    role = Column(String)
    banned = Column(Boolean, default=False)
    banReason = Column(Text)
    banExpiresAt = Column(DateTime)
    twoFactorEnabled = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_user_email", "email"),
        Index("idx_user_role", "role"),
        {"schema": "public", "extend_existing": True},
    )


class BetterAuthSession(Base):
    """Read-only model for Better-Auth session table."""

    __tablename__ = "session"

    id = Column(String, primary_key=True)
    expiresAt = Column(DateTime, nullable=False)
    ipAddress = Column(String)
    userAgent = Column(Text)
    userId = Column(String, nullable=False)
    activeOrganizationId = Column(String)
    impersonatedBy = Column(String)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("idx_session_userId", "userId"),
        Index("idx_session_expiresAt", "expiresAt"),
        {"schema": "public", "extend_existing": True},
    )


class BetterAuthApiKey(Base):
    """Read-only model for Better-Auth apiKey table."""

    __tablename__ = "apiKey"

    id = Column(String, primary_key=True)
    name = Column(String)
    key = Column(String, nullable=False, unique=True)  # This is the hashed key
    userId = Column(String, nullable=False)
    permissions = Column(JSON)
    expiresAt = Column(DateTime)
    rateLimit = Column(JSON)
    enabled = Column(Boolean, default=True)
    lastUsedAt = Column(DateTime)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("idx_apiKey_userId", "userId"),
        Index("idx_apiKey_key", "key"),
        Index("idx_apiKey_enabled", "enabled"),
        Index("idx_apiKey_expiresAt", "expiresAt"),
        {"schema": "public", "extend_existing": True},
    )


class BetterAuthAccount(Base):
    """Read-only model for Better-Auth account table (social logins)."""

    __tablename__ = "account"

    id = Column(String, primary_key=True)
    accountId = Column(String, nullable=False)
    providerId = Column(String, nullable=False)
    userId = Column(String, nullable=False)
    accessToken = Column(Text)
    refreshToken = Column(Text)
    expiresAt = Column(DateTime)
    password = Column(Text)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("idx_account_userId", "userId"),
        Index("idx_account_providerId", "providerId"),
        {"schema": "public", "extend_existing": True},
    )


class BetterAuthVerification(Base):
    """Read-only model for Better-Auth verification table."""

    __tablename__ = "verification"

    id = Column(String, primary_key=True)
    identifier = Column(String, nullable=False)
    value = Column(String, nullable=False)
    expiresAt = Column(DateTime, nullable=False)
    createdAt = Column(DateTime)
    updatedAt = Column(DateTime)

    __table_args__ = (
        Index("idx_verification_identifier", "identifier"),
        Index("idx_verification_expiresAt", "expiresAt"),
        {"schema": "public", "extend_existing": True},
    )


class BetterAuthOrganization(Base):
    """Read-only model for Better-Auth organization table."""

    __tablename__ = "organization"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True)
    logo = Column(Text)
    createdAt = Column(DateTime, nullable=False)
    organization_metadata = Column("metadata", JSON)

    __table_args__ = (
        Index("idx_organization_slug", "slug"),
        {"schema": "public", "extend_existing": True},
    )


class BetterAuthOrganizationMember(Base):
    """Read-only model for Better-Auth organization member table."""

    __tablename__ = "member"

    id = Column(String, primary_key=True)
    organizationId = Column(String, nullable=False)
    userId = Column(String, nullable=False)
    role = Column(String, nullable=False)
    createdAt = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("idx_member_organizationId", "organizationId"),
        Index("idx_member_userId", "userId"),
        Index(
            "idx_member_organizationId_userId", "organizationId", "userId", unique=True
        ),
        {"schema": "public", "extend_existing": True},
    )


class BetterAuthInvitation(Base):
    """Read-only model for Better-Auth invitation table."""

    __tablename__ = "invitation"

    id = Column(String, primary_key=True)
    organizationId = Column(String, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String)
    inviterId = Column(String, nullable=False)
    status = Column(String, nullable=False)
    expiresAt = Column(DateTime, nullable=False)
    invitedAt = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("idx_invitation_organizationId", "organizationId"),
        Index("idx_invitation_email", "email"),
        Index("idx_invitation_status", "status"),
        {"schema": "public", "extend_existing": True},
    )


# Helper function to get user with API key
async def get_user_by_api_key(session, api_key_hash: str) -> dict[str, Any] | None:
    """
    Get user information by API key hash.

    This is a helper function for the API key validator.
    """
    from sqlalchemy import and_, select

    stmt = (
        select(BetterAuthApiKey, BetterAuthUser)
        .join(BetterAuthUser, BetterAuthApiKey.userId == BetterAuthUser.id)
        .where(
            and_(
                BetterAuthApiKey.key == api_key_hash,
                BetterAuthApiKey.enabled.is_(True),
                or_(
                    BetterAuthApiKey.expiresAt.is_(None),
                    BetterAuthApiKey.expiresAt > datetime.now(timezone.utc),
                ),
            )
        )
    )

    result = await session.execute(stmt)
    row = result.first()

    if row:
        api_key, user = row
        return {
            "user_id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role or "user",
            "api_key_id": api_key.id,
            "api_key_name": api_key.name,
            "permissions": api_key.permissions or [],
            "rate_limit": api_key.rateLimit,
        }

    return None
