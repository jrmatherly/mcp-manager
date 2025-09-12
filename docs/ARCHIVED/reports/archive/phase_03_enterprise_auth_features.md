# Phase 3: Enterprise Authentication Features

**Phase**: 3 of 6  
**Duration**: 2-3 weeks  
**Status**: ⏳ **PLANNED**  
**Dependencies**: [Phase 2: Better-Auth Integration](./phase_02_better_auth_integration.md)  

---

## 🎯 **Phase Objectives**

Implement enterprise-grade Better-Auth plugins to create a production-ready authentication system with advanced features for multi-tenant deployment, service-to-service authentication, and comprehensive audit logging.

### **Key Deliverables**
- ⏳ JWT Plugin (service-to-service authentication)
- ⏳ API Key + Bearer Token plugins (programmatic access)
- ⏳ Enhanced Rate Limiting (per-tenant fairness algorithm)
- ⏳ Organization Plugin (multi-tenancy with isolation)
- ⏳ Admin Plugin (centralized user management)
- ⏳ Advanced Session Management (production security)
- ⏳ Database Lifecycle Hooks (SOC 2/GDPR compliance)

---

## 🏗️ **Implementation Steps**

### **Step 1: JWT Plugin Implementation**

**Objective**: Enable service-to-service authentication with 15-20% performance improvement

```typescript
// src/plugins/jwt-plugin.ts - JWT plugin for service authentication
import { jwt } from 'better-auth/plugins';
import type { User, Session } from '../auth';

export const jwtPlugin = jwt({
  issuer: 'mcp-registry-gateway',
  audience: ['mcp-services', 'api-clients'],
  expiresIn: '1h',
  refreshTokenRotation: true,
  
  // Custom claims for MCP operations
  customClaims: (user: User, session: Session) => ({
    roles: user.roles || ['user'],
    tenantId: user.tenantId || 'default',
    mcpPermissions: user.mcpPermissions || [],
    
    // Service-specific claims
    serviceAccess: determineServiceAccess(user.roles),
    resourceQuotas: calculateResourceQuotas(user.tenantId),
    
    // Audit claims
    sessionId: session.id,
    lastActivity: new Date().toISOString()
  }),
  
  // JWT signing configuration
  algorithm: 'RS256', // Use RSA for better security
  keyRotation: {
    enabled: true,
    interval: '30d' // Rotate keys monthly
  },
  
  // Performance optimization
  cacheStrategy: {
    enabled: true,
    ttl: '5m', // Cache tokens for 5 minutes
    maxSize: 1000 // Cache up to 1000 tokens
  }
});

// Helper functions
function determineServiceAccess(roles: string[] = []): string[] {
  const baseAccess = ['mcp:read'];
  
  if (roles.includes('admin')) {
    return [...baseAccess, 'mcp:admin', 'service:manage', 'audit:read'];
  }
  
  if (roles.includes('server_owner')) {
    return [...baseAccess, 'mcp:write', 'server:manage'];
  }
  
  return baseAccess;
}

function calculateResourceQuotas(tenantId: string): Record<string, number> {
  // Dynamic resource quota calculation based on tenant tier
  const defaultQuotas = {
    maxServers: 10,
    maxRequests: 1000,
    maxStorage: 100 // MB
  };
  
  // TODO: Fetch tenant-specific quotas from database
  return defaultQuotas;
}
```

### **Step 2: API Key and Bearer Token Plugins**

**Objective**: Zero-latency programmatic access for MCP server integrations

```typescript
// src/plugins/api-key-plugin.ts - API Key authentication
import { apiKey, bearer } from 'better-auth/plugins';

export const apiKeyPlugin = apiKey({
  // Generate API keys for MCP server integrations
  keyGeneration: {
    algorithm: 'sha256',
    length: 32,
    prefix: 'mcp_' // Prefix for identification
  },
  
  // Custom claims for API key authentication
  customClaims: (key) => {
    const metadata = key.metadata as Record<string, any> || {};
    
    return {
      serverType: metadata.serverType || 'generic',
      allowedEndpoints: metadata.endpoints || ['tools/*'],
      rateLimitTier: metadata.tier || 'standard',
      
      // MCP-specific permissions
      mcpPermissions: metadata.mcpPermissions || ['mcp:tools:call'],
      resourceAccess: metadata.resourceAccess || ['config://server'],
      
      // Security context
      ipWhitelist: metadata.ipWhitelist || [],
      allowedMethods: metadata.allowedMethods || ['POST']
    };
  },
  
  // Key validation and lifecycle
  validation: {
    checkExpiry: true,
    checkIP: true,
    checkUserAgent: false // Flexible for server-to-server
  },
  
  // Audit logging for API key usage
  auditLogging: {
    enabled: true,
    events: ['key:used', 'key:blocked', 'key:expired'],
    includeMetadata: true
  }
});

export const bearerPlugin = bearer({
  // Bearer token authentication for REST APIs
  requireSignature: true,
  tokenValidation: {
    checkFormat: true,
    requireHttps: process.env.NODE_ENV === 'production',
    validateIssuer: true
  },
  
  // Integration with JWT plugin
  jwtIntegration: {
    enabled: true,
    allowJWTAsBearerToken: true,
    validateClaims: ['iss', 'aud', 'exp', 'roles']
  }
});
```

### **Step 3: Enhanced Rate Limiting**

**Objective**: 99%+ fair resource allocation with per-tenant limits

