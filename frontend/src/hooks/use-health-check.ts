import useSWR from "swr";
import { useState } from "react";
import type { HealthCheckResponse, ErrorResponse } from "@/db/schema/server";

// Hook for real-time health monitoring
export function useHealthMonitoring(serverIds: string[] = []) {
  const batchFetcher = async (url: string): Promise<HealthCheckResponse[]> => {
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      const error = (await res.json()) as ErrorResponse;
      throw new Error(error.message || "Failed to perform health check");
    }
    return res.json();
  };

  const { data, error, mutate } = useSWR<HealthCheckResponse[], Error>(
    serverIds.length > 0 ? `/api/health-check/batch?ids=${serverIds.join(",")}` : null,
    batchFetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 10000, // Dedupe requests within 10 seconds
      revalidateOnFocus: false, // Don't revalidate on focus for health checks
    },
  );

  return {
    healthData: data,
    isLoading: !data && !error && serverIds.length > 0,
    isError: !!error,
    error: error?.message,
    refetch: () => mutate(),
  };
}

// Hook for individual server health checks
export function useServerHealthCheck(serverId: string | null) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<HealthCheckResponse | null>(null);

  const performHealthCheck = async (timeout?: number): Promise<HealthCheckResponse> => {
    if (!serverId) {
      throw new Error("Server ID is required");
    }

    setIsChecking(true);
    try {
      const url = `/api/servers/${serverId}/health`;
      const body = timeout ? JSON.stringify({ timeout }) : undefined;

      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : {},
        body,
      });

      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(error.message || "Failed to perform health check");
      }

      const result = (await res.json()) as HealthCheckResponse;
      setLastCheck(result);
      return result;
    } catch (error) {
      const errorResult: HealthCheckResponse = {
        status: "error",
        responseTime: null,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        checkedAt: new Date().toISOString(),
      };
      setLastCheck(errorResult);
      throw error;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isChecking,
    lastCheck,
    performHealthCheck,
  };
}

// Hook for bulk health checks
export function useBulkHealthCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<Map<string, HealthCheckResponse>>(new Map());

  const performBulkHealthCheck = async (serverIds: string[]): Promise<Map<string, HealthCheckResponse>> => {
    if (serverIds.length === 0) {
      throw new Error("Server IDs are required");
    }

    setIsChecking(true);
    const resultMap = new Map<string, HealthCheckResponse>();

    try {
      // Perform health checks in parallel
      const promises = serverIds.map(async (serverId) => {
        try {
          const res = await fetch(`/api/servers/${serverId}/health`, {
            method: "POST",
          });

          if (!res.ok) {
            const error = (await res.json()) as ErrorResponse;
            throw new Error(error.message || "Failed to perform health check");
          }

          const result = (await res.json()) as HealthCheckResponse;
          return { serverId, result };
        } catch (error) {
          const errorResult: HealthCheckResponse = {
            status: "error",
            responseTime: null,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            checkedAt: new Date().toISOString(),
          };
          return { serverId, result: errorResult };
        }
      });

      const results = await Promise.all(promises);
      results.forEach(({ serverId, result }) => {
        resultMap.set(serverId, result);
      });

      setResults(resultMap);
      return resultMap;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isChecking,
    results,
    performBulkHealthCheck,
  };
}

// Hook for health check history
export function useHealthHistory(serverId: string | null, limit: number = 50) {
  const { data, error, mutate } = useSWR<HealthCheckResponse[], Error>(
    serverId ? `/api/servers/${serverId}/health/history?limit=${limit}` : null,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        const error = (await res.json()) as ErrorResponse;
        throw new Error(error.message || "Failed to fetch health history");
      }
      return res.json();
    },
    {
      refreshInterval: 60000, // Refresh every minute
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
    },
  );

  return {
    history: data || [],
    isLoading: !data && !error && !!serverId,
    isError: !!error,
    error: error?.message,
    refetch: () => mutate(),
  };
}

// Utility function to get health status color
export function getHealthStatusColor(status: string): string {
  switch (status) {
    case "healthy":
      return "text-green-600 bg-green-50 border-green-200";
    case "unhealthy":
      return "text-red-600 bg-red-50 border-red-200";
    case "timeout":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "error":
      return "text-red-600 bg-red-50 border-red-200";
    case "unknown":
    default:
      return "text-muted-foreground bg-muted border-border";
  }
}

// Utility function to get health status icon
export function getHealthStatusIcon(status: string): string {
  switch (status) {
    case "healthy":
      return "✅";
    case "unhealthy":
      return "❌";
    case "timeout":
      return "⏰";
    case "error":
      return "🔴";
    case "unknown":
    default:
      return "❓";
  }
}
