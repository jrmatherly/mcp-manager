/**
 * Testing Utilities
 *
 * Custom render functions and test utilities for React components.
 */

import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  // Create a new QueryClient for each test to avoid shared state
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

const customRender = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  const { wrapper: Wrapper = AllTheProviders, ...renderOptions } = options;

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock Next.js router
export const mockRouter = {
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  pathname: "/",
  route: "/",
  query: {},
  asPath: "/",
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
  beforePopState: vi.fn(),
  isFallback: false,
  isLocaleDomain: true,
  isReady: true,
  isPreview: false,
};

// Mock Next.js navigation hooks
export const mockNavigation = {
  useRouter: () => mockRouter,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
};

// Common test data factories
export const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  role: "USER" as const,
  status: "active" as const,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

export const createMockServer = (overrides = {}) => ({
  id: "test-server-id",
  name: "Test Server",
  description: "A test MCP server",
  url: "http://localhost:3001",
  status: "active" as const,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

// Test helpers
export const waitForLoadingToFinish = async () => {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };
