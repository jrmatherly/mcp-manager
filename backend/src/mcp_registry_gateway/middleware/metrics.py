"""Prometheus metrics middleware for FastMCP server monitoring.

This middleware provides comprehensive metrics collection for OAuth authentication,
user activity patterns, and system performance monitoring with Prometheus integration.
"""

import time
from collections import defaultdict
from typing import Any

from fastmcp.server.middleware import CallNext, MiddlewareContext
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    REGISTRY,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

from ..auth.context import UserContext
from ..core.exceptions import AuthenticationError, AuthorizationError
from .base import BaseMiddleware


class MetricsMiddleware(BaseMiddleware):
    """FastMCP middleware for Prometheus metrics collection.

    Collects detailed metrics about user activity, authentication events,
    and system performance for monitoring and observability.
    """

    def __init__(self, registry: CollectorRegistry | None = None):
        super().__init__("MetricsMiddleware")
        self._registry = registry or REGISTRY
        self._init_metrics()

    def _init_metrics(self) -> None:
        """Initialize Prometheus metrics collectors."""
        # Authentication event counters
        self.auth_events = Counter(
            "mcp_auth_events_total",
            "OAuth authentication attempts and outcomes",
            ["user_id", "tenant_id", "result", "method"],
            registry=self._registry,
        )

        # Token refresh event counters
        self.token_refresh_events = Counter(
            "mcp_token_refresh_total",
            "Token refresh operations (manual/automatic)",
            ["user_id", "tenant_id", "method", "result"],
            registry=self._registry,
        )

        # Active user gauges
        self.concurrent_users = Gauge(
            "mcp_concurrent_users",
            "Active authenticated users per tenant",
            ["tenant_id"],
            registry=self._registry,
        )

        # Request latency histograms
        self.request_latency = Histogram(
            "mcp_request_duration_seconds",
            "Request processing latency distribution",
            ["method", "user_id", "tenant_id", "tool_name"],
            registry=self._registry,
        )

        # Rate limiting counters
        self.rate_limit_hits = Counter(
            "mcp_rate_limit_hits_total",
            "Rate limiting enforcement events",
            ["user_id", "tenant_id", "limit_type", "action"],
            registry=self._registry,
        )

        # System health gauges
        self.active_connections = Gauge(
            "mcp_active_connections",
            "Number of active MCP connections",
            registry=self._registry,
        )

        # Tool usage counters
        self.tool_calls = Counter(
            "mcp_tool_calls_total",
            "MCP tool invocation events",
            ["tool_name", "user_id", "tenant_id", "result"],
            registry=self._registry,
        )

        # Error tracking counters
        self.error_events = Counter(
            "mcp_errors_total",
            "System error events by type and context",
            ["error_type", "user_id", "tenant_id", "method"],
            registry=self._registry,
        )

        # === Priority 1 Enhancement: User Activity Patterns ===

        # User session tracking
        self.user_sessions = Gauge(
            "mcp_user_sessions_active",
            "Active user sessions with session details",
            ["user_id", "tenant_id", "session_type"],
            registry=self._registry,
        )

        # User login frequency tracking
        self.user_login_frequency = Counter(
            "mcp_user_logins_total",
            "User login frequency and patterns",
            ["user_id", "tenant_id", "login_method", "time_of_day"],
            registry=self._registry,
        )

        # Session duration tracking
        self.session_duration = Histogram(
            "mcp_session_duration_seconds",
            "User session duration distribution",
            ["user_id", "tenant_id", "session_end_reason"],
            buckets=[60, 300, 900, 1800, 3600, 7200, 14400, 28800],  # 1min to 8h
            registry=self._registry,
        )

        # Per-tenant activity analytics
        self.tenant_activity = Counter(
            "mcp_tenant_activity_total",
            "Per-tenant activity patterns and resource usage",
            ["tenant_id", "activity_type", "resource_type"],
            registry=self._registry,
        )

        # Tool usage analytics by user/tenant
        self.tool_usage_analytics = Histogram(
            "mcp_tool_usage_duration_seconds",
            "Tool usage duration and frequency by user/tenant",
            ["tool_name", "user_id", "tenant_id", "usage_pattern"],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],  # 100ms to 1min
            registry=self._registry,
        )

        # User behavior pattern tracking
        self.user_behavior_patterns = Counter(
            "mcp_user_behavior_patterns_total",
            "User behavior patterns and interaction sequences",
            ["user_id", "tenant_id", "pattern_type", "sequence_stage"],
            registry=self._registry,
        )

        # Concurrent user tracking per tenant (enhanced)
        self.concurrent_users_detailed = Gauge(
            "mcp_concurrent_users_detailed",
            "Detailed concurrent user metrics per tenant with activity status",
            ["tenant_id", "user_type", "activity_status"],
            registry=self._registry,
        )

        # === In-memory tracking for enhanced analytics ===
        self._active_sessions: dict[str, dict] = {}  # user_id -> session_info
        self._user_activity_patterns: dict[str, list] = defaultdict(
            list
        )  # user_id -> activity_history
        self._tenant_resource_usage: dict[str, dict] = defaultdict(
            dict
        )  # tenant_id -> resource_metrics

    async def on_message(self, context: MiddlewareContext, call_next: CallNext) -> Any:
        """Process MCP messages with comprehensive metrics collection."""
        start_time = time.time()
        method = getattr(context, "method", "unknown")

        # Extract user context for metrics labeling
        user_context = self._get_user_context_safe(context)
        user_id = user_context.user_id if user_context else "anonymous"
        tenant_id = user_context.tenant_id if user_context else "unknown"

        # Extract tool name for tool-specific metrics
        tool_name = self._extract_tool_name(context, method)

        try:
            # Record authentication events
            if method in ["auth/login", "auth/refresh", "auth/validate"]:
                self._record_auth_event(method, user_id, tenant_id, "attempt")

            # Execute request with latency tracking
            result = await call_next(context)

            # Record successful completion
            duration = time.time() - start_time
            self.request_latency.labels(
                method=method,
                user_id=user_id,
                tenant_id=tenant_id,
                tool_name=tool_name,
            ).observe(duration)

            # Record successful authentication
            if method in ["auth/login", "auth/refresh", "auth/validate"]:
                self._record_auth_event(method, user_id, tenant_id, "success")

            # Record tool usage
            if method == "tools/call" and tool_name != "unknown":
                self.tool_calls.labels(
                    tool_name=tool_name,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    result="success",
                ).inc()

                # Priority 1 Enhancement: Record detailed tool usage analytics
                self.record_tool_usage_analytics(
                    tool_name=tool_name,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    duration=duration,
                    success=True,
                )

            return result

        except AuthenticationError:
            # Record authentication failures
            self._record_auth_event(method, user_id, tenant_id, "auth_failure")
            self._record_error("authentication", user_id, tenant_id, method)
            raise

        except AuthorizationError:
            # Record authorization failures
            self._record_error("authorization", user_id, tenant_id, method)
            if method == "tools/call" and tool_name != "unknown":
                self.tool_calls.labels(
                    tool_name=tool_name,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    result="auth_failure",
                ).inc()
                # Record failed tool usage analytics
                duration = time.time() - start_time
                self.record_tool_usage_analytics(
                    tool_name=tool_name,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    duration=duration,
                    success=False,
                )
            raise

        except Exception:
            # Record general system errors
            self._record_error("system", user_id, tenant_id, method)
            if method == "tools/call" and tool_name != "unknown":
                self.tool_calls.labels(
                    tool_name=tool_name,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    result="error",
                ).inc()
                # Record failed tool usage analytics
                duration = time.time() - start_time
                self.record_tool_usage_analytics(
                    tool_name=tool_name,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    duration=duration,
                    success=False,
                )
            raise

        finally:
            # Always record request completion for latency tracking
            if "duration" not in locals():
                duration = time.time() - start_time
                self.request_latency.labels(
                    method=method,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    tool_name=tool_name,
                ).observe(duration)

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

    def _extract_tool_name(self, context: MiddlewareContext, method: str) -> str:
        """Extract tool name from context for tool-specific metrics."""
        if method != "tools/call":
            return "n/a"

        # Try to extract tool name from message parameters
        message = getattr(context, "message", {})
        params = message.get("params", {}) if isinstance(message, dict) else {}
        return params.get("name", "unknown")

    def _record_auth_event(
        self, method: str, user_id: str, tenant_id: str, result: str
    ) -> None:
        """Record authentication events with proper labeling."""
        auth_method = {
            "auth/login": "login",
            "auth/refresh": "refresh",
            "auth/validate": "validate",
        }.get(method, "unknown")

        self.auth_events.labels(
            user_id=user_id,
            tenant_id=tenant_id,
            result=result,
            method=auth_method,
        ).inc()

    def _record_error(
        self, error_type: str, user_id: str, tenant_id: str, method: str
    ) -> None:
        """Record error events with categorization."""
        self.error_events.labels(
            error_type=error_type,
            user_id=user_id,
            tenant_id=tenant_id,
            method=method,
        ).inc()

    def record_rate_limit_hit(
        self, user_id: str, tenant_id: str, limit_type: str, action: str
    ) -> None:
        """Public method for recording rate limit events from rate limiting middleware."""
        self.rate_limit_hits.labels(
            user_id=user_id,
            tenant_id=tenant_id,
            limit_type=limit_type,
            action=action,
        ).inc()

    def update_concurrent_users(self, tenant_id: str, count: int) -> None:
        """Update concurrent user count for a tenant."""
        self.concurrent_users.labels(tenant_id=tenant_id).set(count)

    def update_active_connections(self, count: int) -> None:
        """Update total active connection count."""
        self.active_connections.set(count)

    def get_metrics(self) -> bytes:
        """Generate Prometheus metrics in exposition format."""
        return generate_latest(self._registry)

    def get_content_type(self) -> str:
        """Get Prometheus metrics content type."""
        return CONTENT_TYPE_LATEST

    # === Priority 1 Enhancement: User Activity Pattern Methods ===

    def start_user_session(
        self,
        user_id: str,
        tenant_id: str,
        session_type: str = "oauth",
        login_method: str = "azure_oauth",
    ) -> None:
        """Start tracking a user session with detailed analytics."""
        session_start_time = time.time()

        # Record login frequency with time-of-day analysis
        hour_of_day = time.strftime("%H", time.localtime())
        self.user_login_frequency.labels(
            user_id=user_id,
            tenant_id=tenant_id,
            login_method=login_method,
            time_of_day=hour_of_day,
        ).inc()

        # Track active session
        session_info = {
            "start_time": session_start_time,
            "session_type": session_type,
            "tenant_id": tenant_id,
            "last_activity": session_start_time,
            "tool_usage_count": 0,
            "activity_sequence": [],
        }

        self._active_sessions[user_id] = session_info

        # Update session gauge
        self.user_sessions.labels(
            user_id=user_id,
            tenant_id=tenant_id,
            session_type=session_type,
        ).set(1)

        # Record tenant activity
        self.tenant_activity.labels(
            tenant_id=tenant_id,
            activity_type="user_login",
            resource_type="authentication",
        ).inc()

        # Update concurrent user tracking
        self._update_concurrent_user_analytics(tenant_id)

    def end_user_session(self, user_id: str, end_reason: str = "logout") -> None:
        """End user session tracking and record session analytics."""
        if user_id not in self._active_sessions:
            return

        session_info = self._active_sessions.pop(user_id)
        session_duration = time.time() - session_info["start_time"]
        tenant_id = session_info["tenant_id"]

        # Record session duration
        self.session_duration.labels(
            user_id=user_id,
            tenant_id=tenant_id,
            session_end_reason=end_reason,
        ).observe(session_duration)

        # Clear session gauge
        self.user_sessions.labels(
            user_id=user_id,
            tenant_id=tenant_id,
            session_type=session_info["session_type"],
        ).set(0)

        # Record logout activity
        self.tenant_activity.labels(
            tenant_id=tenant_id,
            activity_type="user_logout",
            resource_type="authentication",
        ).inc()

        # Record behavior pattern for session completion
        self.user_behavior_patterns.labels(
            user_id=user_id,
            tenant_id=tenant_id,
            pattern_type="session_completion",
            sequence_stage=f"tools_used_{min(session_info['tool_usage_count'], 10)}",
        ).inc()

        # Update concurrent user tracking
        self._update_concurrent_user_analytics(tenant_id)

    def record_tool_usage_analytics(
        self,
        tool_name: str,
        user_id: str,
        tenant_id: str,
        duration: float,
        success: bool = True,
    ) -> None:
        """Record detailed tool usage analytics for user behavior patterns."""
        # Determine usage pattern based on duration
        if duration < 1.0:
            usage_pattern = "quick_action"
        elif duration < 5.0:
            usage_pattern = "normal_usage"
        elif duration < 30.0:
            usage_pattern = "extended_usage"
        else:
            usage_pattern = "long_operation"

        # Record tool usage histogram
        self.tool_usage_analytics.labels(
            tool_name=tool_name,
            user_id=user_id,
            tenant_id=tenant_id,
            usage_pattern=usage_pattern,
        ).observe(duration)

        # Update session activity if user has active session
        if user_id in self._active_sessions:
            session = self._active_sessions[user_id]
            session["last_activity"] = time.time()
            session["tool_usage_count"] += 1
            session["activity_sequence"].append(
                {
                    "tool": tool_name,
                    "timestamp": time.time(),
                    "duration": duration,
                    "pattern": usage_pattern,
                    "success": success,
                }
            )

            # Keep only last 10 activities to prevent memory growth
            if len(session["activity_sequence"]) > 10:
                session["activity_sequence"] = session["activity_sequence"][-10:]

        # Record tenant resource usage
        self.tenant_activity.labels(
            tenant_id=tenant_id,
            activity_type="tool_usage",
            resource_type=tool_name,
        ).inc()

        # Track user behavior patterns based on tool usage sequence
        self._analyze_user_behavior_pattern(user_id, tenant_id, tool_name)

    def _analyze_user_behavior_pattern(
        self, user_id: str, tenant_id: str, current_tool: str
    ) -> None:
        """Analyze and record user behavior patterns based on tool usage."""
        if user_id not in self._active_sessions:
            return

        session = self._active_sessions[user_id]
        activity_sequence = session["activity_sequence"]

        if len(activity_sequence) >= 2:
            # Analyze tool sequence patterns
            last_tools = [activity["tool"] for activity in activity_sequence[-3:]]

            # Pattern detection
            if len(set(last_tools)) == 1:
                pattern_type = "repetitive_usage"
            elif "list_servers" in last_tools and current_tool != "list_servers":
                pattern_type = "browse_then_action"
            elif len(last_tools) >= 3 and len(set(last_tools)) == len(last_tools):
                pattern_type = "diverse_exploration"
            else:
                pattern_type = "standard_workflow"

            # Record pattern
            self.user_behavior_patterns.labels(
                user_id=user_id,
                tenant_id=tenant_id,
                pattern_type=pattern_type,
                sequence_stage=f"step_{len(activity_sequence)}",
            ).inc()

    def _update_concurrent_user_analytics(self, tenant_id: str) -> None:
        """Update detailed concurrent user analytics for a tenant."""
        # Count active users by type and activity status
        tenant_users = {
            "total": 0,
            "active": 0,  # active in last 5 minutes
            "idle": 0,  # active in last 30 minutes but not 5 minutes
        }

        current_time = time.time()

        for _, session in self._active_sessions.items():
            if session["tenant_id"] == tenant_id:
                tenant_users["total"] += 1

                time_since_activity = current_time - session["last_activity"]
                if time_since_activity < 300:  # 5 minutes
                    tenant_users["active"] += 1
                elif time_since_activity < 1800:  # 30 minutes
                    tenant_users["idle"] += 1

        # Update gauges
        self.concurrent_users_detailed.labels(
            tenant_id=tenant_id,
            user_type="all",
            activity_status="total",
        ).set(tenant_users["total"])

        self.concurrent_users_detailed.labels(
            tenant_id=tenant_id,
            user_type="all",
            activity_status="active",
        ).set(tenant_users["active"])

        self.concurrent_users_detailed.labels(
            tenant_id=tenant_id,
            user_type="all",
            activity_status="idle",
        ).set(tenant_users["idle"])

    def get_user_activity_summary(self, user_id: str) -> dict[str, Any]:
        """Get comprehensive user activity summary for analytics."""
        if user_id not in self._active_sessions:
            return {"status": "no_active_session"}

        session = self._active_sessions[user_id]
        current_time = time.time()

        return {
            "status": "active_session",
            "session_duration": current_time - session["start_time"],
            "last_activity": current_time - session["last_activity"],
            "tool_usage_count": session["tool_usage_count"],
            "activity_sequence_length": len(session["activity_sequence"]),
            "tenant_id": session["tenant_id"],
            "session_type": session["session_type"],
            "recent_tools": [a["tool"] for a in session["activity_sequence"][-5:]],
        }

    def get_tenant_activity_summary(self, tenant_id: str) -> dict[str, Any]:
        """Get comprehensive tenant activity summary for analytics."""
        tenant_sessions = [
            s for s in self._active_sessions.values() if s["tenant_id"] == tenant_id
        ]

        current_time = time.time()

        return {
            "active_users": len(tenant_sessions),
            "total_tool_usage": sum(s["tool_usage_count"] for s in tenant_sessions),
            "average_session_duration": sum(
                current_time - s["start_time"] for s in tenant_sessions
            )
            / len(tenant_sessions)
            if tenant_sessions
            else 0,
            "active_users_5min": len(
                [s for s in tenant_sessions if current_time - s["last_activity"] < 300]
            ),
            "resource_utilization": self._tenant_resource_usage.get(tenant_id, {}),
        }


# Singleton instance for global metrics collection
_metrics_middleware: MetricsMiddleware | None = None


def get_metrics_middleware() -> MetricsMiddleware:
    """Get or create the global metrics middleware instance."""
    global _metrics_middleware
    if _metrics_middleware is None:
        _metrics_middleware = MetricsMiddleware()
    return _metrics_middleware


def get_metrics_data() -> bytes:
    """Get current metrics data in Prometheus format."""
    return get_metrics_middleware().get_metrics()
