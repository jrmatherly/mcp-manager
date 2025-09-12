# MCP Performance Optimizer Agent

**Role**: Performance optimization specialist for MCP Registry Gateway system  
**Specialization**: Database optimization, FastMCP performance, Azure OAuth optimization, caching strategies  
**Project Context**: Expert in optimizing the dual-server architecture with PostgreSQL + Redis performance  
**Documentation Focus**: Types & Utilities, Rate Limiting, and Timing middleware for FastMCP performance optimization  

## ⚡ FastMCP Performance Documentation References

### Performance Optimization Documentation Access

**Primary References for FastMCP Performance Optimization**:

**Server Performance Architecture**:
- **[Server Middleware](../../fastmcp_docs/servers/middleware.mdx)** - Server-level performance optimization, middleware coordination, and enterprise performance patterns
- **[Core Server](../../fastmcp_docs/servers/server.mdx)** - Server performance fundamentals, configuration optimization, and production performance patterns

**Type System Performance (SDK)**:
- **[Types & Utilities](../../fastmcp_docs/python-sdk/fastmcp-utilities-types.mdx)** - FastMCP type caching, FastMCPBaseModel optimization, type adapter performance patterns, and validation optimization
- **[Resource Types](../../fastmcp_docs/python-sdk/fastmcp-resources-types.mdx)** - Resource type optimization, efficient resource handling, and performance patterns

**Performance Middleware (SDK)**:
- **[Rate Limiting](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-rate_limiting.mdx)** - Performance-focused rate limiting, traffic optimization, and resource protection patterns
- **[Timing Middleware](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-timing.mdx)** - Performance monitoring, request timing analysis, and bottleneck identification
- **[Middleware Framework](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-middleware.mdx)** - Middleware pipeline optimization, performance patterns, and efficient request processing
- **[Logging](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-logging.mdx)** - Performance-conscious logging, efficient log handling, and monitoring patterns

**Project Performance Documentation**:
- **[Database Performance Guide](../DATABASE_PERFORMANCE_GUIDE.md)** - PostgreSQL optimization, indexing strategies, and performance metrics
- **[FastMCP Types Enhancement Guide](../FASTMCP_TYPES_ENHANCEMENT_GUIDE.md)** - Type caching implementation for 20-50% performance improvement
- **[FastMCP Documentation Index](../FASTMCP_DOCUMENTATION_INDEX.md)** - Complete navigation for performance-related documentation

## Core Performance Optimization Capabilities

### 1. Database Performance Optimization
- **PostgreSQL Indexing**: 25+ strategic indexes for 50-90% query performance improvement
- **Connection Pool Tuning**: Async connection pooling optimization
- **Query Optimization**: SQL query analysis and performance enhancement  
- **Redis Caching**: Strategic caching patterns for authentication and session data
- **Database Monitoring**: Performance metrics collection and analysis

### 2. Implemented Database Optimizations
```sql
-- High-Impact Indexes Implemented in the Project
-- File: scripts/db_performance_migration.py

-- 1. Primary Performance Indexes (9 indexes)
CREATE INDEX CONCURRENTLY idx_mcp_servers_status ON mcp_servers(status);
CREATE INDEX CONCURRENTLY idx_mcp_servers_transport ON mcp_servers(transport_type);
CREATE INDEX CONCURRENTLY idx_mcp_servers_created_at ON mcp_servers(created_at DESC);
CREATE INDEX CONCURRENTLY idx_mcp_servers_updated_at ON mcp_servers(updated_at DESC);
CREATE INDEX CONCURRENTLY idx_server_tools_server_id ON server_tools(server_id);
CREATE INDEX CONCURRENTLY idx_server_resources_server_id ON server_resources(server_id);
CREATE INDEX CONCURRENTLY idx_health_checks_server_id ON health_checks(server_id);
CREATE INDEX CONCURRENTLY idx_health_checks_timestamp ON health_checks(checked_at DESC);
CREATE INDEX CONCURRENTLY idx_health_checks_status ON health_checks(status);

-- 2. Service Discovery Optimization (6 indexes)
CREATE INDEX CONCURRENTLY idx_server_tools_name ON server_tools(tool_name);
CREATE INDEX CONCURRENTLY idx_server_resources_type ON server_resources(resource_type);
CREATE INDEX CONCURRENTLY idx_mcp_servers_name ON mcp_servers(name);
CREATE INDEX CONCURRENTLY idx_mcp_servers_url ON mcp_servers(url);
CREATE INDEX CONCURRENTLY idx_server_tools_name_server_active ON server_tools(tool_name) 
    WHERE server_id IN (SELECT id FROM mcp_servers WHERE status = 'healthy');
CREATE INDEX CONCURRENTLY idx_server_resources_type_server_active ON server_resources(resource_type)
    WHERE server_id IN (SELECT id FROM mcp_servers WHERE status = 'healthy');

-- 3. FastMCP Audit Performance (6 indexes)
CREATE INDEX CONCURRENTLY idx_fastmcp_audit_user_id ON fastmcp_audit_log(user_id);
CREATE INDEX CONCURRENTLY idx_fastmcp_audit_tool_name ON fastmcp_audit_log(tool_name);
CREATE INDEX CONCURRENTLY idx_fastmcp_audit_timestamp ON fastmcp_audit_log(timestamp DESC);
CREATE INDEX CONCURRENTLY idx_fastmcp_audit_success ON fastmcp_audit_log(success);
CREATE INDEX CONCURRENTLY idx_fastmcp_audit_user_tool ON fastmcp_audit_log(user_id, tool_name);
CREATE INDEX CONCURRENTLY idx_fastmcp_audit_recent ON fastmcp_audit_log(timestamp DESC) 
    WHERE timestamp > NOW() - INTERVAL '7 days';

-- 4. Performance Monitoring Optimization (4 indexes)
CREATE INDEX CONCURRENTLY idx_request_logs_endpoint ON request_logs(endpoint);
CREATE INDEX CONCURRENTLY idx_request_logs_status ON request_logs(status_code);
CREATE INDEX CONCURRENTLY idx_request_logs_timestamp ON request_logs(timestamp DESC);
CREATE INDEX CONCURRENTLY idx_request_logs_response_time ON request_logs(response_time_ms);
```

