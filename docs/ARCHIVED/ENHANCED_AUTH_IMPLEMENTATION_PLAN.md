# Enhanced Authentication Implementation Plan
**Building on Unified FastMCP OAuth Proxy Architecture**

## 🎯 Implementation Strategy Overview

This plan enhances the existing unified FastAPI/FastMCP architecture by extending the current Azure OAuth implementation with modern authentication features while preserving all architectural achievements.

### Core Principles
- ✅ **Build on existing FastMCP OAuth Proxy** (no replacement)
- ✅ **Maintain unified single-server** architecture (port 8000)
- ✅ **Extend existing database schema** (public schema only)
- ✅ **Preserve MREG_ configuration** pattern
- ✅ **Zero breaking changes** to existing functionality

## 📋 Detailed Implementation Plan

### Phase 1: Enhanced Session Management (Week 1, Days 1-2)

#### 1.1 Enhanced Session Manager Implementation
**File**: `src/mcp_registry_gateway/auth/enhanced_session_manager.py`

```python
"""Enhanced session management building on existing FastMCP OAuth Proxy."""

import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import uuid
from dataclasses import dataclass

from fastmcp.server.auth import OAuthProxy
import redis.asyncio as redis
from sqlmodel import select

from ..core.config import get_settings
from ..db.database import get_db_session
from ..models.enhanced_auth import EnhancedSession, UserProfile

@dataclass
class SessionContext:
    """Enhanced session context with user profile and tenant information."""
    session_id: str
    user_info: Dict[str, Any]
    user_profile: Optional[UserProfile]
    tenant_context: Dict[str, Any]
    preferences: Dict[str, Any]
    permissions: list[str]
    expires_at: datetime
    last_activity: datetime

class EnhancedSessionManager:
    """Enhanced session management building on FastMCP OAuth Proxy."""
    
    def __init__(self):
        settings = get_settings()
        self.redis_client = redis.from_url(settings.database.redis_url)
        self.session_ttl = settings.fastmcp.session_expire_hours * 3600
        
    async def create_enhanced_session(
        self, 
        oauth_token: str, 
        user_info: Dict[str, Any],
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> SessionContext:
        """Create enhanced session with user context and preferences."""
        
        session_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(seconds=self.session_ttl)
        
        # Load or create user profile
        user_profile = await self._get_or_create_user_profile(user_info['id'])
        
        # Resolve tenant context
        tenant_context = await self._resolve_tenant_context(user_info)
        
        # Load user preferences
        preferences = await self._load_user_preferences(user_info['id'])
        
        # Get user permissions
        permissions = await self._get_user_permissions(user_info['id'])
        
        # Create session context
        session_context = SessionContext(
            session_id=session_id,
            user_info=user_info,
            user_profile=user_profile,
            tenant_context=tenant_context,
            preferences=preferences,
            permissions=permissions,
            expires_at=expires_at,
            last_activity=datetime.utcnow()
        )
        
        # Store in database
        async with get_db_session() as db:
            enhanced_session = EnhancedSession(
                id=uuid.UUID(session_id),
                user_id=uuid.UUID(user_info['id']),
                session_token=session_id,
                oauth_token_hash=self._hash_token(oauth_token),
                user_agent=user_agent,
                ip_address=ip_address,
                tenant_context=tenant_context,
                expires_at=expires_at,
                last_activity=datetime.utcnow()
            )
            db.add(enhanced_session)
            await db.commit()
        
        # Cache in Redis for fast access
        await self._cache_session_context(session_id, session_context)
        
        return session_context
    
    async def get_session_context(self, session_id: str) -> Optional[SessionContext]:
        """Retrieve enhanced session context."""
        
        # Try Redis cache first
        cached = await self.redis_client.get(f"session:{session_id}")
        if cached:
            data = json.loads(cached)
            return SessionContext(**data)
        
        # Fallback to database
        async with get_db_session() as db:
            result = await db.execute(
                select(EnhancedSession).where(EnhancedSession.session_token == session_id)
            )
            session = result.scalar_one_or_none()
            
            if session and session.expires_at > datetime.utcnow():
                # Rebuild session context
                session_context = await self._rebuild_session_context(session)
                await self._cache_session_context(session_id, session_context)
                return session_context
        
        return None
    
    async def _get_or_create_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get or create user profile."""
        async with get_db_session() as db:
            result = await db.execute(
                select(UserProfile).where(UserProfile.user_id == uuid.UUID(user_id))
            )
            profile = result.scalar_one_or_none()
            
            if not profile:
                profile = UserProfile(
                    user_id=uuid.UUID(user_id),
                    preferences={},
                    metadata={}
                )
                db.add(profile)
                await db.commit()
                await db.refresh(profile)
            
            return profile
    
    async def _resolve_tenant_context(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve tenant context from user information."""
        # Extract tenant information from Azure AD user info
        tenant_id = user_info.get('tid', 'default')
        tenant_name = user_info.get('tenant_display_name', 'Default Tenant')
        
        return {
            'tenant_id': tenant_id,
            'tenant_name': tenant_name,
            'is_admin': user_info.get('roles', []).count('admin') > 0,
            'permissions': await self._get_tenant_permissions(tenant_id, user_info['id'])
        }
    
    def _hash_token(self, token: str) -> str:
        """Hash OAuth token for secure storage."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    async def _cache_session_context(self, session_id: str, context: SessionContext):
        """Cache session context in Redis."""
        cache_data = {
            'session_id': context.session_id,
            'user_info': context.user_info,
            'tenant_context': context.tenant_context,
            'preferences': context.preferences,
            'permissions': context.permissions,
            'expires_at': context.expires_at.isoformat(),
            'last_activity': context.last_activity.isoformat()
        }
        
        await self.redis_client.setex(
            f"session:{session_id}",
            self.session_ttl,
            json.dumps(cache_data, default=str)
        )
```

#### 1.2 Enhanced Database Models
**File**: `src/mcp_registry_gateway/models/enhanced_auth.py`

```python
"""Enhanced authentication models extending existing schema."""

from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid

class UserProfile(SQLModel, table=True):
    """Enhanced user profile extending existing user model."""
    __tablename__ = "user_profiles"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)
    display_name: Optional[str] = Field(max_length=255)
    avatar_url: Optional[str] = Field(max_length=500)
    bio: Optional[str] = Field(max_length=1000)
    preferences: Dict[str, Any] = Field(default_factory=dict, sa_column_kwargs={"type_": "JSON"})
    metadata: Dict[str, Any] = Field(default_factory=dict, sa_column_kwargs={"type_": "JSON"})
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class EnhancedSession(SQLModel, table=True):
    """Enhanced session model building on existing session management."""
    __tablename__ = "enhanced_sessions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    session_token: str = Field(unique=True, max_length=255, index=True)
    oauth_token_hash: str = Field(max_length=255)
    user_agent: Optional[str] = Field(max_length=500)
    ip_address: Optional[str] = Field(max_length=45)  # IPv6 support
    tenant_context: Dict[str, Any] = Field(default_factory=dict, sa_column_kwargs={"type_": "JSON"})
    last_activity: datetime = Field(default_factory=datetime.utcnow, index=True)
    expires_at: datetime = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserPreference(SQLModel, table=True):
    """User preferences and settings."""
    __tablename__ = "user_preferences"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    category: str = Field(max_length=100, index=True)
    key: str = Field(max_length=100, index=True)
    value: Dict[str, Any] = Field(sa_column_kwargs={"type_": "JSON"})
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        table_args = (("user_id", "category", "key"), {"unique": True})

class UserTenantMembership(SQLModel, table=True):
    """User tenant membership and roles."""
    __tablename__ = "user_tenant_memberships"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    tenant_id: str = Field(max_length=100, index=True)
    role: str = Field(max_length=50, default="user")
    permissions: List[str] = Field(default_factory=list, sa_column_kwargs={"type_": "JSON"})
    is_active: bool = Field(default=True, index=True)
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: Optional[datetime] = None
    
    class Config:
        table_args = (("user_id", "tenant_id"), {"unique": True})
```

#### 1.3 Database Migration
**File**: `alembic/versions/004_enhanced_auth_tables.py`

