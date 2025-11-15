/**
 * Preferences Settings Page
 * 
 * Comprehensive preference controls with code splitting for performance.
 * 
 * Requirements: 4.1, 9.3 (code splitting)
 * Task: 7.8, 12.1 (route-based code splitting)
 */

'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Code splitting: Lazy load PreferencesLayout (Task 12.1)
const PreferencesLayout = dynamic(
  () => import('@/components/user/templates').then(mod => ({ default: mod.PreferencesLayout })),
  { 
    loading: () => (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-[400px]" />
          <div className="md:col-span-3 space-y-6">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </div>
        </div>
      </div>
    )
  }
);

export default function PreferencesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <PreferencesLayout />
    </div>
  );
}
