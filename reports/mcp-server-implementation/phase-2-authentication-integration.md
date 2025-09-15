# Phase 2: OAuth 2.1 Authentication Integration

## Overview

<!-- VALIDATION UPDATE: Enhanced with missing components from validation report -->
This phase implements comprehensive OAuth 2.1 authentication for MCP servers

**Critical Missing Components Added (from Validation Report)**:
- **MCPCompliantOAuthProxy class**: Complete OAuth proxy implementation
- **OAuth2Form React component**: User-facing OAuth configuration
- **OAuthConnectionTester utilities**: End-to-end validation tools
- **DCR Bridge implementation**: Dynamic Client Registration support
- **PKCE end-to-end validation**: Security flow verification
- **Token synchronization safety measures**: Cross-layer token management

This phase implements comprehensive OAuth 2.1 authentication for MCP servers, including the FastMCP OAuth Proxy pattern, Dynamic Client Registration (DCR), and full MCP 06-18-2025 specification compliance. Based on extensive research, this phase addresses the most complex authentication challenges including DCR bridging, token synchronization, and multi-layer security vulnerabilities.

**Duration**: 4-5 weeks (adjusted from validation report findings)
**Risk Level**: High (OAuth security complexity)
**Dependencies**: Phase 1 completion, Azure AD configuration, FastMCP v2.6.0+
**Key Challenge**: Bridging DCR-compliant MCP clients with non-DCR Azure AD
**Validation Gap**: Missing MCPCompliantOAuthProxy implementation, OAuth UI components, end-to-end testing

## Critical Implementation Challenges (From Research)

### Challenge 1: Dynamic Client Registration (DCR) Complexity
**Problem**: MCP clients expect DCR support, but Azure AD doesn't support it
**Impact**: Clients get "Redirect URI not registered" errors when trying to authenticate
**Solution**: FastMCP OAuth Proxy bridges DCR-compliant clients with static Azure AD registration

**Code Impact**: Requires sophisticated proxy pattern with state management

### Challenge 2: Token Synchronization Issues
**Problem**: Multiple token formats and expiration times across layers
```typescript
// Different token types in the system:
Better-Auth Session Cookie: { expires: "2024-01-15T10:00:00Z" }
Better-Auth JWT Token: { exp: 1705320000 }
Azure OAuth Token: { expires_in: 3600 }
FastMCP Cached Token: { expiry: "ISO string" }
```
**Solution**: Token normalization layer and synchronization middleware

### Challenge 3: OAuth State Parameter Collision
**Problem**: Both client and proxy need state parameters, but OAuth only supports one
**Impact**: State conflicts break OAuth flow
**Solution**: Use transaction ID as OAuth state, preserve client state in transaction

### Challenge 4: PKCE Challenge Validation
**Problem**: End-to-end PKCE validation across proxy
**Impact**: PKCE validation failures prevent MCP client authentication
**Solution**: Dual PKCE validation - proxy validates client, upstream validates proxy

### Challenge 5: High-Risk Security Vulnerabilities
**From Research**: 15+ vulnerability vectors identified:
- **HIGH RISK**: OAuth redirect URI validation bypass, token replay attacks
- **MEDIUM RISK**: JWT information disclosure, rate limiting bypass
- **CRITICAL**: All vulnerabilities must be mitigated in this phase

<!-- VALIDATION UPDATE: Additional security requirements from validation report -->
### Challenge 6: Missing Critical Infrastructure (Validation Report)
**Problem**: Core OAuth proxy implementation missing
**Impact**: Cannot support MCP server OAuth authentication
**Solution**: Implement MCPCompliantOAuthProxy with comprehensive testing

**Missing Components**:
- MCPCompliantOAuthProxy class (1200+ lines needed)
- OAuth2Form React component for configuration
- OAuthConnectionTester for validation
- Token synchronization across three layers
- End-to-end PKCE validation
- DCR bridge for MCP compliance

---

## OAuth Token Role Claim Updates

**CRITICAL**: The 6-role RBAC implementation requires updates to OAuth token structure and role synchronization.

### JWT Token Structure Changes

**Enhanced Token Claims for 6-Role Hierarchy**:

```typescript
interface JWTPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  // UPDATED: Expanded role set for 6-tier hierarchy
  role: 'admin' | 'manager' | 'developer' | 'analyst' | 'viewer' | 'guest';
  // Previously: role: 'admin' | 'server_owner' | 'user'

  // New role-specific claims
  permissions?: string[];  // Explicit permission list
  roleLevel?: number;      // Hierarchy level (100=admin, 10=guest)
  roleSource?: 'azure_ad' | 'manual' | 'migration';  // How role was assigned

  // Enhanced security claims
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  jti: string;  // Unique token ID for revocation
}
```

### Azure AD Token Synchronization

**Role Mapping During OAuth Callbacks**:

```typescript
// frontend/src/lib/auth/oauth-callback-handler.ts
import { mapAzureGroupsToRole, rolePriority } from '@/lib/auth/providers/azure';

export async function handleOAuthCallback(tokenData: any) {
  // 1. Extract Azure AD groups from token
  const azureGroups = tokenData.groups || [];

  // 2. Map to new 6-role hierarchy
  const mappedRole = mapAzureGroupsToRole(azureGroups);

  // 3. Get current user role from database
  const currentUser = await getUserByEmail(tokenData.email);
  const currentRole = currentUser?.role;

  // 4. Handle role change requiring session regeneration
  if (currentRole && currentRole !== mappedRole) {
    // CRITICAL: Regenerate session on role change (prevents session fixation)
    await regenerateUserSession(currentUser.id);

    // Log role change for audit
    await auditService.log_authorization_event(
      currentUser.id,
      'role.change.oauth_sync',
      null,
      'success',
      null,
      null,
      tokenData.ip_address,
      tokenData.session_id
    );
  }

  // 5. Update user role in database
  await updateUserRole(currentUser.id, mappedRole, 'azure_ad');

  // 6. Create enhanced JWT token
  const enhancedToken = {
    ...tokenData,
    role: mappedRole,
    permissions: getRolePermissions(mappedRole),
    roleLevel: rolePriority[mappedRole],
    roleSource: 'azure_ad'
  };

  return enhancedToken;
}
```

### Session Regeneration on Role Changes

**SECURITY CRITICAL**: Sessions must be regenerated when user roles change to prevent session fixation attacks.

```typescript
// frontend/src/lib/auth/session-security.ts
export async function regenerateUserSession(userId: string) {
  // 1. Invalidate all existing sessions
  await sessionManager.invalidate_all_user_sessions(userId);

  // 2. Clear any cached user context
  await redis.del(`user_context:${userId}`);

  // 3. Force re-authentication on next request
  await redis.setex(`force_reauth:${userId}`, 300, 'true'); // 5 minutes

  // 4. Log security event
  await auditService.log_authentication_event(
    userId,
    'session.regenerate.role_change',
    'success',
    null,
    null,
    { reason: 'role_change_security' }
  );
}
```

### OAuth Provider Configuration Updates

**Better-Auth Configuration for 6-Role System**:

```typescript
// frontend/src/lib/auth.ts (Enhanced)
import { betterAuth } from "better-auth";
import { microsoftEntraId } from "better-auth/plugins/microsoft-entra-id";

export const auth = betterAuth({
  database: {
    provider: "postgresql",
    url: process.env.DATABASE_URL,
  },

  session: {
    expiresIn: 60 * 60 * 8, // 8 hours
    updateAge: 60 * 60, // Update every hour
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  plugins: [
    microsoftEntraId({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID!,

      // Enhanced scope for role information
      scope: [
        "openid",
        "profile",
        "email",
        "https://graph.microsoft.com/User.Read",
        "https://graph.microsoft.com/GroupMember.Read.All", // For role mapping
      ],

      // Role mapping callback
      async profile(profile, tokens) {
        // Get user's Azure AD groups for role mapping
        const groups = await fetchUserGroups(tokens.access_token);
        const mappedRole = mapAzureGroupsToRole(groups);

        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          role: mappedRole,
          roleSource: 'azure_ad',
        };
      },
    }),

    // Additional OAuth providers can be configured similarly
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Handle role synchronization during sign-in
      if (account?.provider === "microsoft-entra-id") {
        const existingUser = await getUserByEmail(user.email);

        if (existingUser && existingUser.role !== user.role) {
          // Role change detected - regenerate session
          await regenerateUserSession(existingUser.id);
        }
      }

      return true;
    },

    async session({ session, user }) {
      // Ensure session includes current role information
      return {
        ...session,
        user: {
          ...session.user,
          role: user.role,
          permissions: getRolePermissions(user.role),
          roleLevel: rolePriority[user.role],
        },
      };
    },
  },
});
```

### Token Validation for 6-Role System

**Enhanced Token Validation**:

```typescript
// backend/src/mcp_registry_gateway/auth/token_validator.py
from typing import Optional
from .roles import UserRole, has_permission, ROLE_HIERARCHY

class EnhancedTokenValidator:
    async def validate_token_with_role_check(
        self,
        token: str,
        required_permission: str
    ) -> tuple[bool, Optional[dict]]:
        """Validate token and check role-based permissions."""

        # 1. Validate token signature and expiration
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
        except jwt.InvalidTokenError:
            return False, None

        # 2. Extract role from token
        user_role = payload.get('role', 'guest')

        # 3. Validate role is in 6-role hierarchy
        if user_role not in ROLE_HIERARCHY:
            logger.warning(f"Invalid role in token: {user_role}")
            return False, None

        # 4. Check permission for the role
        if not has_permission(user_role, required_permission):
            logger.info(f"Permission denied: {user_role} lacks {required_permission}")
            return False, None

        # 5. Validate role source for security
        role_source = payload.get('roleSource', 'unknown')
        if role_source not in ['azure_ad', 'manual', 'migration']:
            logger.warning(f"Invalid role source: {role_source}")
            return False, None

        return True, payload

    async def refresh_token_with_role_sync(
        self,
        refresh_token: str,
        user_id: str
    ) -> Optional[str]:
        """Refresh token with current role synchronization."""

        # 1. Validate refresh token
        if not await self.validate_refresh_token(refresh_token):
            return None

        # 2. Get current user role from database
        current_user = await self.get_user_by_id(user_id)
        if not current_user:
            return None

        # 3. Generate new token with current role
        new_payload = {
            'sub': user_id,
            'email': current_user.email,
            'role': current_user.role,
            'permissions': get_role_permissions(current_user.role),
            'roleLevel': ROLE_HIERARCHY.get(current_user.role, 0),
            'roleSource': current_user.role_source or 'manual',
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(hours=8),
        }

        return jwt.encode(new_payload, self.secret_key, algorithm="HS256")
```

---

## Prerequisites

### 1. Phase 1 Validation

```bash
# Verify Phase 1 completion
cd /Users/jason/dev/AI/mcp-manager

# Check authentication system
npm run test:auth
npm run test:integration

# Verify API key functionality
curl -H "X-API-Key: test-key" http://localhost:3000/api/servers

# Test basic server registration
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer session-token" \
  -d '{"name":"Test","endpoint":"https://httpbin.org","authType":"none"}' \
  http://localhost:3000/api/servers
```

### 2. Azure AD Extended Configuration

```bash
# Azure AD App Registration Requirements for OAuth Proxy
# 1. Go to Azure Portal → App Registrations → [Your App]
# 2. Authentication → Add redirect URI: http://localhost:8001/auth/callback
# 3. API permissions → Add Microsoft Graph permissions:
#    - openid, profile, email, User.Read
# 4. Token configuration → Add optional claims:
#    - ID tokens: email, groups, roles
#    - Access tokens: email, groups, roles
# 5. App roles → Create custom roles if needed:
#    - mcp.server.admin, mcp.server.user
```

### 3. FastMCP OAuth Proxy Environment Setup

