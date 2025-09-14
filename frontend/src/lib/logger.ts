/**
 * Centralized Logger Utility for Next.js Application
 *
 * Features:
 * - Works in both browser and Node.js environments
 * - Environment-aware logging (development vs production)
 * - Structured logging with context
 * - Type-safe with TypeScript
 * - Configurable via environment variables
 * - Performance optimized with log level checks
 */

import { env } from "../env";

// Types
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  module?: string;
}

interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
  enableInProduction: boolean;
  enableInBrowser: boolean;
  enableInNode: boolean;
  enableStructuredLogging: boolean;
  enableColors: boolean;
}

// Environment detection
const isServer = typeof window === "undefined";
const isBrowser = !isServer;
const isDevelopment = env.NODE_ENV === "development";
const isProduction = env.NODE_ENV === "production";

// Log levels with numeric values for comparison
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI color codes for terminal output
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: isDevelopment ? "debug" : "info",
  enabled: true,
  enableInProduction: false,
  enableInBrowser: isDevelopment,
  enableInNode: true,
  enableStructuredLogging: isServer,
  enableColors: isServer && process.stdout.isTTY,
};

// Parse configuration from environment variables
function getConfig(): LoggerConfig {
  const envLevel = (isServer ? env.LOG_LEVEL : env.NEXT_PUBLIC_LOG_LEVEL) as LogLevel;
  const enableInProduction = isServer ? env.LOG_PRODUCTION : env.NEXT_PUBLIC_LOG_PRODUCTION;
  const enableInBrowser = env.NEXT_PUBLIC_LOG_BROWSER;
  const enableStructured = isServer ? env.LOG_STRUCTURED : env.NEXT_PUBLIC_LOG_STRUCTURED;

  return {
    ...DEFAULT_CONFIG,
    level: envLevel && envLevel in LOG_LEVELS ? envLevel : DEFAULT_CONFIG.level,
    enableInProduction,
    enableInBrowser: enableInBrowser && DEFAULT_CONFIG.enableInBrowser,
    enableStructuredLogging: enableStructured || DEFAULT_CONFIG.enableStructuredLogging,
  };
}

class Logger {
  private config: LoggerConfig;
  private module: string;

  constructor(module = "app", config?: Partial<LoggerConfig>) {
    this.module = module;
    this.config = { ...getConfig(), ...config };
  }

  /**
   * Check if logging is enabled for current environment
   */
  private isEnabled(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Production check
    if (isProduction && !this.config.enableInProduction) {
      return false;
    }

    // Environment-specific checks
    if (isBrowser && !this.config.enableInBrowser) {
      return false;
    }
    if (isServer && !this.config.enableInNode) {
      return false;
    }

    return true;
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  /**
   * Format timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Get color for log level
   */
  private getColor(level: LogLevel): string {
    if (!this.config.enableColors) {
      return "";
    }

    switch (level) {
      case "debug":
        return COLORS.gray;
      case "info":
        return COLORS.blue;
      case "warn":
        return COLORS.yellow;
      case "error":
        return COLORS.red;
      default:
        return COLORS.reset;
    }
  }

  /**
   * Get emoji for log level
   */
  private getEmoji(level: LogLevel): string {
    switch (level) {
      case "debug":
        return "🔍";
      case "info":
        return "ℹ️";
      case "warn":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "📝";
    }
  }

  /**
   * Format log entry for console output
   */
  private formatConsoleMessage(entry: LogEntry): [string, ...unknown[]] {
    const { level, message, context, timestamp, module } = entry;
    const color = this.getColor(level);
    const emoji = this.getEmoji(level);
    const reset = this.config.enableColors ? COLORS.reset : "";

    if (this.config.enableStructuredLogging && isServer) {
      // Structured logging for server-side
      const prefix = `${color}[${timestamp}] ${emoji} ${level.toUpperCase()} [${module}]${reset}`;
      return context ? [prefix, message, JSON.stringify(context, null, 2)] : [prefix, message];
    } else {
      // Simple logging for browser or non-structured
      const prefix = `${color}${emoji} [${module}] ${level.toUpperCase()}${reset}`;
      return context ? [prefix, message, context] : [prefix, message];
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: this.getTimestamp(),
      module: this.module,
    };

    const [formattedMessage, ...args] = this.formatConsoleMessage(entry);

    // Use appropriate console method
    switch (level) {
      case "debug":
        // eslint-disable-next-line no-console
        console.debug(formattedMessage, ...args);
        break;
      case "info":
        // eslint-disable-next-line no-console
        console.info(formattedMessage, ...args);
        break;
      case "warn":
        // eslint-disable-next-line no-console
        console.warn(formattedMessage, ...args);
        break;
      case "error":
        // eslint-disable-next-line no-console
        console.error(formattedMessage, ...args);
        break;
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  /**
   * Log error object with stack trace
   */
  logError(error: Error | unknown, message?: string, context?: LogContext): void {
    let errorMessage = message || "An error occurred";
    let errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorMessage = message ? `${message}: ${error.message}` : error.message;
      errorContext = {
        ...errorContext,
        name: error.name,
        stack: error.stack,
      };
    } else {
      errorContext = {
        ...errorContext,
        error: String(error),
      };
    }

    this.error(errorMessage, errorContext);
  }

  /**
   * Create a child logger with additional context
   */
  child(module: string, context?: LogContext): Logger {
    const childLogger = new Logger(`${this.module}:${module}`, this.config);

    if (context) {
      // Create a logger that always includes this context
      const originalLog = childLogger.log.bind(childLogger);
      childLogger.log = (level: LogLevel, message: string, additionalContext?: LogContext) => {
        const mergedContext = { ...context, ...additionalContext };
        originalLog(level, message, mergedContext);
      };
    }

    return childLogger;
  }

  /**
   * Set log level at runtime
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Enable or disable logging at runtime
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

// Create default logger instance
export const logger = new Logger("app");

// Create module-specific loggers
export const createLogger = (module: string, config?: Partial<LoggerConfig>): Logger => {
  return new Logger(module, config);
};

// Convenience exports for common modules
export const dbLogger = createLogger("database");
export const authLogger = createLogger("auth");
export const apiLogger = createLogger("api");
export const uiLogger = createLogger("ui");

// Development utilities
export const devLogger = isDevelopment
  ? createLogger("dev", { level: "debug", enableInBrowser: true })
  : createLogger("dev", { enabled: false });

// Error boundary logger for React error boundaries
export const errorBoundaryLogger = createLogger("error-boundary", {
  level: "error",
  enableInProduction: true,
  enableInBrowser: true,
});

// Export types (LogLevel and LogContext are already exported above)
export type { LogEntry };
export { Logger };
