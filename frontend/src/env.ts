import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Type-safe environment variable validation using T3 Env
 * This ensures all environment variables are properly typed and validated at build time
 */
export const env = createEnv({
  /**
   * Server-side environment variables (not exposed to client)
   * These are only available in server components, API routes, and server-side functions
   */
  server: {
    // Database Configuration
    DATABASE_URL: z
      .string()
      .url("Invalid PostgreSQL connection URL")
      .describe("PostgreSQL connection string"),

    DB_SSL: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) {
          return undefined;
        }
        return val === "true";
      })
      .describe("Force SSL connection to database"),

    // Better Auth Configuration
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "Better Auth secret must be at least 32 characters")
      .describe("Secret key for Better Auth sessions"),

    BETTER_AUTH_URL: z
      .string()
      .url("Invalid Better Auth URL")
      .default("http://localhost:3000")
      .describe("Better Auth callback URL"),

    // OAuth Providers - GitHub
    GITHUB_CLIENT_ID: z
      .string()
      .optional()
      .describe("GitHub OAuth client ID"),

    GITHUB_CLIENT_SECRET: z
      .string()
      .optional()
      .describe("GitHub OAuth client secret"),

    // OAuth Providers - Google
    GOOGLE_CLIENT_ID: z
      .string()
      .optional()
      .describe("Google OAuth client ID"),

    GOOGLE_CLIENT_SECRET: z
      .string()
      .optional()
      .describe("Google OAuth client secret"),

    // OAuth Providers - Microsoft/Azure
    AZURE_CLIENT_ID: z
      .string()
      .optional()
      .describe("Azure/Microsoft OAuth client ID"),

    AZURE_CLIENT_SECRET: z
      .string()
      .optional()
      .describe("Azure/Microsoft OAuth client secret"),

    AZURE_TENANT_ID: z
      .string()
      .default("common")
      .describe("Azure tenant ID - use 'common' for all accounts"),

    // Email Service
    RESEND_API_KEY: z
      .string()
      .optional()
      .describe("Resend API key for email service"),

    // Redis Configuration (optional)
    REDIS_URL: z
      .string()
      .url("Invalid Redis URL")
      .optional()
      .describe("Redis connection URL for caching"),

    // Backend API Configuration
    BACKEND_URL: z
      .string()
      .url("Invalid backend URL")
      .default("http://localhost:8000")
      .describe("Backend API server URL"),

    // Server-side Logging
    LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .default("info")
      .describe("Server-side log level"),

    LOG_PRODUCTION: z
      .string()
      .optional()
      .default("false")
      .transform((val) => val === "true")
      .describe("Enable logging in production"),

    LOG_STRUCTURED: z
      .string()
      .optional()
      .default("true")
      .transform((val) => val === "true")
      .describe("Enable structured JSON logging"),

    // Node Environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development")
      .describe("Node environment"),
  },

  /**
   * Client-side environment variables (exposed to browser)
   * Must be prefixed with NEXT_PUBLIC_
   */
  client: {
    // Public App Configuration
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url("Invalid app URL")
      .optional()
      .default("http://localhost:3000")
      .describe("Public app URL"),

    // Client-side Logging
    NEXT_PUBLIC_LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .default("info")
      .describe("Client-side log level"),

    NEXT_PUBLIC_LOG_PRODUCTION: z
      .string()
      .optional()
      .default("false")
      .transform((val) => val === "true")
      .describe("Enable client logging in production"),

    NEXT_PUBLIC_LOG_BROWSER: z
      .string()
      .optional()
      .default("true")
      .transform((val) => val === "true")
      .describe("Enable browser console logging"),

    NEXT_PUBLIC_LOG_STRUCTURED: z
      .string()
      .optional()
      .default("false")
      .transform((val) => val === "true")
      .describe("Enable structured logging in browser"),
  },

  /**
   * Shared environment variables accessible on both client and server
   * Be careful with what you put here - it will be exposed to the client
   */
  shared: {},

  /**
   * Runtime environment variable mapping
   * Required for Next.js to properly bundle environment variables
   */
  runtimeEnv: {
    // Server variables
    DATABASE_URL: process.env.DATABASE_URL,
    DB_SSL: process.env.DB_SSL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    REDIS_URL: process.env.REDIS_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_PRODUCTION: process.env.LOG_PRODUCTION,
    LOG_STRUCTURED: process.env.LOG_STRUCTURED,
    NODE_ENV: process.env.NODE_ENV,

    // Client variables
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL,
    NEXT_PUBLIC_LOG_PRODUCTION: process.env.NEXT_PUBLIC_LOG_PRODUCTION,
    NEXT_PUBLIC_LOG_BROWSER: process.env.NEXT_PUBLIC_LOG_BROWSER,
    NEXT_PUBLIC_LOG_STRUCTURED: process.env.NEXT_PUBLIC_LOG_STRUCTURED,
  },

  /**
   * Skip validation in certain environments
   * Useful for Docker builds where env vars aren't available at build time
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Tell T3 Env to not throw if an env var is accessed on the client
   * that isn't defined in the client object
   */
  emptyStringAsUndefined: true,
});

/**
 * Type-safe environment variable access
 * Import this instead of using process.env directly
 *
 * @example
 * import { env } from "@/env";
 *
 * // Server-side usage
 * const dbUrl = env.DATABASE_URL; // Type-safe and validated
 *
 * // Client-side usage
 * const logLevel = env.NEXT_PUBLIC_LOG_LEVEL; // Type-safe and validated
 */