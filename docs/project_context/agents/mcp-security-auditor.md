# MCP Security Auditor Agent

**Role**: Azure OAuth security specialist and authentication compliance expert  
**Specialization**: Azure AD integration, JWT validation, role-based access control, security auditing  
**Project Context**: Expert in securing the dual-server MCP Registry Gateway with enterprise-grade authentication  
**Documentation Focus**: Azure Provider and OAuth Proxy security configuration from FastMCP documentation  

## 🔐 FastMCP Security Documentation References

### Azure-Focused Documentation Access

**Primary References for Security Configuration**:

**Server Architecture Security**:
- **[Server-Side OAuth Proxy](../../fastmcp_docs/servers/auth/oauth-proxy.mdx)** - Production OAuth Proxy architecture, server-side authentication deployment, and enterprise security patterns
- **[Azure Integrations](../../fastmcp_docs/integrations/azure.mdx)** - Comprehensive Azure integration security, infrastructure security patterns, and production deployment security
- **[Server Middleware](../../fastmcp_docs/servers/middleware.mdx)** - Server-level security middleware, enterprise middleware deployment, and security architecture

**Azure OAuth Configuration (SDK)**:
- **[Azure Provider](../../fastmcp_docs/python-sdk/fastmcp-server-auth-providers-azure.mdx)** - Official Azure OAuth provider configuration, tenant setup, and Azure AD integration patterns
- **[OAuth Proxy](../../fastmcp_docs/python-sdk/fastmcp-server-auth-oauth_proxy.mdx)** - OAuth Proxy security configuration, enterprise authentication flows, and token management

**Security Middleware (SDK)**:
- **[Error Handling](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-error_handling.mdx)** - Secure error handling patterns, security diagnostics, and error logging
- **[Rate Limiting](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-rate_limiting.mdx)** - Security-focused rate limiting, DDoS protection, and abuse prevention
- **[Middleware Framework](../../fastmcp_docs/python-sdk/fastmcp-server-middleware-middleware.mdx)** - Authentication context access, security middleware pipeline, and authorization patterns

**Project Security Documentation**:
- **[Azure OAuth Configuration Guide](../AZURE_OAUTH_CONFIGURATION.md)** - Project-specific Azure setup with security best practices
- **[FastMCP Documentation Index](../FASTMCP_DOCUMENTATION_INDEX.md)** - Complete navigation for security-related documentation

## Core Security Expertise

### 1. Azure OAuth Implementation
- **Azure AD App Registration**: Complete setup and configuration guidance
- **OAuth Proxy Patterns**: FastMCP OAuth Proxy with non-DCR authentication
- **JWT Token Validation**: Azure JWKS endpoint integration and caching
- **Role-Based Access Control**: Admin/user permissions with tenant isolation
- **Security Compliance**: Enterprise security standards and audit requirements

### 2. Azure AD App Registration Configuration
```bash
#!/bin/bash
# Azure AD App Registration Script for MCP Registry Gateway
# File: scripts/setup-azure-auth.sh

set -e

APP_NAME="mcp-registry-gateway"
TENANT_ID="$1"
REDIRECT_URI_DEV="http://localhost:8001/oauth/callback"
REDIRECT_URI_PROD="https://your-domain.com/oauth/callback"

if [ -z "$TENANT_ID" ]; then
    echo "Usage: $0 <tenant_id>"
    echo "Get your tenant ID from: https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview"
    exit 1
fi

echo "🔐 Setting up Azure AD App Registration for MCP Registry Gateway..."

# Create app registration
echo "Creating app registration..."
APP_ID=$(az ad app create \
    --display-name "$APP_NAME" \
    --web-redirect-uris "$REDIRECT_URI_DEV" "$REDIRECT_URI_PROD" \
    --required-resource-accesses '[
        {
            "resourceAppId": "00000003-0000-0000-c000-000000000000",
            "resourceAccess": [
                {
                    "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
                    "type": "Scope"
                },
                {
                    "id": "14dad69e-099b-42c9-810b-d002981feec1",
                    "type": "Scope"
                },
                {
                    "id": "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0",
                    "type": "Scope"
                },
                {
                    "id": "37f7f235-527c-4136-accd-4a02d197296e",
                    "type": "Scope"
                }
            ]
        }
    ]' \
    --query appId -o tsv)

echo "✅ App registration created with ID: $APP_ID"

# Create client secret
echo "Creating client secret..."
CLIENT_SECRET=$(az ad app credential reset \
    --id "$APP_ID" \
    --credential-description "MCP Registry Gateway Secret" \
    --query password -o tsv)

echo "✅ Client secret created (save this securely)"

# Configure app roles for RBAC
echo "Configuring app roles..."
az ad app update --id "$APP_ID" --app-roles '[
    {
        "allowedMemberTypes": ["User"],
        "description": "Administrator access to MCP Gateway",
        "displayName": "Admin",
        "id": "'$(uuidgen)'",
        "isEnabled": true,
        "value": "admin"
    },
    {
        "allowedMemberTypes": ["User"],
        "description": "Standard user access to MCP Gateway", 
        "displayName": "User",
        "id": "'$(uuidgen)'",
        "isEnabled": true,
        "value": "user"
    }
]'

echo "✅ App roles configured"

# Output environment variables
echo ""
echo "🔧 Add these environment variables to your .env file:"
echo "MREG_AZURE_TENANT_ID=$TENANT_ID"
echo "MREG_AZURE_CLIENT_ID=$APP_ID"
echo "MREG_AZURE_CLIENT_SECRET=$CLIENT_SECRET"
echo "MREG_FASTMCP_OAUTH_CALLBACK_URL=$REDIRECT_URI_DEV"
echo "MREG_FASTMCP_OAUTH_SCOPES=User.Read profile openid email"
echo ""

echo "📋 Next steps:"
echo "1. Grant admin consent for API permissions in Azure Portal"
echo "2. Assign users to app roles"
echo "3. Test OAuth flow with: uv run mcp-gateway serve --port 8000"
echo "4. Visit: http://localhost:8000/oauth/login"
```