```python
"""Enhanced authentication tables

Revision ID: 004_enhanced_auth_tables
Revises: 003_database_performance_indexes  
Create Date: 2025-01-11 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '004_enhanced_auth_tables'
down_revision = '003_database_performance_indexes'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Enhanced user profiles
    op.create_table('user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('bio', sa.String(length=1000), nullable=True),
        sa.Column('preferences', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default=sa.text("'{}'::jsonb")),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_user_profiles_user_id', 'user_profiles', ['user_id'])
    
    # Enhanced sessions
    op.create_table('enhanced_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_token', sa.String(length=255), nullable=False),
        sa.Column('oauth_token_hash', sa.String(length=255), nullable=False),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('tenant_context', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default=sa.text("'{}'::jsonb")),
        sa.Column('last_activity', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('session_token')
    )
    op.create_index('ix_enhanced_sessions_user_id', 'enhanced_sessions', ['user_id'])
    op.create_index('ix_enhanced_sessions_session_token', 'enhanced_sessions', ['session_token'])
    op.create_index('ix_enhanced_sessions_expires_at', 'enhanced_sessions', ['expires_at'])
    op.create_index('ix_enhanced_sessions_last_activity', 'enhanced_sessions', ['last_activity'])
    
    # User preferences
    op.create_table('user_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'category', 'key')
    )
    op.create_index('ix_user_preferences_user_id', 'user_preferences', ['user_id'])
    op.create_index('ix_user_preferences_category', 'user_preferences', ['category'])
    op.create_index('ix_user_preferences_key', 'user_preferences', ['key'])
    
    # User tenant memberships
    op.create_table('user_tenant_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', sa.String(length=100), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, default='user'),
        sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default=sa.text("'[]'::jsonb")),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('joined_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('last_active', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'tenant_id')
    )
    op.create_index('ix_user_tenant_memberships_user_id', 'user_tenant_memberships', ['user_id'])
    op.create_index('ix_user_tenant_memberships_tenant_id', 'user_tenant_memberships', ['tenant_id'])
    op.create_index('ix_user_tenant_memberships_is_active', 'user_tenant_memberships', ['is_active'])

def downgrade() -> None:
    op.drop_table('user_tenant_memberships')
    op.drop_table('user_preferences')
    op.drop_table('enhanced_sessions')
    op.drop_table('user_profiles')
```

### Phase 2: Enhanced API Routes (Week 1, Days 3-4)

#### 2.1 Enhanced Authentication Routes
**File**: `src/mcp_registry_gateway/api/enhanced_auth_routes.py`

