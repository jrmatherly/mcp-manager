import type { HealthCheckResponse } from "@/db/schema/server";
import { updateServerHealth } from "@/lib/server-management";

// MCP protocol standard methods for health checks
const MCP_HEALTH_METHODS = {
  ping: "ping",
  initialize: "initialize",
  listTools: "tools/list",
};

// Health check configuration
export interface HealthCheckConfig {
  timeout: number;
  retryCount: number;
  backoffMs: number;
}

const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  timeout: 5000, // 5 seconds
  retryCount: 3,
  backoffMs: 1000, // 1 second
};

// Perform health check on an MCP server
export async function performHealthCheck(
  serverId: string,
  endpointUrl: string,
  transportType: "http" | "websocket" | "stdio" | "sse",
  authConfig?: {
    authType?: string;
    apiKey?: string;
    bearerToken?: string;
    oauth?: {
      clientId?: string;
      clientSecret?: string;
      scope?: string;
    };
    custom?: Record<string, unknown>;
  },
  config: Partial<HealthCheckConfig> = {},
): Promise<HealthCheckResponse> {
  const healthConfig = { ...DEFAULT_HEALTH_CHECK_CONFIG, ...config };
  const startTime = Date.now();

  try {
    let result: HealthCheckResponse;

    switch (transportType) {
      case "http":
        result = await performHttpHealthCheck(endpointUrl, authConfig, healthConfig);
        break;
      case "websocket":
        result = await performWebSocketHealthCheck(endpointUrl, authConfig, healthConfig);
        break;
      case "stdio":
        result = await performStdioHealthCheck(endpointUrl, authConfig, healthConfig);
        break;
      case "sse":
        result = await performSseHealthCheck(endpointUrl, authConfig, healthConfig);
        break;
      default:
        throw new Error(`Unsupported transport type: ${transportType}`);
    }

    // Update server health in database
    await updateServerHealth(
      serverId,
      result.status === "healthy" ? "healthy" : "unhealthy",
      result.responseTime ?? undefined,
      result.errorMessage ?? undefined,
      result.metrics,
    );

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const errorResult: HealthCheckResponse = {
      status: "error",
      responseTime,
      errorMessage,
      checkedAt: new Date().toISOString(),
    };

    // Update server health in database
    await updateServerHealth(serverId, "unhealthy", responseTime, errorMessage);

    return errorResult;
  }
}

// HTTP transport health check
async function performHttpHealthCheck(
  endpointUrl: string,
  authConfig?: {
    authType?: string;
    apiKey?: string;
    bearerToken?: string;
    oauth?: {
      clientId?: string;
      clientSecret?: string;
      scope?: string;
    };
    custom?: Record<string, unknown>;
  },
  config: HealthCheckConfig = DEFAULT_HEALTH_CHECK_CONFIG,
): Promise<HealthCheckResponse> {
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "MCP-Registry-Health-Checker/1.0",
    };

    // Add authentication headers
    if (authConfig?.authType === "bearer" && authConfig.bearerToken) {
      headers.Authorization = `Bearer ${authConfig.bearerToken}`;
    } else if (authConfig?.authType === "api_key" && authConfig.apiKey) {
      headers["X-API-Key"] = authConfig.apiKey;
    }

    // Try MCP-specific ping first
    const pingPayload = {
      jsonrpc: "2.0",
      id: 1,
      method: MCP_HEALTH_METHODS.ping,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(pingPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          status: "unhealthy",
          responseTime,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
          checkedAt: new Date().toISOString(),
        };
      }

      const data = await response.json();

      return {
        status: "healthy",
        responseTime,
        errorMessage: null,
        metrics: {
          httpStatus: response.status,
          mcpResponse: data,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (controller.signal.aborted) {
        return {
          status: "timeout",
          responseTime: config.timeout,
          errorMessage: "Health check timed out",
          checkedAt: new Date().toISOString(),
        };
      }

      throw fetchError;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: "error",
      responseTime,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      checkedAt: new Date().toISOString(),
    };
  }
}

// WebSocket transport health check
async function performWebSocketHealthCheck(
  endpointUrl: string,
  _authConfig?: {
    authType?: string;
    apiKey?: string;
    bearerToken?: string;
    oauth?: {
      clientId?: string;
      clientSecret?: string;
      scope?: string;
    };
    custom?: Record<string, unknown>;
  },
  config: HealthCheckConfig = DEFAULT_HEALTH_CHECK_CONFIG,
): Promise<HealthCheckResponse> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      // Convert HTTP URL to WebSocket URL if needed
      const wsUrl = endpointUrl.replace(/^https?:\/\//, "ws://").replace(/^http:\/\//, "ws://");
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          status: "timeout",
          responseTime: config.timeout,
          errorMessage: "WebSocket connection timed out",
          checkedAt: new Date().toISOString(),
        });
      }, config.timeout);

      ws.onopen = () => {
        // Send MCP ping message
        const pingMessage = {
          jsonrpc: "2.0",
          id: 1,
          method: MCP_HEALTH_METHODS.ping,
        };
        ws.send(JSON.stringify(pingMessage));
      };

      ws.onmessage = (event) => {
        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;
        ws.close();

        try {
          const data = JSON.parse(event.data);
          resolve({
            status: "healthy",
            responseTime,
            errorMessage: null,
            metrics: {
              wsResponse: data,
            },
            checkedAt: new Date().toISOString(),
          });
        } catch {
          resolve({
            status: "unhealthy",
            responseTime,
            errorMessage: "Invalid JSON response from WebSocket",
            checkedAt: new Date().toISOString(),
          });
        }
      };

      ws.onerror = (_error) => {
        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;
        resolve({
          status: "error",
          responseTime,
          errorMessage: "WebSocket connection error",
          checkedAt: new Date().toISOString(),
        });
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;
        if (event.code !== 1000) {
          resolve({
            status: "unhealthy",
            responseTime,
            errorMessage: `WebSocket closed with code ${event.code}: ${event.reason}`,
            checkedAt: new Date().toISOString(),
          });
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      resolve({
        status: "error",
        responseTime,
        errorMessage: error instanceof Error ? error.message : "Unknown WebSocket error",
        checkedAt: new Date().toISOString(),
      });
    }
  });
}