```typescript
// src/plugins/enhanced-rate-limit.ts - Enterprise rate limiting
import { rateLimit } from 'better-auth/plugins';
import Redis from 'ioredis';

// Redis client for distributed rate limiting
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const enhancedRateLimitPlugin = rateLimit({
  enabled: true,
  storage: "secondary-storage", // Use Redis for distributed limiting
  
  // Global rate limits
  globalLimits: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // 10K requests per 15 minutes globally
    skipSuccessfulRequests: false
  },
  
  // Per-user rate limits
  userLimits: {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 100, // 100 requests per user per window
    keyGenerator: (request) => `user:${request.userId}`,
    skipFailedRequests: true
  },
  
  // Per-tenant rate limits with fairness algorithm
  tenantLimits: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // Base limit per tenant
    keyGenerator: (request) => `tenant:${request.tenantId}`,
    
    // Dynamic limit calculation based on tenant tier
    dynamicLimit: async (request) => {
      const tenantTier = await getTenantTier(request.tenantId);
      const multipliers = {
        'free': 1,
        'pro': 5,
        'enterprise': 20
      };
      return 1000 * (multipliers[tenantTier] || 1);
    }
  },
  
  // MCP operation specific limits
  customRules: {
    "/mcp/tools/call": { 
      windowMs: 10 * 1000,  // 10 seconds
      max: 100,             // 100 tool calls per 10 seconds
      perTenant: true,
      
      // Adaptive limits based on tool complexity
      adaptiveLimits: {
        'simple_tools': { multiplier: 2.0 },
        'compute_intensive': { multiplier: 0.5 },
        'data_access': { multiplier: 1.0 }
      }
    },
    
    "/mcp/resources": { 
      windowMs: 30 * 1000,  // 30 seconds
      max: 200,             // 200 resource requests per 30 seconds
      perTenant: true
    },
    
    "/api/v1/servers": {
      windowMs: 60 * 1000,  // 1 minute
      max: 50,              // Server management operations
      roles: ['admin', 'server_owner'], // Role-based limits
      
      // Different limits per role
      roleLimits: {
        'admin': 100,
        'server_owner': 50
      }
    }
  },
  
  // Tenant fairness algorithm
  tenantFairness: {
    enabled: true,
    maxTenantShare: 0.3,  // No tenant can use more than 30% of global capacity
    
    // Fair queuing algorithm
    algorithm: 'weighted_fair_queuing',
    weights: {
      'free': 1,
      'pro': 3,
      'enterprise': 10
    },
    
    // Fallback limits when fairness is violated
    fallbackLimits: { 
      windowMs: 60 * 1000, 
      max: 10 
    }
  },
  
  // Error handling and monitoring
  errorHandling: {
    onLimitReached: async (request, limit) => {
      // Log rate limit violation
      console.warn(`Rate limit exceeded for ${request.userId} on ${request.path}`);
      
      // Send to monitoring system
      await sendMetric('rate_limit_exceeded', {
        userId: request.userId,
        tenantId: request.tenantId,
        endpoint: request.path,
        limit: limit.max,
        window: limit.windowMs
      });
    },
    
    customHeaders: {
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
      limit: 'X-RateLimit-Limit'
    }
  }
});

// Helper functions
async function getTenantTier(tenantId: string): Promise<'free' | 'pro' | 'enterprise'> {
  // TODO: Fetch from database
  return 'pro'; // Default for now
}

async function sendMetric(name: string, data: Record<string, any>): Promise<void> {
  // TODO: Send to monitoring system (Prometheus, Application Insights, etc.)
  console.log(`Metric: ${name}`, data);
}
```

### **Step 4: Organization Plugin (Multi-Tenancy)**

**Objective**: Enterprise tenant isolation scalable to 1000+ organizations

