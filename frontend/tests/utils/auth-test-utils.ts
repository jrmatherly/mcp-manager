/**
 * Better-Auth Test Utilities
 *
 * Mock implementations and utilities for testing Better-Auth functionality
 * without requiring actual authentication infrastructure.
 */

import { vi } from "vitest";

// Mock API key responses
export interface MockApiKeyResponse {
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

export interface MockApiKeyVerifyResponse {
  valid: boolean;
  key?: {
    id?: string;
    userId?: string;
    name?: string;
    permissions?: Record<string, string[]>;
  } | null;
  error?: string | null;
}

export interface MockApiKeyDeleteResponse {
  success: boolean;
  message?: string;
}

// Mock auth instance for testing
export const createMockAuth = () => {
  const mockApiKeys = new Map<string, MockApiKeyResponse>();

  return {
    api: {
      createApiKey: vi.fn().mockImplementation(async ({ body }: { body: any }) => {
        const keyId = `key_${Date.now()}`;
        const keyValue = `${body.prefix || "mcp_"}${Math.random().toString(36).substring(2, 15)}`;

        const apiKey: MockApiKeyResponse = {
          id: keyId,
          key: keyValue,
          name: body.name,
          userId: body.userId,
          prefix: body.prefix,
          metadata: body.metadata || {},
          rateLimitEnabled: body.rateLimitEnabled || false,
          rateLimitMax: body.rateLimitMax,
          rateLimitTimeWindow: body.rateLimitTimeWindow,
          permissions: body.permissions || {},
        };

        mockApiKeys.set(keyValue, apiKey);
        return apiKey;
      }),

      verifyApiKey: vi.fn().mockImplementation(async ({ body }: { body: any }) => {
        const apiKey = mockApiKeys.get(body.key);

        if (!apiKey) {
          return {
            valid: false,
            key: null,
            error: "API key not found",
          };
        }

        // Check permissions if provided
        if (body.permissions) {
          const hasRequiredPermissions = Object.entries(body.permissions).every(([resource, actions]) => {
            const keyPermissions = apiKey.permissions?.[resource] || [];
            return (actions as string[]).every((action: string) => keyPermissions.includes(action));
          });

          if (!hasRequiredPermissions) {
            return {
              valid: false,
              key: null,
              error: "Insufficient permissions",
            };
          }
        }

        return {
          valid: true,
          key: {
            id: apiKey.id,
            userId: apiKey.userId,
            name: apiKey.name,
            permissions: apiKey.permissions,
          },
          error: null,
        };
      }),

      listApiKeys: vi.fn().mockImplementation(async () => {
        // In a real implementation, this would check session/auth from headers
        // For testing, return all mock keys
        return Array.from(mockApiKeys.values());
      }),

      updateApiKey: vi.fn().mockImplementation(async ({ body }: { body: any }) => {
        const existingKey = Array.from(mockApiKeys.values()).find((k) => k.id === body.keyId);

        if (!existingKey) {
          throw new Error("API key not found");
        }

        const updatedKey = {
          ...existingKey,
          name: body.name || existingKey.name,
          metadata: { ...existingKey.metadata, ...body.metadata },
        };

        // Update in the map using the existing key value
        const keyValue = existingKey.key || "";
        if (keyValue) {
          mockApiKeys.set(keyValue, updatedKey);
        }

        return updatedKey;
      }),

      deleteApiKey: vi.fn().mockImplementation(async ({ body }: { body: any }) => {
        const keyToDelete = Array.from(mockApiKeys.entries()).find(([_, apiKey]) => apiKey.id === body.keyId);

        if (!keyToDelete) {
          throw new Error("API key not found");
        }

        mockApiKeys.delete(keyToDelete[0]);

        return {
          success: true,
          message: "API key deleted successfully",
        };
      }),
    },
  };
};

// Mock auth instance
export const mockAuth = createMockAuth();

// Helper to reset mock state between tests
export const resetMockAuth = () => {
  vi.clearAllMocks();
  // Clear the internal mock storage
  (mockAuth.api.createApiKey as any).mockClear();
  (mockAuth.api.verifyApiKey as any).mockClear();
  (mockAuth.api.listApiKeys as any).mockClear();
  (mockAuth.api.updateApiKey as any).mockClear();
  (mockAuth.api.deleteApiKey as any).mockClear();
};
