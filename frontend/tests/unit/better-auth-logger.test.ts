/**
 * Unit tests for Better-Auth Logger Integration
 *
 * Tests the createBetterAuthLogger function and its integration with the project's
 * logging infrastructure, ensuring proper log level mapping, context conversion,
 * and Better-Auth compatibility.
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from "vitest";

// Mock the environment before importing the logger
vi.mock("../../src/env", () => ({
  env: {
    NODE_ENV: "test",
    LOG_LEVEL: "debug",
    LOG_PRODUCTION: false,
    NEXT_PUBLIC_LOG_LEVEL: "debug",
    NEXT_PUBLIC_LOG_PRODUCTION: false,
    NEXT_PUBLIC_LOG_BROWSER: true,
    LOG_STRUCTURED: true,
    NEXT_PUBLIC_LOG_STRUCTURED: false,
  },
}));

import { createBetterAuthLogger, type Logger, authLogger, betterAuthLogger, type LogLevel } from "../../src/lib/logger";

// Mock the logger methods for testing
const createMockLogger = () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLevel: vi.fn(),
  } as unknown as Logger;

  // Setup default return value for getLevel
  (mockLogger.getLevel as MockedFunction<() => LogLevel>).mockReturnValue("info");

  return mockLogger;
};

describe("createBetterAuthLogger", () => {
  let mockLogger: Logger;
  let betterAuthLogger: ReturnType<typeof createBetterAuthLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    betterAuthLogger = createBetterAuthLogger(mockLogger);
    vi.clearAllMocks();
  });

  describe("Configuration Properties", () => {
    it("should return correct configuration structure", () => {
      expect(betterAuthLogger).toHaveProperty("disabled", false);
      expect(betterAuthLogger).toHaveProperty("disableColors");
      expect(betterAuthLogger).toHaveProperty("level");
      expect(betterAuthLogger).toHaveProperty("log");
      expect(typeof betterAuthLogger.log).toBe("function");
    });

    it("should inherit log level from underlying logger", () => {
      (mockLogger.getLevel as MockedFunction<() => LogLevel>).mockReturnValue("debug");
      const logger = createBetterAuthLogger(mockLogger);
      expect(logger.level).toBe("debug");

      (mockLogger.getLevel as MockedFunction<() => LogLevel>).mockReturnValue("error");
      const errorLogger = createBetterAuthLogger(mockLogger);
      expect(errorLogger.level).toBe("error");
    });

    it("should extract color configuration from logger config using Reflect", () => {
      // Test with colors enabled
      const configWithColors = { enableColors: true };
      Reflect.set(mockLogger, "config", configWithColors);
      const loggerWithColors = createBetterAuthLogger(mockLogger);
      expect(loggerWithColors.disableColors).toBe(false);

      // Test with colors disabled
      const configWithoutColors = { enableColors: false };
      Reflect.set(mockLogger, "config", configWithoutColors);
      const loggerWithoutColors = createBetterAuthLogger(mockLogger);
      expect(loggerWithoutColors.disableColors).toBe(true);

      // Test with missing config (should default to colors enabled)
      Reflect.set(mockLogger, "config", undefined);
      const loggerDefaultColors = createBetterAuthLogger(mockLogger);
      expect(loggerDefaultColors.disableColors).toBe(false);
    });
  });

  describe("Log Level Mapping", () => {
    it("should map debug level correctly", () => {
      betterAuthLogger.log("debug", "Debug message");

      expect(mockLogger.debug).toHaveBeenCalledOnce();
      expect(mockLogger.debug).toHaveBeenCalledWith("[Better-Auth] Debug message", { component: "better-auth" });
    });

    it("should map info level correctly", () => {
      betterAuthLogger.log("info", "Info message");

      expect(mockLogger.info).toHaveBeenCalledOnce();
      expect(mockLogger.info).toHaveBeenCalledWith("[Better-Auth] Info message", { component: "better-auth" });
    });

    it("should map warn level correctly", () => {
      betterAuthLogger.log("warn", "Warning message");

      expect(mockLogger.warn).toHaveBeenCalledOnce();
      expect(mockLogger.warn).toHaveBeenCalledWith("[Better-Auth] Warning message", { component: "better-auth" });
    });

    it("should map error level correctly", () => {
      betterAuthLogger.log("error", "Error message");

      expect(mockLogger.error).toHaveBeenCalledOnce();
      expect(mockLogger.error).toHaveBeenCalledWith("[Better-Auth] Error message", { component: "better-auth" });
    });

    it("should handle unknown log levels by defaulting to info", () => {
      // @ts-expect-error Testing invalid log level
      betterAuthLogger.log("unknown", "Unknown level message");

      expect(mockLogger.info).toHaveBeenCalledOnce();
      expect(mockLogger.info).toHaveBeenCalledWith("[Better-Auth] Unknown level message", { component: "better-auth" });
    });
  });

  describe("Context Conversion", () => {
    it("should add Better-Auth prefix to all messages", () => {
      betterAuthLogger.log("info", "Test message");

      expect(mockLogger.info).toHaveBeenCalledWith("[Better-Auth] Test message", expect.any(Object));
    });

    it("should include component context in all logs", () => {
      betterAuthLogger.log("info", "Test message");

      const [, context] = (mockLogger.info as MockedFunction<any>).mock.calls[0];
      expect(context).toHaveProperty("component", "better-auth");
    });

    it("should handle no additional arguments", () => {
      betterAuthLogger.log("info", "Simple message");

      expect(mockLogger.info).toHaveBeenCalledWith("[Better-Auth] Simple message", { component: "better-auth" });
    });

    it("should merge object arguments into context", () => {
      const contextObj1 = { userId: "123", action: "login" };
      const contextObj2 = { ip: "192.168.1.1", userAgent: "test-agent" };

      betterAuthLogger.log("info", "Login attempt", contextObj1, contextObj2);

      const [, context] = (mockLogger.info as MockedFunction<any>).mock.calls[0];
      expect(context).toEqual({
        component: "better-auth",
        userId: "123",
        action: "login",
        ip: "192.168.1.1",
        userAgent: "test-agent",
      });
    });

    it("should handle primitive arguments as indexed properties", () => {
      betterAuthLogger.log("warn", "Mixed arguments", "string-value", 42, true);

      const [, context] = (mockLogger.warn as MockedFunction<any>).mock.calls[0];
      expect(context).toEqual({
        component: "better-auth",
        arg0: "string-value",
        arg1: 42,
        arg2: true,
      });
    });

    it("should handle mixed object and primitive arguments", () => {
      const userData = { userId: "456", role: "admin" };

      betterAuthLogger.log("debug", "Mixed context", userData, "additional-info", 123);

      const [, context] = (mockLogger.debug as MockedFunction<any>).mock.calls[0];
      expect(context).toEqual({
        component: "better-auth",
        userId: "456",
        role: "admin",
        arg1: "additional-info",
        arg2: 123,
      });
    });

    it("should handle null and undefined arguments safely", () => {
      betterAuthLogger.log("error", "Null handling", null, undefined, { valid: "data" });

      const [, context] = (mockLogger.error as MockedFunction<any>).mock.calls[0];
      expect(context).toEqual({
        component: "better-auth",
        arg0: null,
        arg1: undefined,
        valid: "data",
      });
    });

    it("should preserve argument order when mixing types", () => {
      betterAuthLogger.log("info", "Order test", "first", { middle: "value" }, "last");

      const [, context] = (mockLogger.info as MockedFunction<any>).mock.calls[0];
      expect(context).toEqual({
        component: "better-auth",
        arg0: "first",
        middle: "value",
        arg2: "last",
      });
    });
  });

  describe("Integration with Real authLogger", () => {
    it("should create a working logger with the real authLogger", () => {
      const realBetterAuthLogger = createBetterAuthLogger(authLogger);

      expect(realBetterAuthLogger).toHaveProperty("disabled", false);
      expect(realBetterAuthLogger).toHaveProperty("level");
      expect(realBetterAuthLogger).toHaveProperty("log");
      expect(typeof realBetterAuthLogger.log).toBe("function");
    });

    it("should inherit the correct log level from authLogger", () => {
      const realBetterAuthLogger = createBetterAuthLogger(authLogger);
      const authLoggerLevel = authLogger.getLevel();

      expect(realBetterAuthLogger.level).toBe(authLoggerLevel);
    });
  });

  describe("Environment Awareness", () => {
    it("should respect logger configuration for different environments", () => {
      // Mock a production-like logger configuration
      const prodConfig = {
        enableColors: false,
        level: "warn" as LogLevel,
        enableInProduction: true,
      };

      Reflect.set(mockLogger, "config", prodConfig);
      (mockLogger.getLevel as MockedFunction<() => LogLevel>).mockReturnValue("warn");

      const prodLogger = createBetterAuthLogger(mockLogger);

      expect(prodLogger.disableColors).toBe(true);
      expect(prodLogger.level).toBe("warn");
    });

    it("should handle development-like logger configuration", () => {
      // Mock a development-like logger configuration
      const devConfig = {
        enableColors: true,
        level: "debug" as LogLevel,
        enableInBrowser: true,
      };

      Reflect.set(mockLogger, "config", devConfig);
      (mockLogger.getLevel as MockedFunction<() => LogLevel>).mockReturnValue("debug");

      const devLogger = createBetterAuthLogger(mockLogger);

      expect(devLogger.disableColors).toBe(false);
      expect(devLogger.level).toBe("debug");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle logger with undefined getLevel method", () => {
      const brokenLogger = { getLevel: undefined } as unknown as Logger;

      expect(() => createBetterAuthLogger(brokenLogger)).toThrow();
    });

    it("should handle extremely large context objects", () => {
      const largeContext = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`]));

      expect(() => {
        betterAuthLogger.log("info", "Large context test", largeContext);
      }).not.toThrow();

      const [, context] = (mockLogger.info as MockedFunction<any>).mock.calls[0];
      const contextObj = context as Record<string, unknown>;
      expect(Object.keys(contextObj)).toHaveLength(101); // 100 keys + component
      expect(contextObj.component).toBe("better-auth");
    });

    it("should handle circular reference objects safely", () => {
      const circularObj: any = { name: "circular" };
      circularObj.self = circularObj;

      expect(() => {
        betterAuthLogger.log("warn", "Circular reference test", circularObj);
      }).not.toThrow();

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should handle empty string messages", () => {
      betterAuthLogger.log("info", "");

      expect(mockLogger.info).toHaveBeenCalledWith("[Better-Auth] ", { component: "better-auth" });
    });

    it("should handle special characters in messages", () => {
      const specialMessage = "Message with 🎉 emojis and \n newlines \t tabs";

      betterAuthLogger.log("debug", specialMessage);

      expect(mockLogger.debug).toHaveBeenCalledWith(`[Better-Auth] ${specialMessage}`, { component: "better-auth" });
    });
  });

  describe("Performance Considerations", () => {
    it("should not call underlying logger methods until log is called", () => {
      createBetterAuthLogger(mockLogger);

      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should only call getLevel once during creation", () => {
      createBetterAuthLogger(mockLogger);

      expect(mockLogger.getLevel).toHaveBeenCalledOnce();
    });

    it("should handle high-frequency logging without performance issues", () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        betterAuthLogger.log("debug", `Message ${i}`, { iteration: i });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(mockLogger.debug).toHaveBeenCalledTimes(1000);
    });
  });
});

describe("betterAuthLogger Export", () => {
  it("should export a pre-configured Better-Auth logger", () => {
    // Import the exported instance (already imported at the top)
    expect(betterAuthLogger).toBeDefined();
    expect(betterAuthLogger).toHaveProperty("disabled", false);
    expect(betterAuthLogger).toHaveProperty("log");
    expect(typeof betterAuthLogger.log).toBe("function");
  });

  it("should use the authLogger as its underlying logger", () => {
    // The level should match the authLogger's level (already imported at the top)
    expect(betterAuthLogger.level).toBe(authLogger.getLevel());
  });
});
