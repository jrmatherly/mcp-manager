"""
Azure OAuth Proxy implementation for FastMCP server.

Provides the corrected OAuth Proxy pattern for Azure AD integration,
addressing the fundamental issue that Azure AD does not support
Dynamic Client Registration (DCR).
"""

import logging
import os

from fastmcp.server.auth import OAuthProxy
from fastmcp.server.auth.providers.jwt import JWTVerifier

from ..core.config import FastMCPSettings


logger = logging.getLogger(__name__)


class AzureOAuthProxyManager:
    """Manager for Azure OAuth Proxy configuration using corrected architecture."""

    def __init__(self, settings: FastMCPSettings | None = None):
        """Initialize Azure OAuth Proxy manager."""
        self.settings = settings

        # Load configuration from environment if settings not provided
        if not settings:
            self.tenant_id = os.getenv("MREG_AZURE_TENANT_ID")
            self.client_id = os.getenv("MREG_AZURE_CLIENT_ID")
            self.client_secret = os.getenv("MREG_AZURE_CLIENT_SECRET")
            self.base_url = os.getenv("MREG_FASTMCP_BASE_URL", "http://localhost:8001")
            self.oauth_scopes = ["User.Read", "email", "openid", "profile"]
        else:
            self.tenant_id = settings.azure_tenant_id
            self.client_id = settings.azure_client_id
            self.client_secret = (
                settings.azure_client_secret.get_secret_value()
                if settings.azure_client_secret
                else None
            )
            self.base_url = (
                settings.oauth_callback_url.replace("/oauth/callback", "")
                if settings.oauth_callback_url
                else "http://localhost:8001"
            )
            self.oauth_scopes = settings.oauth_scopes

        if not all([self.tenant_id, self.client_id, self.client_secret]):
            raise ValueError(
                "Missing required Azure OAuth configuration. Required: "
                "MREG_AZURE_TENANT_ID, MREG_AZURE_CLIENT_ID, MREG_AZURE_CLIENT_SECRET"
            )

    def has_credentials(self) -> bool:
        """Check if Azure OAuth credentials are configured."""
        return all([self.tenant_id, self.client_id, self.client_secret])

    def create_oauth_proxy(self) -> OAuthProxy:
        """Create properly configured OAuth Proxy for Azure AD."""

        logger.info("Creating Azure OAuth Proxy with corrected architecture")

        # JWT Verifier for Azure tokens
        jwt_verifier = JWTVerifier(
            jwks_uri=f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys",
            issuer=f"https://login.microsoftonline.com/{self.tenant_id}/v2.0",
            audience=self.client_id,
            algorithm="RS256",
            required_scopes=self.oauth_scopes,
        )

        # OAuth Proxy configuration for Azure (non-DCR provider)
        oauth_proxy = OAuthProxy(
            # Azure OAuth endpoints (tenant-specific)
            upstream_authorization_endpoint=f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/authorize",
            upstream_token_endpoint=f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token",
            # Your registered Azure App credentials
            upstream_client_id=self.client_id,
            upstream_client_secret=self.client_secret,
            # Token validation
            token_verifier=jwt_verifier,
            # FastMCP server's public URL
            base_url=self.base_url,
            # Azure-specific configuration
            forward_pkce=True,  # Azure supports PKCE
            token_endpoint_auth_method="client_secret_post",  # Azure requirement
            # Custom callback path (optional)
            redirect_path="/auth/callback",
        )

        logger.info("Azure OAuth Proxy created successfully")
        return oauth_proxy


def create_azure_oauth_proxy(
    fastmcp_settings: FastMCPSettings | None = None,
) -> OAuthProxy:
    """
    Factory function to create Azure OAuth Proxy using corrected architecture.

    Args:
        fastmcp_settings: Optional FastMCP settings. If not provided, will read from environment.

    Returns:
        Configured OAuth Proxy for Azure AD integration

    Raises:
        ValueError: If required Azure configuration is missing
    """
    manager = AzureOAuthProxyManager(fastmcp_settings)
    return manager.create_oauth_proxy()
