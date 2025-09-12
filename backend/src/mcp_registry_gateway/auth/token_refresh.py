"""
Background Token Refresh Service for FastMCP Azure OAuth integration.

Provides seamless token renewal to eliminate user interruption during
authentication token expiration. Coordinates with Azure OAuth Proxy
for production-grade user experience optimization.
"""

import asyncio
import contextlib
import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from ..core.config import get_settings
from ..db.database import get_redis
from .context import UserContext


logger = logging.getLogger(__name__)


class TokenRefreshService:
    """Background token refresh service for seamless user experience."""

    def __init__(self):
        self.settings = get_settings()
        # Priority 1 Enhancement: Proactive token refresh optimization
        self.refresh_margin_minutes = 5  # Refresh tokens 5 minutes before expiry
        self.proactive_refresh_minutes = (
            10  # Start trying refresh 10 minutes before expiry
        )
        self.retry_intervals = [30, 60, 120, 300]  # Retry backoff in seconds
        self.max_retries = 4

        self.background_tasks: dict[str, asyncio.Task] = {}
        self.redis_client = None

        # Enhanced tracking for Priority 1 optimization
        self.refresh_metrics = {
            "successful_refreshes": 0,
            "failed_refreshes": 0,
            "proactive_refreshes": 0,
            "emergency_refreshes": 0,
            "retry_counts": {},
        }

        # Metrics middleware for refresh tracking
        self.metrics_middleware = None

    async def initialize(self) -> None:
        """Initialize the token refresh service."""
        try:
            self.redis_client = await get_redis()

            # Initialize metrics middleware connection
            try:
                from ..middleware.metrics import get_metrics_middleware

                self.metrics_middleware = get_metrics_middleware()
            except ImportError:
                logger.warning(
                    "Metrics middleware not available for token refresh tracking"
                )

            logger.info("Token refresh service initialized with enhanced monitoring")
        except Exception as e:
            logger.error(f"Failed to initialize token refresh service: {e}")
            raise

    def start_refresh_monitoring(self, user_context: UserContext, token: str) -> None:
        """Start background token refresh monitoring for a user."""
        if not user_context.user_id:
            logger.warning("Cannot start refresh monitoring: missing user ID")
            return

        # Cancel existing task for this user
        self.cancel_refresh_monitoring(user_context.user_id)

        # Start new background task
        task = asyncio.create_task(
            self._monitor_token_refresh(user_context, token),
            name=f"token_refresh_{user_context.user_id}",
        )

        self.background_tasks[user_context.user_id] = task
        logger.info(f"Started token refresh monitoring for user {user_context.user_id}")

    def cancel_refresh_monitoring(self, user_id: str) -> None:
        """Cancel background token refresh monitoring for a user."""
        if user_id in self.background_tasks:
            task = self.background_tasks.pop(user_id)
            if not task.done():
                task.cancel()
            logger.info(f"Cancelled token refresh monitoring for user {user_id}")

    async def _monitor_token_refresh(
        self, user_context: UserContext, token: str
    ) -> None:
        """Monitor and refresh token before expiration with enhanced retry logic."""
        user_id = user_context.user_id
        retry_count = 0

        try:
            while True:
                # Check if token needs refresh
                (
                    refresh_needed,
                    sleep_time,
                    refresh_type,
                ) = await self._check_refresh_needed_enhanced(token)

                if refresh_needed:
                    logger.info(
                        f"Starting {refresh_type} token refresh for user {user_id}"
                    )

                    # Attempt refresh with retry logic
                    new_token = await self._refresh_user_token_with_retry(
                        user_context, token, refresh_type, retry_count
                    )

                    if new_token:
                        # Reset retry count on success
                        retry_count = 0

                        # Update token in monitoring
                        token = new_token

                        # Store new token in Redis for session management
                        await self._store_refreshed_token(user_id, new_token)

                        # Record successful refresh metrics
                        await self._record_refresh_metrics(
                            user_id, user_context.tenant_id, refresh_type, "success"
                        )

                        logger.info(
                            f"Token refreshed successfully for user {user_id} ({refresh_type})"
                        )

                        # Add jitter to prevent thundering herd
                        jitter = random.uniform(0.8, 1.2)
                        sleep_time *= jitter

                    else:
                        # Handle refresh failure
                        retry_count += 1
                        await self._record_refresh_metrics(
                            user_id, user_context.tenant_id, refresh_type, "failure"
                        )

                        if retry_count >= self.max_retries:
                            logger.error(
                                f"Token refresh failed permanently for user {user_id} after {retry_count} attempts"
                            )
                            # Notify user session for re-authentication
                            await self._notify_session_refresh_failure(user_id)
                            break
                        else:
                            # Calculate exponential backoff with jitter
                            backoff_time = min(
                                self.retry_intervals[
                                    min(retry_count - 1, len(self.retry_intervals) - 1)
                                ],
                                300,  # Max 5 minutes
                            )
                            jitter = random.uniform(0.5, 1.5)
                            sleep_time = backoff_time * jitter

                            logger.warning(
                                f"Token refresh failed for user {user_id}, retrying in {sleep_time:.1f}s (attempt {retry_count}/{self.max_retries})"
                            )

                # Sleep until next check with randomized jitter
                jitter = random.uniform(0.9, 1.1)
                await asyncio.sleep(sleep_time * jitter)

        except asyncio.CancelledError:
            logger.info(f"Token refresh monitoring cancelled for user {user_id}")
        except Exception as e:
            logger.error(f"Token refresh monitoring error for user {user_id}: {e}")
            await self._record_refresh_metrics(
                user_id, user_context.tenant_id, "system", "error"
            )

    async def _check_refresh_needed(self, token: str) -> tuple[bool, float]:
        """Check if token needs refresh and calculate sleep time."""
        try:
            # Decode token without verification to get expiration
            decoded = jwt.decode(
                token, options={"verify_signature": False, "verify_exp": False}
            )

            exp_timestamp = decoded.get("exp")
            if not exp_timestamp:
                logger.warning("Token missing expiration claim")
                return False, 300  # Check again in 5 minutes

            exp_time = datetime.fromtimezone(timezone.utc).fromtimestamp(exp_timestamp)
            current_time = datetime.now(timezone.utc)
            time_to_expiry = exp_time - current_time

            # Check if we need to refresh (within refresh margin)
            refresh_needed = time_to_expiry <= timedelta(
                minutes=self.refresh_margin_minutes
            )

            if refresh_needed:
                return True, 0  # Refresh immediately

            # Calculate sleep time (check again when we hit refresh margin)
            sleep_seconds = max(
                (
                    time_to_expiry - timedelta(minutes=self.refresh_margin_minutes)
                ).total_seconds(),
                60,  # Minimum 1 minute check interval
            )

            return False, sleep_seconds

        except Exception as e:
            logger.error(f"Error checking token refresh need: {e}")
            return False, 300  # Default 5-minute recheck

    async def _check_refresh_needed_enhanced(
        self, token: str
    ) -> tuple[bool, float, str]:
        """Enhanced token refresh checking with proactive and emergency modes."""
        try:
            # Decode token without verification to get expiration
            decoded = jwt.decode(
                token, options={"verify_signature": False, "verify_exp": False}
            )

            exp_timestamp = decoded.get("exp")
            if not exp_timestamp:
                logger.warning("Token missing expiration claim")
                return False, 300, "unknown"  # Check again in 5 minutes

            exp_time = datetime.fromtimezone(timezone.utc).fromtimestamp(exp_timestamp)
            current_time = datetime.now(timezone.utc)
            time_to_expiry = exp_time - current_time

            # Emergency refresh (token expires in < refresh_margin_minutes)
            if time_to_expiry <= timedelta(minutes=self.refresh_margin_minutes):
                return True, 0, "emergency"

            # Proactive refresh (token expires in < proactive_refresh_minutes)
            elif time_to_expiry <= timedelta(minutes=self.proactive_refresh_minutes):
                return True, 0, "proactive"

            # Calculate sleep time (check again when we hit proactive refresh window)
            sleep_seconds = max(
                (
                    time_to_expiry - timedelta(minutes=self.proactive_refresh_minutes)
                ).total_seconds(),
                60,  # Minimum 1 minute check interval
            )

            return False, sleep_seconds, "scheduled"

        except Exception as e:
            logger.error(f"Error checking token refresh need: {e}")
            return False, 300, "error"  # Default 5-minute recheck

    async def _refresh_user_token_with_retry(
        self,
        user_context: UserContext,
        current_token: str,
        refresh_type: str,
        retry_count: int,
    ) -> str | None:
        """Refresh user token with enhanced retry logic and metrics."""
        try:
            # Record refresh attempt
            self.refresh_metrics["retry_counts"][user_context.user_id] = retry_count

            if refresh_type == "proactive":
                self.refresh_metrics["proactive_refreshes"] += 1
            elif refresh_type == "emergency":
                self.refresh_metrics["emergency_refreshes"] += 1

            # Call the original refresh method
            new_token = await self._refresh_user_token(user_context, current_token)

            if new_token:
                self.refresh_metrics["successful_refreshes"] += 1
                logger.debug(
                    f"Token refresh successful for user {user_context.user_id} on attempt {retry_count + 1}"
                )
            else:
                self.refresh_metrics["failed_refreshes"] += 1

            return new_token

        except Exception as e:
            self.refresh_metrics["failed_refreshes"] += 1
            logger.error(
                f"Token refresh with retry failed for user {user_context.user_id}: {e}"
            )
            return None

    async def _record_refresh_metrics(
        self, user_id: str, tenant_id: str, refresh_type: str, result: str
    ) -> None:
        """Record token refresh metrics for monitoring."""
        if self.metrics_middleware:
            try:
                # Record refresh event in metrics middleware
                self.metrics_middleware.token_refresh_events.labels(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    method=refresh_type,
                    result=result,
                ).inc()
                logger.debug(
                    f"Recorded refresh metrics: {user_id} {refresh_type} {result}"
                )
            except Exception as e:
                logger.warning(f"Failed to record refresh metrics: {e}")

    async def _notify_session_refresh_failure(self, user_id: str) -> None:
        """Notify session management of permanent refresh failure."""
        try:
            if self.redis_client:
                # Set a flag indicating user needs re-authentication
                await self.redis_client.setex(
                    f"auth_required:{user_id}",
                    3600,  # Expire in 1 hour
                    "token_refresh_failed",
                )
                logger.info(f"Set re-authentication flag for user {user_id}")
        except Exception as e:
            logger.error(
                f"Failed to set re-authentication flag for user {user_id}: {e}"
            )

    def get_refresh_metrics(self) -> dict[str, Any]:
        """Get current refresh metrics for monitoring."""
        return {
            **self.refresh_metrics,
            "active_monitoring_tasks": len(self.background_tasks),
            "proactive_refresh_window_minutes": self.proactive_refresh_minutes,
            "emergency_refresh_window_minutes": self.refresh_margin_minutes,
            "max_retry_attempts": self.max_retries,
        }

    async def _refresh_user_token(
        self, user_context: UserContext, _current_token: str
    ) -> str | None:
        """Refresh user token using Azure OAuth refresh token."""
        try:
            # In a real implementation, this would call Azure OAuth refresh endpoint
            # For now, we simulate the refresh process

            # Get refresh token from Redis storage
            refresh_token = await self._get_refresh_token(user_context.user_id)

            if not refresh_token:
                logger.warning(
                    f"No refresh token found for user {user_context.user_id}"
                )
                return None

            # Azure OAuth refresh token exchange
            new_tokens = await self._exchange_refresh_token(refresh_token, user_context)

            return new_tokens.get("access_token") if new_tokens else None

        except Exception as e:
            logger.error(f"Token refresh failed for user {user_context.user_id}: {e}")
            return None

    async def _get_refresh_token(self, user_id: str) -> str | None:
        """Get stored refresh token for user."""
        try:
            if not self.redis_client:
                return None

            refresh_token = await self.redis_client.get(f"refresh_token:{user_id}")
            return refresh_token

        except Exception as e:
            logger.error(f"Failed to get refresh token for user {user_id}: {e}")
            return None

    async def _exchange_refresh_token(
        self, refresh_token: str, user_context: UserContext
    ) -> dict[str, Any] | None:
        """Exchange refresh token for new access token with Azure."""
        try:
            # This is a simplified implementation
            # In production, this would make HTTP requests to Azure OAuth endpoints

            import httpx

            token_endpoint = f"https://login.microsoftonline.com/{user_context.tenant_id}/oauth2/v2.0/token"

            data = {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": self.settings.security.azure_client_id,
                "client_secret": self.settings.security.azure_client_secret.get_secret_value()
                if self.settings.security.azure_client_secret
                else "",
                "scope": "User.Read email openid profile offline_access",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    token_endpoint,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )

                if response.status_code == 200:
                    tokens = response.json()
                    logger.info(
                        f"Successfully refreshed token for user {user_context.user_id}"
                    )

                    # Store new refresh token if provided
                    if "refresh_token" in tokens:
                        await self._store_refresh_token(
                            user_context.user_id, tokens["refresh_token"]
                        )

                    return tokens
                else:
                    logger.error(
                        f"Token refresh failed: {response.status_code} - {response.text}"
                    )
                    return None

        except Exception as e:
            logger.error(f"Exchange refresh token error: {e}")
            return None

    async def _store_refresh_token(self, user_id: str, refresh_token: str) -> None:
        """Store refresh token in Redis."""
        try:
            if self.redis_client:
                expiry_seconds = (
                    self.settings.security.jwt_refresh_token_expire_days * 24 * 3600
                )
                await self.redis_client.setex(
                    f"refresh_token:{user_id}", expiry_seconds, refresh_token
                )
                logger.debug(f"Stored refresh token for user {user_id}")

        except Exception as e:
            logger.error(f"Failed to store refresh token for user {user_id}: {e}")

    async def _store_refreshed_token(self, user_id: str, access_token: str) -> None:
        """Store refreshed access token in Redis for session management."""
        try:
            if self.redis_client:
                # Store with shorter expiry (access token lifetime)
                expiry_seconds = (
                    self.settings.security.jwt_access_token_expire_minutes * 60
                )
                await self.redis_client.setex(
                    f"access_token:{user_id}", expiry_seconds, access_token
                )
                logger.debug(f"Stored refreshed access token for user {user_id}")

        except Exception as e:
            logger.error(
                f"Failed to store refreshed access token for user {user_id}: {e}"
            )

    async def get_valid_token_for_user(self, user_id: str) -> str | None:
        """Get a valid (possibly refreshed) token for a user."""
        try:
            if not self.redis_client:
                return None

            # Try to get the latest token from Redis
            access_token = await self.redis_client.get(f"access_token:{user_id}")
            return access_token

        except Exception as e:
            logger.error(f"Failed to get valid token for user {user_id}: {e}")
            return None

    async def cleanup(self) -> None:
        """Clean up background tasks and connections."""
        logger.info("Cleaning up token refresh service")

        # Cancel all background tasks
        for _user_id, task in list(self.background_tasks.items()):
            if not task.done():
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task

        self.background_tasks.clear()
        logger.info("Token refresh service cleanup completed")


