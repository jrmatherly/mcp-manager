import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, AlertTriangle, HelpCircle } from "lucide-react";

export interface HealthBadgeProps {
  status: "healthy" | "unhealthy" | "unknown" | "timeout" | "error";
  lastChecked?: string | null;
  responseTime?: number | null;
  errorMessage?: string | null;
  size?: "sm" | "default" | "lg";
  showDetails?: boolean;
}

export function HealthBadge({ status, lastChecked, responseTime, errorMessage, size = "default", showDetails = true }: HealthBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "healthy":
        return {
          variant: "default" as const,
          className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
          icon: CheckCircle,
          label: "Healthy",
          description: "Server is responding normally",
        };
      case "unhealthy":
        return {
          variant: "destructive" as const,
          className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
          icon: XCircle,
          label: "Unhealthy",
          description: "Server is not responding or has errors",
        };
      case "timeout":
        return {
          variant: "outline" as const,
          className: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
          icon: Clock,
          label: "Timeout",
          description: "Health check timed out",
        };
      case "error":
        return {
          variant: "destructive" as const,
          className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
          icon: AlertTriangle,
          label: "Error",
          description: "Health check failed with error",
        };
      case "unknown":
      default:
        return {
          variant: "secondary" as const,
          className: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
          icon: HelpCircle,
          label: "Unknown",
          description: "Health status not determined",
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const formatLastChecked = (timestamp: string | null) => {
    if (!timestamp) {
      return "Never";
    }

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 60000) {
      // Less than 1 minute
      return "Just now";
    } else if (diffMs < 3600000) {
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

  const formatResponseTime = (ms: number | null) => {
    if (!ms) {
      return null;
    }
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const badgeContent = (
    <Badge
      variant={config.variant}
      className={cn("flex items-center gap-1.5 font-medium border transition-colors", config.className, {
        "text-xs px-2 py-1": size === "sm",
        "text-sm px-3 py-1.5": size === "default",
        "text-base px-4 py-2": size === "lg",
      })}
    >
      <Icon
        className={cn({
          "h-3 w-3": size === "sm",
          "h-4 w-4": size === "default",
          "h-5 w-5": size === "lg",
        })}
      />
      {config.label}
      {responseTime && showDetails && <span className="text-xs opacity-75">({formatResponseTime(responseTime)})</span>}
    </Badge>
  );

  if (!showDetails) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{config.description}</div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Check:</span>
                <span>{formatLastChecked(lastChecked ?? null)}</span>
              </div>

              {responseTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Time:</span>
                  <span>{formatResponseTime(responseTime)}</span>
                </div>
              )}

              {errorMessage && (
                <div className="pt-1 border-t border-border">
                  <div className="text-muted-foreground text-xs mb-1">Error:</div>
                  <div className="text-xs font-mono bg-muted p-1 rounded break-words">{errorMessage}</div>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Utility component for inline health status
export function InlineHealthStatus({
  status,
  size = "sm",
}: {
  status: "healthy" | "unhealthy" | "unknown" | "timeout" | "error";
  size?: "sm" | "default";
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "unhealthy":
        return "bg-red-500";
      case "timeout":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      case "unknown":
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("rounded-full", getStatusColor(status), {
          "h-2 w-2": size === "sm",
          "h-3 w-3": size === "default",
        })}
      />
      <span
        className={cn("capitalize", {
          "text-xs": size === "sm",
          "text-sm": size === "default",
        })}
      >
        {status}
      </span>
    </div>
  );
}
