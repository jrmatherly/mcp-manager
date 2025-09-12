"""
Advanced Rate Limiting Middleware for FastMCP Server.

This middleware implements distributed, multi-tier rate limiting with per-tenant
fairness, role-based limits, and DDoS protection using Redis-backed token buckets.
"""

import asyncio
import contextlib
import logging
import time
from typing import Any

from fastmcp.server.middleware import CallNext, Middleware, MiddlewareContext

from ..auth.context import UserContext
from ..core.config import get_settings
from ..core.exceptions import RateLimitError
from ..db.database import get_redis


logger = logging.getLogger(__name__)


class DistributedTokenBucket:
    """Redis-backed distributed token bucket for rate limiting."""

    def __init__(
        self,
        key: str,
        capacity: int,
        refill_rate: float,
        redis_client: Any,
        window_seconds: int = 60,
    ):
        """
        Initialize distributed token bucket.

        Args:
            key: Redis key for the bucket
            capacity: Maximum number of tokens in the bucket
            refill_rate: Number of tokens added per second
            redis_client: Redis client instance
            window_seconds: Time window for rate limiting
        """
        self.key = key
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.redis_client = redis_client
        self.window_seconds = window_seconds

    async def consume(self, tokens: int = 1) -> tuple[bool, dict[str, Any]]:
        """
        Try to consume tokens from the distributed bucket.

        Args:
            tokens: Number of tokens to consume

        Returns:
            tuple: (success: bool, bucket_info: dict)
        """
        now = time.time()

        # Use Redis Lua script for atomic token bucket operations
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local tokens_requested = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        local window_seconds = tonumber(ARGV[5])

        -- Get current bucket state
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local current_tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now

        -- Calculate tokens to add based on elapsed time
        local elapsed = math.max(0, now - last_refill)
        local tokens_to_add = elapsed * refill_rate
        current_tokens = math.min(capacity, current_tokens + tokens_to_add)

        -- Check if we can consume the requested tokens
        local success = current_tokens >= tokens_requested
        if success then
            current_tokens = current_tokens - tokens_requested
        end

        -- Update bucket state
        redis.call('HMSET', key,
            'tokens', current_tokens,
            'last_refill', now,
            'capacity', capacity,
            'refill_rate', refill_rate
        )
        redis.call('EXPIRE', key, window_seconds * 2)

        -- Return results
        return {
            success and 1 or 0,
            current_tokens,
            capacity,
            refill_rate,
            now - last_refill
        }
        """

        try:
            result = await self.redis_client.eval(
                lua_script,
                1,
                self.key,
                self.capacity,
                self.refill_rate,
                tokens,
                now,
                self.window_seconds,
            )

            success = bool(result[0])
            bucket_info = {
                "success": success,
                "current_tokens": result[1],
                "capacity": result[2],
                "refill_rate": result[3],
                "elapsed_since_refill": result[4],
                "key": self.key,
            }

            return success, bucket_info

        except Exception as e:
            logger.error(f"Redis token bucket operation failed for {self.key}: {e}")
            # Fallback: allow request but log the error
            return True, {"error": str(e), "fallback": True}


class AdvancedRateLimitMiddleware(Middleware):
    """
    Advanced rate limiting middleware with per-tenant fairness.

    Features:
    - Distributed Redis-backed rate limiting
    - Per-tenant isolation and fairness
    - Role-based rate limits (admin, user, server_owner, anonymous)
    - DDoS protection with automatic IP blocking
    - Comprehensive metrics integration
    - Graceful degradation and fallback handling
    """

    def __init__(self):
        """Initialize advanced rate limiting middleware."""
        self.settings = get_settings().fastmcp
        self.redis_client = None
        self.metrics_middleware = None

        # Rate limit buckets cache (fallback when Redis unavailable)
        self._fallback_buckets: dict[str, dict] = {
            "user": {},
            "tenant": {},
            "ip": {},
            "global": {},
        }

        # DDoS protection
        self._ddos_blocked_ips: set[str] = set()
        self._ddos_ip_counters: dict[
            str, tuple[int, float]
        ] = {}  # ip -> (count, timestamp)

        # Priority 1 Enhancement: Advanced Per-Tenant Rate Limiting
        self._tenant_rate_configs: dict[str, dict[str, Any]] = {}  # tenant_id -> config
        self._tenant_fairness_queues: dict[
            str, list[float]
        ] = {}  # tenant_id -> request_timestamps
        self._tenant_usage_windows: dict[
            str, dict[str, float]
        ] = {}  # tenant_id -> {window: usage}
        self._global_tenant_limits: dict[
            str, int
        ] = {}  # tenant_id -> allocated_global_quota

        # Cleanup task
        self._cleanup_task: asyncio.Task | None = None
        self._cleanup_started = False

        # Tenant fairness configuration
        self._tenant_fairness_window_seconds = 300  # 5-minute fairness window
        self._enable_tenant_fairness_algorithm = True
        self._tenant_burst_allowance_factor = 1.5

    async def initialize(self) -> None:
        """Initialize the rate limiting middleware."""
        try:
            self.redis_client = await get_redis()

            # Import metrics middleware to avoid circular imports
            from .metrics import get_metrics_middleware

            self.metrics_middleware = get_metrics_middleware()

            # Start cleanup task if not already started
            if not self._cleanup_started:
                self._start_cleanup_task()
                self._cleanup_started = True

            logger.info("Advanced rate limiting middleware initialized")
        except Exception as e:
            logger.warning(f"Redis not available for rate limiting: {e}")
            logger.info("Rate limiting will use fallback in-memory buckets")

    async def on_call_tool(
        self, context: MiddlewareContext, call_next: CallNext
    ) -> Any:
        """
        Apply advanced rate limiting to the request.

        Args:
            context: FastMCP middleware context
            call_next: The next middleware/handler in the chain

        Returns:
            The handler response or raises a rate limit error
        """
        # Lazy initialization if needed
        if self.redis_client is None and self.settings.enable_distributed_rate_limiting:
            await self.initialize()
        # Ensure cleanup task is started (in case initialization failed to start it)
        if not self._cleanup_started:
            self._start_cleanup_task()
            self._cleanup_started = True

        # Extract user context and keys
        user_context = self._get_user_context_safe(context)
        rate_limit_keys = self._extract_rate_limit_keys(context, user_context)

        # Check DDoS protection first
        if self._is_ddos_blocked(rate_limit_keys["client_ip"]):
            await self._record_rate_limit_hit(
                rate_limit_keys["user_id"] or "anonymous",
                rate_limit_keys["tenant_id"] or "unknown",
                "ddos_protection",
                "blocked",
            )
            raise RateLimitError(
                "IP temporarily blocked due to suspicious activity",
                retry_after=self.settings.ddos_ban_duration_seconds,
            )

        # Apply rate limiting in priority order
        rate_limit_result = await self._check_all_rate_limits(
            rate_limit_keys, user_context
        )

        if not rate_limit_result["allowed"]:
            # Record rate limit hit in metrics
            await self._record_rate_limit_hit(
                rate_limit_keys["user_id"] or "anonymous",
                rate_limit_keys["tenant_id"] or "unknown",
                rate_limit_result["limit_type"],
                "exceeded",
            )

            # Update DDoS protection counters
            await self._update_ddos_counters(rate_limit_keys["client_ip"])

            raise RateLimitError(
                f"Rate limit exceeded: {rate_limit_result['limit_description']}",
                retry_after=rate_limit_result["retry_after"],
            )

        # Continue to next middleware/handler
        return await call_next(context)

    def _get_user_context_safe(self, context: MiddlewareContext) -> UserContext | None:
        """Safely extract user context without raising exceptions."""
        try:
            # Try to extract user context from FastMCP context
            if (
                hasattr(context, "fastmcp_context")
                and context.fastmcp_context
                and hasattr(context.fastmcp_context, "auth")
                and context.fastmcp_context.auth
            ):
                auth_context = context.fastmcp_context.auth
                if hasattr(auth_context, "user") and auth_context.user:
                    return auth_context.user
            return None
        except Exception:
            # User not authenticated or context not available
            return None

    def _extract_rate_limit_keys(
        self, context: MiddlewareContext, user_context: UserContext | None
    ) -> dict[str, str | None]:
        """
        Extract keys for rate limiting from context.

        Args:
            context: FastMCP middleware context
            user_context: Current user context (if authenticated)

        Returns:
            Dict containing rate limiting keys
        """
        keys = {
            "user_id": None,
            "tenant_id": None,
            "client_ip": None,
            "user_role": "anonymous",
        }

        # Extract from user context if available
        if user_context:
            keys["user_id"] = user_context.user_id
            keys["tenant_id"] = user_context.tenant_id
            keys["user_role"] = user_context.role

        # Extract client IP from context if available
        keys["client_ip"] = getattr(context, "client_ip", None)

        return keys

    def _get_rate_limits_for_role(self, role: str) -> dict[str, int]:
        """Get rate limits based on user role."""
        role_limits = {
            "admin": self.settings.rate_limit_admin_rpm,
            "user": self.settings.rate_limit_user_rpm,
            "server_owner": self.settings.rate_limit_server_owner_rpm,
            "anonymous": self.settings.rate_limit_anonymous_rpm,
        }

        rpm = role_limits.get(role, self.settings.rate_limit_anonymous_rpm)

        return {
            "rpm": rpm,
            "capacity": int(rpm * self.settings.rate_limit_burst_factor),
            "refill_rate": rpm / 60.0,  # tokens per second
        }

    async def _check_all_rate_limits(
        self, keys: dict[str, str | None], _user_context: UserContext | None
    ) -> dict[str, Any]:
        """
        Check all applicable rate limits in priority order.

        Args:
            keys: Rate limiting keys extracted from context
            user_context: Current user context

        Returns:
            Dict containing rate limit check result
        """
        user_id = keys["user_id"]
        tenant_id = keys["tenant_id"]
        client_ip = keys["client_ip"]
        user_role = keys["user_role"]

        # Get role-based limits
        role_limits = self._get_rate_limits_for_role(user_role)

        # Check global rate limit first
        global_check = await self._check_rate_limit(
            "global:all",
            int(
                self.settings.rate_limit_global_rpm
                * self.settings.rate_limit_burst_factor
            ),
            self.settings.rate_limit_global_rpm / 60.0,
        )

        if not global_check["allowed"]:
            return {
                "allowed": False,
                "limit_type": "global",
                "limit_description": f"Global rate limit: {self.settings.rate_limit_global_rpm} requests per minute",
                "retry_after": global_check["retry_after"],
                "bucket_info": global_check["bucket_info"],
            }

        # Check per-tenant limits (Enhanced with fairness algorithm)
        if self.settings.enable_per_tenant_limits and tenant_id:
            # Priority 1 Enhancement: Advanced per-tenant rate limiting with fairness
            tenant_check = await self._check_advanced_tenant_rate_limit(
                tenant_id, user_role, keys
            )

            if not tenant_check["allowed"]:
                return {
                    "allowed": False,
                    "limit_type": "tenant_advanced",
                    "limit_description": tenant_check["limit_description"],
                    "retry_after": tenant_check["retry_after"],
                    "bucket_info": tenant_check["bucket_info"],
                    "fairness_info": tenant_check.get("fairness_info", {}),
                }

        # Check per-user limits (if authenticated)
        if user_id:
            user_check = await self._check_rate_limit(
                f"user:{user_id}",
                role_limits["capacity"],
                role_limits["refill_rate"],
            )

            if not user_check["allowed"]:
                return {
                    "allowed": False,
                    "limit_type": "user",
                    "limit_description": f"User rate limit ({user_role}): {role_limits['rpm']} requests per minute",
                    "retry_after": user_check["retry_after"],
                    "bucket_info": user_check["bucket_info"],
                }

        # Check per-IP limits (fallback for unauthenticated or additional protection)
        if client_ip:
            # Use anonymous limits for IP-based rate limiting
            ip_limits = self._get_rate_limits_for_role("anonymous")

            ip_check = await self._check_rate_limit(
                f"ip:{client_ip}",
                ip_limits["capacity"],
                ip_limits["refill_rate"],
            )

            if not ip_check["allowed"]:
                return {
                    "allowed": False,
                    "limit_type": "ip",
                    "limit_description": f"IP rate limit: {ip_limits['rpm']} requests per minute",
                    "retry_after": ip_check["retry_after"],
                    "bucket_info": ip_check["bucket_info"],
                }

        # All rate limits passed
        return {"allowed": True}

    async def _check_rate_limit(
        self, key: str, capacity: int, refill_rate: float
    ) -> dict[str, Any]:
        """
        Check rate limit for a specific key using Redis or fallback.

        Args:
            key: Rate limiting key
            capacity: Token bucket capacity
            refill_rate: Token refill rate per second

        Returns:
            Dict containing check result and bucket info
        """
        if self.redis_client and self.settings.enable_distributed_rate_limiting:
            return await self._check_redis_rate_limit(key, capacity, refill_rate)
        else:
            return await self._check_fallback_rate_limit(key, capacity, refill_rate)

    async def _check_redis_rate_limit(
        self, key: str, capacity: int, refill_rate: float
    ) -> dict[str, Any]:
        """Check rate limit using Redis distributed token bucket."""
        try:
            bucket = DistributedTokenBucket(
                key=f"rate_limit:{key}",
                capacity=capacity,
                refill_rate=refill_rate,
                redis_client=self.redis_client,
                window_seconds=self.settings.rate_limit_window_seconds,
            )

            success, bucket_info = await bucket.consume(1)

            retry_after = 0
            if not success and bucket_info.get("current_tokens", 0) < 1:
                # Calculate retry after based on refill rate
                retry_after = max(1, int(1 / refill_rate)) if refill_rate > 0 else 60

            return {
                "allowed": success,
                "retry_after": retry_after,
                "bucket_info": bucket_info,
            }

        except Exception as e:
            logger.error(f"Redis rate limit check failed for {key}: {e}")
            # Fall back to in-memory bucket
            return await self._check_fallback_rate_limit(key, capacity, refill_rate)

    async def _check_fallback_rate_limit(
        self, key: str, capacity: int, refill_rate: float
    ) -> dict[str, Any]:
        """Check rate limit using in-memory fallback token bucket."""
        # Parse key to determine bucket type
        bucket_type = key.split(":", 1)[0]
        bucket_key = key.split(":", 1)[1] if ":" in key else key

        # Get or create bucket
        if bucket_key not in self._fallback_buckets[bucket_type]:
            # Create a simple in-memory token bucket
            self._fallback_buckets[bucket_type][bucket_key] = {
                "tokens": capacity,
                "capacity": capacity,
                "refill_rate": refill_rate,
                "last_refill": time.time(),
            }

        bucket = self._fallback_buckets[bucket_type][bucket_key]

        # Refill tokens
        now = time.time()
        elapsed = now - bucket["last_refill"]
        tokens_to_add = elapsed * refill_rate
        bucket["tokens"] = min(capacity, bucket["tokens"] + tokens_to_add)
        bucket["last_refill"] = now

        # Try to consume token
        success = bucket["tokens"] >= 1
        if success:
            bucket["tokens"] -= 1

        retry_after = 0
        if not success:
            retry_after = max(1, int(1 / refill_rate)) if refill_rate > 0 else 60

        return {
            "allowed": success,
            "retry_after": retry_after,
            "bucket_info": {
                "current_tokens": bucket["tokens"],
                "capacity": capacity,
                "refill_rate": refill_rate,
                "fallback": True,
            },
        }

    # DDoS Protection Methods

    def _is_ddos_blocked(self, client_ip: str | None) -> bool:
        """Check if IP is currently blocked by DDoS protection."""
        if not client_ip or not self.settings.enable_ddos_protection:
            return False

        return client_ip in self._ddos_blocked_ips

    async def _update_ddos_counters(self, client_ip: str | None) -> None:
        """Update DDoS protection counters for rate limit violations."""
        if not client_ip or not self.settings.enable_ddos_protection:
            return

        now = time.time()
        current_count, last_timestamp = self._ddos_ip_counters.get(client_ip, (0, now))

        # Reset counter if more than 1 hour has passed
        if now - last_timestamp > 3600:
            current_count = 0

        current_count += 1
        self._ddos_ip_counters[client_ip] = (current_count, now)

        # Block IP if threshold exceeded
        if current_count >= self.settings.ddos_detection_threshold:
            self._ddos_blocked_ips.add(client_ip)
            logger.warning(
                f"IP {client_ip} blocked for DDoS protection: {current_count} rate limit violations"
            )

            # Schedule unblock after ban duration
            async def unblock_ip():
                await asyncio.sleep(self.settings.ddos_ban_duration_seconds)
                if client_ip in self._ddos_blocked_ips:
                    self._ddos_blocked_ips.remove(client_ip)
                    logger.info(f"IP {client_ip} unblocked after DDoS ban duration")

            task = asyncio.create_task(unblock_ip())
            # Store reference to prevent garbage collection
            self._ddos_unblock_tasks = getattr(self, "_ddos_unblock_tasks", set())
            self._ddos_unblock_tasks.add(task)
            task.add_done_callback(self._ddos_unblock_tasks.discard)

    # === Priority 1 Enhancement: Advanced Per-Tenant Rate Limiting Methods ===

    async def _check_advanced_tenant_rate_limit(
        self, tenant_id: str, user_role: str, _keys: dict[str, str | None]
    ) -> dict[str, Any]:
        """
        Advanced per-tenant rate limiting with fairness algorithm and dynamic allocation.

        Features:
        - Tenant-specific rate configurations
        - Fair resource allocation across tenants
        - Burst allowance management
        - Usage pattern analysis
        """
        try:
            # Get or create tenant rate configuration
            tenant_config = await self._get_tenant_rate_config(tenant_id, user_role)

            # Check tenant fairness allocation
            fairness_result = await self._check_tenant_fairness(
                tenant_id, tenant_config
            )

            if not fairness_result["allowed"]:
                return {
                    "allowed": False,
                    "limit_description": f"Tenant {tenant_id} fairness limit exceeded",
                    "retry_after": fairness_result["retry_after"],
                    "bucket_info": fairness_result["bucket_info"],
                    "fairness_info": fairness_result["fairness_info"],
                }

            # Check tenant-specific rate limits
            tenant_limit_result = await self._check_tenant_specific_limits(
                tenant_id, tenant_config
            )

            if not tenant_limit_result["allowed"]:
                return {
                    "allowed": False,
                    "limit_description": tenant_limit_result["limit_description"],
                    "retry_after": tenant_limit_result["retry_after"],
                    "bucket_info": tenant_limit_result["bucket_info"],
                    "fairness_info": fairness_result["fairness_info"],
                }

            # Update tenant usage tracking
            await self._update_tenant_usage_tracking(tenant_id, tenant_config)

            return {
                "allowed": True,
                "fairness_info": fairness_result["fairness_info"],
            }

        except Exception as e:
            logger.error(
                f"Advanced tenant rate limit check failed for {tenant_id}: {e}"
            )
            # Fallback to basic tenant check
            return await self._fallback_tenant_check(tenant_id, user_role)

    async def _get_tenant_rate_config(
        self, tenant_id: str, user_role: str
    ) -> dict[str, Any]:
        """Get or create tenant-specific rate configuration."""
        if tenant_id not in self._tenant_rate_configs:
            # Create default tenant configuration
            base_limits = self._get_rate_limits_for_role(user_role)

            self._tenant_rate_configs[tenant_id] = {
                "base_rpm": int(
                    base_limits["rpm"] * self.settings.rate_limit_tenant_multiplier
                ),
                "burst_capacity": int(
                    base_limits["capacity"]
                    * self.settings.rate_limit_tenant_multiplier
                    * self._tenant_burst_allowance_factor
                ),
                "allocated_global_quota": 0,  # Will be calculated dynamically
                "fairness_weight": 1.0,  # Equal weight by default
                "usage_history": [],
                "created_at": time.time(),
                "last_updated": time.time(),
            }

        return self._tenant_rate_configs[tenant_id]

    async def _check_tenant_fairness(
        self, tenant_id: str, tenant_config: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Check tenant fairness allocation using sliding window algorithm.

        Ensures fair resource distribution across all active tenants.
        """
        current_time = time.time()

        # Initialize tenant fairness queue if needed
        if tenant_id not in self._tenant_fairness_queues:
            self._tenant_fairness_queues[tenant_id] = []

        # Clean old entries from fairness window
        window_start = current_time - self._tenant_fairness_window_seconds
        self._tenant_fairness_queues[tenant_id] = [
            timestamp
            for timestamp in self._tenant_fairness_queues[tenant_id]
            if timestamp > window_start
        ]

        # Calculate tenant's usage in fairness window
        tenant_usage_in_window = len(self._tenant_fairness_queues[tenant_id])

        # Calculate global usage across all tenants in window
        total_global_usage = sum(
            len([ts for ts in queue if ts > window_start])
            for queue in self._tenant_fairness_queues.values()
        )

        # Calculate fair allocation
        active_tenants = len(
            [
                queue
                for queue in self._tenant_fairness_queues.values()
                if any(ts > window_start for ts in queue)
            ]
        )

        if active_tenants == 0:
            active_tenants = 1  # Avoid division by zero

        # Fair share calculation with weights
        tenant_weight = tenant_config.get("fairness_weight", 1.0)
        total_weight = sum(
            config.get("fairness_weight", 1.0)
            for config in self._tenant_rate_configs.values()
        )

        if total_weight == 0:
            total_weight = 1.0

        fair_share_ratio = tenant_weight / total_weight

        # Calculate allocated quota for this tenant
        global_window_limit = (
            self.settings.rate_limit_global_rpm
            * self._tenant_fairness_window_seconds
            / 60.0
        )

        tenant_allocated_quota = int(global_window_limit * fair_share_ratio)

        # Allow burst above fair share if global capacity available
        burst_allowance = int(
            tenant_allocated_quota * self._tenant_burst_allowance_factor
        )

        # Check if tenant is within limits
        if tenant_usage_in_window >= burst_allowance:
            # Calculate retry after based on fairness algorithm
            retry_after = max(
                1,
                int(self._tenant_fairness_window_seconds / tenant_allocated_quota)
                if tenant_allocated_quota > 0
                else 60,
            )

            return {
                "allowed": False,
                "retry_after": retry_after,
                "bucket_info": {
                    "tenant_usage_in_window": tenant_usage_in_window,
                    "allocated_quota": tenant_allocated_quota,
                    "burst_allowance": burst_allowance,
                },
                "fairness_info": {
                    "active_tenants": active_tenants,
                    "fair_share_ratio": fair_share_ratio,
                    "tenant_weight": tenant_weight,
                    "global_usage": total_global_usage,
                },
            }

        # Record this request in fairness queue
        self._tenant_fairness_queues[tenant_id].append(current_time)

        return {
            "allowed": True,
            "bucket_info": {
                "tenant_usage_in_window": tenant_usage_in_window + 1,
                "allocated_quota": tenant_allocated_quota,
                "remaining_quota": burst_allowance - tenant_usage_in_window - 1,
            },
            "fairness_info": {
                "active_tenants": active_tenants,
                "fair_share_ratio": fair_share_ratio,
                "tenant_weight": tenant_weight,
                "global_usage": total_global_usage + 1,
            },
        }

    async def _check_tenant_specific_limits(
        self, tenant_id: str, tenant_config: dict[str, Any]
    ) -> dict[str, Any]:
        """Check tenant-specific rate limits using token bucket."""
        base_rpm = tenant_config["base_rpm"]
        burst_capacity = tenant_config["burst_capacity"]
        refill_rate = base_rpm / 60.0

        # Use tenant-specific key
        tenant_key = f"tenant_advanced:{tenant_id}"

        limit_check = await self._check_rate_limit(
            tenant_key, burst_capacity, refill_rate
        )

        if not limit_check["allowed"]:
            return {
                "allowed": False,
                "limit_description": f"Tenant {tenant_id} rate limit: {base_rpm} requests per minute",
                "retry_after": limit_check["retry_after"],
                "bucket_info": limit_check["bucket_info"],
            }

        return {"allowed": True, "bucket_info": limit_check["bucket_info"]}

    async def _update_tenant_usage_tracking(
        self, tenant_id: str, tenant_config: dict[str, Any]
    ) -> None:
        """Update tenant usage tracking for analytics and optimization."""
        current_time = time.time()

        # Update tenant configuration
        tenant_config["last_updated"] = current_time

        # Track usage in sliding windows for pattern analysis
        if tenant_id not in self._tenant_usage_windows:
            self._tenant_usage_windows[tenant_id] = {
                "1min": 0,
                "5min": 0,
                "15min": 0,
                "1hour": 0,
            }

        # Increment usage counters (simplified for demo)
        for window in self._tenant_usage_windows[tenant_id]:
            self._tenant_usage_windows[tenant_id][window] += 1

    async def _fallback_tenant_check(
        self, tenant_id: str, user_role: str
    ) -> dict[str, Any]:
        """Fallback to basic tenant rate limiting if advanced check fails."""
        role_limits = self._get_rate_limits_for_role(user_role)
        tenant_rpm = int(
            role_limits["rpm"] * self.settings.rate_limit_tenant_multiplier
        )
        tenant_capacity = int(tenant_rpm * self.settings.rate_limit_burst_factor)
        tenant_refill_rate = tenant_rpm / 60.0

        tenant_check = await self._check_rate_limit(
            f"tenant:{tenant_id}", tenant_capacity, tenant_refill_rate
        )

        if not tenant_check["allowed"]:
            return {
                "allowed": False,
                "limit_description": f"Tenant rate limit (fallback): {tenant_rpm} requests per minute",
                "retry_after": tenant_check["retry_after"],
                "bucket_info": tenant_check["bucket_info"],
            }

        return {"allowed": True, "bucket_info": tenant_check["bucket_info"]}

    def configure_tenant_limits(
        self,
        tenant_id: str,
        base_rpm: int | None = None,
        fairness_weight: float | None = None,
        burst_factor: float | None = None,
    ) -> None:
        """
        Configure custom rate limits for a specific tenant.

        Args:
            tenant_id: Tenant identifier
            base_rpm: Base requests per minute (overrides role-based limits)
            fairness_weight: Weight for fair allocation (default 1.0)
            burst_factor: Burst allowance factor (default from config)
        """
        if tenant_id not in self._tenant_rate_configs:
            # Initialize with defaults
            self._tenant_rate_configs[tenant_id] = {
                "base_rpm": base_rpm or 100,
                "burst_capacity": 200,
                "allocated_global_quota": 0,
                "fairness_weight": 1.0,
                "usage_history": [],
                "created_at": time.time(),
                "last_updated": time.time(),
            }

        config = self._tenant_rate_configs[tenant_id]

        if base_rpm is not None:
            config["base_rpm"] = base_rpm
            config["burst_capacity"] = int(
                base_rpm * (burst_factor or self._tenant_burst_allowance_factor)
            )

        if fairness_weight is not None:
            config["fairness_weight"] = fairness_weight

        config["last_updated"] = time.time()

        logger.info(f"Updated tenant rate configuration for {tenant_id}: {config}")

    def get_tenant_rate_status(self, tenant_id: str) -> dict[str, Any]:
        """Get current rate limiting status for a tenant."""
        current_time = time.time()

        if tenant_id not in self._tenant_rate_configs:
            return {"status": "no_configuration", "tenant_id": tenant_id}

        config = self._tenant_rate_configs[tenant_id]

        # Get fairness queue status
        window_start = current_time - self._tenant_fairness_window_seconds
        recent_requests = [
            ts
            for ts in self._tenant_fairness_queues.get(tenant_id, [])
            if ts > window_start
        ]

        return {
            "status": "configured",
            "tenant_id": tenant_id,
            "configuration": config,
            "current_usage": {
                "requests_in_fairness_window": len(recent_requests),
                "fairness_window_seconds": self._tenant_fairness_window_seconds,
                "usage_windows": self._tenant_usage_windows.get(tenant_id, {}),
            },
            "fairness_metrics": {
                "active_tenant_count": len(
                    [
                        queue
                        for queue in self._tenant_fairness_queues.values()
                        if any(ts > window_start for ts in queue)
                    ]
                ),
                "global_usage_in_window": sum(
                    len([ts for ts in queue if ts > window_start])
                    for queue in self._tenant_fairness_queues.values()
                ),
            },
        }

    # Metrics Integration Methods

    async def _record_rate_limit_hit(
        self, user_id: str, tenant_id: str, limit_type: str, action: str
    ) -> None:
        """Record rate limit hit in metrics middleware."""
        if self.metrics_middleware:
            try:
                self.metrics_middleware.record_rate_limit_hit(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    limit_type=limit_type,
                    action=action,
                )
            except Exception as e:
                logger.error(f"Failed to record rate limit metrics: {e}")

    # Cleanup and Maintenance Methods

    def _start_cleanup_task(self) -> None:
        """Start background task to cleanup stale rate limit buckets and DDoS data."""
        # Only start if we have an event loop and task is not already running
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            # No event loop running, defer until later
            logger.debug("No event loop running, cleanup task will be started later")
            return
        if self._cleanup_task and not self._cleanup_task.done():
            return  # Task already running

        async def cleanup_task():
            while True:
                try:
                    await asyncio.sleep(self.settings.rate_limit_cleanup_interval)
                    await self._cleanup_stale_data()
                except Exception as e:
                    logger.error(f"Error in rate limit cleanup task: {e}")

        self._cleanup_task = asyncio.create_task(cleanup_task())

    async def _cleanup_stale_data(self) -> None:
        """Clean up stale rate limiting data."""
        current_time = time.time()
        cleanup_threshold = current_time - (
            self.settings.rate_limit_cleanup_interval * 2
        )

        # Cleanup fallback buckets
        buckets_cleaned = 0
        for _, buckets in self._fallback_buckets.items():
            stale_keys = [
                key
                for key, bucket in buckets.items()
                if bucket.get("last_refill", 0) < cleanup_threshold
            ]
            for key in stale_keys:
                del buckets[key]
                buckets_cleaned += 1

        # Cleanup DDoS counters (keep only recent violations)
        ddos_cleaned = 0
        stale_ips = [
            ip
            for ip, (_, timestamp) in self._ddos_ip_counters.items()
            if current_time - timestamp > 3600  # Remove after 1 hour
        ]
        for ip in stale_ips:
            del self._ddos_ip_counters[ip]
            ddos_cleaned += 1

        if buckets_cleaned > 0 or ddos_cleaned > 0:
            logger.debug(
                f"Rate limit cleanup: {buckets_cleaned} buckets, {ddos_cleaned} DDoS counters"
            )

    # Public API Methods

    async def get_rate_limit_status(
        self,
        user_id: str | None = None,
        tenant_id: str | None = None,
        client_ip: str | None = None,
        user_role: str = "anonymous",
    ) -> dict[str, Any]:
        """
        Get current rate limit status for debugging and monitoring.

        Args:
            user_id: User ID to check
            tenant_id: Tenant ID to check
            client_ip: Client IP to check
            user_role: User role for limit calculation

        Returns:
            Dict containing rate limit status information
        """
        status = {
            "timestamp": time.time(),
            "limits": {},
            "current_usage": {},
            "ddos_protection": {
                "enabled": self.settings.enable_ddos_protection,
                "blocked_ips_count": len(self._ddos_blocked_ips),
                "is_ip_blocked": self._is_ddos_blocked(client_ip)
                if client_ip
                else False,
            },
        }

        # Get role-based limits
        role_limits = self._get_rate_limits_for_role(user_role)
        status["limits"]["user"] = role_limits

        # Check current bucket states (fallback buckets only for now)
        if user_id and user_id in self._fallback_buckets["user"]:
            bucket = self._fallback_buckets["user"][user_id]
            status["current_usage"]["user"] = {
                "tokens_remaining": bucket["tokens"],
                "capacity": bucket["capacity"],
                "utilization_percent": (1 - bucket["tokens"] / bucket["capacity"])
                * 100,
            }

        if tenant_id and tenant_id in self._fallback_buckets["tenant"]:
            bucket = self._fallback_buckets["tenant"][tenant_id]
            status["current_usage"]["tenant"] = {
                "tokens_remaining": bucket["tokens"],
                "capacity": bucket["capacity"],
                "utilization_percent": (1 - bucket["tokens"] / bucket["capacity"])
                * 100,
            }

        return status

    async def reset_rate_limits(
        self,
        user_id: str | None = None,
        tenant_id: str | None = None,
        client_ip: str | None = None,
    ) -> dict[str, Any]:
        """
        Reset rate limits for specified entities (admin operation).

        Args:
            user_id: User ID to reset
            tenant_id: Tenant ID to reset
            client_ip: Client IP to reset

        Returns:
            Dict containing reset operation results
        """
        reset_count = 0

        # Reset user buckets
        if user_id:
            if user_id in self._fallback_buckets["user"]:
                bucket = self._fallback_buckets["user"][user_id]
                bucket["tokens"] = bucket["capacity"]
                reset_count += 1

            # Also clear from Redis if available
            if self.redis_client:
                try:
                    await self.redis_client.delete(f"rate_limit:user:{user_id}")
                    reset_count += 1
                except Exception as e:
                    logger.warning(
                        f"Failed to reset Redis rate limit for user {user_id}: {e}"
                    )

        # Reset tenant buckets
        if tenant_id:
            if tenant_id in self._fallback_buckets["tenant"]:
                bucket = self._fallback_buckets["tenant"][tenant_id]
                bucket["tokens"] = bucket["capacity"]
                reset_count += 1

            if self.redis_client:
                try:
                    await self.redis_client.delete(f"rate_limit:tenant:{tenant_id}")
                    reset_count += 1
                except Exception as e:
                    logger.warning(
                        f"Failed to reset Redis rate limit for tenant {tenant_id}: {e}"
                    )

        # Reset IP buckets and DDoS protection
        if client_ip:
            if client_ip in self._fallback_buckets["ip"]:
                bucket = self._fallback_buckets["ip"][client_ip]
                bucket["tokens"] = bucket["capacity"]
                reset_count += 1

            # Clear DDoS blocks
            if client_ip in self._ddos_blocked_ips:
                self._ddos_blocked_ips.remove(client_ip)
                reset_count += 1

            if client_ip in self._ddos_ip_counters:
                del self._ddos_ip_counters[client_ip]
                reset_count += 1

            if self.redis_client:
                try:
                    await self.redis_client.delete(f"rate_limit:ip:{client_ip}")
                    reset_count += 1
                except Exception as e:
                    logger.warning(
                        f"Failed to reset Redis rate limit for IP {client_ip}: {e}"
                    )

        return {
            "reset_count": reset_count,
            "timestamp": time.time(),
            "user_id": user_id,
            "tenant_id": tenant_id,
            "client_ip": client_ip,
        }

    async def shutdown(self) -> None:
        """Shutdown the rate limiting middleware."""
        logger.info("Shutting down advanced rate limiting middleware")

        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._cleanup_task

        # Clear all data structures
        self._fallback_buckets.clear()
        self._ddos_blocked_ips.clear()
        self._ddos_ip_counters.clear()

        logger.info("Advanced rate limiting middleware shutdown complete")


# Global instance and factory functions
_rate_limit_middleware: AdvancedRateLimitMiddleware | None = None


def get_advanced_rate_limit_middleware() -> AdvancedRateLimitMiddleware:
    """Get or create the global advanced rate limit middleware instance."""
    global _rate_limit_middleware
    if _rate_limit_middleware is None:
        _rate_limit_middleware = AdvancedRateLimitMiddleware()
    return _rate_limit_middleware


async def initialize_rate_limiting() -> None:
    """Initialize the rate limiting middleware (for startup)."""
    middleware = get_advanced_rate_limit_middleware()
    await middleware.initialize()


async def shutdown_rate_limiting() -> None:
    """Shutdown the rate limiting middleware (for cleanup)."""
    global _rate_limit_middleware
    if _rate_limit_middleware:
        await _rate_limit_middleware.shutdown()
        _rate_limit_middleware = None


# Backwards compatibility alias
RateLimitMiddleware = AdvancedRateLimitMiddleware