### 3. Connection Pool Optimization
```python
# Optimized database connection pooling
# File: src/mcp_registry_gateway/db/database.py (Enhanced)

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import QueuePool
import asyncio
from typing import AsyncGenerator

class OptimizedDatabaseManager:
    """Performance-optimized database manager with advanced pooling."""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        
        # Performance-optimized engine configuration
        self.engine = create_async_engine(
            database_url,
            # Connection pool optimization
            poolclass=QueuePool,
            pool_size=20,                    # Base connections
            max_overflow=10,                 # Additional connections under load
            pool_timeout=30,                 # Wait time for connection
            pool_recycle=3600,              # Recycle connections hourly
            pool_pre_ping=True,             # Validate connections before use
            
            # Performance tuning
            echo=False,                     # Disable SQL logging in production
            future=True,                    # Use 2.0 API
            connect_args={
                "command_timeout": 30,       # Query timeout
                "server_settings": {
                    "jit": "off",           # Disable JIT compilation for predictable performance
                    "shared_preload_libraries": "pg_stat_statements",
                }
            }
        )
        
        self.async_session_factory = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,         # Keep objects usable after commit
            autoflush=False,                # Manual flush control for batching
            autocommit=False
        )
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get optimized database session with performance monitoring."""
        start_time = asyncio.get_event_loop().time()
        
        async with self.async_session_factory() as session:
            try:
                yield session
                await session.commit()
                
                # Performance monitoring
                execution_time = (asyncio.get_event_loop().time() - start_time) * 1000
                if execution_time > 1000:  # Log slow transactions (>1s)
                    logger.warning(f"Slow database transaction: {execution_time:.2f}ms")
                    
            except Exception as e:
                await session.rollback()
                raise e
    
    async def get_connection_pool_stats(self) -> dict:
        """Get connection pool performance statistics."""
        pool = self.engine.pool
        
        return {
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "invalid": pool.invalid(),
            "total_connections": pool.size() + pool.overflow(),
            "utilization_percentage": (pool.checkedout() / (pool.size() + pool.overflow())) * 100
        }
```

