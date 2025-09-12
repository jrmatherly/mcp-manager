"""
Audit Logging Middleware for FastMCP Server.

This middleware logs all authenticated operations to PostgreSQL for
comprehensive audit trails and compliance reporting.
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

from fastmcp.server.middleware import CallNext, Middleware, MiddlewareContext


logger = logging.getLogger(__name__)


class AuditLoggingMiddleware(Middleware):
    """Log all authenticated operations to database."""

    def __init__(self, log_to_db: bool = True, db_manager=None):
        """
        Initialize the audit logging middleware.

        Args:
            log_to_db: Whether to log to database (True) or just to logger (False)
            db_manager: Database manager instance for database operations
        """
        self.log_to_db = log_to_db
        self.db_manager = db_manager

    async def on_call_tool(
        self, context: MiddlewareContext, call_next: CallNext
    ) -> Any:
        """
        Log request and response for audit trails.

        Args:
            context: FastMCP middleware context
            call_next: The next middleware/handler in the chain

        Returns:
            The response from the next handler
        """
        # Extract audit information before processing
        audit_data = await self._extract_audit_info(context)

        # Execute request and measure duration
        start_time = time.time()
        try:
            response = await call_next(context)
            success = True
            error_code = None
            error_message = None
        except Exception as e:
            success = False
            error_code = -32603
            error_message = str(e)
            response = None

        duration_ms = int((time.time() - start_time) * 1000)

        # Update audit data with response information
        audit_data.update(
            {
                "success": success,
                "duration_ms": duration_ms,
                "response_error_code": error_code,
                "response_error_message": error_message,
                "timestamp": datetime.now(timezone.utc),
            }
        )

        # Log the audit trail
        await self._log_audit_trail(audit_data)

        # Re-raise exception if there was one
        if not success:
            raise

        return response

    async def _extract_audit_info(self, context: MiddlewareContext) -> dict[str, Any]:
        """Extract audit information from the context."""
        # Extract authentication context if available
        user_id = "anonymous"
        tenant_id = None
        user_roles = []

        # Access authentication context through FastMCP context
        if (
            hasattr(context, "fastmcp_context")
            and context.fastmcp_context
            and hasattr(context.fastmcp_context, "auth")
            and context.fastmcp_context.auth
        ):
            token = context.fastmcp_context.auth.token
            if token and hasattr(token, "claims"):
                user_id = token.claims.get("sub", "unknown")
                tenant_id = token.claims.get("tid")
                user_roles = token.claims.get("roles", [])

        # Get tool name and parameters
        tool_name = getattr(context, "tool_name", "unknown")
        tool_params = getattr(context, "tool_params", {})

        # Sanitize parameters for logging (remove sensitive data)
        sanitized_params = self._sanitize_params(tool_params)

        return {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "user_roles": user_roles,
            "method": f"tools/call:{tool_name}",
            "params": sanitized_params,
            "request_id": getattr(context, "request_id", None),
            "jsonrpc": "2.0",
        }

    def _sanitize_params(self, params: Any) -> Any:
        """
        Sanitize request parameters to remove sensitive data.

        Args:
            params: Request parameters to sanitize

        Returns:
            Sanitized parameters safe for logging
        """
        if not params:
            return params

        # List of parameter keys that should be masked
        sensitive_keys = {
            "password",
            "secret",
            "token",
            "key",
            "auth",
            "credential",
            "client_secret",
            "private_key",
            "api_key",
        }

        if isinstance(params, dict):
            sanitized = {}
            for key, value in params.items():
                key_lower = key.lower()
                if any(sensitive in key_lower for sensitive in sensitive_keys):
                    sanitized[key] = "***REDACTED***"
                elif isinstance(value, dict | list):
                    sanitized[key] = self._sanitize_params(value)
                else:
                    sanitized[key] = value
            return sanitized
        elif isinstance(params, list):
            return [self._sanitize_params(item) for item in params]
        else:
            return params

    async def _log_audit_trail(self, audit_data: dict[str, Any]) -> None:
        """
        Log audit data to database and/or logger.

        Args:
            audit_data: Dictionary containing audit information
        """
        # Always log to application logger
        log_msg = (
            f"MCP Audit: {audit_data['user_id']} -> {audit_data['method']} "
            f"({audit_data['duration_ms']}ms) "
            f"{'SUCCESS' if audit_data['success'] else 'FAILED'}"
        )

        if audit_data["success"]:
            logger.info(log_msg)
        else:
            logger.warning(
                f"{log_msg} - Error: {audit_data.get('response_error_message')}"
            )

        # Log to database if enabled and database manager available
        if self.log_to_db and self.db_manager:
            try:
                await self._log_to_database(audit_data)
            except Exception as e:
                logger.error(f"Failed to log audit trail to database: {e}")

    async def _log_to_database(self, audit_data: dict[str, Any]) -> None:
        """
        Log audit data to PostgreSQL database.

        Args:
            audit_data: Dictionary containing audit information to log
        """
        # Use the FastMCP-specific audit log table
        query = """
        INSERT INTO fastmcp_audit_log (
            id, user_id, tenant_id, user_roles, method, params, request_id,
            jsonrpc_version, success, duration_ms, error_code, error_message,
            timestamp, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        """

        # Generate UUID for the record
        import uuid

        record_id = str(uuid.uuid4())
        now = audit_data["timestamp"]

        values = (
            record_id,
            audit_data["user_id"],
            audit_data["tenant_id"],
            json.dumps(audit_data["user_roles"]),
            audit_data["method"],
            json.dumps(audit_data["params"]),
            audit_data.get("request_id"),
            audit_data.get("jsonrpc", "2.0"),
            audit_data["success"],
            audit_data["duration_ms"],
            audit_data.get("response_error_code"),
            audit_data.get("response_error_message"),
            now,
            now,  # created_at
            now,  # updated_at
        )

        # Use database manager to execute the query
        await self.db_manager.execute(query, *values)
