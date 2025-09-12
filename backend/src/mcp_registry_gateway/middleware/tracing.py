"""Distributed tracing middleware for request flow analysis.

This middleware implements comprehensive distributed tracing across the
MCP Registry Gateway's dual-server architecture (FastAPI + FastMCP) with
performance monitoring and user journey analysis.

Key Features:
- Request tracing with performance metrics
- User journey tracking with authentication context
- Performance bottleneck identification
- Multi-tenant request flow analysis
- Prometheus metrics integration
- Optional Azure Application Insights export
"""

import asyncio
import contextlib
import logging
import time
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from fastmcp.server.middleware import CallNext, MiddlewareContext
from prometheus_client import Counter, Gauge, Histogram

from ..core.config import Settings
from .base import BaseMiddleware


logger = logging.getLogger(__name__)


@dataclass
class TraceSpan:
    """Individual trace span for request component timing."""

    span_id: str
    parent_id: str | None
    operation_name: str
    start_time: float
    end_time: float | None = None
    duration_ms: float | None = None
    status: str = "active"  # active, completed, error
    metadata: dict[str, Any] = field(default_factory=dict)
    user_context: dict[str, str] | None = None
    tenant_context: str | None = None

    def complete(self, status: str = "completed", **metadata) -> None:
        """Complete the span with timing and metadata."""
        self.end_time = time.time()
        self.duration_ms = (self.end_time - self.start_time) * 1000
        self.status = status
        self.metadata.update(metadata)


@dataclass
class RequestTrace:
    """Complete request trace across multiple components."""

    trace_id: str
    request_id: str
    user_id: str | None = None
    tenant_id: str | None = None
    start_time: float = field(default_factory=time.time)
    end_time: float | None = None
    total_duration_ms: float | None = None

    # Request context
    method: str = "UNKNOWN"
    endpoint: str = "UNKNOWN"
    user_agent: str | None = None
    client_ip: str | None = None

    # Authentication context
    auth_method: str | None = None
    token_type: str | None = None

    # Component traces
    spans: list[TraceSpan] = field(default_factory=list)

    # Performance metrics
    component_timings: dict[str, float] = field(default_factory=dict)

    # Status tracking
    status: str = "active"  # active, completed, error, timeout
    error_details: dict[str, Any] | None = None

    def add_span(
        self, operation_name: str, parent_id: str | None = None, **metadata
    ) -> TraceSpan:
        """Add a new span to this trace."""
        span = TraceSpan(
            span_id=str(uuid.uuid4())[:8],
            parent_id=parent_id,
            operation_name=operation_name,
            start_time=time.time(),
            user_context={"user_id": self.user_id, "tenant_id": self.tenant_id}
            if self.user_id
            else None,
            tenant_context=self.tenant_id,
            metadata=metadata,
        )
        self.spans.append(span)
        return span

    def complete(self, status: str = "completed", **metadata) -> None:
        """Complete the request trace."""
        self.end_time = time.time()
        self.total_duration_ms = (self.end_time - self.start_time) * 1000
        self.status = status

        # Calculate component timings
        for span in self.spans:
            if span.duration_ms is not None:
                self.component_timings[span.operation_name] = span.duration_ms

        if status == "error" and metadata:
            self.error_details = metadata