```python
"""Enhanced authentication routes building on existing OAuth implementation."""

from datetime import datetime
from typing import Optional, Dict, Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import select

from ..auth.enhanced_session_manager import EnhancedSessionManager, SessionContext
from ..models.enhanced_auth import UserProfile, UserPreference
from ..db.database import get_db_session
from ..core.dependencies import get_current_session

router = APIRouter(prefix="/auth", tags=["Enhanced Authentication"])

# Request/Response Models
class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class PreferenceUpdate(BaseModel):
    category: str
    preferences: Dict[str, Any]

class TenantSwitchRequest(BaseModel):
    tenant_id: str

class EnhancedUserResponse(BaseModel):
    user_info: Dict[str, Any]
    profile: Optional[Dict[str, Any]]
    preferences: Dict[str, Any]
    tenant_context: Dict[str, Any]
    permissions: list[str]
    session_info: Dict[str, Any]

@router.get("/user", response_model=EnhancedUserResponse)
async def get_current_user(
    session: SessionContext = Depends(get_current_session)
) -> EnhancedUserResponse:
    """Enhanced user endpoint with profile, preferences, and tenant context."""
    
    profile_data = None
    if session.user_profile:
        profile_data = {
            "id": str(session.user_profile.id),
            "display_name": session.user_profile.display_name,
            "avatar_url": session.user_profile.avatar_url,
            "bio": session.user_profile.bio,
            "created_at": session.user_profile.created_at.isoformat(),
            "updated_at": session.user_profile.updated_at.isoformat(),
        }
    
    return EnhancedUserResponse(
        user_info=session.user_info,
        profile=profile_data,
        preferences=session.preferences,
        tenant_context=session.tenant_context,
        permissions=session.permissions,
        session_info={
            "session_id": session.session_id,
            "expires_at": session.expires_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
        }
    )

@router.put("/profile")
async def update_user_profile(
    profile_update: UserProfileUpdate,
    session: SessionContext = Depends(get_current_session)
):
    """Update user profile information."""
    
    async with get_db_session() as db:
        # Get or create profile
        result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == uuid.UUID(session.user_info['id']))
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            profile = UserProfile(
                user_id=uuid.UUID(session.user_info['id']),
                preferences={}
            )
            db.add(profile)
        
        # Update fields
        if profile_update.display_name is not None:
            profile.display_name = profile_update.display_name
        if profile_update.bio is not None:
            profile.bio = profile_update.bio
        if profile_update.preferences is not None:
            profile.preferences.update(profile_update.preferences)
        
        profile.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(profile)
    
    return {"status": "updated", "profile_id": str(profile.id)}

@router.post("/preferences")
async def update_user_preferences(
    preference_update: PreferenceUpdate,
    session: SessionContext = Depends(get_current_session)
):
    """Update user preferences by category."""
    
    user_id = uuid.UUID(session.user_info['id'])
    
    async with get_db_session() as db:
        # Update or create each preference in the category
        for key, value in preference_update.preferences.items():
            result = await db.execute(
                select(UserPreference).where(
                    UserPreference.user_id == user_id,
                    UserPreference.category == preference_update.category,
                    UserPreference.key == key
                )
            )
            pref = result.scalar_one_or_none()
            
            if pref:
                pref.value = {"data": value}  # Wrap in JSON structure
                pref.updated_at = datetime.utcnow()
            else:
                pref = UserPreference(
                    user_id=user_id,
                    category=preference_update.category,
                    key=key,
                    value={"data": value}
                )
                db.add(pref)
        
        await db.commit()
    
    return {"status": "updated", "category": preference_update.category}

@router.get("/preferences/{category}")
async def get_user_preferences(
    category: str,
    session: SessionContext = Depends(get_current_session)
):
    """Get user preferences by category."""
    
    user_id = uuid.UUID(session.user_info['id'])
    
    async with get_db_session() as db:
        result = await db.execute(
            select(UserPreference).where(
                UserPreference.user_id == user_id,
                UserPreference.category == category
            )
        )
        preferences = result.scalars().all()
    
    pref_data = {}
    for pref in preferences:
        pref_data[pref.key] = pref.value.get("data") if pref.value else None
    
    return {"category": category, "preferences": pref_data}

@router.post("/tenant/switch")
async def switch_tenant(
    tenant_request: TenantSwitchRequest,
    request: Request,
    session: SessionContext = Depends(get_current_session)
):
    """Switch user's active tenant context."""
    
    # Validate tenant access
    user_id = session.user_info['id']
    has_access = await _validate_tenant_access(user_id, tenant_request.tenant_id)
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to requested tenant"
        )
    
    # Update session with new tenant context
    session_manager = EnhancedSessionManager()
    new_tenant_context = await session_manager._resolve_tenant_context_for_tenant(
        session.user_info, 
        tenant_request.tenant_id
    )
    
    # Update cached session
    await session_manager._update_session_tenant_context(
        session.session_id, 
        new_tenant_context
    )
    
    return {
        "status": "switched",
        "tenant_id": tenant_request.tenant_id,
        "tenant_context": new_tenant_context
    }

@router.get("/sessions")
async def get_user_sessions(
    session: SessionContext = Depends(get_current_session)
):
    """Get user's active sessions."""
    
    user_id = uuid.UUID(session.user_info['id'])
    
    async with get_db_session() as db:
        result = await db.execute(
            select(EnhancedSession).where(
                EnhancedSession.user_id == user_id,
                EnhancedSession.expires_at > datetime.utcnow()
            ).order_by(EnhancedSession.last_activity.desc())
        )
        sessions = result.scalars().all()
    
    session_list = []
    for sess in sessions:
        session_list.append({
            "session_id": str(sess.id),
            "created_at": sess.created_at.isoformat(),
            "last_activity": sess.last_activity.isoformat(),
            "expires_at": sess.expires_at.isoformat(),
            "user_agent": sess.user_agent,
            "ip_address": sess.ip_address,
            "is_current": sess.session_token == session.session_id
        })
    
    return {"sessions": session_list}

async def _validate_tenant_access(user_id: str, tenant_id: str) -> bool:
    """Validate if user has access to tenant."""
    # Implementation would check UserTenantMembership table
    return True  # Placeholder for now
```

