"""
Path-based authentication middleware for unified architecture.

Provides authentication boundaries between:
- REST API endpoints (/api/v1/*) - Unauthenticated
- MCP endpoints (/mcp/*) - Authenticated with Azure OAuth
"""

import logging
from collections.abc import Callable

from fastapi import FastAPI, HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware


# Import auth utilities (placeholder implementation for now)
# from ..auth.utils import verify_azure_oauth_token


logger = logging.getLogger(__name__)


class PathBasedAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware that applies different authentication rules based on request path.

    Authentication Rules:
    - /api/v1/* - No authentication required (REST API)
    - /mcp/* - Azure OAuth authentication required
    - /health, /ready, /metrics, /docs, /redoc, /openapi.json - No authentication
    - /* - Root and other paths - No authentication
    """

    def __init__(
        self,
        app,
        protected_paths: set[str] | None = None,
        public_paths: set[str] | None = None,
        require_auth_for_mcp: bool = True,
    ):
        """
        Initialize path-based authentication middleware.

        Args:
            app: FastAPI application instance
            protected_paths: Set of path prefixes that require authentication
            public_paths: Set of specific paths that are always public
            require_auth_for_mcp: Whether to require auth for /mcp/* paths
        """
        super().__init__(app)

        # Default protected paths
        self.protected_paths = protected_paths or {
            "/mcp/",  # All MCP endpoints require authentication
        }

        # Default public paths (always accessible without authentication)
        self.public_paths = public_paths or {
            "/",
            "/health",
            "/ready",
            "/metrics",
            "/docs",
            "/redoc",
            "/openapi.json",
        }

        # API paths that are public by design
        self.api_prefixes = {
            "/api/v1/",  # REST API is intentionally unauthenticated
        }

        self.require_auth_for_mcp = require_auth_for_mcp

        logger.info("Path-based authentication middleware initialized")
        logger.info(f"Protected paths: {self.protected_paths}")
        logger.info(f"Public paths: {self.public_paths}")
        logger.info(f"Public API prefixes: {self.api_prefixes}")

    def _is_protected_path(self, path: str) -> bool:
        """
        Determine if a path requires authentication.

        Args:
            path: Request path

        Returns:
            bool: True if authentication is required
        """
        # Check exact public paths first
        if path in self.public_paths:
            return False

        # Check if path starts with any public API prefix
        for api_prefix in self.api_prefixes:
            if path.startswith(api_prefix):
                return False

        # Check if path starts with any protected prefix
        for protected_prefix in self.protected_paths:
            if path.startswith(protected_prefix):
                return True

        # Default: paths are public unless explicitly protected
        return False

    def _extract_bearer_token(self, request: Request) -> str | None:
        """
        Extract Bearer token from Authorization header.

        Args:
            request: FastAPI request object

        Returns:
            str | None: Bearer token if present, None otherwise
        """
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None

        if not auth_header.startswith("Bearer "):
            return None

        return auth_header[7:]  # Remove "Bearer " prefix

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request with path-based authentication.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware in chain

        Returns:
            Response: HTTP response
        """
        path = request.url.path

        # Check if this path requires authentication
        if not self._is_protected_path(path):
            logger.debug(f"Public path accessed: {path}")
            return await call_next(request)

        # Path requires authentication
        logger.debug(f"Protected path accessed: {path}")

        if not self.require_auth_for_mcp:
            logger.debug("Authentication disabled for MCP paths")
            return await call_next(request)

        # Extract and validate Bearer token
        token = self._extract_bearer_token(request)
        if not token:
            logger.warning(f"Missing authentication token for protected path: {path}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required for this endpoint",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Validate Bearer token (placeholder implementation)
        # For now, we'll do basic token format validation
        # In production, this would validate against Azure OAuth
        try:
            # Basic token format validation
            if len(token) < 10:
                raise ValueError("Token too short")

            # Mock user info extraction (replace with real Azure OAuth validation)
            user_info = {
                "sub": f"user_{token[:8]}",  # Mock user ID from token
                "tid": "default_tenant",  # Mock tenant ID
                "email": "user@example.com",  # Mock email
                "roles": ["user"],  # Mock roles
                "preferred_username": f"user_{token[:8]}",
            }

            logger.info(
                f"Authenticated user {user_info.get('sub', 'unknown')} accessing {path}"
            )
            logger.debug("Mock authentication - token: %s...", token[:10])

            # Add user info to request state for downstream use
            request.state.user_info = user_info
            request.state.authenticated = True

        except Exception as e:
            logger.warning(f"Invalid authentication token for path {path}: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e

        # Proceed with authenticated request
        return await call_next(request)


def add_path_based_auth_middleware(
    app: FastAPI,
    enable_auth: bool = True,
    protected_paths: set[str] | None = None,
    public_paths: set[str] | None = None,
) -> None:
    """
    Add path-based authentication middleware to FastAPI app.

    Args:
        app: FastAPI application instance
        enable_auth: Whether to enable authentication checks
        protected_paths: Custom set of protected path prefixes
        public_paths: Custom set of public paths
    """
    if enable_auth:
        app.add_middleware(
            PathBasedAuthMiddleware,
            protected_paths=protected_paths or {"/mcp/"},
            public_paths=public_paths
            or {
                "/",
                "/health",
                "/ready",
                "/metrics",
                "/docs",
                "/redoc",
                "/openapi.json",
            },
            require_auth_for_mcp=True,
        )
        logger.info("Path-based authentication middleware added")
        logger.info(f"Protected paths: {protected_paths or {'/mcp/'}}")
    else:
        logger.info("Path-based authentication disabled")
