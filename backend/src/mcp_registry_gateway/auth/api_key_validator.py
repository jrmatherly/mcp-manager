"""
API Key validation for FastMCP using Better-Auth database tables.

This module provides API key validation by querying the Better-Auth apiKey table
from the shared PostgreSQL database, implementing the dual-system authentication
architecture where FastMCP validates API keys created by Better-Auth.
"""

import hashlib
import logging
from datetime import datetime, timezone

import redis.asyncio as redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..core.exceptions import FastMCPAuthenticationError
from ..db.database import get_async_session


logger = logging.getLogger(__name__)


class APIKeyValidator:
    """
    Validates API keys from Better-Auth's apiKey table.

    This class implements the dual-system authentication pattern where:
    1. Better-Auth manages API key creation/updates in the frontend
    2. FastMCP validates API keys for backend API access
    3. Redis provides caching for performance optimization
    """

    def __init__(self):
        self.settings = get_settings()
        self._redis_client: redis.Redis | None = None
        self.cache_ttl = 300  # 5 minutes cache TTL

    async def _get_redis(self) -> redis.Redis | None:
        """Get or create Redis client for caching."""
        if self._redis_client is None:
            try:
                self._redis_client = redis.from_url(
                    self.settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                )
                await self._redis_client.ping()
                logger.info("Connected to Redis for API key caching")
            except Exception as e:
                logger.warning(f"Redis connection failed, caching disabled: {e}")
                self._redis_client = None
        return self._redis_client

    def _hash_api_key(self, api_key: str) -> str:
        """
        Hash an API key for comparison with stored hashes.

        Better-Auth stores hashed keys for security.
        """
        return hashlib.sha256(api_key.encode()).hexdigest()

    async def validate_api_key(
        self, api_key: str, session: AsyncSession | None = None
    ) -> dict | None:
        """
        Validate an API key against Better-Auth's apiKey table.

        Args:
            api_key: The API key to validate
            session: Optional database session (will create if not provided)

        Returns:
            User context dict if valid, None if invalid

        Raises:
            FastMCPAuthenticationError: If the API key is invalid or expired
        """
        if not api_key:
            return None

        # Check Redis cache first
        cache_key = f"api_key:{api_key[:8]}..."  # Use prefix for cache key
        redis_client = await self._get_redis()

        if redis_client:
            try:
                cached = await redis_client.get(cache_key)
                if cached == "invalid":
                    raise FastMCPAuthenticationError(
                        "Invalid API key (cached)",
                        auth_method="api_key",
                        operation="api_key_validation",
                    )
                elif cached:
                    logger.debug(f"API key validated from cache: {cache_key}")
                    import json

                    return json.loads(cached)
            except FastMCPAuthenticationError:
                raise
            except Exception as e:
                logger.warning(f"Redis cache read failed: {e}")

        # Query Better-Auth's apiKey table
        async with session or get_async_session() as db_session:
            try:
                # Hash the provided API key for comparison
                key_hash = self._hash_api_key(api_key)

                # Query the Better-Auth apiKey table
                # Note: Using raw SQL since we don't have SQLAlchemy models for Better-Auth tables
                query = text("""
                    SELECT
                        ak."id",
                        ak."userId",
                        ak."name",
                        ak."permissions",
                        ak."expiresAt",
                        ak."rateLimit",
                        ak."enabled",
                        ak."lastUsedAt",
                        u."email",
                        u."name" as user_name,
                        u."role" as user_role
                    FROM "apiKey" ak
                    INNER JOIN "user" u ON ak."userId" = u."id"
                    WHERE ak."key" = :key_hash
                    AND (ak."enabled" = true OR ak."enabled" IS NULL)
                    AND (ak."expiresAt" IS NULL OR ak."expiresAt" > :now)
                """)

                result = await db_session.execute(
                    query, {"key_hash": key_hash, "now": datetime.now(timezone.utc)}
                )
                row = result.fetchone()

                if not row:
                    # Cache the invalid key to prevent repeated DB queries
                    if redis_client:
                        try:
                            await redis_client.setex(cache_key, 60, "invalid")
                        except Exception as e:
                            logger.warning(f"Redis cache write failed: {e}")

                    raise FastMCPAuthenticationError(
                        "Invalid or expired API key",
                        auth_method="api_key",
                        operation="api_key_validation",
                    )

                # Update last used timestamp
                update_query = text("""
                    UPDATE "apiKey"
                    SET "lastUsedAt" = :now
                    WHERE "id" = :key_id
                """)
                await db_session.execute(
                    update_query, {"now": datetime.now(timezone.utc), "key_id": row.id}
                )
                await db_session.commit()

                # Build user context
                user_context = {
                    "user_id": row.userId,
                    "email": row.email,
                    "name": row.user_name,
                    "role": row.user_role or "user",
                    "api_key_id": row.id,
                    "api_key_name": row.name,
                    "permissions": row.permissions or [],
                    "rate_limit": row.rateLimit,
                    "auth_method": "api_key",
                }

                # Cache the valid context
                if redis_client:
                    try:
                        import json

                        await redis_client.setex(
                            cache_key, self.cache_ttl, json.dumps(user_context)
                        )
                    except Exception as e:
                        logger.warning(f"Redis cache write failed: {e}")

                logger.info(
                    f"API key validated for user: {row.email} (key: {row.name})"
                )
                return user_context

            except FastMCPAuthenticationError:
                raise
            except Exception as e:
                logger.error(f"API key validation error: {e}")
                raise FastMCPAuthenticationError(
                    f"API key validation failed: {e!s}",
                    auth_method="api_key",
                    operation="api_key_validation",
                ) from e


# Global instance for middleware use
api_key_validator = APIKeyValidator()