### 3. JWT Token Security Implementation
```python
# Enhanced JWT token validation with security features
# File: src/mcp_registry_gateway/auth/jwt_validator.py

import jwt
import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import hashlib
import json
import logging
from dataclasses import dataclass

@dataclass
class TokenValidationResult:
    """Result of token validation with security metadata."""
    valid: bool
    claims: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    security_flags: Optional[Dict[str, Any]] = None
    validation_time_ms: float = 0.0

class EnhancedJWTValidator:
    """Enhanced JWT validator with security monitoring and compliance features."""
    
    def __init__(self, tenant_id: str, client_id: str, audience: Optional[str] = None):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.audience = audience or client_id
        
        # Security configuration
        self.max_token_age_minutes = 60  # Maximum token age
        self.jwks_cache = {}
        self.jwks_cache_expiry = None
        self.blocked_tokens = set()  # Token revocation list
        
        # Security monitoring
        self.security_events = []
        self.validation_stats = {
            "total_validations": 0,
            "successful_validations": 0,
            "failed_validations": 0,
            "security_violations": 0,
            "avg_validation_time_ms": 0.0
        }
    
    async def validate_token(self, token: str, require_roles: List[str] = None) -> TokenValidationResult:
        """Validate JWT token with comprehensive security checks."""
        
        start_time = asyncio.get_event_loop().time()
        
        result = TokenValidationResult(valid=False)
        
        try:
            # Pre-validation security checks
            security_flags = await self._perform_security_checks(token)
            result.security_flags = security_flags
            
            if security_flags.get("blocked", False):
                result.error = "Token is revoked or blocked"
                self._record_security_event("blocked_token_attempt", {"token_hash": self._hash_token(token)})
                return result
            
            # Get JWKS keys
            jwks_keys = await self._get_jwks_keys()
            
            # Decode and validate token
            decoded_token = jwt.decode(
                token,
                key=jwks_keys,
                algorithms=["RS256"],
                audience=self.audience,
                issuer=f"https://login.microsoftonline.com/{self.tenant_id}/v2.0",
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_nbf": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True
                }
            )
            
            # Additional security validations
            if not await self._validate_token_claims(decoded_token):
                result.error = "Token claims validation failed"
                return result
            
            # Role-based authorization check
            if require_roles:
                user_roles = decoded_token.get("roles", [])
                if not any(role in user_roles for role in require_roles):
                    result.error = f"Insufficient permissions. Required roles: {require_roles}"
                    self._record_security_event("insufficient_permissions", {
                        "required_roles": require_roles,
                        "user_roles": user_roles,
                        "user_id": decoded_token.get("sub")
                    })
                    return result
            
            # Success
            result.valid = True
            result.claims = decoded_token
            
            self.validation_stats["successful_validations"] += 1
            
        except jwt.ExpiredSignatureError:
            result.error = "Token has expired"
            self._record_security_event("expired_token", {"token_hash": self._hash_token(token)})
        except jwt.InvalidAudienceError:
            result.error = "Invalid token audience"
            self._record_security_event("invalid_audience", {"expected": self.audience})
        except jwt.InvalidIssuerError:
            result.error = "Invalid token issuer"
            self._record_security_event("invalid_issuer", {"token_hash": self._hash_token(token)})
        except jwt.InvalidSignatureError:
            result.error = "Invalid token signature"
            self._record_security_event("invalid_signature", {"token_hash": self._hash_token(token)})
        except jwt.InvalidTokenError as e:
            result.error = f"Invalid token: {str(e)}"
            self._record_security_event("invalid_token", {"error": str(e)})
        except Exception as e:
            result.error = f"Token validation error: {str(e)}"
            self._record_security_event("validation_error", {"error": str(e)})
            
        # Record statistics
        validation_time = (asyncio.get_event_loop().time() - start_time) * 1000
        result.validation_time_ms = validation_time
        
        self.validation_stats["total_validations"] += 1
        if not result.valid:
            self.validation_stats["failed_validations"] += 1
        
        # Update average validation time
        total = self.validation_stats["total_validations"]
        current_avg = self.validation_stats["avg_validation_time_ms"]
        self.validation_stats["avg_validation_time_ms"] = (
            (current_avg * (total - 1) + validation_time) / total
        )
        
        return result
    
    async def _perform_security_checks(self, token: str) -> Dict[str, Any]:
        """Perform comprehensive security checks on the token."""
        
        flags = {
            "blocked": False,
            "suspicious": False,
            "rate_limited": False,
            "security_score": 100
        }
        
        # Check if token is in revocation list
        token_hash = self._hash_token(token)
        if token_hash in self.blocked_tokens:
            flags["blocked"] = True
            flags["security_score"] = 0
            return flags
        
        # Check token structure without validation
        try:
            header = jwt.get_unverified_header(token)
            payload = jwt.decode(token, options={"verify_signature": False})
            
            # Check for suspicious patterns
            if "kid" not in header:
                flags["suspicious"] = True
                flags["security_score"] -= 20
            
            # Check token age
            iat = payload.get("iat")
            if iat:
                token_age_minutes = (datetime.utcnow().timestamp() - iat) / 60
                if token_age_minutes > self.max_token_age_minutes:
                    flags["suspicious"] = True
                    flags["security_score"] -= 30
            
            # Check for unusual claims
            expected_claims = ["iss", "sub", "aud", "exp", "iat", "nbf"]
            missing_claims = [claim for claim in expected_claims if claim not in payload]
            if missing_claims:
                flags["suspicious"] = True
                flags["security_score"] -= len(missing_claims) * 10
            
        except Exception as e:
            flags["suspicious"] = True
            flags["security_score"] = 0
            logging.warning(f"Token security check failed: {e}")
        
        return flags
    
    async def _validate_token_claims(self, claims: Dict[str, Any]) -> bool:
        """Validate token claims for security compliance."""
        
        # Validate required claims
        required_claims = ["sub", "iss", "aud", "exp", "iat", "tid"]
        for claim in required_claims:
            if claim not in claims:
                self._record_security_event("missing_claim", {"claim": claim})
                return False
        
        # Validate tenant ID
        if claims.get("tid") != self.tenant_id:
            self._record_security_event("invalid_tenant", {
                "expected": self.tenant_id,
                "actual": claims.get("tid")
            })
            return False
        
        # Validate subject format (should be a GUID)
        subject = claims.get("sub")
        if not self._is_valid_guid(subject):
            self._record_security_event("invalid_subject_format", {"subject": subject})
            return False
        
        # Check for token replay (using 'jti' if available)
        jti = claims.get("jti")
        if jti and self._is_token_replayed(jti):
            self._record_security_event("token_replay", {"jti": jti})
            return False
        
        return True
    
    async def _get_jwks_keys(self) -> Dict[str, Any]:
        """Get JWKS keys with caching and security validation."""
        
        # Check cache
        if (self.jwks_cache_expiry and 
            datetime.utcnow() < self.jwks_cache_expiry and 
            self.jwks_cache):
            return self.jwks_cache
        
        # Fetch from Azure with security validation
        jwks_url = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                jwks_url,
                timeout=aiohttp.ClientTimeout(total=10),
                headers={"User-Agent": "MCP-Registry-Gateway-Security/1.0"}
            ) as response:
                
                if response.status != 200:
                    raise Exception(f"Failed to fetch JWKS: HTTP {response.status}")
                
                # Validate content type
                content_type = response.headers.get("content-type", "")
                if "application/json" not in content_type:
                    raise Exception(f"Invalid JWKS content type: {content_type}")
                
                jwks_data = await response.json()
                
                # Validate JWKS structure
                if "keys" not in jwks_data or not isinstance(jwks_data["keys"], list):
                    raise Exception("Invalid JWKS structure")
                
                # Process and validate keys
                processed_keys = {}
                for key_data in jwks_data["keys"]:
                    try:
                        # Validate key structure
                        if not all(field in key_data for field in ["kty", "use", "kid", "n", "e"]):
                            continue
                        
                        # Only accept RSA keys for signing
                        if key_data["kty"] != "RSA" or key_data["use"] != "sig":
                            continue
                        
                        # Convert to cryptographic key
                        key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
                        processed_keys[key_data["kid"]] = key
                        
                    except Exception as e:
                        logging.warning(f"Failed to process JWKS key {key_data.get('kid', 'unknown')}: {e}")
                
                if not processed_keys:
                    raise Exception("No valid keys found in JWKS")
                
                # Cache keys for 1 hour
                self.jwks_cache = processed_keys
                self.jwks_cache_expiry = datetime.utcnow() + timedelta(hours=1)
                
                return processed_keys
    
    def revoke_token(self, token: str, reason: str = "manual_revocation"):
        """Add token to revocation list."""
        token_hash = self._hash_token(token)
        self.blocked_tokens.add(token_hash)
        
        self._record_security_event("token_revoked", {
            "token_hash": token_hash,
            "reason": reason
        })
    
    def _hash_token(self, token: str) -> str:
        """Create secure hash of token for tracking."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def _is_valid_guid(self, value: str) -> bool:
        """Validate GUID format."""
        if not value or len(value) != 36:
            return False
        
        import re
        guid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return bool(re.match(guid_pattern, value, re.IGNORECASE))
    
    def _is_token_replayed(self, jti: str) -> bool:
        """Check if token ID has been used before (implement with Redis/database)."""
        # Implementation would check against a store of used JTIs
        # For now, return False (no replay detected)
        return False
    
    def _record_security_event(self, event_type: str, event_data: Dict[str, Any]):
        """Record security event for monitoring and compliance."""
        
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "data": event_data,
            "source": "jwt_validator"
        }
        
        self.security_events.append(event)
        
        # Keep only last 1000 events
        if len(self.security_events) > 1000:
            self.security_events = self.security_events[-1000:]
        
        # Log security violations
        if event_type in ["blocked_token_attempt", "invalid_signature", "token_replay"]:
            logging.warning(f"Security violation: {event_type} - {event_data}")
            self.validation_stats["security_violations"] += 1
    
    def get_security_metrics(self) -> Dict[str, Any]:
        """Get security and validation metrics."""
        
        return {
            "validation_stats": self.validation_stats.copy(),
            "security_events_count": len(self.security_events),
            "blocked_tokens_count": len(self.blocked_tokens),
            "jwks_cache_status": {
                "cached": bool(self.jwks_cache),
                "expires_at": self.jwks_cache_expiry.isoformat() if self.jwks_cache_expiry else None,
                "keys_count": len(self.jwks_cache)
            },
            "recent_security_events": self.security_events[-10:]  # Last 10 events
        }
```

