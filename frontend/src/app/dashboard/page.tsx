"use client";

import { useState } from "react";
import Navbar from "@/components/landing/navbar";
import { ServerList } from "@/components/servers/server-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthScoreCard, ServerCountCard, ResponseTimeCard } from "@/components/dashboard/stats-card";
import { useDashboard } from "@/hooks/use-servers";
import type { ServerResponse } from "@/db/schema/server";
import { Activity, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const DashboardPage = () => {
  const [showServerForm, setShowServerForm] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerResponse | null>(null);

  const { stats, isLoading, isError, error, refetch } = useDashboard();

  const handleCreateServer = () => {
    setSelectedServer(null);
    setShowServerForm(true);
  };

  const handleEditServer = (server: ServerResponse) => {
    setSelectedServer(server);
    setShowServerForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage your MCP Registry infrastructure</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <HealthScoreCard score={stats?.systemHealthScore ?? 0} status={stats?.systemStatus ?? "unknown"} loading={isLoading} />

          <ServerCountCard
            total={stats?.totalServers ?? 0}
            healthy={stats?.healthyServers ?? 0}
            unhealthy={stats?.unhealthyServers ?? 0}
            loading={isLoading}
          />

          <ResponseTimeCard avgResponseTime={stats?.avgResponseTime ?? null} loading={isLoading} />

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unknown Status</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <div className="h-8 bg-gray-300 animate-pulse rounded" /> : stats?.unknownServers ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Servers with unknown health status</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        {stats?.recentActivity && stats.recentActivity.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest health checks and server updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          activity.healthStatus === "healthy"
                            ? "bg-green-500"
                            : activity.healthStatus === "unhealthy"
                            ? "bg-red-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <div>
                        <p className="font-medium">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Status: {activity.status} • Health: {activity.healthStatus}
                          {activity.responseTime && ` • ${Math.round(activity.responseTime)}ms`}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activity.lastHealthCheck
                        ? formatDistanceToNow(new Date(activity.lastHealthCheck), { addSuffix: true })
                        : "Never checked"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {isError && (
          <Card className="mb-8 border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-red-500 rounded-full" />
                <div>
                  <p className="font-medium text-red-700">Failed to load dashboard data</p>
                  <p className="text-sm text-red-600">{error || "An unexpected error occurred"}</p>
                </div>
                <Button onClick={refetch} variant="outline" size="sm" className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Server Management */}
        <ServerList onCreateServer={handleCreateServer} onEditServer={handleEditServer} />

        {/* TODO: Add Server Form Modal/Dialog when form component is created */}
        {showServerForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">{selectedServer ? "Edit Server" : "Add New Server"}</h3>
              <p className="text-muted-foreground mb-4">Server form will be implemented in the next phase.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowServerForm(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowServerForm(false)}>{selectedServer ? "Update" : "Create"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
