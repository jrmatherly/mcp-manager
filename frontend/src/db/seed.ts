/**
 * Database seeding utilities
 *
 * Provides functions to seed the database with initial data
 * for development and testing environments.
 */

import { env } from "../env";
import type { drizzle } from "drizzle-orm/node-postgres";
import { user, tenant, tenantMember, systemConfig, featureFlag, rateLimitConfig, mcpServer } from "./schema/index";
import { dbLogger } from "../lib/logger";

type DatabaseConnection = ReturnType<typeof drizzle>;

/**
 * Seed initial system configuration
 */
async function seedSystemConfig(db: DatabaseConnection) {
  dbLogger.info("Seeding system configuration");

  const configs = [
    {
      key: "system.name",
      category: "general",
      value: "MCP Registry Gateway",
      valueType: "string" as const,
      description: "System name displayed in UI",
      isPublic: true,
    },
    {
      key: "system.version",
      category: "general",
      value: "1.0.0",
      valueType: "string" as const,
      description: "Current system version",
      isPublic: true,
    },
    {
      key: "auth.session_timeout",
      category: "security",
      value: 1440, // 24 hours in minutes
      valueType: "number" as const,
      description: "Default session timeout in minutes",
      isPublic: false,
    },
    {
      key: "registration.enabled",
      category: "features",
      value: true,
      valueType: "boolean" as const,
      description: "Allow new user registration",
      isPublic: true,
    },
    {
      key: "mcp.max_servers_per_user",
      category: "limits",
      value: 10,
      valueType: "number" as const,
      description: "Maximum MCP servers per user",
      isPublic: false,
    },
  ];

  await db.insert(systemConfig).values(configs).onConflictDoNothing();
}

/**
 * Seed initial feature flags
 */
async function seedFeatureFlags(db: DatabaseConnection) {
  dbLogger.info("Seeding feature flags");

  const flags = [
    {
      name: "Enhanced Analytics",
      key: "enhanced_analytics",
      description: "Advanced analytics and reporting features",
      type: "boolean" as const,
      defaultValue: false,
      isEnabled: true,
      rolloutPercentage: 50,
      status: "testing" as const,
    },
    {
      name: "Multi-Tenant Mode",
      key: "multi_tenant_mode",
      description: "Enable multi-tenancy support",
      type: "boolean" as const,
      defaultValue: true,
      isEnabled: true,
      rolloutPercentage: 100,
      status: "active" as const,
    },
    {
      name: "Advanced Rate Limiting",
      key: "advanced_rate_limiting",
      description: "Enhanced rate limiting with burst control",
      type: "boolean" as const,
      defaultValue: false,
      isEnabled: false,
      rolloutPercentage: 0,
      status: "development" as const,
    },
  ];

  await db.insert(featureFlag).values(flags).onConflictDoNothing();
}

/**
 * Seed rate limiting configurations
 */
async function seedRateLimitConfig(db: DatabaseConnection) {
  dbLogger.info("Seeding rate limit configurations");

  const configs = [
    {
      name: "Default User Limits",
      description: "Standard rate limits for regular users",
      rules: [
        {
          path: "/api/*",
          method: "GET",
          rpm: 100,
          rph: 1000,
          rpd: 10000,
          burst: 10,
        },
        {
          path: "/api/*",
          method: "POST",
          rpm: 50,
          rph: 500,
          rpd: 2000,
          burst: 5,
        },
      ],
      scope: "user" as const,
      priority: 100,
    },
    {
      name: "Admin User Limits",
      description: "Higher limits for admin users",
      rules: [
        {
          path: "/api/*",
          rpm: 1000,
          rph: 10000,
          rpd: 100000,
          burst: 50,
        },
      ],
      scope: "user" as const,
      priority: 200,
    },
    {
      name: "Anonymous Limits",
      description: "Restrictive limits for unauthenticated requests",
      rules: [
        {
          path: "/api/public/*",
          rpm: 20,
          rph: 100,
          rpd: 500,
          burst: 2,
        },
      ],
      scope: "global" as const,
      priority: 50,
    },
  ];

  await db.insert(rateLimitConfig).values(configs).onConflictDoNothing();
}