```typescript
// src/plugins/organization-plugin.ts - Multi-tenant organization management
import { organization } from 'better-auth/plugins';

export const organizationPlugin = organization({
  // Organization creation settings
  allowUserToCreateOrganization: true,
  organizationLimit: 5, // Per user limit
  requireInviteToJoin: true,
  
  // Role-based access control
  roles: {
    owner: {
      permissions: ['org:admin', 'mcp:admin', 'billing:manage', 'users:manage'],
      description: 'Full organization control'
    },
    admin: {
      permissions: ['org:manage', 'mcp:manage', 'users:invite', 'servers:manage'],
      description: 'Administrative access'
    },
    member: {
      permissions: ['org:view', 'mcp:use', 'servers:view'],
      description: 'Standard member access'
    },
    viewer: {
      permissions: ['org:view', 'mcp:read'],
      description: 'Read-only access'
    }
  },
  
  // MCP-specific organization settings
  mcpIntegration: {
    // Server isolation per organization
    isolateServers: true,
    
    // Shared resources available to all organizations
    sharedResources: [
      'system-tools',
      'monitoring-tools',
      'health-check'
    ],
    
    // Permission mapping for MCP operations
    permissions: {
      'server:register': {
        requiredRoles: ['owner', 'admin'],
        quotaLimits: {
          'free_tier': 5,
          'pro_tier': 25,
          'enterprise_tier': 100
        }
      },
      'server:manage': {
        requiredRoles: ['owner', 'admin', 'member'],
        conditions: ['server_ownership_or_admin']
      },
      'tools:execute': {
        requiredRoles: ['owner', 'admin', 'member'],
        rateLimits: {
          'member': { calls: 100, window: '1h' },
          'admin': { calls: 500, window: '1h' },
          'owner': { calls: 1000, window: '1h' }
        }
      }
    },
    
    // Resource quotas per organization
    resourceQuotas: {
      enabled: true,
      quotaTypes: {
        'servers': {
          free: 5,
          pro: 25,
          enterprise: 100
        },
        'monthly_requests': {
          free: 10000,
          pro: 100000,
          enterprise: 1000000
        },
        'concurrent_connections': {
          free: 10,
          pro: 50,
          enterprise: 200
        }
      },
      
      // Quota enforcement
      enforcement: {
        blockOnExcess: true,
        warningThreshold: 0.8, // Warn at 80% usage
        gracePeriod: '7d' // 7 days grace for quota violations
      }
    }
  },
  
  // Organization lifecycle hooks
  hooks: {
    beforeCreate: async (organization) => {
      // Validate organization name and settings
      await validateOrganizationCreation(organization);
      
      // Set default quotas based on subscription tier
      organization.metadata = {
        ...organization.metadata,
        tier: 'free',
        createdAt: new Date().toISOString(),
        quotas: getDefaultQuotas('free')
      };
      
      return organization;
    },
    
    afterCreate: async (organization) => {
      // Create organization-specific database schema/namespace
      await createOrganizationNamespace(organization.id);
      
      // Initialize default MCP servers for organization
      await initializeDefaultMCPServers(organization.id);
      
      // Send welcome email and setup instructions
      await sendOrganizationWelcomeEmail(organization);
      
      // Audit log
      await auditLog.create({
        event: 'organization:created',
        organizationId: organization.id,
        metadata: organization.metadata
      });
    },
    
    beforeDelete: async (organizationId) => {
      // GDPR compliance - anonymize data before deletion
      await anonymizeOrganizationData(organizationId);
      
      // Archive organization servers and configurations
      await archiveOrganizationResources(organizationId);
      
      // Notify all organization members
      await notifyOrganizationDeletion(organizationId);
    },
    
    afterDelete: async (organizationId) => {
      // Clean up organization namespace
      await cleanupOrganizationNamespace(organizationId);
      
      // Final audit log
      await auditLog.create({
        event: 'organization:deleted',
        organizationId,
        metadata: { deletedAt: new Date().toISOString() }
      });
    }
  },
  
  // Billing integration
  billing: {
    enabled: true,
    provider: 'stripe', // or 'custom'
    
    // Subscription tiers
    subscriptionTiers: {
      free: {
        price: 0,
        quotas: getDefaultQuotas('free'),
        features: ['basic_mcp', 'community_support']
      },
      pro: {
        price: 49, // per month
        quotas: getDefaultQuotas('pro'),
        features: ['advanced_mcp', 'priority_support', 'custom_integrations']
      },
      enterprise: {
        price: 199, // per month
        quotas: getDefaultQuotas('enterprise'),
        features: ['unlimited_mcp', 'dedicated_support', 'sla_guarantee', 'custom_deployment']
      }
    }
  }
});

// Helper functions
async function validateOrganizationCreation(organization: any): Promise<void> {
  // Validate organization name uniqueness
  const existingOrg = await findOrganizationByName(organization.name);
  if (existingOrg) {
    throw new Error('Organization name already exists');
  }
  
  // Validate other constraints
  if (!organization.name || organization.name.length < 3) {
    throw new Error('Organization name must be at least 3 characters');
  }
}

function getDefaultQuotas(tier: string): Record<string, number> {
  const quotas = {
    free: { servers: 5, requests: 10000, storage: 100 },
    pro: { servers: 25, requests: 100000, storage: 1000 },
    enterprise: { servers: 100, requests: 1000000, storage: 10000 }
  };
  
  return quotas[tier] || quotas.free;
}

// Additional helper functions would be implemented here
// createOrganizationNamespace, initializeDefaultMCPServers, etc.
```

### **Step 5: Admin Plugin Implementation**

**Objective**: Centralized user management with comprehensive audit trails