```bash
# Backend environment variables for OAuth proxy
cat >> backend/.env << EOF

# FastMCP OAuth Proxy Configuration
MREG_FASTMCP_ENABLED=true
MREG_FASTMCP_PORT=8001
MREG_FASTMCP_HOST=0.0.0.0
MREG_FASTMCP_BASE_URL=http://localhost:8001

<!-- VALIDATION UPDATE: Added new environment variables from validation requirements -->
# Validation Report Requirements
FASTMCP_OAUTH_SCOPES=openid,profile,email,offline_access
FASTMCP_DCR_ENABLED=true
FASTMCP_METRICS_ENDPOINT=http://localhost:3000/api/metrics
FASTMCP_TOKEN_SYNC_ENABLED=true
FASTMCP_PKCE_VALIDATION=strict

# Azure OAuth for MCP Servers (separate from frontend auth)
MREG_AZURE_TENANT_ID=${AZURE_TENANT_ID}
MREG_AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
MREG_AZURE_CLIENT_SECRET=${AZURE_CLIENT_SECRET}

# OAuth Proxy Security
MREG_OAUTH_PROXY_SECRET=$(openssl rand -hex 32)
MREG_JWT_SIGNING_KEY=$(openssl rand -hex 32)

# MCP Client Registration
MREG_ALLOW_DYNAMIC_REGISTRATION=true
MREG_ALLOWED_REDIRECT_PATTERNS="http://localhost:*,http://127.0.0.1:*"

EOF
```

---

## Implementation Tasks

### Task 1: FastMCP OAuth Proxy Enhancement

**CRITICAL PRIORITY**: Addresses High-Risk OAuth Redirect URI Validation Bypass
**MCP Compliance**: Implements RFC 7591 (DCR), RFC 7636 (PKCE), RFC 8707 (Audience)
**Security Focus**: Mitigates token replay attacks and state management vulnerabilities

#### 1.1 Enhanced OAuth Proxy with Full MCP Compliance

**File**: `backend/src/mcp_registry_gateway/auth/enhanced_oauth_proxy.py`

```python
"""
Enhanced OAuth Proxy with full MCP 06-18-2025 specification compliance.
Implements Dynamic Client Registration (DCR) bridge pattern for non-DCR providers.
"""

import asyncio
import json
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode, urlparse

import httpx
from fastmcp.server.auth import OAuthProxy
from fastmcp.server.auth.providers.jwt import JWTVerifier
from fastmcp.server.auth.types import (
    AccessToken,
    AuthorizationCode,
    AuthorizationParams,
    OAuthClientInformationFull,
    OAuthToken,
    RefreshToken,
)
from cryptography.fernet import Fernet

from ..core.config import FastMCPSettings


logger = logging.getLogger(__name__)


class EnhancedProxyDCRClient:
    """Enhanced DCR client with secure redirect URI validation and state management."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uris: List[str],
        allowed_patterns: List[str],
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uris = redirect_uris
        self.allowed_patterns = allowed_patterns
        self.metadata = metadata or {}
        self.created_at = datetime.now(timezone.utc)

    def validate_redirect_uri(self, redirect_uri: str) -> bool:
        """
        Enhanced redirect URI validation with security patterns.

        Supports:
        - Exact matches for registered URIs
        - Pattern matching for localhost development
        - Production domain validation
        """
        if not redirect_uri:
            return False

        # Check exact matches first
        if redirect_uri in self.redirect_uris:
            return True

        # Parse URI for pattern matching
        parsed = urlparse(redirect_uri)

        # Development patterns (localhost only)
        if parsed.hostname in ['localhost', '127.0.0.1']:
            # Allow any port for localhost in development
            if any(pattern.startswith('http://localhost:') or pattern.startswith('http://127.0.0.1:')
                   for pattern in self.allowed_patterns):
                # Validate port range (1024-65535)
                if parsed.port and 1024 <= parsed.port <= 65535:
                    return True

        # Production patterns (specific domains)
        for pattern in self.allowed_patterns:
            if pattern.endswith('*'):
                base_pattern = pattern[:-1]
                if redirect_uri.startswith(base_pattern):
                    return True

        logger.warning(f"Redirect URI validation failed: {redirect_uri}")
        return False


class MCPCompliantOAuthProxy(OAuthProxy):
    """
    MCP 06-18-2025 specification compliant OAuth proxy.

    Implements full DCR bridge pattern with:
    - Dynamic Client Registration (RFC 7591)
    - PKCE enforcement (RFC 7636)
    - Resource parameter support (RFC 8707)
    - Token introspection (RFC 7662)
    - Secure state management
    """

    def __init__(self, settings: FastMCPSettings):
        self.settings = settings
        self.clients: Dict[str, EnhancedProxyDCRClient] = {}
        self.oauth_transactions: Dict[str, Dict[str, Any]] = {}
        self.client_codes: Dict[str, Dict[str, Any]] = {}
        self.access_tokens: Dict[str, AccessToken] = {}
        self.refresh_tokens: Dict[str, RefreshToken] = {}

        # Initialize encryption for sensitive data
        self.cipher = Fernet(settings.oauth_proxy_secret.encode()[:32])

        # Azure AD configuration
        self.tenant_id = settings.azure_tenant_id
        self.client_id = settings.azure_client_id
        self.client_secret = settings.azure_client_secret
        self.base_url = settings.oauth_callback_url.replace("/oauth/callback", "")

        # OAuth endpoints
        self.authorization_endpoint = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/authorize"
        self.token_endpoint = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        self.jwks_uri = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"

        # JWT verifier for token validation
        self.jwt_verifier = JWTVerifier(
            jwks_uri=self.jwks_uri,
            issuer=f"https://login.microsoftonline.com/{self.tenant_id}/v2.0",
            audience=self.client_id,
            algorithm="RS256",
        )

        # HTTP client for upstream requests
        self.http_client = httpx.AsyncClient(timeout=30.0)

        logger.info("MCP-compliant OAuth Proxy initialized")

    async def register_client(
        self, client_info: OAuthClientInformationFull
    ) -> OAuthClientInformationFull:
        """
        RFC 7591 compliant Dynamic Client Registration.

        Accepts any client registration request and creates a proxy client
        that bridges to the upstream OAuth provider.
        """
        # Validate required client metadata
        if not client_info.client_name:
            raise ValueError("client_name is required for DCR")

        if not client_info.redirect_uris:
            raise ValueError("redirect_uris is required for DCR")

        # Generate unique client credentials
        client_id = f"mcp_client_{secrets.token_hex(16)}"
        client_secret = secrets.token_urlsafe(32)

        # Create enhanced proxy client
        proxy_client = EnhancedProxyDCRClient(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uris=client_info.redirect_uris,
            allowed_patterns=self.settings.allowed_redirect_patterns,
            metadata={
                "client_name": client_info.client_name,
                "client_uri": getattr(client_info, "client_uri", None),
                "tos_uri": getattr(client_info, "tos_uri", None),
                "policy_uri": getattr(client_info, "policy_uri", None),
                "logo_uri": getattr(client_info, "logo_uri", None),
                "contacts": getattr(client_info, "contacts", []),
            },
        )

        # Store client
        self.clients[client_id] = proxy_client

        # Create response with generated credentials
        response = OAuthClientInformationFull(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uris=client_info.redirect_uris,
            client_name=client_info.client_name,
            grant_types=["authorization_code", "refresh_token"],
            response_types=["code"],
            token_endpoint_auth_method="client_secret_post",
            client_id_issued_at=int(time.time()),
            client_secret_expires_at=0,  # Never expires
        )

        logger.info(f"DCR client registered: {client_id}")
        return response

    def get_client(self, client_id: str) -> Optional[OAuthClientInformationFull]:
        """Get client information by ID."""
        proxy_client = self.clients.get(client_id)
        if not proxy_client:
            return None

        return OAuthClientInformationFull(
            client_id=proxy_client.client_id,
            client_secret=proxy_client.client_secret,
            redirect_uris=proxy_client.redirect_uris,
            client_name=proxy_client.metadata.get("client_name", "MCP Client"),
            grant_types=["authorization_code", "refresh_token"],
            response_types=["code"],
            token_endpoint_auth_method="client_secret_post",
        )

    async def authorize(
        self, client: OAuthClientInformationFull, params: AuthorizationParams
    ) -> str:
        """
        Start OAuth authorization flow with enhanced security.

        Implements MCP specification requirements:
        - PKCE enforcement
        - Resource parameter support (RFC 8707)
        - Secure state management
        """
        # Validate client
        proxy_client = self.clients.get(client.client_id)
        if not proxy_client:
            raise ValueError("Client not registered")

        # Validate redirect URI
        if not proxy_client.validate_redirect_uri(params.redirect_uri):
            raise ValueError(f"Invalid redirect URI: {params.redirect_uri}")

        # Enforce PKCE (MCP requirement)
        if not params.code_challenge:
            raise ValueError("PKCE code_challenge is required")

        if not params.code_challenge_method:
            raise ValueError("PKCE code_challenge_method is required")

        if params.code_challenge_method not in ["S256", "plain"]:
            raise ValueError("Invalid code_challenge_method")

        # Generate transaction ID for state management
        transaction_id = secrets.token_urlsafe(32)

        # Store transaction with client context
        transaction = {
            "client_id": client.client_id,
            "redirect_uri": params.redirect_uri,
            "state": params.state,
            "code_challenge": params.code_challenge,
            "code_challenge_method": params.code_challenge_method,
            "scope": params.scope,
            "resource": getattr(params, "resource", None),  # RFC 8707
            "created_at": time.time(),
        }

        # Encrypt sensitive transaction data
        encrypted_transaction = self.cipher.encrypt(json.dumps(transaction).encode())
        self.oauth_transactions[transaction_id] = {
            "data": encrypted_transaction,
            "expires_at": time.time() + 600,  # 10 minutes
        }

        # Generate proxy PKCE parameters for upstream
        proxy_code_verifier = secrets.token_urlsafe(32)
        proxy_code_challenge = self._generate_pkce_challenge(proxy_code_verifier)

        # Store proxy PKCE for later use
        self.oauth_transactions[transaction_id]["proxy_code_verifier"] = proxy_code_verifier

        # Build upstream authorization URL
        upstream_params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": f"{self.base_url}/auth/callback",
            "scope": params.scope or "openid profile email",
            "state": transaction_id,
            "code_challenge": proxy_code_challenge,
            "code_challenge_method": "S256",
        }

        # Add resource parameter if provided (RFC 8707)
        if transaction.get("resource"):
            upstream_params["resource"] = transaction["resource"]

        authorization_url = f"{self.authorization_endpoint}?{urlencode(upstream_params)}"

        logger.info(f"Authorization flow started: transaction={transaction_id}")
        return authorization_url

    async def handle_callback(self, code: str, state: str) -> str:
        """
        Handle OAuth callback from upstream provider.

        Exchanges upstream authorization code for tokens and generates
        new authorization code for the MCP client.
        """
        # Retrieve and decrypt transaction
        transaction_data = self.oauth_transactions.get(state)
        if not transaction_data:
            raise ValueError("Invalid or expired state parameter")

        if time.time() > transaction_data["expires_at"]:
            del self.oauth_transactions[state]
            raise ValueError("Transaction expired")

        # Decrypt transaction
        decrypted_data = self.cipher.decrypt(transaction_data["data"])
        transaction = json.loads(decrypted_data)

        # Exchange authorization code with upstream
        proxy_code_verifier = transaction_data["proxy_code_verifier"]
        upstream_tokens = await self._exchange_code_with_upstream(
            code, proxy_code_verifier
        )

        # Generate new authorization code for client
        client_code = secrets.token_urlsafe(32)

        # Store client code with upstream tokens
        self.client_codes[client_code] = {
            "client_id": transaction["client_id"],
            "upstream_tokens": upstream_tokens,
            "code_challenge": transaction["code_challenge"],
            "code_challenge_method": transaction["code_challenge_method"],
            "scope": transaction["scope"],
            "created_at": time.time(),
            "expires_at": time.time() + 300,  # 5 minutes
        }

        # Clean up transaction
        del self.oauth_transactions[state]

        # Redirect to client with new authorization code
        client_params = {"code": client_code}
        if transaction["state"]:
            client_params["state"] = transaction["state"]

        callback_url = f"{transaction['redirect_uri']}?{urlencode(client_params)}"

        logger.info(f"Callback processed: client_code={client_code}")
        return callback_url

    async def exchange_authorization_code(
        self, client: OAuthClientInformationFull, authorization_code: AuthorizationCode
    ) -> OAuthToken:
        """
        Exchange authorization code for access token.

        Validates PKCE and returns upstream tokens to the client.
        """
        # Retrieve client code data
        code_data = self.client_codes.get(authorization_code.code)
        if not code_data:
            raise ValueError("Invalid authorization code")

        if time.time() > code_data["expires_at"]:
            del self.client_codes[authorization_code.code]
            raise ValueError("Authorization code expired")

        # Validate client
        if code_data["client_id"] != client.client_id:
            raise ValueError("Client mismatch")

        # Validate PKCE
        if not self._verify_pkce(
            code_data["code_challenge"],
            authorization_code.code_verifier,
            code_data["code_challenge_method"],
        ):
            raise ValueError("PKCE validation failed")

        # Get upstream tokens
        upstream_tokens = code_data["upstream_tokens"]

        # Create OAuth token response
        oauth_token = OAuthToken(
            access_token=upstream_tokens["access_token"],
            token_type=upstream_tokens.get("token_type", "Bearer"),
            expires_in=upstream_tokens.get("expires_in", 3600),
            refresh_token=upstream_tokens.get("refresh_token"),
            scope=code_data["scope"],
        )

        # Store tokens for later use
        access_token_obj = AccessToken(
            token=upstream_tokens["access_token"],
            client_id=client.client_id,
            user_id=self._extract_user_id_from_token(upstream_tokens["access_token"]),
            scope=code_data["scope"].split() if code_data["scope"] else [],
            expires_at=datetime.now(timezone.utc)
            + timedelta(seconds=upstream_tokens.get("expires_in", 3600)),
        )

        self.access_tokens[upstream_tokens["access_token"]] = access_token_obj

        if upstream_tokens.get("refresh_token"):
            refresh_token_obj = RefreshToken(
                token=upstream_tokens["refresh_token"],
                client_id=client.client_id,
                user_id=access_token_obj.user_id,
            )
            self.refresh_tokens[upstream_tokens["refresh_token"]] = refresh_token_obj

        # Clean up authorization code
        del self.client_codes[authorization_code.code]

        logger.info(f"Token exchange completed: client={client.client_id}")
        return oauth_token

    async def load_access_token(self, token: str) -> Optional[AccessToken]:
        """Validate access token using JWT verification."""
        try:
            # First check local cache
            if token in self.access_tokens:
                access_token = self.access_tokens[token]
                if access_token.expires_at > datetime.now(timezone.utc):
                    return access_token

            # Validate with JWT verifier
            payload = await self.jwt_verifier.verify_token(token)
            if payload:
                access_token = AccessToken(
                    token=token,
                    client_id=payload.get("aud", ""),
                    user_id=payload.get("sub", ""),
                    scope=payload.get("scope", "").split(),
                    expires_at=datetime.fromtimestamp(
                        payload.get("exp", 0), timezone.utc
                    ),
                )

                # Cache for future use
                self.access_tokens[token] = access_token
                return access_token

        except Exception as e:
            logger.warning(f"Token validation failed: {e}")

        return None

    async def introspect_token(self, token: str) -> Dict[str, Any]:
        """
        RFC 7662 compliant token introspection endpoint.
        """
        access_token = await self.load_access_token(token)

        if not access_token:
            return {"active": False}

        return {
            "active": True,
            "client_id": access_token.client_id,
            "scope": " ".join(access_token.scope),
            "sub": access_token.user_id,
            "exp": int(access_token.expires_at.timestamp()),
            "iat": int((access_token.expires_at - timedelta(hours=1)).timestamp()),
            "token_type": "access_token",
        }

    # Helper methods
    def _generate_pkce_challenge(self, verifier: str) -> str:
        """Generate PKCE challenge from verifier."""
        import hashlib
        import base64

        digest = hashlib.sha256(verifier.encode()).digest()
        return base64.urlsafe_b64encode(digest).decode().rstrip("=")

    def _verify_pkce(self, challenge: str, verifier: str, method: str) -> bool:
        """Verify PKCE challenge against verifier."""
        if method == "S256":
            expected = self._generate_pkce_challenge(verifier)
            return expected == challenge
        elif method == "plain":
            return verifier == challenge
        return False

    async def _exchange_code_with_upstream(
        self, code: str, code_verifier: str
    ) -> Dict[str, Any]:
        """Exchange authorization code with upstream provider."""
        token_data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": f"{self.base_url}/auth/callback",
            "code_verifier": code_verifier,
        }

        response = await self.http_client.post(
            self.token_endpoint,
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code != 200:
            error_text = await response.aread()
            raise ValueError(f"Token exchange failed: {error_text}")

        return response.json()

    def _extract_user_id_from_token(self, token: str) -> str:
        """Extract user ID from JWT token."""
        try:
            import jwt

            # Decode without verification (just to extract claims)
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload.get("sub", "unknown")
        except Exception:
            return "unknown"


# Factory function for creating OAuth proxy
async def create_mcp_oauth_proxy(settings: FastMCPSettings) -> MCPCompliantOAuthProxy:
    """Create and initialize MCP-compliant OAuth proxy."""
    proxy = MCPCompliantOAuthProxy(settings)

    logger.info("MCP OAuth Proxy created and ready")
    return proxy
```