#### 2.2 Integration with Unified App
**File**: `src/mcp_registry_gateway/unified_app.py` (modifications)

```python
# Add to imports
from .api.enhanced_auth_routes import router as enhanced_auth_router

# Add to create_unified_app() function after existing routes
def create_unified_app() -> FastAPI:
    # ... existing code ...
    
    # Enhanced Authentication Routes (add after MCP routes)
    app.include_router(enhanced_auth_router)
    
    # Enhanced OAuth Callback (replaces basic callback)
    @app.get("/auth/callback")
    async def enhanced_oauth_callback(
        code: str, 
        state: str,
        request: Request
    ):
        """Enhanced OAuth callback with profile enrichment."""
        
        if not hasattr(app.state, "fastmcp_server"):
            raise HTTPException(status_code=500, detail="FastMCP server not initialized")
        
        # Use existing OAuth proxy for token exchange
        oauth_result = await app.state.fastmcp_server.oauth_proxy.handle_callback(code, state)
        
        # Enhanced session creation
        session_manager = EnhancedSessionManager()
        enhanced_session = await session_manager.create_enhanced_session(
            oauth_result.access_token,
            oauth_result.user_info,
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None
        )
        
        # Enhanced redirect with session context
        redirect_url = f"/dashboard?session_id={enhanced_session.session_id}&welcome=true"
        
        response = RedirectResponse(url=redirect_url)
        
        # Set secure session cookie
        response.set_cookie(
            key="session_id",
            value=enhanced_session.session_id,
            max_age=settings.fastmcp.session_expire_hours * 3600,
            httponly=True,
            secure=not settings.is_development,
            samesite="lax"
        )
        
        return response
    
    # ... rest of existing code ...
```

### Phase 3: Configuration Enhancement (Week 1, Day 5)

#### 3.1 Enhanced FastMCP Settings
**File**: `src/mcp_registry_gateway/core/config.py` (additions to FastMCPSettings class)

```python
# Add to FastMCPSettings class:

# Enhanced Authentication Configuration
enhanced_auth_enabled: bool = Field(
    default=True, env="MREG_FASTMCP_ENHANCED_AUTH_ENABLED"
)
user_profiles_enabled: bool = Field(
    default=True, env="MREG_FASTMCP_USER_PROFILES_ENABLED"  
)
session_management_enhanced: bool = Field(
    default=True, env="MREG_FASTMCP_SESSION_MANAGEMENT_ENHANCED"
)

# Enhanced Session Configuration
session_expire_hours: int = Field(
    default=24, env="MREG_FASTMCP_SESSION_EXPIRE_HOURS"
)
session_refresh_threshold: int = Field(
    default=2, env="MREG_FASTMCP_SESSION_REFRESH_THRESHOLD"  # hours before expiry
)
session_cleanup_interval: int = Field(
    default=3600, env="MREG_FASTMCP_SESSION_CLEANUP_INTERVAL"  # seconds
)

# User Profile Configuration  
profile_cache_ttl: int = Field(
    default=3600, env="MREG_FASTMCP_PROFILE_CACHE_TTL"
)
preferences_storage: str = Field(
    default="database", env="MREG_FASTMCP_PREFERENCES_STORAGE"  # database|redis|both
)
avatar_storage_enabled: bool = Field(
    default=True, env="MREG_FASTMCP_AVATAR_STORAGE_ENABLED"
)

# Multi-Tenant Enhanced Features
tenant_switching_enabled: bool = Field(
    default=True, env="MREG_FASTMCP_TENANT_SWITCHING_ENABLED"
)
tenant_context_caching: bool = Field(
    default=True, env="MREG_FASTMCP_TENANT_CONTEXT_CACHING"
)
role_based_ui_enabled: bool = Field(
    default=True, env="MREG_FASTMCP_ROLE_BASED_UI_ENABLED"
)

@field_validator("preferences_storage")
@classmethod
def validate_preferences_storage(cls, v: str) -> str:
    """Validate preferences storage option."""
    allowed = {"database", "redis", "both"}
    if v not in allowed:
        raise ValueError(f"Invalid preferences storage: {v}. Must be one of {allowed}")
    return v
```