```typescript
// src/plugins/admin-plugin.ts - Comprehensive admin functionality
import { admin } from 'better-auth/plugins';

export const adminPlugin = admin({
  // Admin role configuration
  adminRoles: ['admin', 'super-admin'],
  
  // Comprehensive audit logging for compliance
  auditLog: {
    enabled: true,
    
    // Events to log for compliance (SOC 2, GDPR)
    events: [
      'user:create', 'user:update', 'user:delete', 'user:login', 'user:logout',
      'role:assign', 'role:revoke', 'role:change',
      'organization:create', 'organization:update', 'organization:delete',
      'mcp:server:register', 'mcp:server:delete', 'mcp:tools:execute',
      'admin:action', 'security:violation', 'data:access'
    ],
    
    // Detailed metadata capture
    metadataCapture: {
      includeUserAgent: true,
      includeIpAddress: true,
      includeGeolocation: false, // Privacy consideration
      includeRequestDetails: true,
      sensitiveDataMasking: true
    },
    
    // Retention policy for compliance
    retention: {
      defaultPeriod: '7y', // 7 years for SOC 2 compliance
      sensitiveData: '2y', // 2 years for PII
      securityEvents: '10y' // 10 years for security incidents
    },
    
    // Export capabilities for compliance audits
    exportCapabilities: {
      formats: ['json', 'csv', 'xlsx'],
      encryptionRequired: true,
      signedUrls: true,
      accessLogging: true
    }
  },
  
  // MCP-specific admin features
  mcpAdministration: {
    // Server management capabilities
    serverManagement: {
      enabled: true,
      permissions: {
        'server:view_all': ['admin', 'super-admin'],
        'server:edit_all': ['super-admin'],
        'server:delete_all': ['super-admin']
      },
      
      // Bulk operations
      bulkOperations: {
        enabled: true,
        maxBatchSize: 100,
        operations: ['update', 'delete', 'migrate', 'backup']
      }
    },
    
    // User permission management
    userPermissions: {
      enabled: true,
      
      // Permission templates for quick assignment
      templates: {
        'mcp_user': {
          permissions: ['mcp:tools:call', 'mcp:resources:read'],
          description: 'Standard MCP user access'
        },
        'mcp_developer': {
          permissions: ['mcp:tools:call', 'mcp:resources:read', 'mcp:servers:register'],
          description: 'Developer with server registration rights'
        },
        'mcp_admin': {
          permissions: ['mcp:*'],
          description: 'Full MCP administrative access'
        }
      },
      
      // Permission audit and compliance
      permissionAudit: {
        enabled: true,
        reviewPeriod: '90d', // Quarterly permission review
        autoRevoke: {
          inactiveUsers: '180d', // Revoke permissions after 6 months inactivity
          expiredRoles: true
        }
      }
    },
    
    // Resource quota management
    resourceQuotas: {
      enabled: true,
      
      // Global quota monitoring
      globalMonitoring: {
        enabled: true,
        alerts: {
          thresholds: [0.7, 0.85, 0.95], // 70%, 85%, 95% usage alerts
          channels: ['email', 'slack', 'webhook']
        }
      },
      
      // Automatic quota adjustments
      autoAdjustments: {
        enabled: false, // Disabled by default for safety
        criteria: {
          consistentHighUsage: { threshold: 0.9, period: '30d' },
          growthPattern: { enabled: true, algorithm: 'linear_regression' }
        }
      }
    },
    
    // Performance metrics and monitoring
    performanceMetrics: {
      enabled: true,
      
      // System-wide metrics
      systemMetrics: [
        'request_latency',
        'error_rates',
        'active_connections',
        'resource_utilization',
        'authentication_success_rate'
      ],
      
      // MCP-specific metrics
      mcpMetrics: [
        'tool_execution_time',
        'server_health_status',
        'proxy_success_rate',
        'token_refresh_rate'
      ],
      
      // Alerting configuration
      alerting: {
        enabled: true,
        rules: {
          'high_error_rate': {
            condition: 'error_rate > 0.05', // 5% error rate
            duration: '5m',
            severity: 'warning'
          },
          'authentication_failures': {
            condition: 'auth_failure_rate > 0.1', // 10% auth failure rate
            duration: '2m',
            severity: 'critical'
          },
          'resource_exhaustion': {
            condition: 'resource_usage > 0.9', // 90% resource usage
            duration: '1m',
            severity: 'critical'
          }
        }
      }
    }
  },
  
  // Security and compliance features
  security: {
    // Admin action verification
    actionVerification: {
      enabled: true,
      requireTwoFactor: true,
      sensitiveActions: [
        'user:delete',
        'organization:delete', 
        'system:configure',
        'security:modify'
      ]
    },
    
    // Session management for admins
    adminSessions: {
      maxDuration: '4h', // Shorter sessions for admins
      requireReauth: {
        enabled: true,
        interval: '30m', // Re-auth every 30 minutes for sensitive operations
        operations: ['user:delete', 'system:configure']
      }
    },
    
    // IP address restrictions
    ipRestrictions: {
      enabled: false, // Can be enabled per environment
      allowedNetworks: [
        // '192.168.1.0/24', // Example: Office network
        // '10.0.0.0/8' // Example: VPN network
      ]
    }
  },
  
  // Reporting and analytics
  reporting: {
    enabled: true,
    
    // Pre-built reports
    predefinedReports: [
      {
        name: 'User Activity Summary',
        type: 'user_activity',
        schedule: 'weekly',
        recipients: ['admin@company.com']
      },
      {
        name: 'Security Audit Report',
        type: 'security_audit',
        schedule: 'monthly',
        recipients: ['security@company.com', 'compliance@company.com']
      },
      {
        name: 'MCP Performance Report',
        type: 'mcp_performance',
        schedule: 'daily',
        recipients: ['ops@company.com']
      }
    ],
    
    // Custom report builder
    customReports: {
      enabled: true,
      maxReports: 50,
      exportFormats: ['pdf', 'csv', 'json'],
      schedulingOptions: ['hourly', 'daily', 'weekly', 'monthly']
    }
  }
});
```

### **Step 6: Advanced Session Management**

**Objective**: Production-grade session handling with 30-40% performance improvement

