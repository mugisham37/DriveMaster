/**
 * Monitoring Dashboard Page
 * 
 * Displays user service metrics and analytics
 * Implements Task 17: Monitoring and Analytics
 * Requirements: 15.1-15.12
 */

import { Suspense } from 'react';
import { MonitoringDashboard } from '@/components/user/templates/MonitoringDashboard';

export default function MonitoringPage() {
  return (
    <Suspense fallback={<MonitoringPageSkeleton />}>
      <MonitoringDashboard />
    </Suspense>
  );
}

function MonitoringPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-10 w-64 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