/**
 * Seed demo tenant and users (development only)
 */
async function seedDemoData(db: DatabaseConnection) {
  if (env.NODE_ENV === "production") {
    return;
  }

  dbLogger.info("Seeding demo data");

  // Create demo tenant
  const demoTenant = {
    id: "demo-tenant",
    name: "Demo Organization",
    slug: "demo",
    status: "active" as const,
    ownerId: "demo-admin", // Will be created below
    planType: "professional" as const,
    maxUsers: 50,
    maxServers: 25,
    features: {
      customDomain: true,
      advancedAnalytics: true,
      prioritySupport: false,
    },
    settings: {
      allowUserRegistration: true,
      requireEmailVerification: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
      },
    },
  };

  await db.insert(tenant).values(demoTenant).onConflictDoNothing();

  // Create demo users
  const demoUsers = [
    {
      id: "demo-admin",
      name: "Demo Admin",
      email: "admin@demo.com",
      emailVerified: true,
      role: "admin" as const,
      tenantId: "demo-tenant",
      isActive: true,
    },
    {
      id: "demo-user",
      name: "Demo User",
      email: "user@demo.com",
      emailVerified: true,
      role: "user" as const,
      tenantId: "demo-tenant",
      isActive: true,
    },
    {
      id: "demo-server-owner",
      name: "Server Owner",
      email: "owner@demo.com",
      emailVerified: true,
      role: "server_owner" as const,
      tenantId: "demo-tenant",
      isActive: true,
    },
  ];

  await db.insert(user).values(demoUsers).onConflictDoNothing();

  // Create tenant memberships
  const memberships = [
    {
      tenantId: "demo-tenant",
      userId: "demo-admin",
      role: "owner" as const,
      status: "active" as const,
      joinedAt: new Date(),
    },
    {
      tenantId: "demo-tenant",
      userId: "demo-user",
      role: "member" as const,
      status: "active" as const,
      joinedAt: new Date(),
    },
    {
      tenantId: "demo-tenant",
      userId: "demo-server-owner",
      role: "member" as const,
      status: "active" as const,
      joinedAt: new Date(),
    },
  ];

  await db.insert(tenantMember).values(memberships).onConflictDoNothing();

  // Create demo MCP servers
  const demoServers = [
    {
      id: "demo-weather-server",
      name: "Weather Service",
      description: "Provides current weather information and forecasts",
      version: "1.0.0",
      endpointUrl: "https://demo-weather.mcp.example.com",
      transportType: "http" as const,
      status: "active" as const,
      healthStatus: "healthy" as const,
      tenantId: "demo-tenant",
      ownerId: "demo-server-owner",
      isPublic: false,
      category: "data",
      tags: ["weather", "api", "data"],
    },
    {
      id: "demo-calculator-server",
      name: "Calculator Service",
      description: "Mathematical calculations and conversions",
      version: "2.1.0",
      endpointUrl: "https://demo-calc.mcp.example.com",
      transportType: "websocket" as const,
      status: "active" as const,
      healthStatus: "healthy" as const,
      tenantId: null, // Global public server
      ownerId: "demo-admin",
      isPublic: true,
      category: "productivity",
      tags: ["math", "calculator", "utilities"],
    },
  ];

  await db.insert(mcpServer).values(demoServers).onConflictDoNothing();
}

/**
 * Main seeding function
 */
export async function seedInitialData(db: DatabaseConnection) {
  dbLogger.info("Starting database seeding");

  try {
    await seedSystemConfig(db);
    await seedFeatureFlags(db);
    await seedRateLimitConfig(db);
    await seedDemoData(db);

    dbLogger.info("Database seeding completed successfully");
  } catch (error) {
    dbLogger.logError(error, "Database seeding failed");
    throw error;
  }
}