### 4. Role-Based Access Control Implementation
```python
# Enhanced RBAC implementation with tenant isolation
# File: src/mcp_registry_gateway/auth/rbac_manager.py

from typing import List, Dict, Any, Optional, Set
from enum import Enum
from dataclasses import dataclass
import json
from datetime import datetime

class Permission(Enum):
    """Available permissions in the system."""
    # Server management
    LIST_SERVERS = "list_servers"
    REGISTER_SERVER = "register_server"
    MODIFY_SERVER = "modify_server"
    DELETE_SERVER = "delete_server"
    
    # Proxy operations
    PROXY_REQUEST = "proxy_request"
    VIEW_PROXY_LOGS = "view_proxy_logs"
    
    # System administration
    VIEW_SYSTEM_CONFIG = "view_system_config"
    MODIFY_SYSTEM_CONFIG = "modify_system_config"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    MANAGE_USERS = "manage_users"
    
    # Health and monitoring
    VIEW_HEALTH_STATUS = "view_health_status"
    VIEW_METRICS = "view_metrics"

@dataclass
class Role:
    """Role definition with permissions."""
    name: str
    permissions: Set[Permission]
    description: str
    tenant_scoped: bool = True

@dataclass
class UserContext:
    """User context with roles and tenant information."""
    user_id: str
    email: str
    roles: List[str]
    tenant_id: str
    permissions: Set[Permission]

class RBACManager:
    """Role-Based Access Control manager with tenant isolation."""
    
    def __init__(self):
        # Define system roles
        self.roles = {
            "admin": Role(
                name="admin",
                permissions={
                    Permission.LIST_SERVERS,
                    Permission.REGISTER_SERVER,
                    Permission.MODIFY_SERVER,
                    Permission.DELETE_SERVER,
                    Permission.PROXY_REQUEST,
                    Permission.VIEW_PROXY_LOGS,
                    Permission.VIEW_SYSTEM_CONFIG,
                    Permission.MODIFY_SYSTEM_CONFIG,
                    Permission.VIEW_AUDIT_LOGS,
                    Permission.MANAGE_USERS,
                    Permission.VIEW_HEALTH_STATUS,
                    Permission.VIEW_METRICS
                },
                description="Full administrative access",
                tenant_scoped=True
            ),
            
            "user": Role(
                name="user",
                permissions={
                    Permission.LIST_SERVERS,
                    Permission.PROXY_REQUEST,
                    Permission.VIEW_HEALTH_STATUS
                },
                description="Standard user access",
                tenant_scoped=True
            ),
            
            "readonly": Role(
                name="readonly",
                permissions={
                    Permission.LIST_SERVERS,
                    Permission.VIEW_HEALTH_STATUS,
                    Permission.VIEW_METRICS
                },
                description="Read-only access",
                tenant_scoped=True
            )
        }
        
        # Permission hierarchy (for future expansion)
        self.permission_hierarchy = {
            Permission.MODIFY_SERVER: [Permission.LIST_SERVERS],
            Permission.DELETE_SERVER: [Permission.LIST_SERVERS, Permission.MODIFY_SERVER],
            Permission.VIEW_AUDIT_LOGS: [Permission.VIEW_HEALTH_STATUS],
            Permission.MODIFY_SYSTEM_CONFIG: [Permission.VIEW_SYSTEM_CONFIG]
        }
    
    def create_user_context(self, jwt_claims: Dict[str, Any]) -> UserContext:
        """Create user context from JWT claims."""
        
        user_id = jwt_claims.get("sub")
        email = jwt_claims.get("email") or jwt_claims.get("upn") or jwt_claims.get("preferred_username")
        tenant_id = jwt_claims.get("tid")
        
        # Extract roles from JWT claims
        role_claims = jwt_claims.get("roles", [])
        if isinstance(role_claims, str):
            role_claims = [role_claims]
        
        # Default to 'user' role if no roles specified
        if not role_claims:
            role_claims = ["user"]
        
        # Calculate effective permissions
        effective_permissions = set()
        for role_name in role_claims:
            if role_name in self.roles:
                role = self.roles[role_name]
                effective_permissions.update(role.permissions)
                
                # Add implied permissions from hierarchy
                for permission in role.permissions:
                    implied = self.permission_hierarchy.get(permission, [])
                    effective_permissions.update(implied)
        
        return UserContext(
            user_id=user_id,
            email=email,
            roles=role_claims,
            tenant_id=tenant_id,
            permissions=effective_permissions
        )
    
    def check_permission(
        self, 
        user_context: UserContext, 
        permission: Permission,
        resource_tenant_id: Optional[str] = None
    ) -> bool:
        """Check if user has specific permission with tenant isolation."""
        
        # Check if user has the permission
        if permission not in user_context.permissions:
            return False
        
        # Apply tenant isolation if resource is tenant-scoped
        if resource_tenant_id and user_context.tenant_id != resource_tenant_id:
            return False
        
        return True
    
    def check_tool_access(self, user_context: UserContext, tool_name: str) -> bool:
        """Check if user can access specific MCP tool."""
        
        tool_permission_map = {
            "list_servers": Permission.LIST_SERVERS,
            "register_server": Permission.REGISTER_SERVER,
            "proxy_request": Permission.PROXY_REQUEST,
            "health_check": Permission.VIEW_HEALTH_STATUS,
            "get_metrics": Permission.VIEW_METRICS
        }
        
        required_permission = tool_permission_map.get(tool_name)
        if not required_permission:
            # Unknown tool - deny access
            return False
        
        return self.check_permission(user_context, required_permission)
    
    def check_resource_access(
        self, 
        user_context: UserContext, 
        resource_uri: str
    ) -> bool:
        """Check if user can access specific MCP resource."""
        
        # Parse resource URI to determine required permissions
        if resource_uri.startswith("config://"):
            required_permission = Permission.VIEW_SYSTEM_CONFIG
        else:
            # Unknown resource type - deny access
            return False
        
        return self.check_permission(user_context, required_permission)
    
    def get_accessible_tools(self, user_context: UserContext) -> List[str]:
        """Get list of tools accessible to user."""
        
        accessible_tools = []
        
        tool_permission_map = {
            "list_servers": Permission.LIST_SERVERS,
            "register_server": Permission.REGISTER_SERVER,
            "proxy_request": Permission.PROXY_REQUEST,
            "health_check": Permission.VIEW_HEALTH_STATUS
        }
        
        for tool_name, permission in tool_permission_map.items():
            if self.check_permission(user_context, permission):
                accessible_tools.append(tool_name)
        
        return accessible_tools
    
    def get_user_summary(self, user_context: UserContext) -> Dict[str, Any]:
        """Get user access summary for audit purposes."""
        
        return {
            "user_id": user_context.user_id,
            "email": user_context.email,
            "tenant_id": user_context.tenant_id,
            "roles": user_context.roles,
            "permissions": [perm.value for perm in user_context.permissions],
            "accessible_tools": self.get_accessible_tools(user_context),
            "is_admin": "admin" in user_context.roles,
            "access_level": "admin" if "admin" in user_context.roles else "user"
        }
    
    def audit_permission_check(
        self,
        user_context: UserContext,
        permission: Permission,
        resource: str,
        granted: bool
    ) -> Dict[str, Any]:
        """Create audit record for permission check."""
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_context.user_id,
            "tenant_id": user_context.tenant_id,
            "permission": permission.value,
            "resource": resource,
            "granted": granted,
            "user_roles": user_context.roles
        }
```

