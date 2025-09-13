import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: ["node_modules/", ".next/", "tests/", "**/*.d.ts", "**/*.config.{ts,js,mjs}", "**/coverage/**", "**/dist/**"],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    teardownTimeout: 10000,
    // Use forks pool for better compatibility with native modules and BigInt
    pool: "forks",
    poolOptions: {
      forks: {
        maxForks: 3,
        minForks: 1,
      },
    },
    // Reporter configuration
    reporters: ["default"],
    // External dependencies configuration
    server: {
      deps: {
        external: ["pg", "node-postgres"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./"),
    },
  },
  // Optimize dependencies for faster test runs
  optimizeDeps: {
    include: ["@testing-library/react", "@testing-library/jest-dom", "@testing-library/user-event"],
  },
  esbuild: {
    target: "esnext",
    // Enable BigInt support
    supported: {
      bigint: true,
    },
  },
});