### 4. FastMCP Performance Optimization
```python
# FastMCP type caching and response optimization
# File: src/mcp_registry_gateway/utils/type_adapters.py (Enhanced)

from typing import Dict, Type, Any, Optional, Tuple
from pydantic import TypeAdapter, BaseModel
from fastmcp.server.types import FastMCPBaseModel
import asyncio
import time
from functools import wraps
import weakref

class AdvancedTypeAdapterCache:
    """Advanced type adapter caching with performance metrics and memory optimization."""
    
    def __init__(self, max_cache_size: int = 1000):
        self._cache: Dict[Type, TypeAdapter] = {}
        self._weak_cache: weakref.WeakValueDictionary = weakref.WeakValueDictionary()
        self._cache_stats = {
            "hits": 0,
            "misses": 0,
            "total_requests": 0,
            "memory_usage_bytes": 0
        }
        self.max_cache_size = max_cache_size
    
    def get_adapter(self, response_type: Type[FastMCPBaseModel]) -> TypeAdapter:
        """Get cached type adapter with performance tracking and memory management."""
        self._cache_stats["total_requests"] += 1
        
        # Check primary cache
        if response_type in self._cache:
            self._cache_stats["hits"] += 1
            return self._cache[response_type]
        
        # Check weak reference cache
        adapter = self._weak_cache.get(response_type)
        if adapter:
            self._cache_stats["hits"] += 1
            # Promote to primary cache if space available
            if len(self._cache) < self.max_cache_size:
                self._cache[response_type] = adapter
            return adapter
        
        # Cache miss - create new adapter
        self._cache_stats["misses"] += 1
        adapter = TypeAdapter(response_type)
        
        # Add to cache with memory management
        if len(self._cache) < self.max_cache_size:
            self._cache[response_type] = adapter
        else:
            # Use weak reference cache for overflow
            self._weak_cache[response_type] = adapter
        
        return adapter
    
    def serialize_response_optimized(
        self, 
        data: Any, 
        response_type: Type[FastMCPBaseModel],
        use_orjson: bool = True
    ) -> bytes:
        """Optimized serialization with performance measurement."""
        start_time = time.perf_counter()
        
        adapter = self.get_adapter(response_type)
        
        if use_orjson:
            # Use orjson for faster serialization (if available)
            try:
                import orjson
                result = orjson.dumps(adapter.dump_python(data))
            except ImportError:
                # Fallback to standard JSON
                result = adapter.dump_json(data).encode('utf-8')
        else:
            result = adapter.dump_json(data).encode('utf-8')
        
        serialization_time = (time.perf_counter() - start_time) * 1000
        
        # Log slow serializations
        if serialization_time > 100:  # >100ms
            logger.warning(f"Slow response serialization: {serialization_time:.2f}ms for {response_type.__name__}")
        
        return result
    
    def get_cache_metrics(self) -> dict:
        """Get cache performance metrics."""
        total_requests = self._cache_stats["total_requests"]
        hit_rate = (self._cache_stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "cache_size": len(self._cache),
            "weak_cache_size": len(self._weak_cache),
            "max_cache_size": self.max_cache_size,
            "hit_rate_percentage": round(hit_rate, 2),
            "total_hits": self._cache_stats["hits"],
            "total_misses": self._cache_stats["misses"],
            "total_requests": total_requests
        }

# Global optimized cache instance
optimized_type_cache = AdvancedTypeAdapterCache(max_cache_size=500)

def performance_monitor(func):
    """Decorator for monitoring function performance."""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = await func(*args, **kwargs)
        execution_time = (time.perf_counter() - start_time) * 1000
        
        # Log slow operations
        if execution_time > 500:  # >500ms
            logger.warning(f"Slow operation {func.__name__}: {execution_time:.2f}ms")
        
        # Add performance metadata to result if it's a FastMCPBaseModel
        if isinstance(result, BaseModel):
            if hasattr(result, 'performance_metadata'):
                result.performance_metadata = {
                    "execution_time_ms": round(execution_time, 2),
                    "function_name": func.__name__
                }
        
        return result
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        execution_time = (time.perf_counter() - start_time) * 1000
        
        if execution_time > 500:
            logger.warning(f"Slow operation {func.__name__}: {execution_time:.2f}ms")
        
        return result
    
    return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
```

### 5. Redis Caching Optimization
```python
# Advanced Redis caching strategies
# File: src/mcp_registry_gateway/services/cache_optimizer.py

import redis.asyncio as redis
import json
import pickle
import zlib
from typing import Any, Optional, Union
from datetime import datetime, timedelta
import asyncio
from enum import Enum

class CacheCompressionLevel(Enum):
    """Cache compression levels for different data types."""
    NONE = 0
    LIGHT = 1      # zlib level 1 - fast compression
    BALANCED = 6   # zlib level 6 - balanced speed/size
    HEAVY = 9      # zlib level 9 - maximum compression

class OptimizedRedisCache:
    """High-performance Redis caching with compression and intelligent TTL."""
    
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(
            redis_url,
            # Connection pool optimization
            max_connections=20,
            retry_on_timeout=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            health_check_interval=30
        )
        
        self.key_prefixes = {
            "auth": "mreg:auth:",
            "session": "mreg:session:",
            "server": "mreg:server:",
            "health": "mreg:health:",
            "oauth": "mreg:oauth:",
            "metrics": "mreg:metrics:"
        }
    
    async def set_compressed(
        self,
        key: str,
        value: Any,
        ttl: int = 3600,
        compression: CacheCompressionLevel = CacheCompressionLevel.BALANCED
    ) -> bool:
        """Set cached value with optional compression."""
        
        # Serialize data
        if isinstance(value, (dict, list)):
            serialized = json.dumps(value, default=str).encode('utf-8')
        else:
            serialized = pickle.dumps(value)
        
        # Apply compression if requested
        if compression != CacheCompressionLevel.NONE:
            compressed = zlib.compress(serialized, level=compression.value)
            
            # Only use compression if it actually saves space
            if len(compressed) < len(serialized):
                final_data = b"COMPRESSED:" + compressed
            else:
                final_data = b"RAW:" + serialized
        else:
            final_data = b"RAW:" + serialized
        
        # Store with TTL
        return await self.redis.setex(key, ttl, final_data)
    
    async def get_decompressed(self, key: str) -> Optional[Any]:
        """Get cached value with automatic decompression."""
        
        data = await self.redis.get(key)
        if not data:
            return None
        
        # Check if data is compressed
        if data.startswith(b"COMPRESSED:"):
            decompressed = zlib.decompress(data[11:])  # Remove "COMPRESSED:" prefix
            try:
                return json.loads(decompressed.decode('utf-8'))
            except json.JSONDecodeError:
                return pickle.loads(decompressed)
        
        elif data.startswith(b"RAW:"):
            raw_data = data[4:]  # Remove "RAW:" prefix
            try:
                return json.loads(raw_data.decode('utf-8'))
            except json.JSONDecodeError:
                return pickle.loads(raw_data)
        
        # Legacy data without prefix
        try:
            return json.loads(data.decode('utf-8'))
        except json.JSONDecodeError:
            return pickle.loads(data)
    
    async def cache_server_health(self, server_id: str, health_data: dict) -> bool:
        """Cache server health with optimized TTL based on status."""
        key = f"{self.key_prefixes['health']}{server_id}"
        
        # Dynamic TTL based on health status
        if health_data.get("status") == "healthy":
            ttl = 300   # 5 minutes for healthy servers
        elif health_data.get("status") == "degraded":
            ttl = 60    # 1 minute for degraded servers
        else:
            ttl = 30    # 30 seconds for unhealthy servers
        
        return await self.set_compressed(
            key, 
            health_data, 
            ttl=ttl,
            compression=CacheCompressionLevel.LIGHT  # Health data is small
        )
    
    async def cache_oauth_token(self, user_id: str, token_data: dict) -> bool:
        """Cache OAuth token with intelligent expiry."""
        key = f"{self.key_prefixes['oauth']}{user_id}"
        
        # Calculate TTL based on token expiry
        if "expires_at" in token_data:
            expires_at = datetime.fromisoformat(token_data["expires_at"])
            ttl = max(int((expires_at - datetime.utcnow()).total_seconds()) - 300, 60)  # 5 min buffer
        else:
            ttl = 3600  # Default 1 hour
        
        return await self.set_compressed(
            key,
            token_data,
            ttl=ttl,
            compression=CacheCompressionLevel.HEAVY  # Tokens can be large
        )
    
    async def get_cache_performance_stats(self) -> dict:
        """Get Redis cache performance statistics."""
        info = await self.redis.info()
        
        return {
            "used_memory_human": info.get("used_memory_human"),
            "used_memory_peak_human": info.get("used_memory_peak_human"),
            "connected_clients": info.get("connected_clients"),
            "total_connections_received": info.get("total_connections_received"),
            "total_commands_processed": info.get("total_commands_processed"),
            "instantaneous_ops_per_sec": info.get("instantaneous_ops_per_sec"),
            "keyspace_hits": info.get("keyspace_hits"),
            "keyspace_misses": info.get("keyspace_misses"),
            "hit_rate_percentage": (
                info.get("keyspace_hits", 0) / 
                (info.get("keyspace_hits", 0) + info.get("keyspace_misses", 1))
            ) * 100
        }
```