// STDIO transport health check
async function performStdioHealthCheck(
  endpointUrl: string,
  _authConfig?: {
    authType?: string;
    apiKey?: string;
    bearerToken?: string;
    oauth?: {
      clientId?: string;
      clientSecret?: string;
      scope?: string;
    };
    custom?: Record<string, unknown>;
  },
  _config: HealthCheckConfig = DEFAULT_HEALTH_CHECK_CONFIG,
): Promise<HealthCheckResponse> {
  // STDIO transport typically involves process execution
  // This is more complex and would require server-side execution
  return {
    status: "unhealthy",
    responseTime: 0,
    errorMessage: "STDIO health checks not yet implemented",
    checkedAt: new Date().toISOString(),
  };
}

// SSE (Server-Sent Events) transport health check
async function performSseHealthCheck(
  endpointUrl: string,
  _authConfig?: {
    authType?: string;
    apiKey?: string;
    bearerToken?: string;
    oauth?: {
      clientId?: string;
      clientSecret?: string;
      scope?: string;
    };
    custom?: Record<string, unknown>;
  },
  config: HealthCheckConfig = DEFAULT_HEALTH_CHECK_CONFIG,
): Promise<HealthCheckResponse> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      const eventSource = new EventSource(endpointUrl);

      const timeout = setTimeout(() => {
        eventSource.close();
        resolve({
          status: "timeout",
          responseTime: config.timeout,
          errorMessage: "SSE connection timed out",
          checkedAt: new Date().toISOString(),
        });
      }, config.timeout);

      eventSource.onopen = () => {
        // SSE connection established
        setTimeout(() => {
          clearTimeout(timeout);
          eventSource.close();
          const responseTime = Date.now() - startTime;
          resolve({
            status: "healthy",
            responseTime,
            errorMessage: null,
            checkedAt: new Date().toISOString(),
          });
        }, 100); // Give it a moment to establish
      };

      eventSource.onerror = () => {
        clearTimeout(timeout);
        eventSource.close();
        const responseTime = Date.now() - startTime;
        resolve({
          status: "error",
          responseTime,
          errorMessage: "SSE connection error",
          checkedAt: new Date().toISOString(),
        });
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      resolve({
        status: "error",
        responseTime,
        errorMessage: error instanceof Error ? error.message : "Unknown SSE error",
        checkedAt: new Date().toISOString(),
      });
    }
  });
}

// Perform health checks on multiple servers in parallel
export async function performBulkHealthCheck(
  servers: Array<{
    id: string;
    endpointUrl: string;
    transportType: "http" | "websocket" | "stdio" | "sse";
    authConfig?: {
      authType?: string;
      apiKey?: string;
      bearerToken?: string;
      oauth?: {
        clientId?: string;
        clientSecret?: string;
        scope?: string;
      };
      custom?: Record<string, unknown>;
    };
  }>,
  config: Partial<HealthCheckConfig> = {},
): Promise<Map<string, HealthCheckResponse>> {
  const healthChecks = servers.map(async (server) => {
    const result = await performHealthCheck(server.id, server.endpointUrl, server.transportType, server.authConfig, config);
    return [server.id, result] as const;
  });

  const results = await Promise.allSettled(healthChecks);
  const healthCheckMap = new Map<string, HealthCheckResponse>();

  results.forEach((result, index) => {
    const serverId = servers[index].id;
    if (result.status === "fulfilled") {
      healthCheckMap.set(serverId, result.value[1]);
    } else {
      healthCheckMap.set(serverId, {
        status: "error",
        responseTime: 0,
        errorMessage: result.reason?.message || "Health check failed",
        checkedAt: new Date().toISOString(),
      });
    }
  });

  return healthCheckMap;
}

// Get recommended health check interval based on server performance
export function getRecommendedHealthCheckInterval(avgResponseTime: number | null, errorCount: number, requestCount: number): number {
  // Default interval is 5 minutes
  let interval = 300;

  // Adjust based on performance
  if (avgResponseTime) {
    if (avgResponseTime > 5000) {
      // Slow servers get less frequent checks
      interval = 600; // 10 minutes
    } else if (avgResponseTime < 1000) {
      // Fast servers can be checked more frequently
      interval = 180; // 3 minutes
    }
  }

  // Adjust based on error rate
  const errorRate = requestCount > 0 ? errorCount / requestCount : 0;
  if (errorRate > 0.1) {
    // High error rate servers get more frequent checks
    interval = Math.max(120, interval / 2); // Minimum 2 minutes
  } else if (errorRate === 0 && requestCount > 100) {
    // Very reliable servers can be checked less frequently
    interval = Math.min(900, interval * 1.5); // Maximum 15 minutes
  }

  return interval;
}
