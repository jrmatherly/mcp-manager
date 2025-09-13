import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
}

export function StatsCard({ title, value, description, icon: Icon, trend, variant = "default", loading = false }: StatsCardProps) {
  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case "success":
        return {
          card: "border-green-200 bg-green-50/50",
          icon: "text-green-600",
          value: "text-green-700",
        };
      case "warning":
        return {
          card: "border-yellow-200 bg-yellow-50/50",
          icon: "text-yellow-600",
          value: "text-yellow-700",
        };
      case "danger":
        return {
          card: "border-red-200 bg-red-50/50",
          icon: "text-red-600",
          value: "text-red-700",
        };
      default:
        return {
          card: "border-border bg-card",
          icon: "text-muted-foreground",
          value: "text-foreground",
        };
    }
  };

  const styles = getVariantStyles(variant);

  if (loading) {
    return (
      <Card className={cn("transition-all", styles.card)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && <div className={cn("h-4 w-4 animate-pulse bg-gray-300 rounded", styles.icon)} />}
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-gray-300 animate-pulse rounded mb-1" />
          {description && <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all hover:shadow-md", styles.card)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", styles.icon)} />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", styles.value)}>{typeof value === "number" ? value.toLocaleString() : value}</div>

        <div className="flex items-center justify-between mt-1">
          {description && <p className="text-xs text-muted-foreground">{description}</p>}

          {trend && (
            <div className={cn("text-xs flex items-center gap-1", trend.isPositive ? "text-green-600" : "text-red-600")}>
              <span className={cn("inline-block", trend.isPositive ? "↗️" : "↘️")}>{trend.isPositive ? "↗" : "↘"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized stats cards
export function HealthScoreCard({
  score,
  status,
  loading,
}: {
  score: number;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  loading?: boolean;
}) {
  const getScoreVariant = (score: number, status: string) => {
    if (status === "healthy" && score >= 80) {
      return "success";
    }
    if (status === "degraded" || (score >= 60 && score < 80)) {
      return "warning";
    }
    return "danger";
  };

  const getScoreDescription = (status: string) => {
    switch (status) {
      case "healthy":
        return "All systems operating normally";
      case "degraded":
        return "Some issues detected";
      case "unhealthy":
        return "Critical issues require attention";
      case "unknown":
      default:
        return "Status unknown";
    }
  };

  return (
    <StatsCard
      title="System Health Score"
      value={`${score}/100`}
      description={getScoreDescription(status)}
      variant={getScoreVariant(score, status)}
      loading={loading}
    />
  );
}

export function ServerCountCard({
  total,
  healthy,
  unhealthy,
  loading,
}: {
  total: number;
  healthy: number;
  unhealthy: number;
  loading?: boolean;
}) {
  const healthyPercentage = total > 0 ? Math.round((healthy / total) * 100) : 0;

  const getVariant = () => {
    if (healthyPercentage >= 90) {
      return "success";
    }
    if (healthyPercentage >= 70) {
      return "warning";
    }
    return "danger";
  };

  return (
    <StatsCard
      title="Servers"
      value={total}
      description={`${healthy} healthy, ${unhealthy} unhealthy (${healthyPercentage}% healthy)`}
      variant={getVariant()}
      loading={loading}
    />
  );
}

export function ResponseTimeCard({ avgResponseTime, loading }: { avgResponseTime: number | null; loading?: boolean }) {
  const formatResponseTime = (ms: number | null) => {
    if (!ms) {
      return "N/A";
    }
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getResponseTimeVariant = (ms: number | null) => {
    if (!ms) {
      return "default";
    }
    if (ms < 500) {
      return "success";
    }
    if (ms < 2000) {
      return "warning";
    }
    return "danger";
  };

  const getResponseTimeDescription = (ms: number | null) => {
    if (!ms) {
      return "No response data available";
    }
    if (ms < 500) {
      return "Excellent response time";
    }
    if (ms < 1000) {
      return "Good response time";
    }
    if (ms < 2000) {
      return "Moderate response time";
    }
    return "Slow response time";
  };

  return (
    <StatsCard
      title="Avg Response Time"
      value={formatResponseTime(avgResponseTime)}
      description={getResponseTimeDescription(avgResponseTime)}
      variant={getResponseTimeVariant(avgResponseTime)}
      loading={loading}
    />
  );
}