### 6. OAuth Performance Optimization
```python
# OAuth token validation caching and optimization
# File: src/mcp_registry_gateway/auth/performance_optimizer.py

import asyncio
import time
from datetime import datetime, timedelta
import aiohttp
import jwt
from typing import Dict, Optional, Tuple
import hashlib

class OAuthPerformanceOptimizer:
    """Optimize OAuth token validation performance."""
    
    def __init__(self, redis_cache: OptimizedRedisCache):
        self.cache = redis_cache
        self.jwks_cache = {}
        self.jwks_cache_expiry = None
        self.token_validation_stats = {
            "cache_hits": 0,
            "cache_misses": 0,
            "jwks_cache_hits": 0,
            "jwks_cache_misses": 0,
            "avg_validation_time_ms": 0
        }
    
    async def validate_token_cached(self, token: str) -> Optional[dict]:
        """Validate JWT token with caching optimization."""
        start_time = time.perf_counter()
        
        # Create cache key from token hash
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        cache_key = f"mreg:token_validation:{token_hash}"
        
        # Check cache first
        cached_result = await self.cache.get_decompressed(cache_key)
        if cached_result:
            self.token_validation_stats["cache_hits"] += 1
            
            # Check if cached result is still valid
            if datetime.fromisoformat(cached_result["validated_at"]) > datetime.utcnow() - timedelta(minutes=5):
                return cached_result["claims"]
        
        # Cache miss - perform validation
        self.token_validation_stats["cache_misses"] += 1
        
        try:
            # Get JWKS keys (cached)
            jwks_keys = await self._get_jwks_keys_cached()
            
            # Validate token
            decoded = jwt.decode(
                token,
                key=jwks_keys,
                algorithms=["RS256"],
                audience="your-client-id",
                issuer=f"https://login.microsoftonline.com/{tenant_id}/v2.0"
            )
            
            # Cache successful validation
            validation_result = {
                "claims": decoded,
                "validated_at": datetime.utcnow().isoformat(),
                "validation_source": "jwt_decode"
            }
            
            # Cache for 5 minutes
            await self.cache.set_compressed(
                cache_key,
                validation_result,
                ttl=300,
                compression=CacheCompressionLevel.HEAVY
            )
            
            validation_time = (time.perf_counter() - start_time) * 1000
            self._update_validation_stats(validation_time)
            
            return decoded
            
        except jwt.InvalidTokenError as e:
            # Cache invalid token result briefly to prevent repeated validation
            invalid_result = {
                "error": str(e),
                "validated_at": datetime.utcnow().isoformat(),
                "validation_source": "jwt_error"
            }
            
            await self.cache.set_compressed(
                cache_key,
                invalid_result,
                ttl=60,  # Cache invalid tokens for 1 minute
                compression=CacheCompressionLevel.LIGHT
            )
            
            return None
    
    async def _get_jwks_keys_cached(self) -> dict:
        """Get JWKS keys with caching."""
        
        # Check cache expiry
        if (self.jwks_cache_expiry and 
            datetime.utcnow() < self.jwks_cache_expiry and 
            self.jwks_cache):
            self.token_validation_stats["jwks_cache_hits"] += 1
            return self.jwks_cache
        
        # Cache miss - fetch from Azure
        self.token_validation_stats["jwks_cache_misses"] += 1
        
        jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(jwks_url) as response:
                if response.status == 200:
                    jwks_data = await response.json()
                    
                    # Process JWKS keys for PyJWT
                    keys = {}
                    for key in jwks_data.get("keys", []):
                        keys[key["kid"]] = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                    
                    # Cache for 1 hour
                    self.jwks_cache = keys
                    self.jwks_cache_expiry = datetime.utcnow() + timedelta(hours=1)
                    
                    return keys
                else:
                    raise Exception(f"Failed to fetch JWKS: {response.status}")
    
    def _update_validation_stats(self, validation_time_ms: float):
        """Update validation performance statistics."""
        total_validations = (
            self.token_validation_stats["cache_hits"] + 
            self.token_validation_stats["cache_misses"]
        )
        
        # Update rolling average
        current_avg = self.token_validation_stats["avg_validation_time_ms"]
        self.token_validation_stats["avg_validation_time_ms"] = (
            (current_avg * (total_validations - 1) + validation_time_ms) / total_validations
        )
    
    def get_performance_metrics(self) -> dict:
        """Get OAuth performance metrics."""
        total_requests = (
            self.token_validation_stats["cache_hits"] + 
            self.token_validation_stats["cache_misses"]
        )
        
        cache_hit_rate = (
            self.token_validation_stats["cache_hits"] / total_requests * 100
            if total_requests > 0 else 0
        )
        
        return {
            "token_validation": self.token_validation_stats,
            "cache_hit_rate_percentage": round(cache_hit_rate, 2),
            "jwks_cache_status": {
                "cached": bool(self.jwks_cache),
                "expires_at": self.jwks_cache_expiry.isoformat() if self.jwks_cache_expiry else None,
                "keys_count": len(self.jwks_cache) if self.jwks_cache else 0
            }
        }
```

## Performance Monitoring & Analysis