class DistributedTracingMiddleware(BaseMiddleware):
    """Distributed tracing middleware with performance monitoring.

    Provides comprehensive request flow analysis across FastAPI and FastMCP
    components with user journey tracking and performance optimization insights.
    """

    def __init__(self, settings: Settings):
        """Initialize distributed tracing."""
        super().__init__("DistributedTracingMiddleware")
        self.settings = settings
        self.enabled = settings.monitoring.enable_tracing

        # Tracing infrastructure
        self._active_traces: dict[str, RequestTrace] = {}  # trace_id -> trace
        self._completed_traces: list[RequestTrace] = []  # Recent completed traces
        self._trace_lock = asyncio.Lock()

        # Performance tracking
        self._component_performance: dict[str, list[float]] = defaultdict(list)
        self._user_journey_patterns: dict[str, list[str]] = defaultdict(list)

        # Configuration
        self.max_active_traces = 1000  # Prevent memory leaks
        self.completed_trace_retention = 500  # Keep recent traces for analysis
        self.export_batch_size = 50
        self.export_interval_seconds = 30

        # Azure Application Insights integration (simplified)
        self.azure_instrumentation_key = getattr(
            settings.fastmcp, "azure_instrumentation_key", None
        )
        if self.enabled and self.azure_instrumentation_key:
            logger.info("Azure Application Insights integration configured")

        # Sampling rate
        self.sample_rate = 0.1 if not settings.is_debug else 1.0

        # Prometheus metrics for tracing analytics
        self._init_metrics()

        # Background tasks
        self._cleanup_task: asyncio.Task | None = None
        self._export_task: asyncio.Task | None = None

        logger.info(f"Distributed tracing {'enabled' if self.enabled else 'disabled'}")

    def _init_metrics(self) -> None:
        """Initialize Prometheus metrics for tracing analytics."""
        # Request tracing metrics
        self.trace_requests_total = Counter(
            "mcp_trace_requests_total",
            "Total number of traced requests",
            ["method", "endpoint", "status", "user_id", "tenant_id"],
        )

        self.trace_duration_seconds = Histogram(
            "mcp_trace_duration_seconds",
            "Request trace duration distribution",
            ["method", "endpoint", "user_id", "tenant_id"],
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
        )

        # Component performance metrics
        self.component_duration_seconds = Histogram(
            "mcp_component_duration_seconds",
            "Individual component duration distribution",
            ["component", "operation", "user_id", "tenant_id"],
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0],
        )

        # Active traces gauge
        self.active_traces_count = Gauge(
            "mcp_active_traces_count", "Number of currently active request traces"
        )

        # User journey tracking
        self.user_journey_patterns = Counter(
            "mcp_user_journey_patterns_total",
            "User journey pattern analysis",
            ["pattern_type", "user_id", "tenant_id", "endpoint_sequence"],
        )

        # Tracing system health
        self.trace_exports_total = Counter(
            "mcp_trace_exports_total",
            "Trace exports to external systems",
            ["destination", "status"],
        )

        self.trace_errors_total = Counter(
            "mcp_trace_errors_total",
            "Tracing system errors",
            ["error_type", "component"],
        )

    async def startup(self) -> None:
        """Start background tracing tasks."""
        if not self.enabled:
            return

        # Start cleanup task
        self._cleanup_task = asyncio.create_task(self._cleanup_traces())

        # Start export task if Azure is configured
        if self.azure_instrumentation_key:
            self._export_task = asyncio.create_task(self._export_traces())

        logger.info("Distributed tracing middleware started")

    async def shutdown(self) -> None:
        """Cleanup tracing resources."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._cleanup_task

        if self._export_task:
            self._export_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._export_task

        logger.info("Distributed tracing middleware stopped")

    async def on_message(self, context: MiddlewareContext, call_next: CallNext) -> Any:
        """Process FastMCP messages with distributed tracing."""
        if not self.enabled:
            return await call_next(context)

        # Create or retrieve trace
        trace_id = getattr(context, "trace_id", None)
        if not trace_id:
            trace_id = str(uuid.uuid4())
            context.trace_id = trace_id

        method = getattr(context, "method", "unknown")
        user_id = self._get_user_id_safe(context)
        tenant_id = self._get_tenant_id_safe(context)

        # Create trace if doesn't exist
        if trace_id not in self._active_traces:
            trace = RequestTrace(
                trace_id=trace_id,
                request_id=str(uuid.uuid4())[:8],
                user_id=user_id,
                tenant_id=tenant_id,
                method=method,
                endpoint=f"fastmcp/{method}",
            )

            async with self._trace_lock:
                # Prevent memory leaks
                if len(self._active_traces) >= self.max_active_traces:
                    # Remove oldest trace
                    oldest_trace_id = min(self._active_traces.keys())
                    self._active_traces.pop(oldest_trace_id, None)

                self._active_traces[trace_id] = trace

        trace = self._active_traces[trace_id]

        # Start FastMCP span
        span = trace.add_span(
            operation_name="fastmcp_processing",
            service="fastmcp",
            method=method,
            user_id=user_id,
            tenant_id=tenant_id,
        )

        try:
            # Process request
            result = await call_next(context)

            # Complete span successfully
            span.complete(
                status="completed",
                result_size=len(str(result)) if result else 0,
            )

            # Complete trace if this is the final operation
            self._complete_trace_if_done(trace_id)

            return result

        except Exception as e:
            # Complete span with error
            span.complete(
                status="error",
                error_type=type(e).__name__,
                error_message=str(e),
            )

            # Record error metric
            self.trace_errors_total.labels(
                error_type=type(e).__name__, component="fastmcp_processing"
            ).inc()

            # Complete trace with error
            self._complete_trace_if_done(trace_id, status="error", error=e)

            raise

    def _get_user_id_safe(self, context: MiddlewareContext) -> str | None:
        """Safely extract user ID from context."""
        try:
            auth_context = getattr(context, "fastmcp_context", None)
            if auth_context and hasattr(auth_context, "auth"):
                user = getattr(auth_context.auth, "user", None)
                if user:
                    return getattr(user, "user_id", None)
        except Exception:
            pass
        return None

    def _get_tenant_id_safe(self, context: MiddlewareContext) -> str | None:
        """Safely extract tenant ID from context."""
        try:
            auth_context = getattr(context, "fastmcp_context", None)
            if auth_context and hasattr(auth_context, "auth"):
                user = getattr(auth_context.auth, "user", None)
                if user:
                    return getattr(user, "tenant_id", None)
        except Exception:
            pass
        return None

    def _complete_trace_if_done(
        self, trace_id: str, status: str = "completed", error: Exception | None = None
    ) -> None:
        """Complete trace if all operations are finished."""
        trace = self._active_traces.get(trace_id)
        if not trace:
            return

        # Complete the trace
        trace.complete(
            status=status,
            error_type=type(error).__name__ if error else None,
            error_message=str(error) if error else None,
        )

        # Move to completed traces
        async def move_trace():
            async with self._trace_lock:
                completed_trace = self._active_traces.pop(trace_id, None)
                if completed_trace:
                    self._completed_traces.append(completed_trace)

                    # Maintain retention limit
                    if len(self._completed_traces) > self.completed_trace_retention:
                        self._completed_traces.pop(0)

                    # Update metrics
                    self.active_traces_count.set(len(self._active_traces))

                    # Record trace metrics
                    self.trace_requests_total.labels(
                        method=completed_trace.method,
                        endpoint=completed_trace.endpoint,
                        status=status,
                        user_id=completed_trace.user_id or "anonymous",
                        tenant_id=completed_trace.tenant_id or "default",
                    ).inc()

                    if completed_trace.total_duration_ms:
                        self.trace_duration_seconds.labels(
                            method=completed_trace.method,
                            endpoint=completed_trace.endpoint,
                            user_id=completed_trace.user_id or "anonymous",
                            tenant_id=completed_trace.tenant_id or "default",
                        ).observe(completed_trace.total_duration_ms / 1000)

                    # Record component timings
                    for (
                        component,
                        duration_ms,
                    ) in completed_trace.component_timings.items():
                        self.component_duration_seconds.labels(
                            component=component,
                            operation=completed_trace.endpoint,
                            user_id=completed_trace.user_id or "anonymous",
                            tenant_id=completed_trace.tenant_id or "default",
                        ).observe(duration_ms / 1000)

                    # Track user journey patterns
                    if completed_trace.user_id:
                        await self._update_user_journey(completed_trace)

        # Schedule the async operation
        task = asyncio.create_task(move_trace())
        # Store task reference to prevent garbage collection
        if not hasattr(self, "_background_tasks"):
            self._background_tasks = set()
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

    @asynccontextmanager
    async def span(self, operation_name: str, trace_id: str | None = None, **metadata):
        """Create a traced span context manager."""
        if not self.enabled or not trace_id:
            yield None
            return

        trace = self._active_traces.get(trace_id)
        if not trace:
            yield None
            return

        span = trace.add_span(operation_name, **metadata)
        try:
            yield span
        except Exception as e:
            span.complete(status="error", error=str(e))
            raise
        else:
            span.complete(status="completed")

    async def _update_user_journey(self, trace: RequestTrace) -> None:
        """Update user journey pattern tracking."""
        if not trace.user_id:
            return

        # Add to user journey history
        journey_key = f"{trace.user_id}:{trace.tenant_id or 'default'}"
        self._user_journey_patterns[journey_key].append(trace.endpoint)

        # Keep only recent endpoints (last 10)
        if len(self._user_journey_patterns[journey_key]) > 10:
            self._user_journey_patterns[journey_key] = self._user_journey_patterns[
                journey_key
            ][-10:]

        # Detect patterns
        endpoints = self._user_journey_patterns[journey_key]
        if len(endpoints) >= 3:
            pattern_type = self._detect_journey_pattern(endpoints)
            if pattern_type:
                self.user_journey_patterns.labels(
                    pattern_type=pattern_type,
                    user_id=trace.user_id,
                    tenant_id=trace.tenant_id or "default",
                    endpoint_sequence="_".join(endpoints[-3:]),
                ).inc()

    def _detect_journey_pattern(self, endpoints: list[str]) -> str | None:
        """Detect user journey patterns."""
        recent_endpoints = endpoints[-3:]

        # Authentication flow pattern
        if any("oauth" in ep or "login" in ep for ep in recent_endpoints):
            return "authentication_flow"

        # Server management pattern
        if any("server" in ep for ep in recent_endpoints):
            return "server_management"

        # Discovery pattern
        if any("discover" in ep or "search" in ep for ep in recent_endpoints):
            return "service_discovery"

        # Proxy usage pattern
        if any("proxy" in ep for ep in recent_endpoints):
            return "proxy_usage"

        # Repetitive pattern (same endpoint multiple times)
        if len(set(recent_endpoints)) == 1:
            return "repetitive_usage"

        # Exploration pattern (all different endpoints)
        if len(set(recent_endpoints)) == len(recent_endpoints):
            return "exploration"

        return "standard_workflow"

    async def _cleanup_traces(self) -> None:
        """Background task to cleanup old traces."""
        while True:
            try:
                await asyncio.sleep(60)  # Cleanup every minute

                current_time = time.time()
                cleanup_threshold = current_time - 300  # 5 minutes

                async with self._trace_lock:
                    # Find traces to cleanup
                    traces_to_remove = [
                        trace_id
                        for trace_id, trace in self._active_traces.items()
                        if trace.start_time < cleanup_threshold
                    ]

                    # Remove old traces
                    for trace_id in traces_to_remove:
                        trace = self._active_traces.pop(trace_id)
                        trace.complete(status="timeout")
                        self._completed_traces.append(trace)

                        logger.warning(f"Cleaned up stale trace {trace_id}")

                    # Cleanup completed traces
                    if len(self._completed_traces) > self.completed_trace_retention:
                        excess = (
                            len(self._completed_traces) - self.completed_trace_retention
                        )
                        self._completed_traces = self._completed_traces[excess:]

                # Update metrics
                self.active_traces_count.set(len(self._active_traces))

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Trace cleanup error: {e}")
                self.trace_errors_total.labels(
                    error_type=type(e).__name__, component="cleanup"
                ).inc()

    async def _export_traces(self) -> None:
        """Background task to export traces to Azure Application Insights."""
        if not self.azure_instrumentation_key:
            return

        while True:
            try:
                await asyncio.sleep(self.export_interval_seconds)

                # Get completed traces to export
                traces_to_export = self._completed_traces[-self.export_batch_size :]
                if not traces_to_export:
                    continue

                # Convert traces to Azure format and export
                for trace in traces_to_export:
                    try:
                        await self._export_trace_to_azure(trace)
                        self.trace_exports_total.labels(
                            destination="azure", status="success"
                        ).inc()
                    except Exception as e:
                        logger.error(f"Azure trace export failed: {e}")
                        self.trace_exports_total.labels(
                            destination="azure", status="error"
                        ).inc()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Trace export error: {e}")
                self.trace_errors_total.labels(
                    error_type=type(e).__name__, component="export"
                ).inc()

    async def _export_trace_to_azure(self, trace: RequestTrace) -> None:
        """Export individual trace to Azure Application Insights."""
        # Convert trace to Azure telemetry format
        telemetry_data = {
            "name": f"{trace.method} {trace.endpoint}",
            "id": trace.trace_id,
            "startTime": datetime.fromtimestamp(trace.start_time).isoformat(),
            "duration": trace.total_duration_ms or 0,
            "success": trace.status == "completed",
            "url": trace.endpoint,
            "properties": {
                "user_id": trace.user_id,
                "tenant_id": trace.tenant_id,
                "method": trace.method,
                "client_ip": trace.client_ip,
                "user_agent": trace.user_agent,
                "component_count": len(trace.spans),
                "auth_method": trace.auth_method,
                "token_type": trace.token_type,
            },
            "measurements": {
                "total_duration_ms": trace.total_duration_ms or 0,
                **trace.component_timings,
            },
        }

        # Remove None values
        telemetry_data["properties"] = {
            k: v for k, v in telemetry_data["properties"].items() if v is not None
        }

        # Export via Azure (simplified for now - just log)
        logger.debug(f"Exporting trace {trace.trace_id} to Azure Application Insights")

    # Analytics and reporting methods

    def get_active_traces(self) -> list[RequestTrace]:
        """Get currently active traces for monitoring."""
        return list(self._active_traces.values())

    def get_completed_traces(self, limit: int = 100) -> list[RequestTrace]:
        """Get recently completed traces for analysis."""
        return self._completed_traces[-limit:]

    def get_performance_summary(self) -> dict[str, Any]:
        """Get performance analytics summary."""
        if not self._completed_traces:
            return {}

        recent_traces = self._completed_traces[-100:]

        # Calculate averages
        total_requests = len(recent_traces)
        avg_duration = (
            sum(t.total_duration_ms or 0 for t in recent_traces) / total_requests
        )

        # Component performance
        component_stats = defaultdict(list)
        for trace in recent_traces:
            for component, duration in trace.component_timings.items():
                component_stats[component].append(duration)

        component_averages = {
            component: sum(durations) / len(durations)
            for component, durations in component_stats.items()
        }

        # Error rates
        error_count = sum(1 for t in recent_traces if t.status == "error")
        error_rate = error_count / total_requests if total_requests > 0 else 0

        return {
            "total_requests": total_requests,
            "average_duration_ms": avg_duration,
            "error_rate": error_rate,
            "component_averages": component_averages,
            "active_traces": len(self._active_traces),
            "user_patterns": len(self._user_journey_patterns),
        }

    def get_user_journey_analysis(
        self, user_id: str, tenant_id: str | None = None
    ) -> dict[str, Any]:
        """Get user journey pattern analysis for specific user."""
        journey_key = f"{user_id}:{tenant_id or 'default'}"
        endpoints = self._user_journey_patterns.get(journey_key, [])

        if not endpoints:
            return {"user_id": user_id, "tenant_id": tenant_id, "patterns": []}

        # Analyze patterns
        pattern_counts = defaultdict(int)
        for i in range(len(endpoints) - 2):
            pattern = "_".join(endpoints[i : i + 3])
            pattern_counts[pattern] += 1

        # Get user's recent traces
        user_traces = [
            trace
            for trace in self._completed_traces[-50:]
            if trace.user_id == user_id
            and (not tenant_id or trace.tenant_id == tenant_id)
        ]

        return {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "recent_endpoints": endpoints[-10:],
            "common_patterns": dict(pattern_counts),
            "total_requests": len(user_traces),
            "avg_duration_ms": sum(t.total_duration_ms or 0 for t in user_traces)
            / len(user_traces)
            if user_traces
            else 0,
        }


# Singleton instance for global tracing
_tracing_middleware: DistributedTracingMiddleware | None = None


def get_tracing_middleware(
    settings: Settings | None = None,
) -> DistributedTracingMiddleware:
    """Get or create the global tracing middleware instance."""
    global _tracing_middleware
    if _tracing_middleware is None and settings:
        _tracing_middleware = DistributedTracingMiddleware(settings)
    return _tracing_middleware


def get_tracing_analytics() -> dict[str, Any]:
    """Get current tracing analytics data."""
    if _tracing_middleware:
        return _tracing_middleware.get_performance_summary()
    return {}
