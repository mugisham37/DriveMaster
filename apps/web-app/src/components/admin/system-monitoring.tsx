"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartBarIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  CloudIcon,
} from "@heroicons/react/24/outline";
import { adminApi } from "@/lib/api/admin";

interface SystemMetrics {
  services: ServiceStatus[];
  performance: PerformanceMetrics;
  alerts: SystemAlert[];
  usage: UsageMetrics;
}

interface ServiceStatus {
  name: string;
  status: "healthy" | "warning" | "error";
  uptime: number;
  responseTime: number;
  lastCheck: string;
  version: string;
  instances: number;
}

interface PerformanceMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    inbound: number;
    outbound: number;
  };
  database: {
    connections: number;
    queryTime: number;
  };
  cache: {
    hitRate: number;
    memory: number;
  };
}

interface SystemAlert {
  id: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  service: string;
  timestamp: string;
  acknowledged: boolean;
}

interface UsageMetrics {
  activeUsers: number;
  totalSessions: number;
  questionsAnswered: number;
  apiRequests: number;
  errorRate: number;
}

export function SystemMonitoring() {
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">(
    "24h"
  );
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch system metrics
  const {
    data: metrics,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["systemMetrics", timeRange],
    queryFn: () => adminApi.getSystemMetrics({ timeRange }),
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "error":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircleIcon className="w-4 h-4" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case "error":
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-700 bg-red-100 border-red-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">System Monitoring</h2>
          <div className="flex items-center gap-2">
            {["1h", "24h", "7d", "30d"].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range as any)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Disable" : "Enable"} Auto-refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <ServerIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.usage.activeUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.usage.totalSessions.toLocaleString()} total sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.usage.apiRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.usage.errorRate.toFixed(2)}% error rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <CpuChipIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.performance.cpu.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.performance.memory.toFixed(1)}% memory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <CircleStackIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.performance.cache.hitRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(metrics?.performance.cache.memory || 0)} used
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Status */}
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.services.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1 rounded-full ${getStatusColor(
                        service.status
                      )}`}
                    >
                      {getStatusIcon(service.status)}
                    </div>
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      <p className="text-sm text-gray-500">
                        v{service.version} • {service.instances} instances
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {formatUptime(service.uptime)}
                    </div>
                    <div className="text-gray-500">
                      {service.responseTime}ms avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-500">No active alerts</p>
                  <p className="text-sm text-gray-400">
                    All systems operational
                  </p>
                </div>
              ) : (
                metrics?.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 border rounded-lg ${getSeverityColor(
                      alert.severity
                    )}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            {alert.service}
                          </span>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Handle acknowledge alert
                            adminApi.acknowledgeAlert(alert.id);
                          }}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Details */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-3">System Resources</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CPU Usage</span>
                  <span>{metrics?.performance.cpu.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span>{metrics?.performance.memory.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Disk Usage</span>
                  <span>{metrics?.performance.disk.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Network</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Inbound</span>
                  <span>
                    {formatBytes(metrics?.performance.network.inbound || 0)}/s
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Outbound</span>
                  <span>
                    {formatBytes(metrics?.performance.network.outbound || 0)}/s
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Database</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active Connections</span>
                  <span>{metrics?.performance.database.connections}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Query Time</span>
                  <span>{metrics?.performance.database.queryTime}ms</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