#### 3.2 Consolidated Environment Configuration
**File**: `.env.example` (additions)

```bash
# ============================================================================
# ENHANCED AUTHENTICATION SETTINGS (MREG_ prefix - extends FastMCPSettings)  
# ============================================================================

# Enhanced OAuth Configuration
MREG_FASTMCP_ENHANCED_AUTH_ENABLED=true
MREG_FASTMCP_USER_PROFILES_ENABLED=true
MREG_FASTMCP_SESSION_MANAGEMENT_ENHANCED=true

# Enhanced Session Configuration
MREG_FASTMCP_SESSION_EXPIRE_HOURS=24
MREG_FASTMCP_SESSION_REFRESH_THRESHOLD=2  # hours before expiry
MREG_FASTMCP_SESSION_CLEANUP_INTERVAL=3600  # seconds

# User Profile Configuration
MREG_FASTMCP_PROFILE_CACHE_TTL=3600
MREG_FASTMCP_PREFERENCES_STORAGE=database  # database|redis|both
MREG_FASTMCP_AVATAR_STORAGE_ENABLED=true

# Multi-Tenant Enhanced Features
MREG_FASTMCP_TENANT_SWITCHING_ENABLED=true
MREG_FASTMCP_TENANT_CONTEXT_CACHING=true
MREG_FASTMCP_ROLE_BASED_UI_ENABLED=true

# ============================================================================
# FRONTEND INTEGRATION (for VITE build process)
# ============================================================================
VITE_API_BASE_URL=http://localhost:8000  # Unified server
VITE_AUTH_PROVIDER=azure_enhanced
VITE_ENABLE_USER_PROFILES=true
VITE_ENABLE_PREFERENCES=true  
VITE_ENABLE_TENANT_SWITCHING=true
VITE_ENABLE_SESSION_MANAGEMENT=true
```

### Phase 4: Frontend Integration (Week 2)