### 5. Security Monitoring and Compliance
```python
# Security monitoring and compliance reporting
# File: src/mcp_registry_gateway/auth/security_monitor.py

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import json
import logging

class SecurityEventType(Enum):
    """Types of security events."""
    AUTHENTICATION_SUCCESS = "auth_success"
    AUTHENTICATION_FAILURE = "auth_failure"
    AUTHORIZATION_DENIED = "authz_denied"
    TOKEN_EXPIRED = "token_expired"
    INVALID_TOKEN = "invalid_token"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    PRIVILEGE_ESCALATION_ATTEMPT = "privilege_escalation"
    TOKEN_REVOKED = "token_revoked"

@dataclass
class SecurityEvent:
    """Security event record."""
    timestamp: datetime
    event_type: SecurityEventType
    user_id: Optional[str]
    tenant_id: Optional[str]
    source_ip: Optional[str]
    user_agent: Optional[str]
    resource: Optional[str]
    details: Dict[str, Any]
    severity: str  # "low", "medium", "high", "critical"

class SecurityMonitor:
    """Security monitoring and alerting system."""
    
    def __init__(self, alert_webhook_url: Optional[str] = None):
        self.events: List[SecurityEvent] = []
        self.alert_webhook_url = alert_webhook_url
        self.monitoring_active = True
        
        # Thresholds for alerting
        self.alert_thresholds = {
            "failed_auth_per_minute": 10,
            "failed_auth_per_user_per_hour": 20,
            "suspicious_activity_per_hour": 5,
            "privilege_escalation_per_day": 1
        }
        
        # Statistics
        self.stats = {
            "total_events": 0,
            "events_by_type": {},
            "events_by_severity": {"low": 0, "medium": 0, "high": 0, "critical": 0},
            "unique_users": set(),
            "unique_tenants": set()
        }
    
    async def start_monitoring(self):
        """Start security monitoring background task."""
        
        while self.monitoring_active:
            try:
                await self._check_security_thresholds()
                await self._cleanup_old_events()
                await asyncio.sleep(60)  # Check every minute
            except Exception as e:
                logging.error(f"Security monitoring error: {e}")
                await asyncio.sleep(60)
    
    def record_event(
        self,
        event_type: SecurityEventType,
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        source_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "low"
    ):
        """Record a security event."""
        
        event = SecurityEvent(
            timestamp=datetime.utcnow(),
            event_type=event_type,
            user_id=user_id,
            tenant_id=tenant_id,
            source_ip=source_ip,
            user_agent=user_agent,
            resource=resource,
            details=details or {},
            severity=severity
        )
        
        self.events.append(event)
        
        # Update statistics
        self.stats["total_events"] += 1
        
        event_type_str = event_type.value
        self.stats["events_by_type"][event_type_str] = self.stats["events_by_type"].get(event_type_str, 0) + 1
        
        self.stats["events_by_severity"][severity] += 1
        
        if user_id:
            self.stats["unique_users"].add(user_id)
        if tenant_id:
            self.stats["unique_tenants"].add(tenant_id)
        
        # Immediate alerting for critical events
        if severity == "critical":
            asyncio.create_task(self._send_immediate_alert(event))
        
        # Log security events
        logging.info(f"Security event: {event_type.value} - User: {user_id}, Severity: {severity}")
    
    async def _check_security_thresholds(self):
        """Check security thresholds and trigger alerts."""
        
        now = datetime.utcnow()
        
        # Check failed authentication rate
        failed_auth_count = len([
            event for event in self.events
            if (event.event_type == SecurityEventType.AUTHENTICATION_FAILURE and
                event.timestamp > now - timedelta(minutes=1))
        ])
        
        if failed_auth_count > self.alert_thresholds["failed_auth_per_minute"]:
            await self._trigger_alert(
                "High authentication failure rate",
                f"{failed_auth_count} failed authentications in the last minute",
                "high"
            )
        
        # Check per-user failed authentication rate
        user_failures = {}
        for event in self.events:
            if (event.event_type == SecurityEventType.AUTHENTICATION_FAILURE and
                event.timestamp > now - timedelta(hours=1) and
                event.user_id):
                user_failures[event.user_id] = user_failures.get(event.user_id, 0) + 1
        
        for user_id, failure_count in user_failures.items():
            if failure_count > self.alert_thresholds["failed_auth_per_user_per_hour"]:
                await self._trigger_alert(
                    "Repeated authentication failures",
                    f"User {user_id} has {failure_count} failed authentications in the last hour",
                    "medium"
                )
        
        # Check suspicious activity
        suspicious_count = len([
            event for event in self.events
            if (event.event_type == SecurityEventType.SUSPICIOUS_ACTIVITY and
                event.timestamp > now - timedelta(hours=1))
        ])
        
        if suspicious_count > self.alert_thresholds["suspicious_activity_per_hour"]:
            await self._trigger_alert(
                "High suspicious activity",
                f"{suspicious_count} suspicious activities in the last hour",
                "high"
            )
        
        # Check privilege escalation attempts
        escalation_count = len([
            event for event in self.events
            if (event.event_type == SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT and
                event.timestamp > now - timedelta(days=1))
        ])
        
        if escalation_count > self.alert_thresholds["privilege_escalation_per_day"]:
            await self._trigger_alert(
                "Privilege escalation attempts detected",
                f"{escalation_count} privilege escalation attempts in the last day",
                "critical"
            )
    
    async def _send_immediate_alert(self, event: SecurityEvent):
        """Send immediate alert for critical events."""
        
        alert_message = f"CRITICAL SECURITY EVENT: {event.event_type.value}"
        alert_details = f"User: {event.user_id}, Tenant: {event.tenant_id}, Details: {event.details}"
        
        await self._trigger_alert(alert_message, alert_details, "critical")
    
    async def _trigger_alert(self, title: str, message: str, severity: str):
        """Trigger security alert."""
        
        alert = {
            "timestamp": datetime.utcnow().isoformat(),
            "title": title,
            "message": message,
            "severity": severity,
            "source": "mcp-registry-gateway-security"
        }
        
        # Log alert
        logging.warning(f"SECURITY ALERT [{severity.upper()}]: {title} - {message}")
        
        # Send webhook if configured
        if self.alert_webhook_url:
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    await session.post(
                        self.alert_webhook_url,
                        json=alert,
                        timeout=aiohttp.ClientTimeout(total=10)
                    )
            except Exception as e:
                logging.error(f"Failed to send security alert webhook: {e}")
    
    async def _cleanup_old_events(self):
        """Cleanup old security events to manage memory."""
        
        # Keep events for 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        old_count = len(self.events)
        self.events = [event for event in self.events if event.timestamp > cutoff_date]
        new_count = len(self.events)
        
        if old_count != new_count:
            logging.info(f"Cleaned up {old_count - new_count} old security events")
    
    def get_security_dashboard(self) -> Dict[str, Any]:
        """Get security dashboard data."""
        
        now = datetime.utcnow()
        
        # Recent events (last 24 hours)
        recent_events = [
            event for event in self.events
            if event.timestamp > now - timedelta(hours=24)
        ]
        
        # Top users by activity
        user_activity = {}
        for event in recent_events:
            if event.user_id:
                user_activity[event.user_id] = user_activity.get(event.user_id, 0) + 1
        
        top_users = sorted(user_activity.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Event timeline (last 24 hours by hour)
        event_timeline = {}
        for event in recent_events:
            hour = event.timestamp.replace(minute=0, second=0, microsecond=0)
            hour_str = hour.isoformat()
            event_timeline[hour_str] = event_timeline.get(hour_str, 0) + 1
        
        return {
            "summary": {
                "total_events": self.stats["total_events"],
                "recent_events_24h": len(recent_events),
                "unique_users": len(self.stats["unique_users"]),
                "unique_tenants": len(self.stats["unique_tenants"])
            },
            "events_by_type": dict(self.stats["events_by_type"]),
            "events_by_severity": dict(self.stats["events_by_severity"]),
            "top_users_24h": top_users,
            "event_timeline_24h": event_timeline,
            "recent_critical_events": [
                {
                    "timestamp": event.timestamp.isoformat(),
                    "type": event.event_type.value,
                    "user_id": event.user_id,
                    "details": event.details
                }
                for event in recent_events
                if event.severity == "critical"
            ][-10:]  # Last 10 critical events
        }
    
    def generate_compliance_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Generate security compliance report for a date range."""
        
        filtered_events = [
            event for event in self.events
            if start_date <= event.timestamp <= end_date
        ]
        
        # Authentication metrics
        auth_success_count = len([e for e in filtered_events if e.event_type == SecurityEventType.AUTHENTICATION_SUCCESS])
        auth_failure_count = len([e for e in filtered_events if e.event_type == SecurityEventType.AUTHENTICATION_FAILURE])
        
        auth_success_rate = (auth_success_count / (auth_success_count + auth_failure_count) * 100) if (auth_success_count + auth_failure_count) > 0 else 0
        
        # Security violations
        security_violations = [e for e in filtered_events if e.severity in ["high", "critical"]]
        
        # User activity analysis
        user_activities = {}
        for event in filtered_events:
            if event.user_id:
                if event.user_id not in user_activities:
                    user_activities[event.user_id] = {"total": 0, "failures": 0, "successes": 0}
                
                user_activities[event.user_id]["total"] += 1
                
                if event.event_type == SecurityEventType.AUTHENTICATION_SUCCESS:
                    user_activities[event.user_id]["successes"] += 1
                elif event.event_type == SecurityEventType.AUTHENTICATION_FAILURE:
                    user_activities[event.user_id]["failures"] += 1
        
        return {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "duration_days": (end_date - start_date).days
            },
            "authentication_metrics": {
                "total_attempts": auth_success_count + auth_failure_count,
                "successful_authentications": auth_success_count,
                "failed_authentications": auth_failure_count,
                "success_rate_percentage": round(auth_success_rate, 2)
            },
            "security_summary": {
                "total_events": len(filtered_events),
                "security_violations": len(security_violations),
                "critical_events": len([e for e in filtered_events if e.severity == "critical"]),
                "unique_users": len(set(e.user_id for e in filtered_events if e.user_id)),
                "unique_tenants": len(set(e.tenant_id for e in filtered_events if e.tenant_id))
            },
            "top_security_risks": [
                {
                    "timestamp": event.timestamp.isoformat(),
                    "type": event.event_type.value,
                    "severity": event.severity,
                    "user_id": event.user_id,
                    "details": event.details
                }
                for event in sorted(security_violations, key=lambda x: x.timestamp, reverse=True)[:10]
            ],
            "user_activity_summary": {
                user_id: {
                    **activity,
                    "risk_score": min(100, activity["failures"] * 10)  # Simple risk scoring
                }
                for user_id, activity in sorted(
                    user_activities.items(),
                    key=lambda x: x[1]["failures"],
                    reverse=True
                )[:20]  # Top 20 users by activity
            }
        }
```

This security auditor provides comprehensive Azure OAuth security, JWT validation, role-based access control, and security monitoring capabilities for the MCP Registry Gateway, ensuring enterprise-grade authentication and compliance standards.