"""
Core exceptions for MCP Registry Gateway.

Provides a hierarchy of exceptions for different error categories with
proper error codes and context information.
"""

from typing import Any


class MCPGatewayError(Exception):
    """
    Base exception for all MCP Gateway errors.

    Provides common error handling functionality including error codes,
    context information, and structured error responses.
    """

    def __init__(
        self,
        message: str,
        error_code: str | None = None,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code or self.__class__.__name__.upper()
        self.context = context or {}
        self.cause = cause

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error": self.error_code,
            "message": self.message,
            "context": self.context,
            "type": self.__class__.__name__,
        }

    def __str__(self) -> str:
        """String representation including context."""
        base_str = f"{self.error_code}: {self.message}"
        if self.context:
            context_str = ", ".join(f"{k}={v}" for k, v in self.context.items())
            base_str += f" ({context_str})"
        return base_str


class ConfigurationError(MCPGatewayError):
    """Raised when there are configuration issues."""

    def __init__(
        self,
        message: str,
        config_key: str | None = None,
        **kwargs: Any,
    ):
        context = {"config_key": config_key} if config_key else {}
        context.update(kwargs.get("context", {}))
        super().__init__(message, error_code="CONFIGURATION_ERROR", context=context)


class RegistryError(MCPGatewayError):
    """Base exception for registry-related errors."""

    pass


class ServerRegistrationError(RegistryError):
    """Raised when MCP server registration fails."""

    def __init__(
        self,
        message: str,
        server_name: str | None = None,
        endpoint_url: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "server_name": server_name,
            "endpoint_url": endpoint_url,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="SERVER_REGISTRATION_ERROR", context=context, **kwargs
        )


class ServerNotFoundError(RegistryError):
    """Raised when requested MCP server is not found."""

    def __init__(
        self,
        message: str,
        server_id: str | None = None,
        server_name: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "server_id": server_id,
            "server_name": server_name,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="SERVER_NOT_FOUND", context=context, **kwargs
        )


class ServerHealthCheckError(RegistryError):
    """Raised when server health check fails."""

    def __init__(
        self,
        message: str,
        server_id: str | None = None,
        health_status: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "server_id": server_id,
            "health_status": health_status,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="SERVER_HEALTH_CHECK_ERROR", context=context, **kwargs
        )


class RoutingError(MCPGatewayError):
    """Base exception for routing-related errors."""

    pass


class NoCompatibleServerError(RoutingError):
    """Raised when no compatible server is found for a request."""

    def __init__(
        self,
        message: str,
        required_tools: list | None = None,
        required_resources: list | None = None,
        tenant_id: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "required_tools": required_tools,
            "required_resources": required_resources,
            "tenant_id": tenant_id,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="NO_COMPATIBLE_SERVER", context=context, **kwargs
        )


class ServerUnavailableError(RoutingError):
    """Raised when selected server is temporarily unavailable."""

    def __init__(
        self,
        message: str,
        server_id: str | None = None,
        last_error: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "server_id": server_id,
            "last_error": last_error,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="SERVER_UNAVAILABLE", context=context, **kwargs
        )


class CircuitBreakerOpenError(RoutingError):
    """Raised when circuit breaker is open for a server."""

    def __init__(
        self,
        message: str,
        server_id: str | None = None,
        failure_count: int | None = None,
        **kwargs: Any,
    ):
        context = {
            "server_id": server_id,
            "failure_count": failure_count,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="CIRCUIT_BREAKER_OPEN", context=context, **kwargs
        )


class AuthenticationError(MCPGatewayError):
    """Base exception for authentication-related errors."""

    pass