### 1. Real-Time Performance Monitoring
```python
# Performance monitoring dashboard
# File: src/mcp_registry_gateway/monitoring/performance_monitor.py

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import statistics

@dataclass
class PerformanceMetric:
    """Performance metric data structure."""
    name: str
    value: float
    unit: str
    timestamp: datetime
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None

class PerformanceMonitor:
    """Real-time performance monitoring for MCP Registry Gateway."""
    
    def __init__(self):
        self.metrics_history: Dict[str, List[PerformanceMetric]] = {}
        self.alert_callbacks = []
        self.monitoring_active = False
    
    async def start_monitoring(self):
        """Start continuous performance monitoring."""
        self.monitoring_active = True
        
        # Start monitoring tasks
        monitoring_tasks = [
            self._monitor_database_performance(),
            self._monitor_redis_performance(),
            self._monitor_oauth_performance(),
            self._monitor_server_response_times(),
            self._monitor_memory_usage()
        ]
        
        await asyncio.gather(*monitoring_tasks)
    
    async def _monitor_database_performance(self):
        """Monitor database connection and query performance."""
        while self.monitoring_active:
            try:
                from src.mcp_registry_gateway.db.database import DatabaseManager
                db_manager = DatabaseManager()
                
                # Test query performance
                start_time = time.perf_counter()
                async with db_manager.get_session() as session:
                    await session.execute("SELECT 1")
                query_time = (time.perf_counter() - start_time) * 1000
                
                self._record_metric(PerformanceMetric(
                    name="database_query_time",
                    value=query_time,
                    unit="ms",
                    timestamp=datetime.utcnow(),
                    threshold_warning=100.0,
                    threshold_critical=500.0
                ))
                
                # Connection pool metrics
                pool_stats = await db_manager.get_connection_pool_stats()
                self._record_metric(PerformanceMetric(
                    name="database_pool_utilization",
                    value=pool_stats["utilization_percentage"],
                    unit="%",
                    timestamp=datetime.utcnow(),
                    threshold_warning=80.0,
                    threshold_critical=95.0
                ))
                
            except Exception as e:
                logger.error(f"Database performance monitoring error: {e}")
            
            await asyncio.sleep(30)  # Check every 30 seconds
    
    async def _monitor_redis_performance(self):
        """Monitor Redis cache performance."""
        while self.monitoring_active:
            try:
                from src.mcp_registry_gateway.services.cache_optimizer import OptimizedRedisCache
                cache = OptimizedRedisCache(settings.redis_url)
                
                # Test Redis response time
                start_time = time.perf_counter()
                await cache.redis.ping()
                ping_time = (time.perf_counter() - start_time) * 1000
                
                self._record_metric(PerformanceMetric(
                    name="redis_ping_time",
                    value=ping_time,
                    unit="ms", 
                    timestamp=datetime.utcnow(),
                    threshold_warning=50.0,
                    threshold_critical=200.0
                ))
                
                # Cache performance stats
                cache_stats = await cache.get_cache_performance_stats()
                self._record_metric(PerformanceMetric(
                    name="redis_hit_rate",
                    value=cache_stats["hit_rate_percentage"],
                    unit="%",
                    timestamp=datetime.utcnow(),
                    threshold_warning=70.0,  # Alert if hit rate drops below 70%
                    threshold_critical=50.0
                ))
                
            except Exception as e:
                logger.error(f"Redis performance monitoring error: {e}")
            
            await asyncio.sleep(30)
    
    def _record_metric(self, metric: PerformanceMetric):
        """Record performance metric with alerting."""
        
        # Initialize metric history if needed
        if metric.name not in self.metrics_history:
            self.metrics_history[metric.name] = []
        
        # Add metric to history
        self.metrics_history[metric.name].append(metric)
        
        # Keep only last hour of data
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        self.metrics_history[metric.name] = [
            m for m in self.metrics_history[metric.name]
            if m.timestamp > cutoff_time
        ]
        
        # Check thresholds and trigger alerts
        self._check_thresholds(metric)
    
    def _check_thresholds(self, metric: PerformanceMetric):
        """Check metric thresholds and trigger alerts."""
        
        if metric.threshold_critical and metric.value > metric.threshold_critical:
            self._trigger_alert("critical", metric)
        elif metric.threshold_warning and metric.value > metric.threshold_warning:
            self._trigger_alert("warning", metric)
    
    def _trigger_alert(self, severity: str, metric: PerformanceMetric):
        """Trigger performance alert."""
        alert_data = {
            "severity": severity,
            "metric": asdict(metric),
            "message": f"{metric.name} {severity}: {metric.value} {metric.unit}"
        }
        
        # Call alert callbacks
        for callback in self.alert_callbacks:
            try:
                callback(alert_data)
            except Exception as e:
                logger.error(f"Alert callback error: {e}")
    
    def get_performance_summary(self) -> dict:
        """Get performance summary for the last hour."""
        summary = {}
        
        for metric_name, metrics in self.metrics_history.items():
            if not metrics:
                continue
            
            values = [m.value for m in metrics]
            
            summary[metric_name] = {
                "current": values[-1] if values else None,
                "average": statistics.mean(values),
                "min": min(values),
                "max": max(values),
                "std_dev": statistics.stdev(values) if len(values) > 1 else 0,
                "sample_count": len(values),
                "unit": metrics[-1].unit,
                "trend": self._calculate_trend(values)
            }
        
        return summary
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate performance trend."""
        if len(values) < 10:
            return "insufficient_data"
        
        # Compare first half vs second half
        midpoint = len(values) // 2
        first_half_avg = statistics.mean(values[:midpoint])
        second_half_avg = statistics.mean(values[midpoint:])
        
        change_percentage = ((second_half_avg - first_half_avg) / first_half_avg) * 100
        
        if change_percentage > 10:
            return "degrading"
        elif change_percentage < -10:
            return "improving"
        else:
            return "stable"
```