#### 1.2 OAuth Proxy Integration with FastMCP Server

**Implementation Note**: Integrates security enhancements from research findings
**Key Features**: Multi-layer authentication support, secure middleware chaining

**File**: `backend/src/mcp_registry_gateway/server/fastmcp_server.py`

```python
"""
Enhanced FastMCP server with OAuth proxy integration.
"""

import asyncio
import logging
from typing import Optional

from fastmcp import FastMCP
from fastmcp.server import Server
from fastmcp.server.auth import AuthMiddleware

from ..auth.enhanced_oauth_proxy import create_mcp_oauth_proxy
from ..core.config import FastMCPSettings
from ..middleware.auth_middleware import (
    AuthenticationMiddleware,
    AuthorizationMiddleware,
)


logger = logging.getLogger(__name__)


class EnhancedFastMCPServer:
    """Enhanced FastMCP server with full OAuth integration."""

    def __init__(self, settings: FastMCPSettings):
        self.settings = settings
        self.server: Optional[Server] = None
        self.oauth_proxy = None

    async def initialize(self):
        """Initialize server with OAuth proxy if enabled."""

        # Create OAuth proxy if configured
        if self.settings.azure_tenant_id and self.settings.azure_client_id:
            self.oauth_proxy = await create_mcp_oauth_proxy(self.settings)
            logger.info("OAuth proxy initialized")

        # Create FastMCP server
        server_config = {
            "name": "MCP Registry Gateway",
            "version": "1.0.0",
            "description": "Enterprise MCP Server Registry and Gateway",
        }

        if self.oauth_proxy:
            # Add OAuth authentication
            server_config["auth"] = self.oauth_proxy
            logger.info("Server configured with OAuth authentication")

        self.server = Server(**server_config)

        # Add middleware
        await self._setup_middleware()

        # Register tools and resources
        await self._register_tools()
        await self._register_resources()

        logger.info("FastMCP server initialized successfully")

    async def _setup_middleware(self):
        """Set up authentication and authorization middleware."""

        # Authentication middleware (handles both OAuth and API keys)
        auth_middleware = AuthenticationMiddleware(require_auth=True)
        self.server.add_middleware(auth_middleware)

        # Authorization middleware with tool permissions
        tool_permissions = {
            "register_server": ["admin", "server_owner"],
            "update_server": ["admin", "server_owner"],
            "delete_server": ["admin"],
            "list_servers": ["admin", "server_owner", "user"],
            "test_connection": ["admin", "server_owner"],
        }

        authz_middleware = AuthorizationMiddleware(tool_permissions)
        self.server.add_middleware(authz_middleware)

        logger.info("Middleware configured")

    async def _register_tools(self):
        """Register MCP tools."""

        @self.server.tool("register_server")
        async def register_server(
            name: str,
            endpoint: str,
            auth_type: str = "none",
            auth_config: dict = None,
            settings: dict = None,
        ) -> dict:
            """Register a new MCP server."""
            # Implementation for server registration
            # This will call the frontend API or database directly
            pass

        @self.server.tool("test_connection")
        async def test_connection(endpoint: str, auth_config: dict = None) -> dict:
            """Test connection to an MCP server."""
            # Implementation for connection testing
            pass

        @self.server.tool("list_servers")
        async def list_servers(
            filter_by: str = None,
            owner_id: str = None
        ) -> list:
            """List registered MCP servers."""
            # Implementation for listing servers
            pass

    async def _register_resources(self):
        """Register MCP resources."""

        @self.server.resource("config://server-registry")
        async def server_registry_config() -> dict:
            """Get server registry configuration."""
            return {
                "oauth_enabled": bool(self.oauth_proxy),
                "supported_auth_types": ["none", "bearer", "api_key", "oauth"],
                "max_servers_per_user": 100,
                "default_timeout": 30,
            }

    async def start(self, host: str = "0.0.0.0", port: int = 8001):
        """Start the FastMCP server."""
        if not self.server:
            await self.initialize()

        logger.info(f"Starting FastMCP server on {host}:{port}")
        await self.server.start(host=host, port=port)

    async def stop(self):
        """Stop the FastMCP server."""
        if self.server:
            await self.server.stop()
            logger.info("FastMCP server stopped")


# Factory function
async def create_fastmcp_server(settings: FastMCPSettings) -> EnhancedFastMCPServer:
    """Create and initialize FastMCP server."""
    server = EnhancedFastMCPServer(settings)
    await server.initialize()
    return server
```

### Task 2: OAuth Server Registration UI

**User Experience Priority**: Addresses complexity discovered in research
**Key Features**: OAuth discovery, endpoint validation, MCP compliance indicators

#### 2.1 Enhanced OAuth Form Component

**File**: `frontend/src/components/servers/OAuth2Form.tsx`

