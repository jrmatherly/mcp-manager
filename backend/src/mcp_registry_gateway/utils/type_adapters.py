"""
Type adapters for FastMCP response models with caching for performance.

This module provides cached type adapters for all FastMCP response models,
improving serialization performance through type adapter reuse.
"""

from collections.abc import Callable
from typing import Any, TypeVar

from fastmcp.utilities.types import get_cached_typeadapter

from ..models.responses import (
    ConfigurationResponse,
    HealthCheckResponse,
    ProxyRequestResponse,
    ServerListResponse,
    ServerRegistrationResponse,
)


# Type variable for generic type adapter functions
T = TypeVar("T")

# Cached type adapters for all response models
SERVER_LIST_ADAPTER = get_cached_typeadapter(ServerListResponse)
SERVER_REGISTRATION_ADAPTER = get_cached_typeadapter(ServerRegistrationResponse)
PROXY_REQUEST_ADAPTER = get_cached_typeadapter(ProxyRequestResponse)
HEALTH_CHECK_ADAPTER = get_cached_typeadapter(HealthCheckResponse)
CONFIGURATION_ADAPTER = get_cached_typeadapter(ConfigurationResponse)

# Export mapping for dynamic adapter lookup
RESPONSE_ADAPTERS = {
    ServerListResponse: SERVER_LIST_ADAPTER,
    ServerRegistrationResponse: SERVER_REGISTRATION_ADAPTER,
    ProxyRequestResponse: PROXY_REQUEST_ADAPTER,
    HealthCheckResponse: HEALTH_CHECK_ADAPTER,
    ConfigurationResponse: CONFIGURATION_ADAPTER,
}


def get_response_adapter(response_type: type[T]) -> Callable[..., Any]:
    """
    Get cached type adapter for a response type.

    Args:
        response_type: The response model class

    Returns:
        Cached type adapter for the response type

    Raises:
        KeyError: If response type is not registered
    """
    adapter = RESPONSE_ADAPTERS.get(response_type)
    if adapter is None:
        raise KeyError(f"No cached adapter found for type: {response_type}")
    return adapter


def validate_response(response_type: type[T], data: dict[str, Any]) -> T:
    """
    Validate and convert data to response model using cached adapter.

    Args:
        response_type: The response model class
        data: Dictionary data to validate

    Returns:
        Validated response model instance

    Raises:
        ValidationError: If data is invalid
        KeyError: If response type is not registered
    """
    adapter = get_response_adapter(response_type)
    return adapter.validate_python(data)
