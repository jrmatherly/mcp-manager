/**
 * Integration test for Better-Auth API Key functionality
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { auth } from "../src/lib/auth";
import { db } from "../src/db";
import { apiKey, user } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("Better-Auth API Key Integration", () => {
  let testUserId: string;
  let testApiKey: { key?: string; id?: string };

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
    if (testApiKey?.id) {
      await db.delete(apiKey).where(eq(apiKey.id, testApiKey.id));
    }
    if (testUserId) {
      await db.delete(user).where(eq(user.id, testUserId));
    }
  });

  it("should create an API key via Better-Auth", async () => {
    const result = await auth.api.createApiKey({
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
    });

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

    const result = await auth.api.verifyApiKey({
      body: {
        key: testApiKey.key,
      },
    });

    expect(result).toBeDefined();
    expect(result.valid).toBe(true);
    expect(result.key).toBeDefined();
    expect(result.key?.userId).toBe(testUserId);
    expect(result.error).toBeNull();
  });

  it("should fail to verify an invalid API key", async () => {
    const result = await auth.api.verifyApiKey({
      body: {
        key: "mcp_invalid_key_12345",
      },
    });

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

    const result = await auth.api.listApiKeys({
      headers: mockHeaders,
    });

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

    const result = await auth.api.updateApiKey({
      body: {
        keyId: testApiKey.id,
        name: "Updated Test API Key",
        metadata: {
          environment: "test",
          version: "2.0.0",
          updated: true,
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Updated Test API Key");
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.version).toBe("2.0.0");
    expect(result.metadata?.updated).toBe(true);
  });

  it("should respect rate limiting configuration", async () => {
    const rateLimitedKey = await auth.api.createApiKey({
      body: {
        name: "Rate Limited Key",
        userId: testUserId,
        rateLimitEnabled: true,
        rateLimitMax: 10,
        rateLimitTimeWindow: 60000, // 1 minute
      },
    });

    expect(rateLimitedKey).toBeDefined();
    expect(rateLimitedKey.rateLimitEnabled).toBe(true);
    expect(rateLimitedKey.rateLimitMax).toBe(10);
    expect(rateLimitedKey.rateLimitTimeWindow).toBe(60000);

    // Clean up
    if (rateLimitedKey.id) {
      await db.delete(apiKey).where(eq(apiKey.id, rateLimitedKey.id));
    }
  });

  it("should handle API key permissions", async () => {
    const permissionedKey = await auth.api.createApiKey({
      body: {
        name: "Permissioned Key",
        userId: testUserId,
        permissions: {
          servers: ["read"],
          users: ["read", "write"],
        },
      },
    });

    expect(permissionedKey).toBeDefined();
    expect(permissionedKey.permissions).toBeDefined();

    // Verify with required permissions
    const verifyResult = await auth.api.verifyApiKey({
      body: {
        key: permissionedKey.key!,
        permissions: {
          servers: ["read"],
        },
      },
    });

    expect(verifyResult.valid).toBe(true);

    // Verify with permissions the key doesn't have
    const failResult = await auth.api.verifyApiKey({
      body: {
        key: permissionedKey.key!,
        permissions: {
          servers: ["write"], // Key only has "read" permission
        },
      },
    });

    expect(failResult.valid).toBe(false);

    // Clean up
    if (permissionedKey.id) {
      await db.delete(apiKey).where(eq(apiKey.id, permissionedKey.id));
    }
  });

  it("should delete an API key", async () => {
    const keyToDelete = await auth.api.createApiKey({
      body: {
        name: "Key to Delete",
        userId: testUserId,
      },
    });

    expect(keyToDelete).toBeDefined();
    expect(keyToDelete.id).toBeDefined();

    const deleteResult = await auth.api.deleteApiKey({
      body: {
        keyId: keyToDelete.id!,
      },
    });

    expect(deleteResult).toBeDefined();
    expect(deleteResult.success).toBe(true);

    // Verify the key is deleted
    const keys = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.id, keyToDelete.id!));

    expect(keys.length).toBe(0);
  });
});