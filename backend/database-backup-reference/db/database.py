"""
Database connection and session management for MCP Registry Gateway.

Provides PostgreSQL connection handling with connection pooling,
async support, and health monitoring.
"""

import asyncio
import contextlib
import logging
import time
from collections import deque
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import AsyncAdaptedQueuePool
from sqlmodel import SQLModel, select

from ..core.config import Settings, get_settings
from ..core.exceptions import DatabaseConnectionError, RedisConnectionError
from .models import SystemConfig


logger = logging.getLogger(__name__)


class ConnectionPoolMonitor:
    """
    Monitors connection pool usage and provides adaptive scaling recommendations.

    Tracks connection usage patterns, latency, and provides predictive scaling
    based on historical data and current load patterns.
    """

    def __init__(self):
        self.usage_history = deque(maxlen=1440)  # 24 hours of minute-by-minute data
        self.connection_latency_history = deque(maxlen=100)  # Recent latency samples
        self.last_check_time = time.time()
        self.current_utilization = 0.0
        self.avg_latency_ms = 0.0
        self.peak_connections = 0
        self.lock = asyncio.Lock()

    async def record_connection_usage(
        self, pool_size: int, checked_out: int, latency_ms: float = 0.0
    ):
        """Record current connection pool usage."""
        async with self.lock:
            utilization = checked_out / pool_size if pool_size > 0 else 0.0
            self.current_utilization = utilization
            self.peak_connections = max(self.peak_connections, checked_out)

            # Record usage history with timestamp
            current_time = time.time()
            self.usage_history.append(
                {
                    "timestamp": current_time,
                    "utilization": utilization,
                    "pool_size": pool_size,
                    "checked_out": checked_out,
                    "latency_ms": latency_ms,
                }
            )

            # Record latency history
            if latency_ms > 0:
                self.connection_latency_history.append(latency_ms)
                self.avg_latency_ms = sum(self.connection_latency_history) / len(
                    self.connection_latency_history
                )

    async def get_scaling_recommendation(
        self, current_pool_size: int, settings
    ) -> dict[str, Any]:
        """Get adaptive scaling recommendation based on current usage patterns."""
        async with self.lock:
            # Calculate recent utilization trend
            recent_samples = [
                h for h in self.usage_history if time.time() - h["timestamp"] < 600
            ]  # 10 minutes

            if not recent_samples:
                return {"action": "no_change", "reason": "insufficient_data"}

            avg_utilization = sum(h["utilization"] for h in recent_samples) / len(
                recent_samples
            )
            max_utilization = max(h["utilization"] for h in recent_samples)

            # Predictive scaling based on trends
            if len(recent_samples) >= 5:
                # Calculate trend (simple linear regression)
                x_values = list(range(len(recent_samples)))
                y_values = [h["utilization"] for h in recent_samples]

                n = len(recent_samples)
                sum_x = sum(x_values)
                sum_y = sum(y_values)
                sum_xy = sum(x * y for x, y in zip(x_values, y_values, strict=True))
                sum_x2 = sum(x * x for x in x_values)

                if n * sum_x2 - sum_x * sum_x != 0:
                    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
                    trend = (
                        "increasing"
                        if slope > 0.01
                        else "decreasing"
                        if slope < -0.01
                        else "stable"
                    )
                else:
                    trend = "stable"
            else:
                trend = "stable"

            # Scaling decision logic
            high_threshold = settings.database.adaptive_pool_scale_threshold_high
            low_threshold = settings.database.adaptive_pool_scale_threshold_low
            max_pool_size = settings.database.adaptive_pool_max_size
            min_pool_size = settings.database.adaptive_pool_min_size

            recommendation = {
                "action": "no_change",
                "reason": "within_thresholds",
                "current_utilization": avg_utilization,
                "max_utilization": max_utilization,
                "trend": trend,
                "suggested_pool_size": current_pool_size,
                "avg_latency_ms": self.avg_latency_ms,
            }

            # Scale up conditions
            if (
                max_utilization > high_threshold and trend in ["increasing", "stable"]
            ) or (avg_utilization > high_threshold * 0.9 and trend == "increasing"):
                if current_pool_size < max_pool_size:
                    new_size = min(current_pool_size + 5, max_pool_size)
                    recommendation.update(
                        {
                            "action": "scale_up",
                            "reason": "high_utilization_detected",
                            "suggested_pool_size": new_size,
                        }
                    )

            # Scale down conditions (more conservative)
            elif (
                max_utilization < low_threshold
                and trend in ["decreasing", "stable"]
                and len([h for h in recent_samples if h["utilization"] > low_threshold])
                == 0
                and current_pool_size > min_pool_size
            ):
                new_size = max(current_pool_size - 2, min_pool_size)
                recommendation.update(
                    {
                        "action": "scale_down",
                        "reason": "low_utilization_detected",
                        "suggested_pool_size": new_size,
                    }
                )

            return recommendation

    async def get_health_metrics(self) -> dict[str, Any]:
        """Get connection pool health metrics."""
        async with self.lock:
            recent_samples = [
                h for h in self.usage_history if time.time() - h["timestamp"] < 3600
            ]  # 1 hour

            if not recent_samples:
                return {"status": "no_data"}

            avg_utilization = sum(h["utilization"] for h in recent_samples) / len(
                recent_samples
            )
            max_utilization = max(h["utilization"] for h in recent_samples)

            return {
                "status": "healthy",
                "current_utilization": self.current_utilization,
                "avg_utilization_1h": avg_utilization,
                "max_utilization_1h": max_utilization,
                "peak_connections": self.peak_connections,
                "avg_latency_ms": self.avg_latency_ms,
                "samples_count": len(recent_samples),
            }


