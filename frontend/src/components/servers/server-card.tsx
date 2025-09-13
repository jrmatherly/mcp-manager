import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HealthBadge } from "@/components/ui/health-badge";
import type { ServerResponse } from "@/db/schema/server";
import { MoreHorizontal, Play, Square, Settings, Trash2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerHealthCheck } from "@/hooks/use-health-check";
import { useState } from "react";
import toast from "react-hot-toast";

export interface ServerCardProps {
  server: ServerResponse;
  onStatusChange?: (serverId: string, newStatus: "active" | "inactive") => void;
  onEdit?: (server: ServerResponse) => void;
  onDelete?: (serverId: string) => void;
  onHealthCheck?: (serverId: string) => void;
}

export function ServerCard({ server, onStatusChange, onEdit, onDelete, onHealthCheck }: ServerCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { performHealthCheck, isChecking } = useServerHealthCheck(server.id);

  const formatLastUsed = (timestamp: string | null) => {
    if (!timestamp) {
      return "Never";
    }

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 3600000) {
      // Less than 1 hour
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes}m ago`;
    } else if (diffMs < 86400000) {
      // Less than 1 day
      const hours = Math.floor(diffMs / 3600000);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffMs / 86400000);
      return `${days}d ago`;
    }
  };

  const getTransportBadgeColor = (transport: string) => {
    switch (transport) {
      case "http":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "websocket":
        return "bg-green-50 text-green-700 border-green-200";
      case "stdio":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "sse":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200";
      case "inactive":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "error":
        return "bg-red-50 text-red-700 border-red-200";
      case "maintenance":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const handleStatusToggle = async () => {
    if (!onStatusChange) {
      return;
    }

    setIsLoading(true);
    try {
      const newStatus = server.status === "active" ? "inactive" : "active";
      await onStatusChange(server.id, newStatus);
      toast.success(`Server ${newStatus === "active" ? "started" : "stopped"} successfully`);
    } catch {
      toast.error("Failed to change server status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      await performHealthCheck();
      toast.success("Health check completed");
      onHealthCheck?.(server.id);
    } catch {
      toast.error("Health check failed");
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${server.name}"? This action cannot be undone.`)) {
      onDelete?.(server.id);
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        server.status === "active" ? "border-l-4 border-l-green-500" : "border-l-4 border-l-gray-300",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">{server.name}</CardTitle>
            {server.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{server.description}</p>}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleHealthCheck} disabled={isChecking}>
                <Activity className="mr-2 h-4 w-4" />
                {isChecking ? "Checking..." : "Health Check"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStatusToggle} disabled={isLoading}>
                {server.status === "active" ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Stop Server
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Server
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(server)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status and Health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={cn("border transition-colors", getStatusBadgeColor(server.status))}>{server.status}</Badge>
            <Badge className={cn("border transition-colors", getTransportBadgeColor(server.transportType))}>{server.transportType}</Badge>
          </div>

          <HealthBadge
            status={server.healthStatus as "healthy" | "unhealthy" | "unknown"}
            lastChecked={server.lastHealthCheck}
            responseTime={server.avgResponseTime ? parseFloat(server.avgResponseTime) : null}
            size="sm"
          />
        </div>

        {/* Server Metadata */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Version</p>
            <p className="font-mono text-xs bg-muted px-2 py-1 rounded">{server.version}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Requests</p>
            <p className="font-medium">{server.requestCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Uptime</p>
            <p className="font-medium">{parseFloat(server.uptime).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Last Used</p>
            <p className="font-medium">{formatLastUsed(server.lastUsedAt)}</p>
          </div>
        </div>

        {/* Endpoint URL */}
        <div>
          <p className="text-muted-foreground text-xs mb-1">Endpoint</p>
          <p className="text-xs font-mono bg-muted p-2 rounded truncate" title={server.endpointUrl}>
            {server.endpointUrl}
          </p>
        </div>

        {/* Tags */}
        {server.tags && server.tags.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {server.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs px-2 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Error Information */}
        {server.healthStatus !== "healthy" && server.errorCount > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-600 font-medium mb-1">
              {server.errorCount} error{server.errorCount !== 1 ? "s" : ""} in recent requests
            </p>
            <p className="text-xs text-red-500">
              Error rate: {server.requestCount > 0 ? ((server.errorCount / server.requestCount) * 100).toFixed(1) : 0}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton for loading state
export function ServerCardSkeleton() {
  return (
    <Card className="transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-300 animate-pulse rounded w-3/4" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
          </div>
          <div className="h-8 w-8 bg-gray-300 animate-pulse rounded" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <div className="h-6 bg-gray-300 animate-pulse rounded w-16" />
            <div className="h-6 bg-gray-300 animate-pulse rounded w-20" />
          </div>
          <div className="h-6 bg-gray-300 animate-pulse rounded w-24" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 bg-gray-200 animate-pulse rounded w-16" />
              <div className="h-4 bg-gray-300 animate-pulse rounded w-12" />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="h-3 bg-gray-200 animate-pulse rounded w-12" />
          <div className="h-8 bg-gray-300 animate-pulse rounded w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