# Global token refresh service instance
_token_refresh_service: TokenRefreshService | None = None


async def get_token_refresh_service() -> TokenRefreshService:
    """Get or create the global token refresh service instance."""
    global _token_refresh_service

    if _token_refresh_service is None:
        _token_refresh_service = TokenRefreshService()
        await _token_refresh_service.initialize()

    return _token_refresh_service


async def start_user_token_monitoring(user_context: UserContext, token: str) -> None:
    """Start background token monitoring for a user (convenience function)."""
    service = await get_token_refresh_service()
    service.start_refresh_monitoring(user_context, token)


async def stop_user_token_monitoring(user_id: str) -> None:
    """Stop background token monitoring for a user (convenience function)."""
    global _token_refresh_service

    if _token_refresh_service:
        _token_refresh_service.cancel_refresh_monitoring(user_id)


async def get_fresh_user_token(user_id: str) -> str | None:
    """Get a fresh (possibly auto-refreshed) token for a user."""
    service = await get_token_refresh_service()
    return await service.get_valid_token_for_user(user_id)


async def cleanup_token_refresh_service() -> None:
    """Clean up the token refresh service (for shutdown)."""
    global _token_refresh_service

    if _token_refresh_service:
        await _token_refresh_service.cleanup()
        _token_refresh_service = None
