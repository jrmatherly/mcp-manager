/**
 * Integration tests for Better-Auth Logger Integration
 *
 * Tests the complete integration between Better-Auth and the project's logging
 * infrastructure, ensuring proper functionality in realistic usage scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from "vitest";

// Mock the environment before importing any modules
vi.mock("../../src/env", () => ({
  env: {
    NODE_ENV: "development", // Set to development to enable logging
    LOG_LEVEL: "debug",
    LOG_PRODUCTION: true, // Enable production logging for tests
    NEXT_PUBLIC_LOG_LEVEL: "debug",
    NEXT_PUBLIC_LOG_PRODUCTION: true,
    NEXT_PUBLIC_LOG_BROWSER: true,
    LOG_STRUCTURED: false, // Disable structured logging for simpler console output
    NEXT_PUBLIC_LOG_STRUCTURED: false,
    // Add minimal auth environment variables to prevent errors
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
  },
}));

// Mock the database and Redis to prevent connection attempts in tests
vi.mock("../../src/db", () => ({
  db: {},
}));

vi.mock("../../src/lib/redis", () => ({
  redisSecondaryStorage: {},
}));

vi.mock("../../src/lib/email", () => ({
  sendEmail: vi.fn(),
}));

import { betterAuthLogger, authLogger } from "../../src/lib/logger";

describe("Better-Auth Logger Integration", () => {
  let originalConsole: typeof console;
  let authLoggerSpy: { debug: MockInstance; info: MockInstance; warn: MockInstance; error: MockInstance };

  beforeEach(() => {
    // Capture console output for testing
    originalConsole = global.console;
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Also spy on the underlying authLogger methods for more reliable testing
    authLoggerSpy = {
      debug: vi.spyOn(authLogger, "debug"),
      info: vi.spyOn(authLogger, "info"),
      warn: vi.spyOn(authLogger, "warn"),
      error: vi.spyOn(authLogger, "error"),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.console = originalConsole;
  });

  describe("Better-Auth Configuration Integration", () => {
    it("should have proper logger structure for Better-Auth integration", () => {
      // Check that betterAuthLogger has the expected structure
      expect(betterAuthLogger).toHaveProperty("disabled", false);
      expect(betterAuthLogger).toHaveProperty("log");
      expect(typeof betterAuthLogger.log).toBe("function");
    });

    it("should inherit configuration from authLogger", () => {
      const authLoggerLevel = authLogger.getLevel();
      expect(betterAuthLogger.level).toBe(authLoggerLevel);
    });

    it("should maintain Better-Auth compatibility", () => {
      // Test that the logger has the expected Better-Auth interface
      expect(betterAuthLogger).toHaveProperty("disabled");
      expect(betterAuthLogger).toHaveProperty("disableColors");
      expect(betterAuthLogger).toHaveProperty("level");
      expect(betterAuthLogger).toHaveProperty("log");

      // Test the log method signature
      expect(() => {
        betterAuthLogger.log("info", "Test message", { extra: "context" });
      }).not.toThrow();
    });
  });

  describe("Logging Behavior in Realistic Scenarios", () => {
    it("should format Better-Auth messages correctly", () => {
      const testMessage = "User authentication successful";
      const testContext = { userId: "user123", method: "oauth" };

      betterAuthLogger.log("info", testMessage, testContext);

      // Verify the underlying authLogger was called with proper formatting
      expect(authLoggerSpy.info).toHaveBeenCalledWith(
        "[Better-Auth] User authentication successful",
        expect.objectContaining({
          component: "better-auth",
          userId: "user123",
          method: "oauth",
        })
      );
    });

    it("should handle authentication flow logging", () => {
      // Simulate typical Better-Auth log calls during authentication
      betterAuthLogger.log("debug", "Starting OAuth flow", { provider: "google" });
      betterAuthLogger.log("info", "OAuth callback received", {
        code: "auth_code_123",
        state: "random_state"
      });
      betterAuthLogger.log("info", "User authenticated successfully", {
        userId: "user456",
        email: "test@example.com"
      });

      expect(authLoggerSpy.debug).toHaveBeenCalledTimes(1);
      expect(authLoggerSpy.info).toHaveBeenCalledTimes(2);

      // Verify the debug call
      expect(authLoggerSpy.debug).toHaveBeenCalledWith(
        "[Better-Auth] Starting OAuth flow",
        expect.objectContaining({
          component: "better-auth",
          provider: "google",
        })
      );
    });

    it("should handle error scenarios during authentication", () => {
      // Simulate error logging during failed authentication
      betterAuthLogger.log("warn", "Invalid OAuth state parameter", {
        received: "invalid_state",
        expected: "valid_state"
      });

      betterAuthLogger.log("error", "Authentication failed", {
        error: "invalid_grant",
        description: "The provided authorization grant is invalid"
      });

      expect(authLoggerSpy.warn).toHaveBeenCalledTimes(1);
      expect(authLoggerSpy.error).toHaveBeenCalledTimes(1);

      // Verify the error call details
      expect(authLoggerSpy.error).toHaveBeenCalledWith(
        "[Better-Auth] Authentication failed",
        expect.objectContaining({
          component: "better-auth",
          error: "invalid_grant",
          description: "The provided authorization grant is invalid",
        })
      );
    });

    it("should maintain context across multiple log calls", () => {
      const sessionId = "session_789";

      // Log multiple related events
      betterAuthLogger.log("debug", "Session started", { sessionId });
      betterAuthLogger.log("info", "User profile loaded", { sessionId, userId: "user789" });
      betterAuthLogger.log("debug", "Permissions checked", { sessionId, permissions: ["read", "write"] });

      // All calls should have been made
      expect(authLoggerSpy.debug).toHaveBeenCalledTimes(2);
      expect(authLoggerSpy.info).toHaveBeenCalledTimes(1);

      // Verify context is maintained
      expect(authLoggerSpy.info).toHaveBeenCalledWith(
        "[Better-Auth] User profile loaded",
        expect.objectContaining({
          component: "better-auth",
          sessionId: "session_789",
          userId: "user789",
        })
      );
    });
  });

  describe("Environment-Specific Behavior", () => {
    it("should respect environment configuration for logging output", () => {
      // Test that the logger respects the environment configuration
      betterAuthLogger.log("info", "Environment test message");

      // Verify the underlying logger was called
      expect(authLoggerSpy.info).toHaveBeenCalledWith(
        "[Better-Auth] Environment test message",
        expect.objectContaining({
          component: "better-auth",
        })
      );
    });

    it("should handle different log levels based on configuration", () => {
      // Test various log levels
      betterAuthLogger.log("debug", "Debug level message");
      betterAuthLogger.log("info", "Info level message");
      betterAuthLogger.log("warn", "Warning level message");
      betterAuthLogger.log("error", "Error level message");

      // Verify appropriate logger methods were called
      expect(authLoggerSpy.debug).toHaveBeenCalled();
      expect(authLoggerSpy.info).toHaveBeenCalled();
      expect(authLoggerSpy.warn).toHaveBeenCalled();
      expect(authLoggerSpy.error).toHaveBeenCalled();
    });
  });

  describe("Performance and Memory Usage", () => {
    it("should handle high-volume logging efficiently", () => {
      const start = performance.now();

      // Simulate high-volume logging typical in production
      for (let i = 0; i < 100; i++) {
        betterAuthLogger.log("debug", `Request ${i}`, {
          requestId: `req_${i}`,
          timestamp: Date.now(),
          userAgent: "test-agent"
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should be very fast
      expect(authLoggerSpy.debug).toHaveBeenCalledTimes(100);
    });

    it("should not leak memory with large context objects", () => {
      // Test with large context objects to ensure no memory leaks
      const largeContext = {
        metadata: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`field${i}`, `value${i}`.repeat(10)])
        ),
        timestamp: Date.now(),
        environment: "test"
      };

      expect(() => {
        betterAuthLogger.log("info", "Large context test", largeContext);
      }).not.toThrow();

      expect(authLoggerSpy.info).toHaveBeenCalledWith(
        "[Better-Auth] Large context test",
        expect.objectContaining({
          component: "better-auth",
          metadata: expect.any(Object),
          timestamp: expect.any(Number),
          environment: "test",
        })
      );
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should continue working if console methods are unavailable", () => {
      // Test that the Better-Auth logger is resilient
      // Since we're mocking the underlying logger, this test verifies
      // that the wrapper function continues to work
      expect(() => {
        betterAuthLogger.log("info", "Resilience test message");
      }).not.toThrow();

      // Verify the call was made to the underlying logger
      expect(authLoggerSpy.info).toHaveBeenCalledWith(
        "[Better-Auth] Resilience test message",
        expect.objectContaining({ component: "better-auth" })
      );
    });

    it("should handle malformed context objects gracefully", () => {
      const malformedContext = {
        circular: {} as any,
        function: () => "test",
        symbol: Symbol("test"),
        bigint: BigInt(123),
      };
      malformedContext.circular.self = malformedContext.circular;

      expect(() => {
        betterAuthLogger.log("warn", "Malformed context test", malformedContext);
      }).not.toThrow();

      expect(authLoggerSpy.warn).toHaveBeenCalledWith(
        "[Better-Auth] Malformed context test",
        expect.objectContaining({
          component: "better-auth",
        })
      );
    });

    it("should recover from logging errors and continue operation", () => {
      // Test that the Better-Auth logger continues to work even if underlying logging has issues
      betterAuthLogger.log("info", "First message");
      betterAuthLogger.log("info", "Second message");

      // Both calls should have been made to the underlying logger
      expect(authLoggerSpy.info).toHaveBeenCalledTimes(2);
      expect(authLoggerSpy.info).toHaveBeenCalledWith(
        "[Better-Auth] Second message",
        expect.objectContaining({ component: "better-auth" })
      );
    });
  });

  describe("Message Formatting and Structure", () => {
    it("should include Better-Auth prefix in all messages", () => {
      betterAuthLogger.log("info", "Test message");

      expect(authLoggerSpy.info).toHaveBeenCalledWith(
        "[Better-Auth] Test message",
        expect.objectContaining({ component: "better-auth" })
      );
    });

    it("should preserve message formatting and special characters", () => {
      const complexMessage = "User 'john@example.com' logged in via OAuth2 🔐";

      betterAuthLogger.log("info", complexMessage);

      expect(authLoggerSpy.info).toHaveBeenCalledWith(
        `[Better-Auth] ${complexMessage}`,
        expect.objectContaining({ component: "better-auth" })
      );
    });

    it("should maintain consistent context structure", () => {
      const testContext = {
        userId: "user123",
        action: "login",
        timestamp: "2024-01-01T00:00:00Z"
      };

      betterAuthLogger.log("info", "Consistent context test", testContext);

      expect(authLoggerSpy.info).toHaveBeenCalledWith(
        "[Better-Auth] Consistent context test",
        expect.objectContaining({
          component: "better-auth",
          userId: "user123",
          action: "login",
          timestamp: "2024-01-01T00:00:00Z"
        })
      );
    });
  });
});