#### 4.1 Enhanced Auth Context
**File**: `frontend/src/contexts/EnhancedAuthContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tid: string; // tenant id
}

interface UserProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

interface TenantContext {
  tenant_id: string;
  tenant_name: string;
  is_admin: boolean;
  permissions: string[];
}

interface UserPreferences {
  [category: string]: {
    [key: string]: any;
  };
}

interface SessionInfo {
  session_id: string;
  expires_at: string;
  last_activity: string;
}

interface EnhancedAuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  
  // Enhanced features
  userProfile: UserProfile | null;
  preferences: UserPreferences | null;
  tenantContext: TenantContext | null;
  permissions: string[];
  sessionInfo: SessionInfo | null;
  
  // Authentication methods
  login: () => Promise<void>;
  logout: () => Promise<void>;
  
  // Enhanced methods
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (category: string, prefs: Record<string, any>) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

export const useEnhancedAuth = () => {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

interface EnhancedAuthProviderProps {
  children: React.ReactNode;
}

export const EnhancedAuthProvider: React.FC<EnhancedAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Get stored session token
  const getStoredToken = useCallback(() => {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('session_id');
  }, []);

  // Enhanced API fetch with authentication
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getStoredToken();
    
    const response = await fetch(`${apiBaseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
    });

    if (response.status === 401) {
      // Token expired, redirect to login
      await logout();
      return null;
    }

    return response;
  }, [apiBaseUrl, getStoredToken]);

  // Load current user with enhanced data
  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/auth/user');
      
      if (response && response.ok) {
        const data = await response.json();
        
        setUser(data.user_info);
        setUserProfile(data.profile);
        setPreferences(data.preferences);
        setTenantContext(data.tenant_context);
        setPermissions(data.permissions);
        setSessionInfo(data.session_info);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setUserProfile(null);
        setPreferences(null);
        setTenantContext(null);
        setPermissions([]);
        setSessionInfo(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  // Authentication methods
  const login = useCallback(async () => {
    window.location.href = `${apiBaseUrl}/mcp/oauth/login?enhanced=true`;
  }, [apiBaseUrl]);

  const logout = useCallback(async () => {
    try {
      await authenticatedFetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('session_id');
      setIsAuthenticated(false);
      setUser(null);
      setUserProfile(null);
      setPreferences(null);
      setTenantContext(null);
      setPermissions([]);
      setSessionInfo(null);
      window.location.href = '/';
    }
  }, [authenticatedFetch]);

  // Enhanced methods
  const updateProfile = useCallback(async (profileUpdates: Partial<UserProfile>) => {
    try {
      const response = await authenticatedFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileUpdates),
      });

      if (response && response.ok) {
        // Reload user data to get updated profile
        await loadCurrentUser();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [authenticatedFetch, loadCurrentUser]);

  const updatePreferences = useCallback(async (category: string, prefs: Record<string, any>) => {
    try {
      const response = await authenticatedFetch('/auth/preferences', {
        method: 'POST',
        body: JSON.stringify({ category, preferences: prefs }),
      });

      if (response && response.ok) {
        // Update local preferences state
        setPreferences(current => ({
          ...current,
          [category]: { ...current?.[category], ...prefs }
        }));
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }, [authenticatedFetch]);

  const switchTenant = useCallback(async (tenantId: string) => {
    try {
      const response = await authenticatedFetch('/auth/tenant/switch', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId }),
      });

      if (response && response.ok) {
        const data = await response.json();
        setTenantContext(data.tenant_context);
        // Optionally reload user to get updated permissions
        await loadCurrentUser();
      }
    } catch (error) {
      console.error('Error switching tenant:', error);
      throw error;
    }
  }, [authenticatedFetch, loadCurrentUser]);

  const refreshSession = useCallback(async () => {
    await loadCurrentUser();
  }, [loadCurrentUser]);

  // Initialize auth state on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      loadCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [loadCurrentUser, getStoredToken]);

  // Session refresh interval
  useEffect(() => {
    if (isAuthenticated && sessionInfo) {
      const expiresAt = new Date(sessionInfo.expires_at);
      const now = new Date();
      const timeToExpiry = expiresAt.getTime() - now.getTime();
      
      // Refresh 5 minutes before expiry
      const refreshTime = Math.max(timeToExpiry - 5 * 60 * 1000, 60 * 1000);
      
      const refreshTimeout = setTimeout(() => {
        refreshSession();
      }, refreshTime);
      
      return () => clearTimeout(refreshTimeout);
    }
  }, [isAuthenticated, sessionInfo, refreshSession]);

  const value: EnhancedAuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    userProfile,
    preferences,
    tenantContext,
    permissions,
    sessionInfo,
    login,
    logout,
    updateProfile,
    updatePreferences,
    switchTenant,
    refreshSession,
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};
```

## 🎯 Implementation Timeline

### Week 1: Backend Enhancement
- **Day 1**: Enhanced Session Manager + Database Models
- **Day 2**: Database Migration + Enhanced User Profile Service
- **Day 3**: Enhanced Auth Routes (user, profile, preferences)
- **Day 4**: Enhanced Auth Routes (sessions, tenant switching) + Unified App Integration
- **Day 5**: Configuration Enhancement + Testing

### Week 2: Frontend Integration  
- **Days 1-2**: Enhanced Auth Context + User Profile Components
- **Days 3-4**: Preferences System + Tenant Context UI
- **Day 5**: Integration Testing + Bug Fixes

### Week 3: Polish & Production
- **Days 1-2**: Configuration Consolidation + Documentation Updates
- **Days 3-4**: Comprehensive Testing + Security Review
- **Day 5**: Production Deployment Preparation

## ✅ Success Criteria

### Architecture Preservation ✅
- Unified single-server architecture maintained (port 8000 only)
- 25% memory reduction and 50% fewer connections preserved
- FastMCP OAuth Proxy enhanced, not replaced
- Path-based routing extended with `/auth/*` endpoints
- MREG_ configuration consistency maintained

### Enhanced Features ✅
- Modern user profiles with preferences
- Enterprise session management with activity tracking
- Multi-tenant context switching capability
- Role-based UI features enabled
- Unified configuration management achieved

### Zero Breaking Changes ✅
- Existing OAuth flow preserved and enhanced
- Database schema extended in public schema only
- Configuration enhanced with backward compatibility
- API endpoints added as extensions, not replacements
- Frontend integration builds on existing patterns

This implementation plan delivers modern authentication capabilities while building on and preserving the proven unified architecture achievements.