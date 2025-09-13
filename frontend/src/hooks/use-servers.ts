import useSWR from "swr";
import type { ServerListResponse, ServerResponse, ErrorResponse } from "@/db/schema/server";
import type { DashboardStats } from "@/app/api/dashboard/route";

// Fetcher functions for SWR
const serverListFetcher = async (url: string): Promise<ServerListResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = (await res.json()) as ErrorResponse;
    throw new Error(error.message || "Failed to fetch");
  }
  return res.json();
};

const serverFetcher = async (url: string): Promise<ServerResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = (await res.json()) as ErrorResponse;
    throw new Error(error.message || "Failed to fetch");
  }
  return res.json();
};

const dashboardFetcher = async (url: string): Promise<DashboardStats> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = (await res.json()) as ErrorResponse;
    throw new Error(error.message || "Failed to fetch");
  }
  return res.json();
};

// Hook for fetching servers list
export function useServers(params?: {
  status?: string;
  transportType?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  }

  const url = `/api/servers${searchParams.toString() ? "?" + searchParams.toString() : ""}`;

  const { data, error, mutate } = useSWR<ServerListResponse, Error>(url, serverListFetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
    revalidateOnFocus: true,
  });

  return {
    servers: data?.servers || [],
    pagination: data?.pagination,
    isLoading: !data && !error,
    isError: !!error,
    error: error?.message,
    mutate,
    refetch: () => mutate(),
  };
}

// Hook for fetching a single server
export function useServer(serverId: string | null) {
  const { data, error, mutate } = useSWR<ServerResponse, Error>(serverId ? `/api/servers/${serverId}` : null, serverFetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds for individual server
    dedupingInterval: 2000, // Dedupe requests within 2 seconds
  });

  return {
    server: data,
    isLoading: !data && !error && !!serverId,
    isError: !!error,
    error: error?.message,
    mutate,
    refetch: () => mutate(),
  };
}

// Hook for dashboard statistics
export function useDashboard() {
  const { data, error, mutate } = useSWR<DashboardStats, Error>("/api/dashboard", dashboardFetcher, {
    refreshInterval: 15000, // Refresh every 15 seconds
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
    revalidateOnFocus: true,
  });

  return {
    stats: data,
    isLoading: !data && !error,
    isError: !!error,
    error: error?.message,
    mutate,
    refetch: () => mutate(),
  };
}

// Hook for server actions (create, update, delete)
export function useServerActions() {
  const createServer = async (serverData: Record<string, unknown>): Promise<ServerResponse> => {
    const res = await fetch("/api/servers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serverData),
    });

    if (!res.ok) {
      const error = (await res.json()) as ErrorResponse;
      throw new Error(error.message || "Failed to create server");
    }

    return res.json();
  };

  const updateServer = async (serverId: string, serverData: Record<string, unknown>): Promise<ServerResponse> => {
    const res = await fetch(`/api/servers/${serverId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serverData),
    });

    if (!res.ok) {
      const error = (await res.json()) as ErrorResponse;
      throw new Error(error.message || "Failed to update server");
    }

    return res.json();
  };

  const deleteServer = async (serverId: string): Promise<void> => {
    const res = await fetch(`/api/servers/${serverId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const error = (await res.json()) as ErrorResponse;
      throw new Error(error.message || "Failed to delete server");
    }
  };

  return {
    createServer,
    updateServer,
    deleteServer,
  };
}