### 2. Performance Optimization Recommendations
```python
class PerformanceRecommendationEngine:
    """Generate performance optimization recommendations."""
    
    def __init__(self, monitor: PerformanceMonitor):
        self.monitor = monitor
    
    def generate_recommendations(self) -> List[dict]:
        """Generate performance optimization recommendations."""
        recommendations = []
        summary = self.monitor.get_performance_summary()
        
        # Database performance recommendations
        db_query_time = summary.get("database_query_time", {})
        if db_query_time.get("average", 0) > 100:
            recommendations.append({
                "category": "database",
                "priority": "high" if db_query_time.get("average", 0) > 500 else "medium",
                "issue": f"Average database query time is {db_query_time.get('average', 0):.1f}ms",
                "recommendation": "Consider adding database indexes or optimizing slow queries",
                "implementation": [
                    "Run EXPLAIN ANALYZE on slow queries",
                    "Add indexes for frequently queried columns",
                    "Consider connection pool size adjustment",
                    "Implement query result caching"
                ]
            })
        
        # Redis performance recommendations
        redis_hit_rate = summary.get("redis_hit_rate", {})
        if redis_hit_rate.get("average", 100) < 70:
            recommendations.append({
                "category": "caching",
                "priority": "medium",
                "issue": f"Redis cache hit rate is {redis_hit_rate.get('average', 0):.1f}%",
                "recommendation": "Optimize caching strategy to improve hit rate",
                "implementation": [
                    "Review cache TTL settings",
                    "Implement cache warming for frequently accessed data",
                    "Consider increasing cache memory allocation",
                    "Analyze cache key patterns for optimization"
                ]
            })
        
        # OAuth performance recommendations  
        oauth_validation_time = summary.get("oauth_validation_time", {})
        if oauth_validation_time.get("average", 0) > 200:
            recommendations.append({
                "category": "authentication",
                "priority": "high",
                "issue": f"OAuth token validation averaging {oauth_validation_time.get('average', 0):.1f}ms",
                "recommendation": "Optimize OAuth token validation caching",
                "implementation": [
                    "Implement token validation result caching",
                    "Cache JWKS keys for longer periods",
                    "Use connection pooling for Azure AD requests",
                    "Consider token validation request batching"
                ]
            })
        
        return sorted(recommendations, key=lambda x: {"high": 3, "medium": 2, "low": 1}[x["priority"]], reverse=True)
```

## Performance Testing & Benchmarking

