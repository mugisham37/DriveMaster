/**
 * Performance Debugger Component
 * Development tool for monitoring component performance
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PerformanceMonitor } from '@/lib/performance/performance-monitor';
import { Activity, Download, RefreshCw, X } from 'lucide-react';

export const PerformanceDebugger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState(PerformanceMonitor.getAllMetrics());

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setMetrics(PerformanceMonitor.getAllMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleDownloadReport = () => {
    const report = PerformanceMonitor.generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    PerformanceMonitor.clearMetrics();
    setMetrics([]);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        variant="outline"
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="mr-2 h-4 w-4" />
        Performance
      </Button>
    );
  }

  const slowComponents = metrics.filter((m) => m.renderTime > 16);

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[600px] overflow-auto z-50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Performance Monitor</CardTitle>
        <div className="flex gap-2">
          <Button onClick={handleDownloadReport} size="sm" variant="ghost">
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={handleClear} size="sm" variant="ghost">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsOpen(false)} size="sm" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm">
            <p className="text-muted-foreground">Total Components</p>
            <p className="text-2xl font-bold">{metrics.length}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Slow Components</p>
            <p className="text-2xl font-bold text-red-600">{slowComponents.length}</p>
          </div>
        </div>

        {slowComponents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Slow Components (&gt;16ms)</h4>
            {slowComponents.map((metric) => (
              <div
                key={metric.componentName}
                className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 rounded"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{metric.componentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {metric.updateCount} updates
                  </p>
                </div>
                <Badge variant="destructive">
                  {metric.renderTime.toFixed(2)}ms
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">All Components</h4>
          <div className="space-y-1 max-h-[300px] overflow-auto">
            {metrics.map((metric) => (
              <div
                key={metric.componentName}
                className="flex items-center justify-between p-2 bg-muted rounded text-xs"
              >
                <span className="truncate flex-1">{metric.componentName}</span>
                <Badge variant={metric.renderTime > 16 ? 'destructive' : 'secondary'}>
                  {metric.renderTime.toFixed(2)}ms
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
