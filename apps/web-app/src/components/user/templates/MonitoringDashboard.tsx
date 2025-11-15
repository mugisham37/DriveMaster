/**
 * Monitoring Dashboard Component
 * 
 * Displays user service metrics and analytics
 * Implements Task 17: Monitoring and Analytics
 * Requirements: 15.1-15.12
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, Users, Zap } from 'lucide-react';
import { useUserServiceMetrics } from '@/hooks/useUserServiceMetrics';
import type { MetricsSnapshot } from '@/lib/user-service/monitoring';

export function MonitoringDashboard() {
  const { currentMetrics, exportMetrics } = useUserServiceMetrics();
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);

  useEffect(() => {
    setMetrics(currentMetrics);
  }, [currentMetrics]);

  if (!metrics) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading metrics...
      </div>
    );
  }

  const handleExport = () => {
    const data = exportMetrics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Service Monitoring</h1>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Export Metrics
        </button>
      </div>

      {/* Technical Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Technical Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="API Response Time (p50)"
            value={`${metrics.technical.apiResponseTimes.p50.toFixed(0)}ms`}
            icon={<Zap className="h-4 w-4" />}
          />
          <MetricCard
            title="API Response Time (p95)"
            value={`${metrics.technical.apiResponseTimes.p95.toFixed(0)}ms`}
            icon={<Zap className="h-4 w-4" />}
          />
          <MetricCard
            title="API Response Time (p99)"
            value={`${metrics.technical.apiResponseTimes.p99.toFixed(0)}ms`}
            icon={<Zap className="h-4 w-4" />}
          />
          <MetricCard
            title="WebSocket Connections"
            value={metrics.technical.webSocketStability.connectionCount.toString()}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* User Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">User Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Profile Completion Rate"
            value={`${(metrics.user.profileCompletionRate * 100).toFixed(1)}%`}
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Onboarding Completion Rate"
            value={`${(metrics.user.onboardingCompletionRate * 100).toFixed(1)}%`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCard
            title="Preference Changes"
            value={metrics.user.preferenceChangeFrequency.toString()}
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Engagement Score"
            value={
              metrics.user.userEngagementScores.length > 0
                ? `${(
                    metrics.user.userEngagementScores.reduce((a, b) => a + b, 0) /
                    metrics.user.userEngagementScores.length
                  ).toFixed(1)}%`
                : 'N/A'
            }
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Cache Hit Rates */}
      {Object.keys(metrics.technical.cacheHitRates).length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Cache Performance</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {Object.entries(metrics.technical.cacheHitRates).map(([key, rate]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{key}</span>
                    <span className="font-medium">{(rate * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Rates */}
      {Object.keys(metrics.technical.errorRates).length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Error Rates</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {Object.entries(metrics.technical.errorRates).map(([endpoint, count]) => (
                  <div key={endpoint} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{endpoint}</span>
                    <span className="font-medium text-red-600">{count} errors</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Adoption */}
      {Object.keys(metrics.user.featureAdoptionRates).length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Feature Usage</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {Object.entries(metrics.user.featureAdoptionRates).map(([feature, count]) => (
                  <div key={feature} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{feature}</span>
                    <span className="font-medium">{count} uses</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