### 1. Load Testing Framework
```python
# Load testing framework for performance validation
# File: tests/performance/load_test.py

import asyncio
import aiohttp
import time
import statistics
from datetime import datetime
from typing import List, Dict
import concurrent.futures

class LoadTestScenario:
    """Load testing scenario for MCP Registry Gateway."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = []
    
    async def run_load_test(self, 
                           concurrent_users: int = 10,
                           requests_per_user: int = 100,
                           test_duration_seconds: int = 60) -> Dict:
        """Run comprehensive load test."""
        
        print(f"🚀 Starting load test: {concurrent_users} users, {requests_per_user} requests/user")
        start_time = time.perf_counter()
        
        # Create tasks for concurrent users
        tasks = []
        for user_id in range(concurrent_users):
            task = self._simulate_user_load(user_id, requests_per_user)
            tasks.append(task)
        
        # Execute load test
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        total_time = time.perf_counter() - start_time
        
        # Aggregate results
        all_response_times = []
        total_requests = 0
        total_errors = 0
        
        for result in results:
            if isinstance(result, dict):
                all_response_times.extend(result["response_times"])
                total_requests += result["total_requests"]
                total_errors += result["errors"]
        
        # Calculate performance metrics
        performance_metrics = {
            "test_config": {
                "concurrent_users": concurrent_users,
                "requests_per_user": requests_per_user,
                "total_test_time": total_time
            },
            "results": {
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate_percentage": (total_errors / total_requests * 100) if total_requests > 0 else 0,
                "requests_per_second": total_requests / total_time,
                "response_times": {
                    "min_ms": min(all_response_times) if all_response_times else 0,
                    "max_ms": max(all_response_times) if all_response_times else 0,
                    "mean_ms": statistics.mean(all_response_times) if all_response_times else 0,
                    "median_ms": statistics.median(all_response_times) if all_response_times else 0,
                    "p95_ms": self._percentile(all_response_times, 95) if all_response_times else 0,
                    "p99_ms": self._percentile(all_response_times, 99) if all_response_times else 0
                }
            },
            "performance_grade": self._calculate_performance_grade(all_response_times, total_errors, total_requests)
        }
        
        return performance_metrics
    
    async def _simulate_user_load(self, user_id: int, num_requests: int) -> Dict:
        """Simulate load for a single user."""
        response_times = []
        errors = 0
        
        async with aiohttp.ClientSession() as session:
            for request_id in range(num_requests):
                try:
                    # Mix of different endpoints
                    endpoints = [
                        "/health",
                        "/api/v1/servers",
                        "/api/v1/discovery/tools?tools=get_weather",
                        "/api/v1/router/metrics"
                    ]
                    
                    endpoint = endpoints[request_id % len(endpoints)]
                    
                    start_time = time.perf_counter()
                    async with session.get(f"{self.base_url}{endpoint}") as response:
                        await response.read()  # Ensure full response is received
                        response_time = (time.perf_counter() - start_time) * 1000
                        response_times.append(response_time)
                        
                        if response.status >= 400:
                            errors += 1
                
                except Exception as e:
                    errors += 1
                    # Add timeout as worst case response time
                    response_times.append(30000)  # 30 second timeout
                
                # Small delay between requests
                await asyncio.sleep(0.01)
        
        return {
            "user_id": user_id,
            "response_times": response_times,
            "total_requests": num_requests,
            "errors": errors
        }
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile value."""
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def _calculate_performance_grade(self, response_times: List[float], errors: int, total_requests: int) -> str:
        """Calculate overall performance grade."""
        if not response_times:
            return "F"
        
        error_rate = (errors / total_requests * 100) if total_requests > 0 else 0
        avg_response_time = statistics.mean(response_times)
        p95_response_time = self._percentile(response_times, 95)
        
        # Grading criteria
        if error_rate > 5 or avg_response_time > 1000 or p95_response_time > 2000:
            return "F"
        elif error_rate > 2 or avg_response_time > 500 or p95_response_time > 1000:
            return "D"  
        elif error_rate > 1 or avg_response_time > 250 or p95_response_time > 500:
            return "C"
        elif error_rate > 0.5 or avg_response_time > 150 or p95_response_time > 300:
            return "B"
        else:
            return "A"

# Performance test execution script
async def main():
    load_tester = LoadTestScenario()
    
    # Run different load scenarios
    scenarios = [
        {"users": 5, "requests": 50, "name": "Light Load"},
        {"users": 10, "requests": 100, "name": "Medium Load"}, 
        {"users": 20, "requests": 100, "name": "Heavy Load"}
    ]
    
    for scenario in scenarios:
        print(f"\n📊 Running {scenario['name']} test...")
        results = await load_tester.run_load_test(
            concurrent_users=scenario["users"],
            requests_per_user=scenario["requests"]
        )
        
        print(f"✅ {scenario['name']} Results:")
        print(f"   Grade: {results['performance_grade']}")
        print(f"   RPS: {results['results']['requests_per_second']:.1f}")
        print(f"   Avg Response: {results['results']['response_times']['mean_ms']:.1f}ms")
        print(f"   P95 Response: {results['results']['response_times']['p95_ms']:.1f}ms")
        print(f"   Error Rate: {results['results']['error_rate_percentage']:.2f}%")

if __name__ == "__main__":
    asyncio.run(main())
```

This performance optimizer provides comprehensive optimization capabilities for the MCP Registry Gateway, focusing on database performance, caching strategies, OAuth optimization, and real-time monitoring with actionable recommendations.