"""
Authentication module for MCP Registry Gateway.

This module provides authentication components including Azure OAuth,
user context management, and authentication utilities.
"""

from .azure_oauth_proxy import AzureOAuthProxyManager, create_azure_oauth_proxy
from .context import AuthContext, UserContext
from .utils import (
    check_tenant_access,
    create_auth_context,
    extract_user_context,
    get_user_context_from_context,
    get_user_context_from_token,
    has_required_roles,
    require_authentication,
)


__all__ = [
    "AuthContext",
    "AzureOAuthProxyManager",
    "UserContext",
    "check_tenant_access",
    "create_auth_context",
    "create_azure_oauth_proxy",
    "extract_user_context",
    "get_user_context_from_context",
    "get_user_context_from_token",
    "has_required_roles",
    "require_authentication",
]