```typescript
// src/plugins/advanced-session.ts - Enhanced session management
export const advancedSessionConfig = {
  // IP address tracking and validation
  ipAddress: {
    ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
    disableIpTracking: false,
    
    // Enhanced security features
    blockSuspiciousIPs: true,
    suspiciousPatterns: {
      rapidLoginAttempts: { threshold: 5, window: '5m' },
      geolocationAnomalies: { enabled: true, variance: 500 }, // 500km
      userAgentChanges: { enabled: true, allowMobileDesktopSwitch: true }
    },
    
    // IP reputation checking
    reputationChecking: {
      enabled: process.env.NODE_ENV === 'production',
      providers: ['cloudflare', 'abuseipdb'],
      blockKnownAttackers: true,
      whitelist: [] // Trusted IPs that bypass reputation checks
    }
  },
  
  // Secure cookie configuration
  useSecureCookies: process.env.NODE_ENV === 'production',
  crossSubDomainCookies: {
    enabled: process.env.NODE_ENV === 'production',
    domain: process.env.COOKIE_DOMAIN || ".mcp-gateway.com",
    
    // Subdomain isolation for security
    subdomainIsolation: {
      enabled: true,
      isolatedSubdomains: ['admin', 'api', 'secure']
    }
  },
  
  // Fresh sessions for sensitive operations (critical security feature)
  freshSessions: {
    enabled: true,
    maxAge: '15m',  // Require re-auth for admin actions within 15 minutes
    
    // Operations requiring fresh authentication
    endpoints: [
      '/mcp/tools/call',
      '/api/v1/servers/:id/delete',
      '/api/v1/admin/*',
      '/api/v1/organizations/*/delete',
      '/api/v1/users/*/roles'
    ],
    
    // Fresh session bypass for API keys (service-to-service)
    bypassForApiKeys: true,
    bypassForJWT: false // JWT tokens still require fresh sessions
  },
  
  // Hybrid session storage for resilience and performance
  session: {
    storage: 'hybrid',
    
    // Primary storage (Redis for performance)
    primaryStorage: {
      type: 'redis',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      options: {
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3
      }
    },
    
    // Fallback storage (PostgreSQL for durability)
    fallbackStorage: {
      type: 'postgresql',
      url: process.env.DATABASE_URL,
      table: 'auth.sessions'
    },
    
    // Session replication for high availability
    replication: {
      enabled: process.env.NODE_ENV === 'production',
      replicas: 2,
      syncStrategy: 'async' // or 'sync' for stronger consistency
    },
    
    // Cookie caching for 30-40% performance improvement
    cookieCaching: {
      enabled: true,
      maxAge: '5m',           // Cache session data in cookie for 5 minutes
      compression: true,       // Compress session data
      encryptionKey: process.env.SESSION_ENCRYPTION_KEY,
      
      // Cache validation
      validation: {
        checkIntegrity: true,   // Verify data hasn't been tampered
        maxSize: '4kb',        // Prevent cookie size issues
        refreshThreshold: '1m'  // Refresh cache if older than 1 minute
      }
    }
  },
  
  // Session lifecycle management
  lifecycle: {
    // Automatic cleanup of expired sessions
    cleanup: {
      enabled: true,
      interval: '1h',         // Run cleanup every hour
      batchSize: 1000,       // Process 1000 sessions per batch
      deleteExpired: true,    // Remove expired sessions
      archiveOld: '30d'      // Archive sessions older than 30 days
    },
    
    // Session extension policies
    extension: {
      enabled: true,
      conditions: {
        userActivity: true,     // Extend on user activity
        apiUsage: true,        // Extend on API usage
        maxExtensions: 5       // Limit total extensions
      },
      extensionPeriod: '1h'    // Extend by 1 hour each time
    },
    
    // Concurrent session management
    concurrentSessions: {
      enabled: true,
      maxSessions: 5,         // Max 5 concurrent sessions per user
      policy: 'oldest_first', // Evict oldest when limit exceeded
      notifyUser: true        // Notify user of session eviction
    }
  },
  
  // Security monitoring and alerting
  monitoring: {
    // Session anomaly detection
    anomalyDetection: {
      enabled: true,
      algorithms: ['isolation_forest', 'statistical_outlier'],
      
      // Patterns to detect
      patterns: {
        unusualLoginTimes: true,
        rapidLocationChanges: true,
        deviceFingerprintChanges: true,
        sessionDurationAnomalies: true
      },
      
      // Response to anomalies
      response: {
        requireAdditionalAuth: true,
        notifyUser: true,
        logIncident: true,
        temporaryAccountLock: false // Disabled to prevent DoS
      }
    },
    
    // Real-time session metrics
    metrics: {
      enabled: true,
      trackMetrics: [
        'active_sessions',
        'session_creation_rate',
        'session_validation_time',
        'cache_hit_ratio',
        'storage_latency'
      ],
      
      // Performance thresholds
      thresholds: {
        sessionValidationTime: '50ms',
        cacheHitRatio: '0.95',
        storageLatency: '10ms'
      }
    }
  }
};
```

### **Step 7: Database Lifecycle Hooks for Compliance**

**Objective**: SOC 2/GDPR compliance with comprehensive audit logging

