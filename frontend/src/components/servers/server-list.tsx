import { useState, useMemo } from "react";
import { ServerCard, ServerCardSkeleton } from "./server-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useServers, useServerActions } from "@/hooks/use-servers";
import { useBulkHealthCheck } from "@/hooks/use-health-check";
import type { ServerResponse } from "@/db/schema/server";
import { Search, Plus, RefreshCw, Activity, Filter } from "lucide-react";
import toast from "react-hot-toast";

export interface ServerListProps {
  onCreateServer?: () => void;
  onEditServer?: (server: ServerResponse) => void;
}

export function ServerList({ onCreateServer, onEditServer }: ServerListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transportFilter, setTransportFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { servers, pagination, isLoading, isError, error, refetch } = useServers({
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    transportType: transportFilter !== "all" ? transportFilter : undefined,
    sortBy: sortBy as "name" | "createdAt" | "lastUsedAt" | "requestCount",
    sortOrder,
    limit: 50,
  });

  const { updateServer, deleteServer } = useServerActions();
  const { performBulkHealthCheck, isChecking: isBulkChecking } = useBulkHealthCheck();

  // Filter servers based on search and filters (client-side backup)
  const filteredServers = useMemo(() => {
    let filtered = [...servers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (server) =>
          server.name.toLowerCase().includes(term) ||
          server.description?.toLowerCase().includes(term) ||
          server.endpointUrl.toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [servers, searchTerm]);

  const handleStatusChange = async (serverId: string, newStatus: "active" | "inactive") => {
    try {
      await updateServer(serverId, { status: newStatus });
      refetch();
      toast.success(`Server ${newStatus === "active" ? "started" : "stopped"} successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update server status");
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    try {
      await deleteServer(serverId);
      refetch();
      toast.success("Server deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete server");
    }
  };

  const handleHealthCheck = (_serverId: string) => {
    refetch(); // Refresh the server list after health check
  };

  const handleBulkHealthCheck = async () => {
    try {
      const serverIds = servers.map((s) => s.id);
      await performBulkHealthCheck(serverIds);
      refetch();
      toast.success("Bulk health check completed");
    } catch {
      toast.error("Some health checks failed");
    }
  };

  const getFilterCounts = () => {
    const total = servers.length;
    const active = servers.filter((s) => s.status === "active").length;
    const inactive = servers.filter((s) => s.status === "inactive").length;
    const healthy = servers.filter((s) => s.healthStatus === "healthy").length;
    const unhealthy = servers.filter((s) => s.healthStatus === "unhealthy").length;

    return { total, active, inactive, healthy, unhealthy };
  };

  const filterCounts = getFilterCounts();

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600">Failed to Load Servers</h3>
          <p className="text-muted-foreground mt-1">{error || "An error occurred while loading servers"}</p>
        </div>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">MCP Servers</h2>
          <p className="text-muted-foreground">Manage and monitor your Model Context Protocol servers</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleBulkHealthCheck} variant="outline" disabled={isBulkChecking || servers.length === 0}>
            <Activity className="mr-2 h-4 w-4" />
            {isBulkChecking ? "Checking..." : "Check All"}
          </Button>

          <Button onClick={refetch} variant="outline" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button onClick={onCreateServer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center p-4 border rounded-lg">
          <div className="text-2xl font-bold">{filterCounts.total}</div>
          <div className="text-sm text-muted-foreground">Total Servers</div>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{filterCounts.active}</div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <div className="text-2xl font-bold text-muted-foreground">{filterCounts.inactive}</div>
          <div className="text-sm text-muted-foreground">Inactive</div>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{filterCounts.healthy}</div>
          <div className="text-sm text-muted-foreground">Healthy</div>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{filterCounts.unhealthy}</div>
          <div className="text-sm text-muted-foreground">Unhealthy</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search servers by name, description, or endpoint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Select value={transportFilter} onValueChange={setTransportFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Transport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="http">HTTP</SelectItem>
              <SelectItem value="websocket">WebSocket</SelectItem>
              <SelectItem value="stdio">STDIO</SelectItem>
              <SelectItem value="sse">SSE</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="createdAt">Created</SelectItem>
              <SelectItem value="lastUsedAt">Last Used</SelectItem>
              <SelectItem value="requestCount">Requests</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {(searchTerm || statusFilter !== "all" || transportFilter !== "all") && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {searchTerm && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchTerm("")}>
              Search: &ldquo;{searchTerm}&rdquo; ×
            </Badge>
          )}

          {statusFilter !== "all" && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setStatusFilter("all")}>
              Status: {statusFilter} ×
            </Badge>
          )}

          {transportFilter !== "all" && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setTransportFilter("all")}>
              Transport: {transportFilter} ×
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setTransportFilter("all");
            }}
            className="text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Server Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <ServerCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm || statusFilter !== "all" || transportFilter !== "all" ? "No servers match your filters" : "No MCP servers yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" || transportFilter !== "all"
              ? "Try adjusting your search terms or filters"
              : "Get started by adding your first MCP server"}
          </p>
          {!(searchTerm || statusFilter !== "all" || transportFilter !== "all") && (
            <Button onClick={onCreateServer}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Server
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onStatusChange={handleStatusChange}
                onEdit={onEditServer}
                onDelete={handleDeleteServer}
                onHealthCheck={handleHealthCheck}
              />
            ))}
          </div>

          {/* Pagination Info */}
          {pagination && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Showing {filteredServers.length} of {pagination.total} servers
              </div>
              {pagination.hasMore && <div>More servers available - consider refining your search</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
