/**
 * Privacy Settings Page - GDPR Compliance Interface
 * 
 * Implements comprehensive privacy controls and data rights management:
 * - Compliance status overview
 * - Consent management with granular controls
 * - Data export and deletion requests
 * - Privacy report generation and viewing
 * - Privacy alerts and notifications
 * - Audit log of privacy-related actions
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.6, 7.9, 7.10, 9.3 (code splitting), 11.6 (error boundaries)
 * Task: 10.9, 12.1 (route-based code splitting), 14.1 (error boundary wrapping)
 */

'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { GDPRComplianceErrorBoundary } from '@/components/user/error-boundary';

// Code splitting: Lazy load GDPRDashboard (Task 12.1)
const GDPRDashboard = dynamic(
  () => import('@/components/gdpr').then(mod => ({ default: mod.GDPRDashboard })),
  { 
    loading: () => (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="space-y-6">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    )
  }
);

export default function PrivacySettingsPage() {
  return (
    <GDPRComplianceErrorBoundary>
      <div className="container mx-auto py-8 px-4">
        <GDPRDashboard />
      </div>
    </GDPRComplianceErrorBoundary>
  );
}