```typescript
// src/plugins/compliance-hooks.ts - Database lifecycle hooks for compliance
export const complianceHooksConfig = {
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // GDPR consent validation (CRITICAL)
          if (!user.gdprConsent || !user.privacyPolicyAccepted) {
            throw new Error('GDPR consent and privacy policy acceptance required');
          }
          
          // Additional consent checks
          if (!user.termsOfServiceAccepted) {
            throw new Error('Terms of service acceptance required');
          }
          
          // Data minimization principle (GDPR Article 5)
          user = minimizeUserData(user);
          
          // Set default privacy preferences
          user.privacyPreferences = {
            dataProcessing: user.dataProcessingConsent || false,
            marketing: user.marketingConsent || false,
            analytics: user.analyticsConsent || false,
            thirdPartySharing: false // Always default to false
          };
          
          return user;
        },
        
        after: async (user) => {
          // SOC 2 audit logging (CRITICAL)
          await auditLog.create({
            event: 'user:created',
            eventType: 'security',
            userId: user.id,
            
            // Comprehensive metadata for compliance
            metadata: {
              email: hashEmail(user.email), // Hash PII for audit logs
              registrationMethod: 'oauth',
              tenantId: user.tenantId,
              consentTimestamp: new Date().toISOString(),
              
              // GDPR compliance fields
              gdprConsent: true,
              consentVersion: getCurrentConsentVersion(),
              dataProcessingBasis: 'consent', // or 'contract', 'legitimate_interest'
              
              // Security context
              ipAddress: user.creationIP,
              userAgent: user.creationUserAgent,
              geolocation: user.creationGeolocation
            },
            
            // Compliance tags
            complianceTags: ['user_creation', 'gdpr', 'soc2'],
            
            // Retention policy
            retentionPeriod: '7y', // SOC 2 requirement
            
            timestamp: new Date(),
            severity: 'info'
          });
          
          // Initialize user's data processing record
          await createDataProcessingRecord(user.id, {
            purposes: ['authentication', 'service_provision'],
            legalBasis: 'consent',
            retentionPeriod: '7y',
            dataCategories: ['identity', 'contact', 'technical']
          });
          
          // Send GDPR-compliant welcome email
          await sendGDPRCompliantWelcomeEmail(user);
        }
      },
      
      update: {
        before: async (userId, updates) => {
          // Track what data is being updated for audit trail
          const existingUser = await getUserById(userId);
          const changes = detectUserChanges(existingUser, updates);
          
          // Validate consent for data updates
          if (changes.includesPII) {
            await validateDataUpdateConsent(userId, changes);
          }
          
          return updates;
        },
        
        after: async (userId, updates, changes) => {
          // Detailed audit log for user updates
          await auditLog.create({
            event: 'user:updated',
            eventType: 'data_modification',
            userId: userId,
            
            metadata: {
              changedFields: Object.keys(changes),
              sensitiveDataChanged: changes.includesPII,
              updateReason: updates.updateReason,
              updatedBy: updates.updatedBy || userId // Self-update or admin update
            },
            
            complianceTags: ['user_update', 'data_modification'],
            timestamp: new Date()
          });
          
          // Update data processing record if necessary
          if (changes.includesPII) {
            await updateDataProcessingRecord(userId, {
              lastModified: new Date(),
              modificationType: 'user_initiated_update'
            });
          }
        }
      },
      
      delete: {
        before: async (userId) => {
          // GDPR right to be forgotten - comprehensive data deletion
          console.log(`Initiating GDPR-compliant deletion for user: ${userId}`);
          
          // 1. Delete or anonymize related data across all systems
          await Promise.all([
            deleteUserSessions(userId),
            anonymizeUserAuditLogs(userId), // Anonymize, don't delete for compliance
            deleteUserMcpActivity(userId),
            deleteUserOrganizationMemberships(userId),
            deleteUserAPIKeys(userId),
            anonymizeUserMetrics(userId)
          ]);
          
          // 2. Archive user data before deletion (compliance requirement)
          await archiveUserDataForCompliance(userId, {
            archiveReason: 'gdpr_deletion_request',
            retentionPeriod: '7y', // Keep anonymized records for compliance
            dataCategories: ['audit_logs', 'security_events']
          });
          
          // 3. Update data processing records
          await updateDataProcessingRecord(userId, {
            status: 'deletion_requested',
            deletionDate: new Date(),
            deletionReason: 'gdpr_right_to_be_forgotten'
          });
        },
        
        after: async (userId) => {
          // Compliance verification after deletion
          await verifyUserDataDeletion(userId);
          
          // Final audit log (with anonymized user reference)
          const anonymizedUserId = generateAnonymizedUserId(userId);
          await auditLog.create({
            event: 'user:deleted',
            eventType: 'gdpr_deletion',
            userId: anonymizedUserId, // Use anonymized ID
            
            metadata: {
              gdprDeletion: true,
              deletionVerified: true,
              originalRequestDate: new Date(), // When deletion was requested
              completionDate: new Date(),
              dataCategories: ['all_personal_data'],
              retainedData: ['anonymized_audit_logs', 'anonymized_metrics']
            },
            
            complianceTags: ['user_deletion', 'gdpr', 'right_to_be_forgotten'],
            retentionPeriod: '7y', // Keep deletion record for compliance
            timestamp: new Date()
          });
          
          // Notify compliance team
          await notifyComplianceTeam({
            event: 'user_deletion_completed',
            userId: anonymizedUserId,
            deletionVerified: true
          });
        }
      }
    },
    
    session: {
      create: async (session) => {
        // Session creation audit (important for security)
        await auditLog.create({
          event: 'session:created',
          eventType: 'authentication',
          userId: session.userId,
          sessionId: session.id,
          
          metadata: {
            ipAddress: session.ipAddress,
            userAgent: maskUserAgent(session.userAgent), // Mask for privacy
            geolocation: session.geolocation,
            authMethod: session.authMethod || 'oauth',
            
            // MCP-specific context
            mcpPermissions: session.mcpPermissions || [],
            tenantId: session.tenantId,
            
            // Security context
            sessionType: session.type || 'interactive',
            securityLevel: determineSecurityLevel(session)
          },
          
          complianceTags: ['session_creation', 'authentication'],
          timestamp: new Date()
        });
        
        // Track session for monitoring
        await updateSessionMetrics('session_created', {
          userId: session.userId,
          tenantId: session.tenantId
        });
      },
      
      delete: async (sessionId, userId) => {
        // Session termination audit
        await auditLog.create({
          event: 'session:terminated',
          eventType: 'authentication',
          userId: userId,
          sessionId: sessionId,
          
          metadata: {
            terminationReason: 'logout', // or 'timeout', 'security', 'admin_action'
            terminationTime: new Date().toISOString()
          },
          
          complianceTags: ['session_termination'],
          timestamp: new Date()
        });
      }
    },
    
    organization: {
      create: {
        after: async (organization) => {
          // Organization creation audit
          await auditLog.create({
            event: 'organization:created',
            eventType: 'business',
            organizationId: organization.id,
            userId: organization.createdBy,
            
            metadata: {
              organizationName: organization.name,
              tier: organization.tier || 'free',
              initialMemberCount: 1,
              creationMethod: 'user_initiated'
            },
            
            complianceTags: ['organization_creation', 'business_process'],
            timestamp: new Date()
          });
        }
      },
      
      delete: {
        before: async (organizationId) => {
          // Archive organization data before deletion
          await archiveOrganizationDataForCompliance(organizationId);
        },
        
        after: async (organizationId) => {
          // Organization deletion audit
          await auditLog.create({
            event: 'organization:deleted',
            eventType: 'business',
            organizationId: organizationId,
            
            metadata: {
              deletionDate: new Date().toISOString(),
              dataArchived: true,
              complianceVerified: true
            },
            
            complianceTags: ['organization_deletion', 'data_retention'],
            retentionPeriod: '7y',
            timestamp: new Date()
          });
        }
      }
    }
  },
  
  // Data retention policies
  dataRetention: {
    policies: {
      auditLogs: {
        defaultPeriod: '7y',
        categories: {
          security: '10y',
          financial: '7y',
          operational: '3y',
          debug: '1y'
        }
      },
      
      userData: {
        active: 'indefinite', // While user is active
        inactive: '2y',       // Delete after 2 years of inactivity
        deleted: '0d',        // Immediate deletion on request
        anonymized: '7y'      // Keep anonymized data for compliance
      },
      
      sessionData: {
        active: '30d',
        expired: '90d',
        audit: '2y'
      }
    },
    
    // Automated cleanup
    automation: {
      enabled: true,
      schedule: '0 2 * * *', // Run at 2 AM daily
      batchSize: 1000,
      dryRun: false // Set to true for testing
    }
  }
};

// Helper functions for compliance
async function minimizeUserData(user: any): Promise<any> {
  // Implement data minimization according to GDPR Article 5
  const minimizedUser = { ...user };
  
  // Remove unnecessary fields
  delete minimizedUser.internalNotes;
  delete minimizedUser.debugInfo;
  
  // Normalize data formats
  if (minimizedUser.email) {
    minimizedUser.email = minimizedUser.email.toLowerCase().trim();
  }
  
  return minimizedUser;
}

async function hashEmail(email: string): Promise<string> {
  // Hash email for audit logs to protect PII
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(email).digest('hex');
}

function getCurrentConsentVersion(): string {
  // Return current consent version for compliance tracking
  return process.env.CONSENT_VERSION || '1.0';
}

// Additional helper functions would be implemented here...
```