class InvalidTokenError(AuthenticationError):
    """Raised when JWT token is invalid or expired."""

    def __init__(
        self,
        message: str,
        token_type: str | None = None,
        expiry_time: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "token_type": token_type,
            "expiry_time": expiry_time,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(message, error_code="INVALID_TOKEN", context=context, **kwargs)


class AuthenticationProviderError(AuthenticationError):
    """Raised when authentication provider fails."""

    def __init__(
        self,
        message: str,
        provider: str | None = None,
        provider_error: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "provider": provider,
            "provider_error": provider_error,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message,
            error_code="AUTHENTICATION_PROVIDER_ERROR",
            context=context,
            **kwargs,
        )


class AuthorizationError(MCPGatewayError):
    """Base exception for authorization-related errors."""

    pass


class InsufficientPermissionsError(AuthorizationError):
    """Raised when user lacks required permissions."""

    def __init__(
        self,
        message: str,
        required_permission: str | None = None,
        user_permissions: list | None = None,
        resource: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "required_permission": required_permission,
            "user_permissions": user_permissions,
            "resource": resource,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="INSUFFICIENT_PERMISSIONS", context=context, **kwargs
        )


class TenantAccessDeniedError(AuthorizationError):
    """Raised when user is denied access to tenant resources."""

    def __init__(
        self,
        message: str,
        tenant_id: str | None = None,
        user_id: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "tenant_id": tenant_id,
            "user_id": user_id,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="TENANT_ACCESS_DENIED", context=context, **kwargs
        )


class RateLimitExceededError(AuthorizationError):
    """Raised when rate limit is exceeded."""

    def __init__(
        self,
        message: str,
        limit: int | None = None,
        window_seconds: int | None = None,
        retry_after: int | None = None,
        **kwargs: Any,
    ):
        context = {
            "limit": limit,
            "window_seconds": window_seconds,
            "retry_after": retry_after,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="RATE_LIMIT_EXCEEDED", context=context, **kwargs
        )


class RateLimitError(AuthorizationError):
    """
    Advanced rate limiting error with enhanced context.

    Provides comprehensive rate limiting information including
    per-tenant fairness details, DDoS protection status, and
    structured retry guidance.
    """

    def __init__(
        self,
        message: str,
        limit_type: str | None = None,
        user_id: str | None = None,
        tenant_id: str | None = None,
        client_ip: str | None = None,
        limit: int | None = None,
        window_seconds: int | None = None,
        retry_after: int | None = None,
        bucket_info: dict[str, Any] | None = None,
        **kwargs: Any,
    ):
        context = {
            "limit_type": limit_type,  # user, tenant, ip, global, ddos_protection
            "user_id": user_id,
            "tenant_id": tenant_id,
            "client_ip": client_ip,
            "limit": limit,
            "window_seconds": window_seconds,
            "retry_after": retry_after,
            "bucket_info": bucket_info,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="ADVANCED_RATE_LIMIT_ERROR", context=context, **kwargs
        )

        # Store retry_after as a property for easy access
        self.retry_after = retry_after


class ConnectionError(MCPGatewayError):
    """Base exception for connection-related errors."""

    pass


class DatabaseConnectionError(ConnectionError):
    """Raised when database connection fails."""

    def __init__(
        self,
        message: str,
        database_type: str | None = None,
        host: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "database_type": database_type,
            "host": host,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="DATABASE_CONNECTION_ERROR", context=context, **kwargs
        )


class RedisConnectionError(ConnectionError):
    """Raised when Redis connection fails."""

    def __init__(
        self,
        message: str,
        host: str | None = None,
        port: int | None = None,
        **kwargs: Any,
    ):
        context = {
            "host": host,
            "port": port,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="REDIS_CONNECTION_ERROR", context=context, **kwargs
        )


class MCPServerConnectionError(ConnectionError):
    """Raised when connection to MCP server fails."""

    def __init__(
        self,
        message: str,
        server_id: str | None = None,
        endpoint_url: str | None = None,
        transport_type: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "server_id": server_id,
            "endpoint_url": endpoint_url,
            "transport_type": transport_type,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="MCP_SERVER_CONNECTION_ERROR", context=context, **kwargs
        )


class ValidationError(MCPGatewayError):
    """Raised when request validation fails."""

    def __init__(
        self,
        message: str,
        field: str | None = None,
        invalid_value: Any = None,
        **kwargs: Any,
    ):
        context = {
            "field": field,
            "invalid_value": str(invalid_value) if invalid_value is not None else None,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="VALIDATION_ERROR", context=context, **kwargs
        )


class TimeoutError(MCPGatewayError):
    """Raised when operations timeout."""

    def __init__(
        self,
        message: str,
        timeout_seconds: float | None = None,
        operation: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "timeout_seconds": timeout_seconds,
            "operation": operation,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(message, error_code="TIMEOUT_ERROR", context=context, **kwargs)


class ProxyError(MCPGatewayError):
    """Raised when MCP request proxying fails."""

    def __init__(
        self,
        message: str,
        request_id: str | None = None,
        method: str | None = None,
        server_id: str | None = None,
        transport_type: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "request_id": request_id,
            "method": method,
            "server_id": server_id,
            "transport_type": transport_type,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(message, error_code="PROXY_ERROR", context=context, **kwargs)


# FastMCP-specific exceptions
# These exceptions provide compatibility with FastMCP framework error types
# while maintaining consistency with our internal exception hierarchy


class FastMCPToolError(MCPGatewayError):
    """
    FastMCP-compatible tool error for tool execution failures.

    This exception is compatible with fastmcp.exceptions.ToolError while
    maintaining our internal error structure for consistent logging and handling.
    """

    def __init__(
        self,
        message: str,
        tool_name: str | None = None,
        tool_arguments: dict[str, Any] | None = None,
        **kwargs: Any,
    ):
        context = {
            "tool_name": tool_name,
            "tool_arguments": tool_arguments,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="FASTMCP_TOOL_ERROR", context=context, **kwargs
        )


class FastMCPResourceError(MCPGatewayError):
    """
    FastMCP-compatible resource error for resource access failures.

    This exception is compatible with fastmcp.exceptions.ResourceError while
    maintaining our internal error structure.
    """

    def __init__(
        self,
        message: str,
        resource_uri: str | None = None,
        resource_type: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "resource_uri": resource_uri,
            "resource_type": resource_type,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="FASTMCP_RESOURCE_ERROR", context=context, **kwargs
        )


class FastMCPAuthenticationError(AuthenticationError):
    """
    FastMCP-compatible authentication error.

    This exception provides compatibility with FastMCP authentication patterns
    while maintaining our structured error approach.
    """

    def __init__(
        self,
        message: str,
        auth_method: str | None = None,
        token_type: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "auth_method": auth_method,
            "token_type": token_type,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(message, context=context, **kwargs)
        self.error_code = "FASTMCP_AUTHENTICATION_ERROR"


class FastMCPAuthorizationError(AuthorizationError):
    """
    FastMCP-compatible authorization error.

    This exception provides compatibility with FastMCP authorization patterns
    for role-based access control failures.
    """

    def __init__(
        self,
        message: str,
        required_roles: list[str] | None = None,
        user_roles: list[str] | None = None,
        operation: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "required_roles": required_roles,
            "user_roles": user_roles,
            "operation": operation,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(message, context=context, **kwargs)
        self.error_code = "FASTMCP_AUTHORIZATION_ERROR"


class FastMCPMiddlewareError(MCPGatewayError):
    """
    FastMCP middleware execution error.

    Raised when middleware operations fail during request processing.
    """

    def __init__(
        self,
        message: str,
        middleware_name: str | None = None,
        operation: str | None = None,
        **kwargs: Any,
    ):
        context = {
            "middleware_name": middleware_name,
            "operation": operation,
        }
        context.update(kwargs.get("context", {}))
        super().__init__(
            message, error_code="FASTMCP_MIDDLEWARE_ERROR", context=context, **kwargs
        )
