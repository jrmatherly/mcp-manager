/**
 * Vitest Test Setup
 *
 * Global test configuration and setup for the frontend test suite.
 * This file is automatically loaded before any tests run.
 */

import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./utils/msw-server";

// Global test environment setup
beforeAll(() => {
  // Start MSW server for API mocking
  server.listen({ onUnhandledRequest: "error" });

  // Mock window.matchMedia (required for some components)
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock window.scrollTo
  window.scrollTo = vi.fn();

  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    // Uncomment to suppress console outputs during tests
    // log: vi.fn(),
    // warn: vi.fn(),
    // error: vi.fn(),
  };
});

// Cleanup after each test
afterEach(() => {
  // Clean up DOM after each test
  cleanup();

  // Reset MSW handlers to prevent test pollution
  server.resetHandlers();

  // Clear all mocks
  vi.clearAllMocks();
});

// Global teardown
afterAll(() => {
  // Stop MSW server
  server.close();
});

// Type declarations for Vitest are now in vitest.d.ts