### **Step 8: Integration and Testing**

```typescript
// src/auth-enhanced.ts - Integrate all enterprise plugins
import { betterAuth } from 'better-auth';
import { microsoft } from 'better-auth/providers';

// Import all enterprise plugins
import { jwtPlugin } from './plugins/jwt-plugin';
import { apiKeyPlugin, bearerPlugin } from './plugins/api-key-plugin';
import { enhancedRateLimitPlugin } from './plugins/enhanced-rate-limit';
import { organizationPlugin } from './plugins/organization-plugin';
import { adminPlugin } from './plugins/admin-plugin';
import { advancedSessionConfig } from './plugins/advanced-session';
import { complianceHooksConfig } from './plugins/compliance-hooks';

export const auth = betterAuth({
  // Database configuration
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/mcp_registry',
    schema: 'auth'
  },
  
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  
  // OAuth providers
  providers: [
    microsoft({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID,
      redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/microsoft`,
      scope: 'openid profile email User.Read'
    })
  ],
  
  // Enterprise plugins
  plugins: [
    jwtPlugin,              // Service-to-service authentication
    apiKeyPlugin,           // API key authentication
    bearerPlugin,           // Bearer token support
    enhancedRateLimitPlugin, // Advanced rate limiting
    organizationPlugin,      // Multi-tenancy
    adminPlugin             // Admin management
  ],
  
  // Advanced session management
  ...advancedSessionConfig,
  
  // Compliance hooks
  ...complianceHooksConfig,
  
  // User model extensions
  user: {
    additionalFields: {
      tenantId: { type: 'string', required: false },
      roles: { type: 'string[]', required: false, defaultValue: ['user'] },
      mcpPermissions: { type: 'string[]', required: false, defaultValue: [] },
      
      // GDPR compliance fields
      gdprConsent: { type: 'boolean', required: true },
      privacyPolicyAccepted: { type: 'boolean', required: true },
      termsOfServiceAccepted: { type: 'boolean', required: true },
      dataProcessingConsent: { type: 'boolean', required: false },
      marketingConsent: { type: 'boolean', required: false },
      
      // Security fields
      lastPasswordChange: { type: 'date', required: false },
      loginAttempts: { type: 'number', required: false, defaultValue: 0 },
      accountLocked: { type: 'boolean', required: false, defaultValue: false },
      
      // Audit fields
      creationIP: { type: 'string', required: false },
      creationUserAgent: { type: 'string', required: false },
      lastLoginIP: { type: 'string', required: false },
      lastActivity: { type: 'date', required: false }
    }
  },
  
  // Security configuration
  security: {
    // Password requirements (if using password auth)
    password: {
      minLength: 12,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventReuse: 5 // Prevent reusing last 5 passwords
    },
    
    // Rate limiting for auth endpoints
    rateLimit: {
      window: '15m',
      max: 5, // 5 attempts per 15 minutes
      skipSuccessfulRequests: true
    },
    
    // CSRF protection
    csrf: {
      enabled: true,
      cookieName: 'csrf-token',
      headerName: 'X-CSRF-Token'
    }
  },
  
  // Logging configuration
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    
    // Structured logging for production
    format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
    
    // Log sensitive operations
    logSensitiveOperations: true,
    
    // Integration with external logging systems
    transports: process.env.NODE_ENV === 'production' ? [
      {
        type: 'file',
        filename: '/var/log/better-auth/auth.log'
      },
      {
        type: 'http',
        endpoint: process.env.LOG_ENDPOINT
      }
    ] : undefined
  }
});