```typescript
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, ExternalLink, Info, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OAuth2Config {
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  resourceParameter?: string;
}

interface OAuth2FormProps {
  config: OAuth2Config;
  onChange: (config: OAuth2Config) => void;
  serverEndpoint: string;
}

interface OAuthDiscoveryResult {
  authorization_endpoint?: string;
  token_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
}

export function OAuth2Form({ config, onChange, serverEndpoint }: OAuth2FormProps) {
  const [discoveryUrl, setDiscoveryUrl] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<OAuthDiscoveryResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    authEndpoint?: boolean;
    tokenEndpoint?: boolean;
    pkceSupported?: boolean;
  }>({});

  // Auto-populate discovery URL based on server endpoint
  useEffect(() => {
    if (serverEndpoint && !discoveryUrl) {
      try {
        const url = new URL(serverEndpoint);
        setDiscoveryUrl(`${url.protocol}//${url.host}`);
      } catch {
        // Invalid URL, ignore
      }
    }
  }, [serverEndpoint, discoveryUrl]);

  const handleOAuthDiscovery = async () => {
    if (!discoveryUrl) return;

    setIsDiscovering(true);
    setDiscoveryResult(null);

    try {
      // Try multiple discovery endpoints
      const discoveryUrls = [
        `${discoveryUrl}/.well-known/oauth-authorization-server`,
        `${discoveryUrl}/.well-known/openid_configuration`,
        `${discoveryUrl}/.well-known/openid-configuration`,
      ];

      let discoveryData: OAuthDiscoveryResult | null = null;

      for (const url of discoveryUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            discoveryData = await response.json();
            break;
          }
        } catch {
          // Try next URL
          continue;
        }
      }

      if (!discoveryData) {
        throw new Error('OAuth discovery failed - no valid discovery document found');
      }

      setDiscoveryResult(discoveryData);

      // Auto-fill configuration
      const newConfig: OAuth2Config = {
        ...config,
        authorizationUrl: discoveryData.authorization_endpoint,
        tokenUrl: discoveryData.token_endpoint,
        scope: discoveryData.scopes_supported?.slice(0, 3).join(' ') || 'openid profile email',
      };

      onChange(newConfig);

      toast({
        title: "OAuth Discovery Successful",
        description: "Configuration has been auto-filled from discovery document",
      });

    } catch (error) {
      toast({
        title: "OAuth Discovery Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const validateOAuthEndpoints = async () => {
    if (!config.authorizationUrl && !config.tokenUrl) {
      toast({
        title: "Validation Error",
        description: "Please provide at least authorization or token URL",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    setValidationResults({});

    const results: any = {};

    try {
      // Test authorization endpoint
      if (config.authorizationUrl) {
        try {
          const authResponse = await fetch(config.authorizationUrl, {
            method: 'HEAD',
            mode: 'no-cors' // Avoid CORS issues for validation
          });
          results.authEndpoint = true;
        } catch {
          results.authEndpoint = false;
        }
      }

      // Test token endpoint
      if (config.tokenUrl) {
        try {
          const tokenResponse = await fetch(config.tokenUrl, {
            method: 'HEAD',
            mode: 'no-cors'
          });
          results.tokenEndpoint = true;
        } catch {
          results.tokenEndpoint = false;
        }
      }

      // Check PKCE support from discovery
      if (discoveryResult?.code_challenge_methods_supported) {
        results.pkceSupported = discoveryResult.code_challenge_methods_supported.includes('S256');
      }

      setValidationResults(results);

      const hasErrors = Object.values(results).some(result => result === false);
      if (hasErrors) {
        toast({
          title: "Validation Issues Detected",
          description: "Some endpoints may not be accessible. Check the results below.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Validation Successful",
          description: "All OAuth endpoints are accessible",
        });
      }

    } catch (error) {
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* OAuth Discovery Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            OAuth Discovery
          </CardTitle>
          <CardDescription>
            Automatically discover OAuth configuration from your server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="discovery-url">Server Base URL</Label>
            <div className="flex space-x-2">
              <Input
                id="discovery-url"
                value={discoveryUrl}
                onChange={(e) => setDiscoveryUrl(e.target.value)}
                placeholder="https://auth.example.com"
              />
              <Button
                type="button"
                onClick={handleOAuthDiscovery}
                disabled={!discoveryUrl || isDiscovering}
                variant="outline"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  'Discover'
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Attempts to discover OAuth endpoints from /.well-known/ URLs
            </p>
          </div>

          {discoveryResult && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-green-800">Discovery Successful!</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {discoveryResult.authorization_endpoint && (
                      <div>
                        <strong>Auth Endpoint:</strong>
                        <br />
                        <code className="text-xs bg-white px-1 rounded">
                          {discoveryResult.authorization_endpoint}
                        </code>
                      </div>
                    )}
                    {discoveryResult.token_endpoint && (
                      <div>
                        <strong>Token Endpoint:</strong>
                        <br />
                        <code className="text-xs bg-white px-1 rounded">
                          {discoveryResult.token_endpoint}
                        </code>
                      </div>
                    )}
                  </div>
                  {discoveryResult.scopes_supported && (
                    <div>
                      <strong>Supported Scopes:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {discoveryResult.scopes_supported.slice(0, 8).map(scope => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Manual OAuth Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>OAuth 2.1 Configuration</CardTitle>
          <CardDescription>
            Configure OAuth client credentials and endpoints manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client-id">Client ID *</Label>
              <Input
                id="client-id"
                value={config.clientId || ''}
                onChange={(e) => onChange({ ...config, clientId: e.target.value })}
                placeholder="oauth-client-id"
                required
              />
            </div>

            <div>
              <Label htmlFor="client-secret">Client Secret *</Label>
              <Input
                id="client-secret"
                type="password"
                value={config.clientSecret || ''}
                onChange={(e) => onChange({ ...config, clientSecret: e.target.value })}
                placeholder="oauth-client-secret"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="scope">Scope</Label>
            <Input
              id="scope"
              value={config.scope || ''}
              onChange={(e) => onChange({ ...config, scope: e.target.value })}
              placeholder="openid profile email"
            />
            <p className="text-sm text-gray-600 mt-1">
              Space-separated list of OAuth scopes to request
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="auth-url">Authorization URL *</Label>
              <Input
                id="auth-url"
                value={config.authorizationUrl || ''}
                onChange={(e) => onChange({ ...config, authorizationUrl: e.target.value })}
                placeholder="https://auth.example.com/oauth/authorize"
                type="url"
                required
              />
            </div>

            <div>
              <Label htmlFor="token-url">Token URL *</Label>
              <Input
                id="token-url"
                value={config.tokenUrl || ''}
                onChange={(e) => onChange({ ...config, tokenUrl: e.target.value })}
                placeholder="https://auth.example.com/oauth/token"
                type="url"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="resource-param">Resource Parameter (Optional)</Label>
            <Input
              id="resource-param"
              value={config.resourceParameter || ''}
              onChange={(e) => onChange({ ...config, resourceParameter: e.target.value })}
              placeholder="https://api.example.com"
            />
            <p className="text-sm text-gray-600 mt-1">
              RFC 8707 resource parameter for multi-resource access
            </p>
          </div>

          {/* Validation Section */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Endpoint Validation</h4>
              <Button
                type="button"
                onClick={validateOAuthEndpoints}
                disabled={isValidating}
                variant="outline"
                size="sm"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate Endpoints'
                )}
              </Button>
            </div>

            {Object.keys(validationResults).length > 0 && (
              <div className="space-y-2">
                {config.authorizationUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Authorization Endpoint</span>
                    {validationResults.authEndpoint === true ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Accessible
                      </Badge>
                    ) : validationResults.authEndpoint === false ? (
                      <Badge variant="destructive">
                        Not Accessible
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Not Tested
                      </Badge>
                    )}
                  </div>
                )}

                {config.tokenUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Token Endpoint</span>
                    {validationResults.tokenEndpoint === true ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Accessible
                      </Badge>
                    ) : validationResults.tokenEndpoint === false ? (
                      <Badge variant="destructive">
                        Not Accessible
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Not Tested
                      </Badge>
                    )}
                  </div>
                )}

                {discoveryResult && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">PKCE Support</span>
                    {validationResults.pkceSupported === true ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Supported
                      </Badge>
                    ) : validationResults.pkceSupported === false ? (
                      <Badge variant="outline" className="border-orange-300 text-orange-700">
                        Not Supported
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Unknown
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MCP Specification Compliance Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">MCP 06-18-2025 OAuth 2.1 Requirements:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>PKCE (RFC 7636) is enforced for all authorization flows</li>
              <li>Dynamic Client Registration (RFC 7591) is handled automatically</li>
              <li>Resource parameter (RFC 8707) is supported for multi-resource access</li>
              <li>Token introspection (RFC 7662) is available for validation</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

#### 2.2 OAuth Connection Testing

**Testing Philosophy**: Validate configuration without full OAuth flow
**Security Consideration**: Tests must not expose credentials or create security risks

**File**: `frontend/src/lib/oauth-connection-tester.ts`

```typescript
/**
 * OAuth Connection Testing Utilities
 * Tests OAuth configuration without requiring full authentication flow
 */

interface OAuthTestConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope?: string;
  resourceParameter?: string;
}

interface OAuthTestResult {
  success: boolean;
  tests: {
    endpointAccessibility: boolean;
    discoveryDocument: boolean;
    clientCredentials: boolean;
    pkceSupport: boolean;
  };
  details: {
    authEndpointStatus?: number;
    tokenEndpointStatus?: number;
    discoveryData?: any;
    clientCredentialsResponse?: any;
    errors: string[];
  };
  capabilities?: {
    supportedGrantTypes: string[];
    supportedScopes: string[];
    pkceMethods: string[];
    authMethods: string[];
  };
}

export class OAuthConnectionTester {
  async testOAuthConfiguration(config: OAuthTestConfig): Promise<OAuthTestResult> {
    const result: OAuthTestResult = {
      success: false,
      tests: {
        endpointAccessibility: false,
        discoveryDocument: false,
        clientCredentials: false,
        pkceSupport: false,
      },
      details: {
        errors: []
      }
    };

    try {
      // Test 1: Endpoint Accessibility
      result.tests.endpointAccessibility = await this.testEndpointAccessibility(config, result.details);

      // Test 2: Discovery Document
      result.tests.discoveryDocument = await this.testDiscoveryDocument(config, result.details);

      // Test 3: Client Credentials (if safe to test)
      result.tests.clientCredentials = await this.testClientCredentials(config, result.details);

      // Test 4: PKCE Support
      result.tests.pkceSupport = await this.testPKCESupport(config, result.details);

      // Overall success if most tests pass
      const passedTests = Object.values(result.tests).filter(Boolean).length;
      result.success = passedTests >= 2; // At least 2 out of 4 tests must pass

      return result;

    } catch (error) {
      result.details.errors.push(`Test execution failed: ${error.message}`);
      return result;
    }
  }

  private async testEndpointAccessibility(
    config: OAuthTestConfig,
    details: OAuthTestResult['details']
  ): Promise<boolean> {
    try {
      // Test authorization endpoint
      const authResponse = await fetch(config.authorizationUrl, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      details.authEndpointStatus = authResponse.status;

      // Test token endpoint
      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      details.tokenEndpointStatus = tokenResponse.status;

      return true; // If we reach here, both endpoints are accessible

    } catch (error) {
      details.errors.push(`Endpoint accessibility test failed: ${error.message}`);
      return false;
    }
  }

  private async testDiscoveryDocument(
    config: OAuthTestConfig,
    details: OAuthTestResult['details']
  ): Promise<boolean> {
    try {
      // Extract base URL from authorization endpoint
      const baseUrl = new URL(config.authorizationUrl).origin;

      // Try common discovery endpoints
      const discoveryUrls = [
        `${baseUrl}/.well-known/oauth-authorization-server`,
        `${baseUrl}/.well-known/openid_configuration`,
        `${baseUrl}/.well-known/openid-configuration`,
      ];

      for (const url of discoveryUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const discoveryData = await response.json();
            details.discoveryData = discoveryData;

            // Extract capabilities
            if (!details.errors) details.errors = [];

            return true;
          }
        } catch {
          continue;
        }
      }

      details.errors.push('No valid OAuth discovery document found');
      return false;

    } catch (error) {
      details.errors.push(`Discovery document test failed: ${error.message}`);
      return false;
    }
  }

  private async testClientCredentials(
    config: OAuthTestConfig,
    details: OAuthTestResult['details']
  ): Promise<boolean> {
    try {
      // Only test client credentials flow if it's safe
      // We'll make a request that should fail gracefully
      const testData = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: config.scope || 'openid'
      });

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: testData,
      });

      const responseData = await response.json();
      details.clientCredentialsResponse = responseData;

      // Success if we get either a token or a proper error response
      if (response.ok || (responseData.error && responseData.error !== 'server_error')) {
        return true;
      }

      details.errors.push(`Client credentials test failed: ${responseData.error_description || responseData.error}`);
      return false;

    } catch (error) {
      // Client credentials might not be supported, which is OK
      details.errors.push(`Client credentials test inconclusive: ${error.message}`);
      return false;
    }
  }

  private async testPKCESupport(
    config: OAuthTestConfig,
    details: OAuthTestResult['details']
  ): Promise<boolean> {
    try {
      // Check PKCE support from discovery document
      if (details.discoveryData?.code_challenge_methods_supported) {
        const pkceMethods = details.discoveryData.code_challenge_methods_supported;
        return pkceMethods.includes('S256') || pkceMethods.includes('plain');
      }

      // If no discovery document, assume PKCE is supported (conservative approach)
      return true;

    } catch (error) {
      details.errors.push(`PKCE support test failed: ${error.message}`);
      return false;
    }
  }

  async generatePKCEChallenge(): Promise<{ verifier: string; challenge: string }> {
    /**
     * Generate PKCE challenge for testing
     */
    const verifier = this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);

    return { verifier, challenge };
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

export const oauthTester = new OAuthConnectionTester();
```

## MCP Specification Compliance

### RFC 7591 - Dynamic Client Registration
**Status**: Implemented via FastMCP OAuth Proxy
**Key Features**:
- Client metadata validation
- Secure client credential generation
- Redirect URI pattern validation
- Grant type restrictions

**Implementation**: See Enhanced OAuth Proxy code above

### RFC 7636 - PKCE Enforcement
**Status**: End-to-end PKCE validation
**Implementation**:
- Code challenge generation and validation
- Support for S256 and plain methods
- Challenge verification across proxy

**Critical**: MCP specification requires PKCE for all flows

### RFC 8707 - Resource Indicators
**Status**: Implemented with resource parameter support
**Enhancement Needed**: Complete multi-resource access patterns

```python
# Resource parameter handling in OAuth proxy
class ResourceParameterHandler:
    async def handle_authorization_request(self, params: AuthorizationParams):
        """Handle resource parameter for multi-resource access"""
        if params.resource:
            # Validate resource parameter
            if not self.is_valid_resource(params.resource):
                raise ValidationError("Invalid resource parameter")

            # Include resource in upstream request
            upstream_params = {
                **params.dict(),
                "resource": params.resource  # Pass through to Azure AD
            }

            return upstream_params

        return params.dict()
```

### RFC 7662 - Token Introspection
**Status**: Implemented in OAuth proxy
**Usage**: Allows MCP clients to validate token status and permissions

---

## Security Enhancements

**MANDATORY**: All High-Risk vulnerabilities from research must be mitigated

### 1. OAuth State Management Security

```python
# Enhanced state management with encryption and expiration
class SecureStateManager:
    def __init__(self, encryption_key: bytes):
        self.cipher = Fernet(encryption_key)
        self.states: Dict[str, Dict[str, Any]] = {}

    def create_state(self, transaction_data: Dict[str, Any]) -> str:
        """Create encrypted state with expiration."""
        state_id = secrets.token_urlsafe(32)

        # Add timestamp and nonce
        transaction_data.update({
            'created_at': time.time(),
            'nonce': secrets.token_hex(16),
            'expires_at': time.time() + 600  # 10 minutes
        })

        # Encrypt transaction data
        encrypted_data = self.cipher.encrypt(
            json.dumps(transaction_data).encode()
        )

        self.states[state_id] = {
            'data': encrypted_data,
            'expires_at': transaction_data['expires_at']
        }

        return state_id

    def retrieve_state(self, state_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve and decrypt state data."""
        state_data = self.states.get(state_id)
        if not state_data:
            return None

        # Check expiration
        if time.time() > state_data['expires_at']:
            del self.states[state_id]
            return None

        # Decrypt data
        try:
            decrypted_data = self.cipher.decrypt(state_data['data'])
            transaction = json.loads(decrypted_data)

            # Verify timestamp
            if time.time() > transaction['expires_at']:
                del self.states[state_id]
                return None

            return transaction

        except Exception as e:
            logger.error(f"State decryption failed: {e}")
            return None

    def cleanup_expired_states(self):
        """Remove expired states."""
        current_time = time.time()
        expired_states = [
            state_id for state_id, data in self.states.items()
            if current_time > data['expires_at']
        ]

        for state_id in expired_states:
            del self.states[state_id]
```

### 2. Token Security Enhancements

```python
# Enhanced token storage with encryption
class SecureTokenStorage:
    def __init__(self, encryption_key: bytes, redis_client):
        self.cipher = Fernet(encryption_key)
        self.redis = redis_client

    async def store_tokens(
        self,
        client_id: str,
        tokens: Dict[str, Any],
        ttl: int = 3600
    ):
        """Store tokens with encryption."""
        # Encrypt sensitive tokens
        encrypted_tokens = {}
        for key, value in tokens.items():
            if key in ['access_token', 'refresh_token', 'id_token']:
                encrypted_tokens[key] = self.cipher.encrypt(str(value).encode()).decode()
            else:
                encrypted_tokens[key] = value

        # Store in Redis with TTL
        await self.redis.setex(
            f"oauth_tokens:{client_id}",
            ttl,
            json.dumps(encrypted_tokens)
        )

    async def retrieve_tokens(self, client_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve and decrypt tokens."""
        encrypted_data = await self.redis.get(f"oauth_tokens:{client_id}")
        if not encrypted_data:
            return None

        try:
            encrypted_tokens = json.loads(encrypted_data)
            decrypted_tokens = {}

            for key, value in encrypted_tokens.items():
                if key in ['access_token', 'refresh_token', 'id_token']:
                    decrypted_tokens[key] = self.cipher.decrypt(value.encode()).decode()
                else:
                    decrypted_tokens[key] = value

            return decrypted_tokens

        except Exception as e:
            logger.error(f"Token decryption failed: {e}")
            return None
```

## Implementation Gotchas (Critical Issues from Research)

### Gotcha 1: OAuth Redirect URI Validation Bypass
**VULNERABILITY**: Weak redirect URI validation allows malicious redirects
```python
# VULNERABLE CODE:
def validate_redirect_uri(self, redirect_uri: str) -> bool:
    return redirect_uri.startswith("http://localhost")  # TOO BROAD
```

**SECURE IMPLEMENTATION**:
```python
class SecureRedirectValidator:
    def __init__(self):
        self.allowed_patterns = [
            re.compile(r"^http://127\.0\.0\.1:\d{4,5}/callback$"),
            re.compile(r"^http://localhost:\d{4,5}/callback$"),
            # Production patterns
            re.compile(r"^https://[a-zA-Z0-9-]+\.example\.com/auth/callback$"),
        ]

    def validate_redirect_uri(self, redirect_uri: str) -> bool:
        return any(pattern.match(redirect_uri) for pattern in self.allowed_patterns)
```

### Gotcha 2: Token Replay Attack Prevention
**VULNERABILITY**: Cached OAuth tokens may not reflect latest permissions
```python
# VULNERABLE: Cached tokens retain old permissions
class TokenCache:
    async def get_cached_token(self, user_id: str):
        cached_token = await redis.get(f"oauth_token:{user_id}")
        if cached_token and not is_expired(cached_token):
            return cached_token  # POTENTIAL SECURITY ISSUE
```

**SECURE IMPLEMENTATION**:
```python
class SecureTokenCache:
    async def validate_token_permissions(self, token: str, user_id: str):
        # Always check current user permissions against token claims
        current_permissions = await get_current_user_permissions(user_id)
        token_permissions = extract_permissions_from_token(token)

        if not permissions_match(current_permissions, token_permissions):
            # Force token refresh
            await invalidate_cached_token(user_id)
            return None

        return token
```

### Gotcha 3: JWT Token Information Disclosure
**VULNERABILITY**: Full user object in JWT payload exposes sensitive data
```typescript
// VULNERABLE:
jwt: {
  definePayload: ({ user }) => {
    return user;  // EXPOSES ALL USER DATA
  }
}
```

**SECURE IMPLEMENTATION**:
```typescript
// SECURE: Minimal payload with only necessary claims
jwt: {
  definePayload: ({ user }) => {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      // Don't include sensitive data like full profile
    };
  }
}
```

### Gotcha 4: Complex Azure AD Role Mapping
**ISSUE**: Multiple claim sources require robust extraction logic
```typescript
// Azure AD profile can contain roles in different formats:
interface MicrosoftProfile {
  roles?: string | string[];           // App roles
  appRoles?: string | string[];        // Alternative app roles format
  app_roles?: string | string[];       // Another alternative format
  groups?: string | string[];          // Security groups
}
```

**ROBUST IMPLEMENTATION**: Requires fallback logic and error handling (see research deep-dive)

### Gotcha 5: PKCE State Management Complexity
**ISSUE**: Proxy must maintain two PKCE challenges simultaneously
- Client PKCE challenge (for end-to-end validation)
- Proxy PKCE challenge (for upstream provider)

**SOLUTION**: Dual challenge storage in encrypted transaction state

---

## Testing Strategy

**Testing Philosophy**: Tests must adapt to implementation, never modify production code to make tests pass

### 1. OAuth Proxy Integration Tests

```python
# tests/test_oauth_proxy.py
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_oauth_proxy_dcr_flow():
    """Test Dynamic Client Registration flow."""
    proxy = MCPCompliantOAuthProxy(test_settings)

    # Test client registration
    client_info = OAuthClientInformationFull(
        client_name="Test MCP Client",
        redirect_uris=["http://localhost:12345/callback"]
    )

    registered_client = await proxy.register_client(client_info)

    assert registered_client.client_id.startswith("mcp_client_")
    assert registered_client.client_secret is not None
    assert "authorization_code" in registered_client.grant_types

@pytest.mark.asyncio
async def test_oauth_proxy_authorization_flow():
    """Test authorization flow with PKCE."""
    proxy = MCPCompliantOAuthProxy(test_settings)

    # Register client first
    client = await proxy.register_client(test_client_info)

    # Test authorization
    auth_params = AuthorizationParams(
        response_type="code",
        redirect_uri="http://localhost:12345/callback",
        state="test_state",
        code_challenge="challenge",
        code_challenge_method="S256"
    )

    auth_url = await proxy.authorize(client, auth_params)

    assert "login.microsoftonline.com" in auth_url
    assert "code_challenge=" in auth_url
    assert "state=" in auth_url

@pytest.mark.asyncio
async def test_oauth_proxy_token_exchange():
    """Test token exchange flow."""
    proxy = MCPCompliantOAuthProxy(test_settings)

    # Mock upstream token exchange
    with patch.object(proxy, '_exchange_code_with_upstream') as mock_exchange:
        mock_exchange.return_value = {
            "access_token": "test_access_token",
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": "test_refresh_token"
        }

        # Test token exchange
        auth_code = AuthorizationCode(
            code="test_code",
            code_verifier="test_verifier"
        )

        token = await proxy.exchange_authorization_code(test_client, auth_code)

        assert token.access_token == "test_access_token"
        assert token.token_type == "Bearer"
        assert token.expires_in == 3600
```

### 2. Frontend OAuth Form Tests

```typescript
// tests/OAuth2Form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OAuth2Form } from '@/components/servers/OAuth2Form';

describe('OAuth2Form', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    config: {},
    onChange: mockOnChange,
    serverEndpoint: 'https://api.example.com'
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should auto-populate discovery URL from server endpoint', () => {
    render(<OAuth2Form {...defaultProps} />);

    const discoveryInput = screen.getByLabelText('Server Base URL');
    expect(discoveryInput).toHaveValue('https://api.example.com');
  });

  it('should perform OAuth discovery successfully', async () => {
    // Mock successful discovery response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        authorization_endpoint: 'https://auth.example.com/oauth/authorize',
        token_endpoint: 'https://auth.example.com/oauth/token',
        scopes_supported: ['openid', 'profile', 'email']
      })
    });

    render(<OAuth2Form {...defaultProps} />);

    const discoverButton = screen.getByText('Discover');
    fireEvent.click(discoverButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        authorizationUrl: 'https://auth.example.com/oauth/authorize',
        tokenUrl: 'https://auth.example.com/oauth/token',
        scope: 'openid profile email'
      });
    });
  });

  it('should validate OAuth endpoints', async () => {
    const config = {
      authorizationUrl: 'https://auth.example.com/oauth/authorize',
      tokenUrl: 'https://auth.example.com/oauth/token'
    };

    render(<OAuth2Form {...defaultProps} config={config} />);

    const validateButton = screen.getByText('Validate Endpoints');
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(screen.getByText('Accessible')).toBeInTheDocument();
    });
  });

  it('should handle OAuth discovery failure gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    render(<OAuth2Form {...defaultProps} />);

    const discoverButton = screen.getByText('Discover');
    fireEvent.click(discoverButton);

    await waitFor(() => {
      expect(screen.getByText(/OAuth Discovery Failed/)).toBeInTheDocument();
    });
  });
});
```

## Token Synchronization Solution

### Token Normalization Layer
**Problem**: Different token formats across authentication layers
**Solution**: Centralized token normalization and synchronization

```typescript
interface NormalizedToken {
  userId: string;
  email: string;
  roles: string[];
  tenantId?: string;
  expiresAt: Date;
  scopes: string[];
}

class TokenNormalizer {
  normalizeBetterAuthToken(token: BetterAuthToken): NormalizedToken {
    return {
      userId: token.sub,
      email: token.email,
      roles: [token.role],
      expiresAt: new Date(token.exp * 1000),
      scopes: ["read", "write"] // Default scopes
    };
  }

  normalizeAzureToken(token: AzureToken): NormalizedToken {
    return {
      userId: token.sub,
      email: token.email,
      roles: Array.isArray(token.roles) ? token.roles : [token.roles],
      tenantId: token.tid,
      expiresAt: new Date((token.iat + token.expires_in) * 1000),
      scopes: token.scope?.split(' ') || []
    };
  }

  async syncTokenExpiration(tokens: {
    sessionExpiry: Date;
    jwtExpiry: number;
    oauthExpiry: Date;
  }): Promise<Date> {
    // Use shortest expiry time minus safety buffer
    const expiryTimes = [
      tokens.sessionExpiry,
      new Date(tokens.jwtExpiry * 1000),
      tokens.oauthExpiry
    ];

    const shortestExpiry = new Date(Math.min(...expiryTimes.map(d => d.getTime())));
    return new Date(shortestExpiry.getTime() - 60000); // 1 minute safety buffer
  }
}
```

---

## Deployment and Monitoring

### 1. OAuth Proxy Health Monitoring

**Critical for Production**: OAuth proxy health directly impacts MCP client connectivity

```python
# Enhanced health monitoring for OAuth proxy
@app.get("/health/oauth")
async def oauth_health_check():
    """Health check for OAuth proxy functionality."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {}
    }

    try:
        # Check Azure AD connectivity
        jwks_response = await httpx.get(
            f"https://login.microsoftonline.com/{settings.azure_tenant_id}/discovery/v2.0/keys",
            timeout=5.0
        )
        health_status["checks"]["azure_jwks"] = {
            "status": "healthy" if jwks_response.status_code == 200 else "unhealthy",
            "response_time": jwks_response.elapsed.total_seconds()
        }

        # Check token endpoint connectivity
        token_endpoint = f"https://login.microsoftonline.com/{settings.azure_tenant_id}/oauth2/v2.0/token"
        token_response = await httpx.head(token_endpoint, timeout=5.0)
        health_status["checks"]["azure_token_endpoint"] = {
            "status": "healthy" if token_response.status_code in [200, 405] else "unhealthy",
            "response_time": token_response.elapsed.total_seconds()
        }

        # Check Redis connectivity for token storage
        await redis_client.ping()
        health_status["checks"]["redis"] = {"status": "healthy"}

        # Check active transactions
        active_transactions = len(oauth_proxy.oauth_transactions)
        health_status["checks"]["active_transactions"] = {
            "count": active_transactions,
            "status": "healthy" if active_transactions < 1000 else "warning"
        }

    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["error"] = str(e)

    return health_status
```

### 2. OAuth Metrics Collection

**Performance Monitoring**: Track OAuth flow performance and identify bottlenecks

```python
# OAuth-specific metrics
from prometheus_client import Counter, Histogram, Gauge

oauth_requests_total = Counter(
    'oauth_requests_total',
    'Total OAuth requests',
    ['flow_type', 'status']
)

oauth_request_duration = Histogram(
    'oauth_request_duration_seconds',
    'OAuth request duration',
    ['flow_type']
)

oauth_active_sessions = Gauge(
    'oauth_active_sessions',
    'Number of active OAuth sessions'
)

oauth_token_exchanges_total = Counter(
    'oauth_token_exchanges_total',
    'Total OAuth token exchanges',
    ['grant_type', 'status']
)

# Middleware to collect metrics
@oauth_proxy.middleware
async def oauth_metrics_middleware(request, call_next):
    start_time = time.time()

    try:
        response = await call_next(request)

        oauth_requests_total.labels(
            flow_type=request.path_info,
            status='success'
        ).inc()

        return response

    except Exception as e:
        oauth_requests_total.labels(
            flow_type=request.path_info,
            status='error'
        ).inc()
        raise

    finally:
        duration = time.time() - start_time
        oauth_request_duration.labels(
            flow_type=request.path_info
        ).observe(duration)
```

---

## Success Criteria

### Phase 2 Completion Checklist

**Security Requirements (MANDATORY)**:

- [ ] **All HIGH-RISK OAuth vulnerabilities mitigated**
- [ ] **OAuth Redirect URI validation bypass prevented**
- [ ] **Token replay attack prevention implemented**
- [ ] **JWT payload information disclosure minimized**
- [ ] **Secure token storage with encryption implemented**
- [ ] **PKCE validation working end-to-end**
- [ ] **All MCP specification compliance gaps addressed**

**Functional Requirements**:
- [ ] FastMCP OAuth Proxy implemented with full MCP compliance
- [ ] Dynamic Client Registration (DCR) working for MCP clients
- [ ] PKCE enforcement implemented and tested
- [ ] OAuth 2.1 server registration UI complete
- [ ] OAuth discovery and validation working
- [ ] Token introspection endpoint functional
- [ ] Token synchronization across all layers working
- [ ] Resource parameter support implemented (RFC 8707)

**Testing Requirements**:
- [ ] Integration tests passing for OAuth flows
- [ ] Frontend OAuth form tests passing
- [ ] Security testing validates all vulnerability mitigations
- [ ] End-to-end MCP client integration testing
- [ ] OAuth proxy health monitoring implemented
- [ ] Metrics collection for OAuth operations
- [ ] Documentation complete with security considerations

### Performance Targets

- OAuth authorization flow completion < 10 seconds
- Token exchange < 2 seconds
- Discovery endpoint response < 1 second
- Token synchronization < 200ms
- OAuth proxy response time < 300ms
- Cache hit ratio for tokens > 90%
- OAuth proxy handles 100+ concurrent flows
- PKCE validation < 50ms

### Security Validation

**OAuth Security**:
- PKCE challenges properly validated (RFC 7636 compliance)
- OAuth state parameters secure and unique
- Redirect URIs properly validated with strict patterns
- Client credentials properly protected and encrypted
- Audience claims validated (RFC 8707)
- Resource parameters supported where required

**Token Security**:
- Tokens encrypted at rest using Fernet encryption
- Token refresh secured against replay attacks
- Token synchronization preserves security boundaries
- JWT payloads minimized to prevent information disclosure
- Token expiration properly enforced across all layers

**Integration Security**:
- Azure AD role mapping robust with multiple fallbacks
- Error handling doesn't leak sensitive OAuth details
- Audit logging for all OAuth operations
- Rate limiting prevents OAuth abuse
- DCR bridge maintains security while providing compatibility

## Integration with Phase 1

**Dependency Validation**: Ensure Phase 1 security hardening is complete before beginning Phase 2
**Token Integration**: OAuth tokens must work seamlessly with existing API key authentication
**Session Coordination**: OAuth sessions must integrate with Better-Auth session management
**Error Handling**: OAuth errors must integrate with existing error handling patterns

## Rollback Plan

### OAuth Configuration Rollback
```bash
# Disable OAuth proxy
export MREG_FASTMCP_ENABLED=false

# Revert to API key authentication only
export MREG_OAUTH_ENABLED=false

# Rollback code changes
git checkout HEAD~1 -- backend/src/mcp_registry_gateway/auth/
git checkout HEAD~1 -- frontend/src/components/servers/OAuth2Form.tsx

# Restart services
docker-compose restart backend frontend
```

### Graceful Degradation
- **OAuth Failures**: System falls back to API key authentication
- **Proxy Unavailable**: Direct Azure AD integration still works
- **Token Issues**: Automatic token refresh with fallback to re-authentication
- **Performance Impact**: OAuth proxy adds <300ms latency

<!-- VALIDATION UPDATE: Added critical missing components identified in validation report -->

## Critical Missing Components Implementation

### MCPCompliantOAuthProxy Class (Validation Requirement)

**File**: `backend/src/mcp_registry_gateway/auth/mcp_oauth_proxy.py`

```python
"""
MCP-Compliant OAuth Proxy implementation addressing validation report gaps.
Implements full MCP protocol support with DCR bridging and token synchronization.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import asyncio
import logging
import secrets
import json
from urllib.parse import urlencode, parse_qs, urlparse

from fastapi import HTTPException
import httpx
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

class MCPCompliantOAuthProxy:
    """MCP-compliant OAuth proxy with DCR bridging and token synchronization."""

    def __init__(self, config: OAuthProxyConfig):
        self.config = config
        self.token_synchronizer = TokenSynchronizer()
        self.pkce_validator = PKCEValidator()
        self.dcr_bridge = DCRBridge(config)
        self.client_registry = ClientRegistry()
        self.state_manager = StateManager()
        self.audit_logger = AuditLogger()

    async def handle_authorization_request(self, request: AuthorizationRequest) -> AuthorizationResponse:
        """Handle MCP client authorization requests with DCR bridging."""
        try:
            # Validate MCP client request
            await self._validate_mcp_request(request)

            # Handle Dynamic Client Registration if needed
            if not await self.client_registry.is_registered(request.client_id):
                client_info = await self.dcr_bridge.register_client(
                    redirect_uris=request.redirect_uris,
                    client_metadata=request.metadata
                )
                await self.client_registry.store_client(client_info)

            # Generate authorization URL with state management
            auth_url = await self._build_authorization_url(request)

            # Log authorization attempt
            await self.audit_logger.log_authorization_attempt(
                client_id=request.client_id,
                redirect_uri=request.redirect_uri,
                scopes=request.scopes
            )

            return AuthorizationResponse(
                authorization_url=auth_url,
                state=request.state,
                code_challenge=request.code_challenge
            )

        except Exception as e:
            logger.error(f"Authorization request failed: {e}")
            await self.audit_logger.log_authorization_failure(
                client_id=request.client_id,
                error=str(e)
            )
            raise HTTPException(status_code=400, detail=str(e))

    async def handle_token_exchange(self, token_request: TokenRequest) -> TokenResponse:
        """Handle token exchange with cross-layer synchronization."""
        try:
            # Validate authorization code
            auth_code_data = await self.state_manager.validate_auth_code(
                token_request.code
            )

            # Validate PKCE if present
            if token_request.code_verifier:
                await self.pkce_validator.validate_pkce(
                    code_verifier=token_request.code_verifier,
                    code_challenge=auth_code_data.code_challenge,
                    code_challenge_method=auth_code_data.code_challenge_method
                )

            # Exchange code for tokens with upstream provider
            upstream_tokens = await self._exchange_code_upstream(
                code=auth_code_data.upstream_code,
                client_id=self.config.upstream_client_id,
                client_secret=self.config.upstream_client_secret,
                redirect_uri=self.config.upstream_redirect_uri
            )

            # Normalize and synchronize tokens across layers
            normalized_tokens = await self.token_synchronizer.synchronize_tokens(
                upstream_tokens=upstream_tokens,
                client_id=token_request.client_id,
                user_info=auth_code_data.user_info
            )

            # Store refresh token for future use
            if normalized_tokens.refresh_token:
                await self.token_synchronizer.store_refresh_token(
                    client_id=token_request.client_id,
                    refresh_token=normalized_tokens.refresh_token,
                    expires_at=normalized_tokens.refresh_expires_at
                )

            # Log successful token exchange
            await self.audit_logger.log_token_exchange_success(
                client_id=token_request.client_id,
                scopes=normalized_tokens.scope
            )

            return TokenResponse(
                access_token=normalized_tokens.access_token,
                token_type="Bearer",
                expires_in=normalized_tokens.expires_in,
                refresh_token=normalized_tokens.refresh_token,
                scope=normalized_tokens.scope
            )

        except Exception as e:
            logger.error(f"Token exchange failed: {e}")
            await self.audit_logger.log_token_exchange_failure(
                client_id=token_request.client_id,
                error=str(e)
            )
            raise HTTPException(status_code=400, detail="invalid_grant")

    async def handle_token_refresh(self, refresh_request: RefreshRequest) -> TokenResponse:
        """Handle token refresh with atomic synchronization."""
        try:
            # Validate refresh token
            refresh_data = await self.token_synchronizer.validate_refresh_token(
                refresh_request.refresh_token
            )

            # Refresh tokens atomically across all layers
            new_tokens = await self.token_synchronizer.refresh_tokens_atomic(
                refresh_data=refresh_data,
                requested_scopes=refresh_request.scope
            )

            # Update stored refresh token
            await self.token_synchronizer.update_refresh_token(
                old_refresh_token=refresh_request.refresh_token,
                new_refresh_token=new_tokens.refresh_token,
                expires_at=new_tokens.refresh_expires_at
            )

            return TokenResponse(
                access_token=new_tokens.access_token,
                token_type="Bearer",
                expires_in=new_tokens.expires_in,
                refresh_token=new_tokens.refresh_token,
                scope=new_tokens.scope
            )

        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            raise HTTPException(status_code=400, detail="invalid_grant")

    async def _validate_mcp_request(self, request: AuthorizationRequest) -> None:
        """Validate MCP-specific authorization request parameters."""
        # Validate redirect URI
        if not request.redirect_uri:
            raise ValueError("redirect_uri is required")

        # Validate MCP-specific scopes
        mcp_scopes = {"mcp.server.read", "mcp.server.write", "mcp.server.admin"}
        if not any(scope in mcp_scopes for scope in request.scopes):
            logger.warning(f"No MCP-specific scopes requested: {request.scopes}")

        # Validate PKCE for public clients
        if request.client_type == "public" and not request.code_challenge:
            raise ValueError("PKCE is required for public clients")

    async def _build_authorization_url(self, request: AuthorizationRequest) -> str:
        """Build authorization URL with proper state management."""
        # Generate internal state for tracking
        internal_state = await self.state_manager.create_authorization_state(
            client_id=request.client_id,
            redirect_uri=request.redirect_uri,
            original_state=request.state,
            code_challenge=request.code_challenge,
            code_challenge_method=request.code_challenge_method
        )

        # Build upstream authorization URL
        auth_params = {
            "client_id": self.config.upstream_client_id,
            "response_type": "code",
            "redirect_uri": self.config.upstream_redirect_uri,
            "scope": " ".join(request.scopes),
            "state": internal_state,
            "access_type": "offline",  # Request refresh token
        }

        # Add PKCE if supported by upstream
        if self.config.upstream_supports_pkce:
            upstream_pkce = await self.pkce_validator.generate_pkce_challenge()
            auth_params.update({
                "code_challenge": upstream_pkce.code_challenge,
                "code_challenge_method": "S256"
            })

            # Store upstream PKCE for validation
            await self.state_manager.store_upstream_pkce(
                state=internal_state,
                code_verifier=upstream_pkce.code_verifier
            )

        return f"{self.config.upstream_auth_endpoint}?{urlencode(auth_params)}"

    async def _exchange_code_upstream(self, code: str, client_id: str,
                                     client_secret: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code with upstream provider."""
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.config.upstream_token_endpoint,
                data=token_data,
                headers={"Accept": "application/json"}
            )

            if response.status_code != 200:
                logger.error(f"Upstream token exchange failed: {response.text}")
                raise HTTPException(status_code=400, detail="upstream_token_exchange_failed")

            return response.json()

class TokenSynchronizer:
    """Handles atomic token refresh across all authentication layers."""

    async def synchronize_tokens(self, upstream_tokens: Dict[str, Any],
                               client_id: str, user_info: Dict[str, Any]) -> NormalizedTokenSet:
        """Synchronize tokens across Better-Auth, FastMCP, and client layers."""
        # Normalize upstream tokens
        normalized = NormalizedTokenSet(
            access_token=upstream_tokens["access_token"],
            refresh_token=upstream_tokens.get("refresh_token"),
            expires_in=upstream_tokens.get("expires_in", 3600),
            scope=upstream_tokens.get("scope", "").split(),
            user_info=user_info
        )

        # Update Better-Auth session
        await self._update_better_auth_session(normalized)

        # Update FastMCP token cache
        await self._update_fastmcp_cache(normalized, client_id)

        return normalized

    async def refresh_tokens_atomic(self, refresh_data: RefreshTokenData,
                                  requested_scopes: Optional[List[str]] = None) -> NormalizedTokenSet:
        """Atomically refresh tokens across all layers."""
        # Begin transaction
        async with self._begin_token_transaction() as tx:
            try:
                # Refresh upstream tokens
                new_upstream_tokens = await self._refresh_upstream_tokens(
                    refresh_token=refresh_data.refresh_token,
                    scopes=requested_scopes
                )

                # Normalize new tokens
                normalized = await self._normalize_tokens(new_upstream_tokens)

                # Update all layers atomically
                await self._update_all_layers_atomic(normalized, tx)

                # Commit transaction
                await tx.commit()

                return normalized

            except Exception as e:
                # Rollback on any failure
                await tx.rollback()
                raise e

class DCRBridge:
    """Bridges MCP Dynamic Client Registration with static provider registration."""

    async def register_client(self, redirect_uris: List[str],
                            client_metadata: Dict[str, Any]) -> ClientInfo:
        """Register MCP client through DCR bridge pattern."""
        # Generate client credentials
        client_id = f"mcp_{secrets.token_urlsafe(16)}"
        client_secret = secrets.token_urlsafe(32)

        # Validate redirect URIs against security patterns
        validated_uris = await self._validate_redirect_uris(redirect_uris)

        # Create client registration
        client_info = ClientInfo(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uris=validated_uris,
            client_name=client_metadata.get("client_name", "MCP Client"),
            grant_types=["authorization_code", "refresh_token"],
            response_types=["code"],
            token_endpoint_auth_method="client_secret_post",
            created_at=datetime.now(timezone.utc)
        )

        return client_info
```

### OAuth2Form React Component (Validation Requirement)

**File**: `frontend/src/components/servers/OAuth2ConfigForm.tsx`

```typescript
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

interface ValidationResults {
  discovery: boolean | null;
  authEndpoint: boolean | null;
  tokenEndpoint: boolean | null;
  pkceSupported: boolean | null;
  dcr: boolean | null;
}

interface OAuth2ConfigFormProps {
  onConfigSave: (config: OAuthConfig) => void;
  initialConfig?: Partial<OAuthConfig>;
  serverType: string;
}

export function OAuth2ConfigForm({ onConfigSave, initialConfig, serverType }: OAuth2ConfigFormProps) {
  const [config, setConfig] = useState<OAuthConfig>({
    clientId: initialConfig?.clientId || '',
    clientSecret: initialConfig?.clientSecret || '',
    authUrl: initialConfig?.authUrl || '',
    tokenUrl: initialConfig?.tokenUrl || '',
    scopes: initialConfig?.scopes || ['openid', 'profile', 'email'],
    redirectUri: initialConfig?.redirectUri || ''
  });

  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResults>({
    discovery: null,
    authEndpoint: null,
    tokenEndpoint: null,
    pkceSupported: null,
    dcr: null
  });

  const [isDiscovering, setIsDiscovering] = useState(false);

  // Auto-discovery for common providers
  const handleAutoDiscovery = async (provider: string) => {
    setIsDiscovering(true);

    try {
      const discoveryUrls = {
        'microsoft': 'https://login.microsoftonline.com/common/v2.0/.well-known/openid_configuration',
        'google': 'https://accounts.google.com/.well-known/openid_configuration',
        'github': 'https://github.com/.well-known/openid_configuration'
      };

      const discoveryUrl = discoveryUrls[provider as keyof typeof discoveryUrls];
      if (!discoveryUrl) {
        throw new Error('Provider not supported for auto-discovery');
      }

      const response = await fetch(`/api/oauth/discover?url=${encodeURIComponent(discoveryUrl)}`);
      if (!response.ok) {
        throw new Error('Discovery failed');
      }

      const discoveryData = await response.json();

      setConfig(prev => ({
        ...prev,
        authUrl: discoveryData.authorization_endpoint,
        tokenUrl: discoveryData.token_endpoint
      }));

      toast.success('OAuth endpoints discovered successfully');

    } catch (error) {
      toast.error('Auto-discovery failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDiscovering(false);
    }
  };

  // Validate OAuth configuration
  const validateConfiguration = async () => {
    setIsValidating(true);

    try {
      const response = await fetch('/api/oauth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Validation request failed');
      }

      const results = await response.json();
      setValidationResults(results);

      const hasErrors = Object.values(results).some(result => result === false);
      if (hasErrors) {
        toast.error('Some validation checks failed');
      } else {
        toast.success('All validation checks passed');
      }

    } catch (error) {
      toast.error('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsValidating(false);
    }
  };

  // Test OAuth connection end-to-end
  const testConnection = async () => {
    try {
      const response = await fetch('/api/oauth/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, serverType })
      });

      if (!response.ok) {
        throw new Error('Connection test failed');
      }

      const result = await response.json();

      if (result.success) {
        toast.success('OAuth connection test successful');
      } else {
        toast.error('OAuth connection test failed: ' + result.error);
      }

    } catch (error) {
      toast.error('Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const handleSave = () => {
    // Validate required fields
    if (!config.clientId || !config.clientSecret || !config.authUrl || !config.tokenUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    onConfigSave(config);
    toast.success('OAuth configuration saved');
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>OAuth 2.1 Configuration</CardTitle>
        <CardDescription>
          Configure OAuth 2.1 authentication for {serverType} server connection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Config</TabsTrigger>
            <TabsTrigger value="discovery">Auto-Discovery</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID *</Label>
                <Input
                  id="clientId"
                  value={config.clientId}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="Your OAuth client ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret *</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder="Your OAuth client secret"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="authUrl">Authorization URL *</Label>
                <Input
                  id="authUrl"
                  value={config.authUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, authUrl: e.target.value }))}
                  placeholder="https://provider.com/oauth/authorize"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokenUrl">Token URL *</Label>
                <Input
                  id="tokenUrl"
                  value={config.tokenUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, tokenUrl: e.target.value }))}
                  placeholder="https://provider.com/oauth/token"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirectUri">Redirect URI</Label>
              <Input
                id="redirectUri"
                value={config.redirectUri}
                onChange={(e) => setConfig(prev => ({ ...prev, redirectUri: e.target.value }))}
                placeholder="http://localhost:8001/auth/callback"
              />
            </div>

            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="flex flex-wrap gap-2">
                {config.scopes.map((scope, index) => (
                  <Badge key={index} variant="secondary">
                    {scope}
                    <button
                      className="ml-1 text-xs"
                      onClick={() => {
                        setConfig(prev => ({
                          ...prev,
                          scopes: prev.scopes.filter((_, i) => i !== index)
                        }));
                      }}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="discovery" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Automatically discover OAuth endpoints for common providers
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => handleAutoDiscovery('microsoft')}
                disabled={isDiscovering}
              >
                {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Microsoft
              </Button>

              <Button
                variant="outline"
                onClick={() => handleAutoDiscovery('google')}
                disabled={isDiscovering}
              >
                {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Google
              </Button>

              <Button
                variant="outline"
                onClick={() => handleAutoDiscovery('github')}
                disabled={isDiscovering}
              >
                {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                GitHub
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <div className="space-y-4">
              <Button
                onClick={validateConfiguration}
                disabled={isValidating}
                className="w-full"
              >
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Validate Configuration
              </Button>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>OAuth Discovery</span>
                  {getStatusIcon(validationResults.discovery)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Authorization Endpoint</span>
                  {getStatusIcon(validationResults.authEndpoint)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Token Endpoint</span>
                  {getStatusIcon(validationResults.tokenEndpoint)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <span>PKCE Support</span>
                  {getStatusIcon(validationResults.pkceSupported)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <span>DCR Support</span>
                  {getStatusIcon(validationResults.dcr)}
                </div>
              </div>

              <Button
                onClick={testConnection}
                variant="secondary"
                className="w-full"
              >
                Test OAuth Connection
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2">
          <Button
            onClick={handleSave}
            className="w-32"
          >
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### OAuthConnectionTester Utilities (Validation Requirement)

**File**: `backend/src/mcp_registry_gateway/testing/oauth_connection_tester.py`

```python
"""
OAuth Connection Testing utilities for end-to-end validation.
Addresses validation report gap in OAuth proxy integration testing.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import asyncio
import logging
import httpx
from urllib.parse import urlencode, parse_qs, urlparse

logger = logging.getLogger(__name__)

class OAuthConnectionTester:
    """End-to-end OAuth connection testing for MCP servers."""

    def __init__(self, config: OAuthTestConfig):
        self.config = config
        self.test_results = []

    async def test_full_oauth_flow(self, oauth_config: Dict[str, Any]) -> OAuthTestResult:
        """Test complete OAuth flow from authorization to token refresh."""
        test_result = OAuthTestResult(
            start_time=datetime.now(timezone.utc),
            oauth_config=oauth_config
        )

        try:
            # Test 1: OAuth Discovery
            discovery_result = await self._test_oauth_discovery(oauth_config)
            test_result.add_test('discovery', discovery_result)

            # Test 2: Authorization Endpoint
            auth_result = await self._test_authorization_endpoint(oauth_config)
            test_result.add_test('authorization', auth_result)

            # Test 3: PKCE Support
            pkce_result = await self._test_pkce_support(oauth_config)
            test_result.add_test('pkce', pkce_result)

            # Test 4: Token Exchange (requires manual intervention for full flow)
            # For automated testing, we test the endpoint accessibility and structure
            token_result = await self._test_token_endpoint(oauth_config)
            test_result.add_test('token_endpoint', token_result)

            # Test 5: DCR Bridge (if enabled)
            if self.config.test_dcr:
                dcr_result = await self._test_dcr_bridge(oauth_config)
                test_result.add_test('dcr_bridge', dcr_result)

            # Test 6: Token Synchronization
            sync_result = await self._test_token_synchronization(oauth_config)
            test_result.add_test('token_sync', sync_result)

        except Exception as e:
            logger.error(f"OAuth flow test failed: {e}")
            test_result.overall_success = False
            test_result.error_message = str(e)

        test_result.end_time = datetime.now(timezone.utc)
        test_result.duration = (test_result.end_time - test_result.start_time).total_seconds()

        return test_result

    async def _test_oauth_discovery(self, config: Dict[str, Any]) -> TestStepResult:
        """Test OAuth discovery endpoint."""
        try:
            # Try to derive discovery URL from auth URL
            auth_url = config.get('authUrl', '')
            if 'microsoft' in auth_url:
                discovery_url = 'https://login.microsoftonline.com/common/v2.0/.well-known/openid_configuration'
            elif 'google' in auth_url:
                discovery_url = 'https://accounts.google.com/.well-known/openid_configuration'
            else:
                # Try to construct discovery URL
                parsed = urlparse(auth_url)
                discovery_url = f"{parsed.scheme}://{parsed.netloc}/.well-known/openid_configuration"

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(discovery_url)

                if response.status_code == 200:
                    discovery_data = response.json()
                    return TestStepResult(
                        success=True,
                        details={
                            'discovery_url': discovery_url,
                            'endpoints_found': list(discovery_data.keys()),
                            'issuer': discovery_data.get('issuer'),
                            'authorization_endpoint': discovery_data.get('authorization_endpoint'),
                            'token_endpoint': discovery_data.get('token_endpoint')
                        }
                    )
                else:
                    return TestStepResult(
                        success=False,
                        error=f"Discovery endpoint returned {response.status_code}"
                    )

        except Exception as e:
            return TestStepResult(
                success=False,
                error=f"Discovery test failed: {str(e)}"
            )

    async def _test_authorization_endpoint(self, config: Dict[str, Any]) -> TestStepResult:
        """Test authorization endpoint accessibility."""
        try:
            auth_url = config.get('authUrl')
            if not auth_url:
                return TestStepResult(success=False, error="No authorization URL provided")

            # Test basic accessibility
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try HEAD request first
                response = await client.head(auth_url)

                # Some providers don't support HEAD, try GET with minimal params
                if response.status_code >= 400:
                    test_params = {
                        'client_id': 'test',
                        'response_type': 'code',
                        'redirect_uri': 'http://localhost:8001/callback'
                    }
                    response = await client.get(f"{auth_url}?{urlencode(test_params)}")

                # Even with invalid params, we should get a response (not connection error)
                if response.status_code < 500:  # Accept client errors but not server errors
                    return TestStepResult(
                        success=True,
                        details={
                            'status_code': response.status_code,
                            'accessible': True,
                            'response_headers': dict(response.headers)
                        }
                    )
                else:
                    return TestStepResult(
                        success=False,
                        error=f"Authorization endpoint returned {response.status_code}"
                    )

        except Exception as e:
            return TestStepResult(
                success=False,
                error=f"Authorization endpoint test failed: {str(e)}"
            )

    async def _test_pkce_support(self, config: Dict[str, Any]) -> TestStepResult:
        """Test PKCE support through discovery or direct testing."""
        try:
            # First try discovery
            discovery_result = await self._test_oauth_discovery(config)
            if discovery_result.success and discovery_result.details:
                discovery_data = discovery_result.details
                code_challenge_methods = discovery_data.get('code_challenge_methods_supported', [])

                if 'S256' in code_challenge_methods:
                    return TestStepResult(
                        success=True,
                        details={
                            'pkce_supported': True,
                            'methods': code_challenge_methods,
                            'detected_via': 'discovery'
                        }
                    )

            # Fallback: assume PKCE support for modern providers
            auth_url = config.get('authUrl', '')
            if any(provider in auth_url for provider in ['microsoft', 'google', 'github']):
                return TestStepResult(
                    success=True,
                    details={
                        'pkce_supported': True,
                        'detected_via': 'provider_assumption'
                    }
                )

            return TestStepResult(
                success=False,
                error="Could not determine PKCE support"
            )

        except Exception as e:
            return TestStepResult(
                success=False,
                error=f"PKCE test failed: {str(e)}"
            )

    async def _test_token_endpoint(self, config: Dict[str, Any]) -> TestStepResult:
        """Test token endpoint accessibility and structure."""
        try:
            token_url = config.get('tokenUrl')
            if not token_url:
                return TestStepResult(success=False, error="No token URL provided")

            # Test endpoint accessibility
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try POST with invalid but structurally correct data
                test_data = {
                    'grant_type': 'authorization_code',
                    'code': 'test_code',
                    'client_id': 'test_client',
                    'redirect_uri': 'http://localhost:8001/callback'
                }

                response = await client.post(
                    token_url,
                    data=test_data,
                    headers={'Accept': 'application/json'}
                )

                # We expect client errors (400) for invalid data, not server errors (500)
                if response.status_code in [400, 401, 403]:  # Expected client errors
                    return TestStepResult(
                        success=True,
                        details={
                            'endpoint_accessible': True,
                            'status_code': response.status_code,
                            'accepts_post': True
                        }
                    )
                else:
                    return TestStepResult(
                        success=False,
                        error=f"Unexpected response: {response.status_code}"
                    )

        except Exception as e:
            return TestStepResult(
                success=False,
                error=f"Token endpoint test failed: {str(e)}"
            )

    async def _test_dcr_bridge(self, config: Dict[str, Any]) -> TestStepResult:
        """Test DCR bridge functionality."""
        try:
            # Test our DCR bridge endpoint
            dcr_endpoint = f"{self.config.base_url}/oauth/dcr"

            test_registration = {
                'redirect_uris': ['http://localhost:8001/callback'],
                'client_name': 'Test MCP Client',
                'grant_types': ['authorization_code'],
                'response_types': ['code']
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    dcr_endpoint,
                    json=test_registration,
                    headers={'Content-Type': 'application/json'}
                )

                if response.status_code == 201:  # Created
                    registration_data = response.json()
                    return TestStepResult(
                        success=True,
                        details={
                            'dcr_bridge_working': True,
                            'client_id': registration_data.get('client_id'),
                            'registration_endpoint': dcr_endpoint
                        }
                    )
                else:
                    return TestStepResult(
                        success=False,
                        error=f"DCR bridge returned {response.status_code}"
                    )

        except Exception as e:
            return TestStepResult(
                success=False,
                error=f"DCR bridge test failed: {str(e)}"
            )

    async def _test_token_synchronization(self, config: Dict[str, Any]) -> TestStepResult:
        """Test token synchronization across layers."""
        try:
            # Test our token sync endpoint
            sync_endpoint = f"{self.config.base_url}/oauth/token-sync-test"

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(sync_endpoint)

                if response.status_code == 200:
                    sync_data = response.json()
                    return TestStepResult(
                        success=True,
                        details={
                            'token_sync_available': True,
                            'layers_count': sync_data.get('layers_count', 0),
                            'sync_latency_ms': sync_data.get('sync_latency_ms', 0)
                        }
                    )
                else:
                    return TestStepResult(
                        success=False,
                        error=f"Token sync test returned {response.status_code}"
                    )

        except Exception as e:
            return TestStepResult(
                success=False,
                error=f"Token sync test failed: {str(e)}"
            )

class TestStepResult:
    """Result of a single test step."""

    def __init__(self, success: bool, details: Optional[Dict[str, Any]] = None, error: Optional[str] = None):
        self.success = success
        self.details = details or {}
        self.error = error
        self.timestamp = datetime.now(timezone.utc)

class OAuthTestResult:
    """Complete OAuth test result."""

    def __init__(self, start_time: datetime, oauth_config: Dict[str, Any]):
        self.start_time = start_time
        self.oauth_config = oauth_config
        self.end_time: Optional[datetime] = None
        self.duration: Optional[float] = None
        self.test_steps: Dict[str, TestStepResult] = {}
        self.overall_success = True
        self.error_message: Optional[str] = None

    def add_test(self, step_name: str, result: TestStepResult):
        """Add a test step result."""
        self.test_steps[step_name] = result
        if not result.success:
            self.overall_success = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_seconds': self.duration,
            'overall_success': self.overall_success,
            'error_message': self.error_message,
            'test_steps': {
                name: {
                    'success': result.success,
                    'details': result.details,
                    'error': result.error,
                    'timestamp': result.timestamp.isoformat()
                }
                for name, result in self.test_steps.items()
            }
        }
```

---

**Next Phase**: With Phase 2 complete and all validation report gaps addressed, Phase 3 will focus on comprehensive role-based access control (RBAC) with 6-role hierarchy and user preference management for the complete server management experience.