class DatabaseManager:
    """
    Manages database connections and sessions with adaptive connection pool tuning.

    Provides async PostgreSQL connections with intelligent connection pooling,
    load-based optimization, health monitoring, and predictive scaling.
    """

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._engine: AsyncEngine | None = None
        self._read_engine: AsyncEngine | None = None  # Dedicated read pool
        self._write_engine: AsyncEngine | None = None  # Dedicated write pool
        self._analytics_engine: AsyncEngine | None = None  # Long-running queries
        self._session_factory: async_sessionmaker[AsyncSession] | None = None
        self._redis_client: redis.Redis | None = None
        self._is_initialized = False

        # Connection Pool Monitoring and Tuning
        self.pool_monitor = ConnectionPoolMonitor()
        self._monitoring_task: asyncio.Task | None = None
        self._last_pool_adjustment = time.time()

    async def initialize(self) -> None:
        """Initialize database connections with adaptive monitoring."""
        if self._is_initialized:
            return

        try:
            await self._create_postgres_engine()
            await self._create_redis_client()
            await self._verify_connections()

            # Start adaptive pool monitoring if enabled
            if self.settings.database.enable_adaptive_pool_sizing:
                self._monitoring_task = asyncio.create_task(
                    self._monitor_connection_pools()
                )
                logger.info("Adaptive connection pool monitoring started")

            self._is_initialized = True
            logger.info(
                "Database connections initialized successfully with adaptive features"
            )
        except Exception as e:
            logger.error(f"Failed to initialize database connections: {e}")
            await self.close()
            raise

    async def _create_postgres_engine(self) -> None:
        """Create PostgreSQL async engines with adaptive connection pooling."""
        try:
            # Base connection arguments
            base_connect_args = {
                "command_timeout": 60,
                "server_settings": {
                    "jit": "off",  # Disable JIT for consistent performance
                    "application_name": "mcp_registry_gateway",
                },
            }

            # Create main engine with adaptive pooling
            main_pool_config = {
                "pool_size": self.settings.database.pool_size,
                "max_overflow": self.settings.database.max_overflow,
                "pool_timeout": self.settings.database.pool_timeout,
                "pool_recycle": self.settings.database.pool_recycle,
                "pool_pre_ping": self.settings.database.pool_pre_ping,
            }

            self._engine = create_async_engine(
                self.settings.database.postgres_url,
                poolclass=AsyncAdaptedQueuePool,
                **main_pool_config,
                connect_args=base_connect_args,
                echo=self.settings.is_debug,
                echo_pool=self.settings.is_debug,
            )

            # Create operation-specific engines if enabled
            if self.settings.database.enable_operation_specific_pools:
                # Read-optimized pool (larger, longer-lived connections)
                read_pool_config = {
                    "pool_size": self.settings.database.read_pool_size,
                    "max_overflow": self.settings.database.max_overflow // 2,
                    "pool_timeout": self.settings.database.pool_timeout,
                    "pool_recycle": self.settings.database.pool_recycle
                    * 2,  # Longer recycle
                    "pool_pre_ping": True,
                }

                self._read_engine = create_async_engine(
                    self.settings.database.postgres_url,
                    poolclass=AsyncAdaptedQueuePool,
                    **read_pool_config,
                    connect_args={
                        **base_connect_args,
                        "server_settings": {
                            **base_connect_args["server_settings"],
                            "default_transaction_isolation": "read committed",
                        },
                    },
                    echo=False,  # Reduce logging for read operations
                )

                # Write-optimized pool (smaller, faster recycling)
                write_pool_config = {
                    "pool_size": self.settings.database.write_pool_size,
                    "max_overflow": self.settings.database.max_overflow // 3,
                    "pool_timeout": self.settings.database.pool_timeout
                    // 2,  # Faster timeout
                    "pool_recycle": self.settings.database.pool_recycle
                    // 2,  # Faster recycle
                    "pool_pre_ping": True,
                }

                self._write_engine = create_async_engine(
                    self.settings.database.postgres_url,
                    poolclass=AsyncAdaptedQueuePool,
                    **write_pool_config,
                    connect_args=base_connect_args,
                    echo=self.settings.is_debug,
                )

                # Analytics-optimized pool (dedicated for long-running queries)
                analytics_pool_config = {
                    "pool_size": self.settings.database.analytics_pool_size,
                    "max_overflow": 2,  # Limited overflow for analytics
                    "pool_timeout": 30,  # Longer timeout for analytics
                    "pool_recycle": self.settings.database.pool_recycle
                    * 4,  # Very long recycle
                    "pool_pre_ping": True,
                }

                self._analytics_engine = create_async_engine(
                    self.settings.database.postgres_url,
                    poolclass=AsyncAdaptedQueuePool,
                    **analytics_pool_config,
                    connect_args={
                        **base_connect_args,
                        "command_timeout": 300,  # 5 minutes for analytics
                        "server_settings": {
                            **base_connect_args["server_settings"],
                            "statement_timeout": "300s",
                        },
                    },
                    echo=False,
                )

                logger.info(
                    "Operation-specific PostgreSQL engines created successfully"
                )
            else:
                # Use main engine for all operations
                self._read_engine = self._engine
                self._write_engine = self._engine
                self._analytics_engine = self._engine

            # Create session factory using main engine
            self._session_factory = async_sessionmaker(
                self._engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )

            logger.info("PostgreSQL engines created successfully with adaptive pooling")

        except Exception as e:
            logger.error(f"Failed to create PostgreSQL engines: {e}")
            raise DatabaseConnectionError(
                message="Failed to create database engines",
                database_type="postgresql",
                host=self.settings.database.postgres_host,
                cause=e,
            )

    async def _create_redis_client(self) -> None:
        """Create Redis async client with optimized connection pool."""
        try:
            # Redis connection with minimal configuration for local setup
            self._redis_client = redis.from_url(
                self.settings.database.redis_url,
                decode_responses=True,
                max_connections=20,  # Simple static value
                socket_connect_timeout=5,
                socket_timeout=5,
            )

            logger.info(
                "Redis client created successfully with optimized connection pool"
            )

        except Exception as e:
            logger.error(f"Failed to create Redis client: {e}")
            raise RedisConnectionError(
                message="Failed to create Redis client",
                host=self.settings.database.redis_host,
                port=self.settings.database.redis_port,
                cause=e,
            )

    async def _verify_connections(self) -> None:
        """Verify database connections are working."""
        # Test PostgreSQL connection
        if self._engine is None or self._session_factory is None:
            raise DatabaseConnectionError("PostgreSQL engine not initialized")

        try:
            async with self._session_factory() as session:
                await session.execute(select(1))
            logger.info("PostgreSQL connection verified")
        except Exception as e:
            logger.error(f"PostgreSQL connection verification failed: {e}")
            raise DatabaseConnectionError(
                message="PostgreSQL connection verification failed",
                database_type="postgresql",
                cause=e,
            )

        # Test Redis connection
        if self._redis_client is None:
            raise RedisConnectionError("Redis client not initialized")

        try:
            await self._redis_client.ping()
            logger.info("Redis connection verified")
        except Exception as e:
            logger.error(f"Redis connection verification failed: {e}")
            raise RedisConnectionError(
                message="Redis connection verification failed",
                host=self.settings.database.redis_host,
                port=self.settings.database.redis_port,
                cause=e,
            )

    async def create_tables(self) -> None:
        """Create all database tables."""
        if self._engine is None:
            raise DatabaseConnectionError("Database engine not initialized")

        try:
            async with self._engine.begin() as conn:
                await conn.run_sync(SQLModel.metadata.create_all)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise DatabaseConnectionError(
                message="Failed to create database tables",
                cause=e,
            )

    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Get database session with automatic cleanup.

        Yields:
            AsyncSession: Database session

        Example:
            async with db_manager.get_session() as session:
                result = await session.execute(select(User))
                users = result.scalars().all()
        """
        if not self._is_initialized or self._session_factory is None:
            raise DatabaseConnectionError("Database not initialized")

        async with self._session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    @property
    def redis(self) -> redis.Redis:
        """
        Get Redis client.

        Returns:
            redis.Redis: Redis client instance

        Raises:
            RedisConnectionError: If Redis client not initialized
        """
        if not self._is_initialized or self._redis_client is None:
            raise RedisConnectionError("Redis client not initialized")
        return self._redis_client

    async def get_config(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value from database.

        Args:
            key: Configuration key
            default: Default value if key not found

        Returns:
            Configuration value or default
        """
        try:
            async with self.get_session() as session:
                result = await session.execute(
                    select(SystemConfig).where(SystemConfig.key == key)
                )
                config = result.scalar_one_or_none()
                return config.value if config else default
        except Exception as e:
            logger.error(f"Failed to get config {key}: {e}")
            return default

    async def set_config(
        self,
        key: str,
        value: Any,
        category: str = "general",
        description: str | None = None,
        tenant_id: str | None = None,
    ) -> None:
        """
        Set configuration value in database.

        Args:
            key: Configuration key
            value: Configuration value
            category: Configuration category
            description: Optional description
            tenant_id: Optional tenant ID for tenant-specific config
        """
        try:
            async with self.get_session() as session:
                # Check if config already exists
                result = await session.execute(
                    select(SystemConfig).where(
                        SystemConfig.key == key,
                        SystemConfig.tenant_id == tenant_id,
                    )
                )
                config = result.scalar_one_or_none()

                if config:
                    # Update existing
                    config.value = value
                    config.version += 1
                    if description:
                        config.description = description
                else:
                    # Create new
                    config = SystemConfig(
                        key=key,
                        value=value,
                        category=category,
                        description=description,
                        tenant_id=tenant_id,
                    )
                    session.add(config)

                await session.commit()
                logger.info(f"Configuration {key} set successfully")

        except Exception as e:
            logger.error(f"Failed to set config {key}: {e}")
            raise

    async def _monitor_connection_pools(self) -> None:
        """Background task to monitor and adapt connection pools based on usage patterns."""
        logger.info("Starting adaptive connection pool monitoring")

        while True:
            try:
                await asyncio.sleep(self.settings.database.adaptive_pool_check_interval)

                if not self._is_initialized or self._engine is None:
                    continue

                # Collect metrics from all pools
                start_time = time.time()

                # Main pool metrics
                pool = self._engine.pool
                pool_size = getattr(pool, "size", lambda: 0)()
                checked_out = getattr(pool, "checkedout", lambda: 0)()

                # Measure connection acquisition latency
                try:
                    async with self._engine.connect():
                        latency_ms = (time.time() - start_time) * 1000
                except Exception:
                    latency_ms = 0.0

                # Record usage data
                await self.pool_monitor.record_connection_usage(
                    pool_size, checked_out, latency_ms
                )

                # Get scaling recommendation
                recommendation = await self.pool_monitor.get_scaling_recommendation(
                    pool_size, self.settings
                )

                # Apply scaling recommendation if needed (conservative approach)
                if (
                    recommendation["action"] == "scale_up"
                    and time.time() - self._last_pool_adjustment > 300
                ):  # 5-minute cooldown
                    logger.info(
                        f"Pool scaling recommendation: {recommendation['action']} to "
                        f"{recommendation['suggested_pool_size']} (current: {pool_size}, "
                        f"utilization: {recommendation['current_utilization']:.2%})"
                    )
                    # Note: Actual pool resizing would require engine recreation
                    # For now, we log the recommendation for operational awareness
                    self._last_pool_adjustment = time.time()

                elif (
                    recommendation["action"] == "scale_down"
                    and time.time() - self._last_pool_adjustment > 600
                ):  # 10-minute cooldown for scale-down
                    logger.info(
                        f"Pool scaling recommendation: {recommendation['action']} to "
                        f"{recommendation['suggested_pool_size']} (current: {pool_size}, "
                        f"utilization: {recommendation['current_utilization']:.2%})"
                    )
                    self._last_pool_adjustment = time.time()

            except asyncio.CancelledError:
                logger.info("Connection pool monitoring task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in connection pool monitoring: {e}")
                await asyncio.sleep(10)  # Brief pause before retrying

    def get_engine_for_operation(self, operation_type: str = "default") -> AsyncEngine:
        """
        Get the appropriate engine for the given operation type.

        Args:
            operation_type: Type of operation ("read", "write", "analytics", or "default")

        Returns:
            AsyncEngine: Appropriate engine for the operation
        """
        if not self._is_initialized or self._engine is None:
            raise DatabaseConnectionError("Database not initialized")

        if not self.settings.database.enable_operation_specific_pools:
            return self._engine

        engine_map = {
            "read": self._read_engine,
            "write": self._write_engine,
            "analytics": self._analytics_engine,
            "default": self._engine,
        }

        return engine_map.get(operation_type, self._engine) or self._engine

    @asynccontextmanager
    async def get_session_for_operation(
        self, operation_type: str = "default"
    ) -> AsyncGenerator[AsyncSession, None]:
        """
        Get database session optimized for the given operation type.

        Args:
            operation_type: Type of operation ("read", "write", "analytics", or "default")

        Yields:
            AsyncSession: Database session optimized for the operation type
        """
        engine = self.get_engine_for_operation(operation_type)
        session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        async with session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def health_check(self) -> dict[str, Any]:
        """
        Perform comprehensive health check on all database connections with pool metrics.

        Returns:
            Dict containing health status of each database with adaptive pool information
        """
        health_status = {
            "postgres": {"status": "unknown", "details": {}},
            "redis": {"status": "unknown", "details": {}},
            "connection_pools": {"status": "unknown", "details": {}},
        }

        # Check PostgreSQL
        try:
            if self._engine is None or self._session_factory is None:
                health_status["postgres"]["status"] = "disconnected"
                health_status["postgres"]["details"]["error"] = "Engine not initialized"
            else:
                async with self._session_factory() as session:
                    result = await session.execute(select(1))
                    result.scalar()

                    # Enhanced health check with adaptive pool metrics
                    pool = self._engine.pool
                    health_status["postgres"]["status"] = "healthy"
                    health_status["postgres"]["details"] = {
                        "engine_type": "async",
                        "pool_class": str(type(pool).__name__),
                        "connection_successful": True,
                        "pool_metrics": {
                            "size": getattr(pool, "size", lambda: "N/A")(),
                            "checked_in": getattr(pool, "checkedin", lambda: "N/A")(),
                            "checked_out": getattr(pool, "checkedout", lambda: "N/A")(),
                            "overflow": getattr(pool, "overflow", lambda: "N/A")(),
                            "invalidated": getattr(
                                pool, "invalidated", lambda: "N/A"
                            )(),
                        },
                        "pool_configuration": {
                            "pool_size": self.settings.database.pool_size,
                            "max_overflow": self.settings.database.max_overflow,
                            "pool_timeout": self.settings.database.pool_timeout,
                            "pool_recycle": self.settings.database.pool_recycle,
                            "adaptive_tuning_enabled": self.settings.database.enable_adaptive_pool_sizing,
                            "operation_specific_pools": self.settings.database.enable_operation_specific_pools,
                        },
                    }

                    # Add operation-specific pool details if enabled
                    if self.settings.database.enable_operation_specific_pools:
                        health_status["postgres"]["details"]["operation_pools"] = {
                            "read_pool_size": self.settings.database.read_pool_size,
                            "write_pool_size": self.settings.database.write_pool_size,
                            "analytics_pool_size": self.settings.database.analytics_pool_size,
                        }

        except Exception as e:
            health_status["postgres"]["status"] = "unhealthy"
            health_status["postgres"]["details"]["error"] = str(e)
            logger.error(f"PostgreSQL health check failed: {e}")

        # Check Redis with enhanced metrics
        try:
            if self._redis_client is None:
                health_status["redis"]["status"] = "disconnected"
                health_status["redis"]["details"]["error"] = "Client not initialized"
            else:
                await self._redis_client.ping()
                info = await self._redis_client.info()
                health_status["redis"]["status"] = "healthy"
                health_status["redis"]["details"] = {
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory_human": info.get("used_memory_human", "unknown"),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0),
                    "connection_pool_config": {
                        "max_connections": self.settings.database.redis_max_connections,
                        "connection_timeout": self.settings.database.redis_connection_timeout,
                        "socket_timeout": self.settings.database.redis_socket_timeout,
                        "health_check_interval": self.settings.database.redis_health_check_interval,
                    },
                }
        except Exception as e:
            health_status["redis"]["status"] = "unhealthy"
            health_status["redis"]["details"]["error"] = str(e)
            logger.error(f"Redis health check failed: {e}")

        # Add adaptive pool monitoring metrics
        try:
            pool_metrics = await self.pool_monitor.get_health_metrics()
            health_status["connection_pools"]["status"] = "healthy"
            health_status["connection_pools"]["details"] = {
                "adaptive_monitoring": {
                    "enabled": self.settings.database.enable_adaptive_pool_sizing,
                    "check_interval": self.settings.database.adaptive_pool_check_interval,
                    "last_adjustment": self._last_pool_adjustment,
                },
                "usage_metrics": pool_metrics,
                "monitoring_task_running": self._monitoring_task is not None
                and not self._monitoring_task.done(),
            }
        except Exception as e:
            health_status["connection_pools"]["status"] = "unhealthy"
            health_status["connection_pools"]["details"]["error"] = str(e)

        return health_status

    async def close(self) -> None:
        """Close all database connections and stop monitoring tasks."""
        logger.info("Closing database connections and stopping monitoring")

        # Stop monitoring task
        if self._monitoring_task and not self._monitoring_task.done():
            self._monitoring_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._monitoring_task
            logger.info("Adaptive pool monitoring stopped")

        if self._redis_client:
            try:
                await self._redis_client.aclose()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.error(f"Error closing Redis connection: {e}")

        # Close all PostgreSQL engines
        engines_to_close = [
            (self._engine, "main"),
            (self._read_engine, "read"),
            (self._write_engine, "write"),
            (self._analytics_engine, "analytics"),
        ]

        for engine, name in engines_to_close:
            if engine and engine != self._engine:  # Avoid double-closing main engine
                try:
                    await engine.dispose()
                    logger.info(f"PostgreSQL {name} engine disposed")
                except Exception as e:
                    logger.error(f"Error disposing PostgreSQL {name} engine: {e}")

        # Close main engine last
        if self._engine:
            try:
                await self._engine.dispose()
                logger.info("PostgreSQL main engine disposed")
            except Exception as e:
                logger.error(f"Error disposing PostgreSQL main engine: {e}")

        self._is_initialized = False


# Global database manager instance
_db_manager: DatabaseManager | None = None


async def get_database() -> DatabaseManager:
    """
    Get database manager singleton.

    Returns:
        DatabaseManager: Initialized database manager
    """
    global _db_manager

    if _db_manager is None:
        _db_manager = DatabaseManager()
        await _db_manager.initialize()

    return _db_manager


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting database session.

    Yields:
        AsyncSession: Database session for dependency injection
    """
    db_manager = await get_database()
    async with db_manager.get_session() as session:
        yield session


async def get_redis() -> redis.Redis:
    """
    Dependency for getting Redis client.

    Returns:
        redis.Redis: Redis client for dependency injection
    """
    db_manager = await get_database()
    return db_manager.redis


async def close_database() -> None:
    """Close database connections (for shutdown)."""
    global _db_manager
    if _db_manager:
        await _db_manager.close()
        _db_manager = None


# Startup and shutdown event handlers
async def startup_database() -> None:
    """Initialize database connections on startup."""
    await get_database()


async def create_tables() -> None:
    """Create database tables on startup."""
    db_manager = await get_database()
    await db_manager.create_tables()