// Export types
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
export type Organization = typeof auth.$Infer.Organization;
```

---

## 🧪 **Testing Strategy**

### **Unit Testing**

```typescript
// tests/enterprise-plugins.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { auth } from '../src/auth-enhanced';
import { jwtBridge } from '../src/jwt-bridge';

describe('Enterprise Authentication Features', () => {
  describe('JWT Plugin', () => {
    it('should generate service-to-service tokens', async () => {
      const mockUser = {
        id: 'service-user',
        roles: ['service'],
        tenantId: 'test-tenant'
      };
      
      const token = await auth.jwt.generateServiceToken(mockUser);
      expect(token).toBeDefined();
      
      const decoded = await auth.jwt.verifyToken(token);
      expect(decoded.serviceAccess).toContain('mcp:read');
    });
  });
  
  describe('Rate Limiting', () => {
    it('should enforce per-tenant rate limits', async () => {
      // Test implementation
    });
  });
  
  describe('Organization Plugin', () => {
    it('should create organization with proper isolation', async () => {
      // Test implementation
    });
  });
});
```

### **Integration Testing**

```typescript
// tests/compliance-integration.test.ts
describe('Compliance Integration', () => {
  it('should handle GDPR deletion correctly', async () => {
    // Create test user
    const user = await createTestUser({
      gdprConsent: true,
      privacyPolicyAccepted: true
    });
    
    // Request deletion
    await auth.user.delete(user.id);
    
    // Verify data is anonymized/deleted
    const deletedUser = await auth.user.findById(user.id);
    expect(deletedUser).toBeNull();
    
    // Verify audit log exists (anonymized)
    const auditLogs = await getAuditLogs({ event: 'user:deleted' });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].metadata.gdprDeletion).toBe(true);
  });
});
```

### **Load Testing**

```bash
# k6 load testing script for enterprise features
# load-test-enterprise.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
};

export default function() {
  // Test JWT token generation performance
  let jwtResponse = http.post('http://localhost:3000/api/mcp-token', {
    headers: { 'Cookie': 'session=...' }
  });
  
  check(jwtResponse, {
    'JWT generation under 100ms': (r) => r.timings.duration < 100,
    'JWT generation successful': (r) => r.status === 200
  });
  
  // Test rate limiting
  let mcpResponse = http.post('http://localhost:8000/mcp', {
    headers: { 'Authorization': `Bearer ${jwtResponse.json('token')}` }
  });
  
  check(mcpResponse, {
    'MCP call successful or rate limited': (r) => [200, 429].includes(r.status)
  });
}
```

---

## 📊 **Success Metrics**

### **Performance Improvements**

| Feature | Target Improvement | Measurement Method |
|---------|-------------------|-------------------|
| **JWT Service Auth** | 15-20% faster | Compare auth latency before/after |
| **Session Caching** | 30-40% faster validation | Session validation response time |
| **Rate Limiting** | 99%+ fair allocation | Tenant resource usage distribution |
| **API Key Auth** | Zero-latency service calls | Eliminate OAuth flow for services |

### **Scalability Targets**

| Metric | Target | Validation |
|--------|--------|------------|
| **Concurrent Users** | 1000+ | Load testing |
| **Organizations** | 1000+ | Database performance testing |
| **API Keys per Org** | 100+ | Key management performance |
| **Rate Limit Rules** | 500+ per tenant | Rule evaluation performance |

### **Compliance Requirements**

| Requirement | Implementation | Validation |
|-------------|----------------|------------|
| **SOC 2 Type II** | Comprehensive audit logging | Audit log completeness |
| **GDPR Article 17** | Right to be forgotten | Data deletion verification |
| **Data Retention** | Automated cleanup policies | Retention policy enforcement |
| **Consent Management** | Granular consent tracking | Consent audit trail |

---

## 🔗 **Dependencies Satisfied**

### **Phase 2 Prerequisites** ✅

- [x] **Better-Auth Foundation**: Basic authentication system working
- [x] **JWT Token Bridge**: FastMCP compatibility established
- [x] **Database Schema**: PostgreSQL with auth schema ready
- [x] **Authentication Context**: React context and hooks implemented
- [x] **Protected Routes**: Basic role-based access control working

### **External Dependencies**

- [x] **Redis Instance**: For distributed rate limiting and session caching
- [x] **PostgreSQL Extensions**: For advanced indexing and performance
- [x] **Monitoring Infrastructure**: For metrics collection and alerting
- [x] **Log Management**: For audit log storage and analysis

---

## 🚀 **Next Phase**

**Phase 3 Status**: ⏳ **PLANNED**  
**Next Phase**: [Phase 4: Component Implementation](./phase_04_component_implementation.md)

### **What Phase 4 Will Build On**

1. **Complete Authentication System**: All enterprise auth features implemented
2. **Multi-Tenant Foundation**: Organization isolation and management ready
3. **Compliance Infrastructure**: SOC 2/GDPR requirements satisfied
4. **Performance Optimizations**: 15-25% overall system improvement achieved
5. **Security Hardening**: Production-grade security features implemented

### **Phase 3 Deliverables for Phase 4**

- ✅ Enterprise authentication plugins (JWT, API Keys, Rate Limiting)
- ✅ Multi-tenant organization management with resource quotas
- ✅ Comprehensive admin interface capabilities
- ✅ Advanced session management with caching
- ✅ Compliance hooks and audit logging infrastructure
- ✅ Production-ready security configuration

---

**Phase 3 Implementation Guide**: Comprehensive enterprise authentication  
**Estimated Implementation Time**: 2-3 weeks  
**Enterprise Readiness**: Production-grade multi-tenant authentication system
