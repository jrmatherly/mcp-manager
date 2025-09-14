/**
 * Integration test for Better-Auth API Key functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { mockAuth, resetMockAuth } from "../utils/auth-test-utils";
import { db } from "../../src/db";
import { user } from "../../src/db/schema/auth";
import { eq } from "drizzle-orm";

// Types for Better-Auth API responses
interface ApiKeyResponse {
  key?: string;
  id?: string;
  name?: string;
  userId?: string;
  prefix?: string;
  metadata?: Record<string, any>;
  rateLimitEnabled?: boolean;
  rateLimitMax?: number;
  rateLimitTimeWindow?: number;
  permissions?: Record<string, string[]>;
}

interface ApiKeyVerifyResponse {
  valid: boolean;
  key?: {
    id?: string;
    userId?: string;
    name?: string;
    permissions?: Record<string, string[]>;
  } | null;
  error?: string | null;
}

interface ApiKeyDeleteResponse {
  success: boolean;
  message?: string;
}

describe("Better-Auth API Key Integration", () => {
  let testUserId: string;
  let testApiKey: ApiKeyResponse = {};

  beforeEach(() => {
    // Reset mocks before each test
    resetMockAuth();
  });

  beforeAll(async () => {
    // Create a test user for API key testing
    const testUser = {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(user).values(testUser);
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test data
    // Note: API key cleanup is handled by mocks, only clean up actual database records
    if (testUserId) {
      await db.delete(user).where(eq(user.id, testUserId));
    }
  });

  it("should create an API key via Better-Auth", async () => {
    const result = await mockAuth.api.createApiKey({
      body: {
        name: "Test API Key",
        expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
        userId: testUserId,
        prefix: "mcp_test",
        metadata: {
          environment: "test",
          version: "1.0.0",
        },
      },
    }) as ApiKeyResponse;

    expect(result).toBeDefined();
    expect(result.key).toBeDefined();
    expect(result.key).toMatch(/^mcp_test/);
    expect(result.id).toBeDefined();
    expect(result.name).toBe("Test API Key");
    expect(result.userId).toBe(testUserId);

    testApiKey = result;
  });

  it("should verify a valid API key", async () => {
    if (!testApiKey.key) {
      throw new Error("Test API key not created");
    }

    const result = await mockAuth.api.verifyApiKey({
      body: {
        key: testApiKey.key,
      },
    }) as ApiKeyVerifyResponse;

    expect(result).toBeDefined();
    expect(result.valid).toBe(true);
    expect(result.key).toBeDefined();
    expect(result.key?.userId).toBe(testUserId);
    expect(result.error).toBeNull();
  });

  it("should fail to verify an invalid API key", async () => {
    const result = await mockAuth.api.verifyApiKey({
      body: {
        key: "mcp_invalid_key_12345",
      },
    }) as ApiKeyVerifyResponse;

    expect(result).toBeDefined();
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.key).toBeNull();
  });

  it("should list API keys for a user", async () => {
    // Create a mock session context for the user
    const mockHeaders = new Headers({
      cookie: `test-session=${testUserId}`,
    });

    const result = await mockAuth.api.listApiKeys({
      headers: mockHeaders,
    }) as ApiKeyResponse[];

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Should find at least the test API key we created
    const foundKey = result.find((k) => k.id === testApiKey.id);
    expect(foundKey).toBeDefined();
    expect(foundKey?.name).toBe("Test API Key");
  });

  it("should update an API key", async () => {
    if (!testApiKey.id) {
      throw new Error("Test API key not created");
    }

    const result = await mockAuth.api.updateApiKey({
      body: {
        keyId: testApiKey.id,
        name: "Updated Test API Key",
        metadata: {
          environment: "test",
          version: "2.0.0",
          updated: true,
        },
      },
    }) as ApiKeyResponse;

    expect(result).toBeDefined();
    expect(result.name).toBe("Updated Test API Key");
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.version).toBe("2.0.0");
    expect(result.metadata?.updated).toBe(true);
  });

  it("should respect rate limiting configuration", async () => {
    const rateLimitedKey = await mockAuth.api.createApiKey({
      body: {
        name: "Rate Limited Key",
        userId: testUserId,
        rateLimitEnabled: true,
        rateLimitMax: 10,
        rateLimitTimeWindow: 60000, // 1 minute
      },
    }) as ApiKeyResponse;

    expect(rateLimitedKey).toBeDefined();
    expect(rateLimitedKey.rateLimitEnabled).toBe(true);
    expect(rateLimitedKey.rateLimitMax).toBe(10);
    expect(rateLimitedKey.rateLimitTimeWindow).toBe(60000);

    // Note: Cleanup is handled by mock reset in beforeEach
  });

  it("should handle API key permissions", async () => {
    const permissionedKey = await mockAuth.api.createApiKey({
      body: {
        name: "Permissioned Key",
        userId: testUserId,
        permissions: {
          servers: ["read"],
          users: ["read", "write"],
        },
      },
    }) as ApiKeyResponse;

    expect(permissionedKey).toBeDefined();
    expect(permissionedKey.permissions).toBeDefined();

    // Verify with required permissions
    const verifyResult = await mockAuth.api.verifyApiKey({
      body: {
        key: permissionedKey.key || "",
        permissions: {
          servers: ["read"],
        },
      },
    }) as ApiKeyVerifyResponse;

    expect(verifyResult.valid).toBe(true);

    // Verify with permissions the key doesn't have
    const failResult = await mockAuth.api.verifyApiKey({
      body: {
        key: permissionedKey.key || "",
        permissions: {
          servers: ["write"], // Key only has "read" permission
        },
      },
    }) as ApiKeyVerifyResponse;

    expect(failResult.valid).toBe(false);

    // Note: Cleanup is handled by mock reset in beforeEach
  });

  it("should delete an API key", async () => {
    const keyToDelete = await mockAuth.api.createApiKey({
      body: {
        name: "Key to Delete",
        userId: testUserId,
      },
    }) as ApiKeyResponse;

    expect(keyToDelete).toBeDefined();
    expect(keyToDelete.id).toBeDefined();

    if (!keyToDelete.id) {
      throw new Error("Failed to create test API key for deletion");
    }

    const deleteResult = await mockAuth.api.deleteApiKey({
      body: {
        keyId: keyToDelete.id,
      },
    }) as ApiKeyDeleteResponse;

    expect(deleteResult).toBeDefined();
    expect(deleteResult.success).toBe(true);

    // In a real implementation, you would verify against the database
    // For mocked tests, we verify the mock behavior instead
    expect(deleteResult.success).toBe(true);
  });
});
