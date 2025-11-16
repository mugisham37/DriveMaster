/**
 * Dynamic Imports Configuration
 * 
 * Centralized configuration for code splitting and lazy loading.
 * This ensures consistent lazy loading patterns across the application.
 * 
 * Requirements: 13.1, 13.5
 * Task: 14.1
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// ============================================================================
// Loading Components
// ============================================================================

/**
 * Generic loading component for lazy-loaded components
 */
export const DefaultLoadingComponent = () => {
  return null; // Return null for now - will be replaced with actual JSX in component files
};

/**
 * Loading component for chart components
 */
export const ChartLoadingComponent = () => {
  return null; // Return null for now - will be replaced with actual JSX in component files
};

/**
 * Loading component for media components
 */
export const MediaLoadingComponent = () => {
  return null; // Return null for now - will be replaced with actual JSX in component files
};

// ============================================================================
// Heavy Component Lazy Loaders
// ============================================================================

/**
 * Lazy load chart components (recharts library is heavy)
 */
export const LazyChartComponents = {
  // Progress page charts
  TopicMasteryBarChart: dynamic(
    () => import('@/app/progress/sections/charts/TopicMasteryBarChart'),
    {
      loading: ChartLoadingComponent,
      ssr: false, // Charts don't need SSR
    }
  ),
  
  TopicMasteryRadarChart: dynamic(
    () => import('@/app/progress/sections/charts/TopicMasteryRadarChart'),
    {
      loading: ChartLoadingComponent,
      ssr: false,
    }
  ),
  
  // User profile charts
  WeeklyProgressChart: dynamic(
    () => import('@/components/user/templates/WeeklyProgressChart'),
    {
      loading: ChartLoadingComponent,
      ssr: false,
    }
  ),
  
  ActivityBreakdownChart: dynamic(
    () => import('@/components/user/templates/ActivityBreakdownChart'),
    {
      loading: ChartLoadingComponent,
      ssr: false,
    }
  ),
};

/**
 * Lazy load media components
 */
export const LazyMediaComponents = {
  MediaGallery: dynamic(
    () => import('@/components/content/media/media-gallery').then(m => ({ default: m.MediaGallery })),
    {
      loading: MediaLoadingComponent,
      ssr: false,
    }
  ),
};

/**
 * Lazy load bulk operation components (admin/content management)
 * Note: These components will be implemented when bulk operations are added
 */
export const LazyBulkComponents = {
  // Placeholder - implement when bulk operations are added
};

/**
 * Lazy load notification components
 */
export const LazyNotificationComponents = {
  NotificationCenter: dynamic(
    () => import('@/components/notifications/NotificationCenter'),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  ),
  
  NotificationAnalyticsDashboard: dynamic(
    () => import('@/components/notifications/NotificationAnalyticsDashboard'),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  ),
};

/**
 * Lazy load GDPR/Privacy components (rarely used)
 */
export const LazyGDPRComponents = {
  GDPRDashboard: dynamic(
    () => import('@/components/gdpr/GDPRDashboard'),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  ),
  
  DataExportManager: dynamic(
    () => import('@/components/gdpr/DataExportManager'),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  ),
  
  DataDeletionManager: dynamic(
    () => import('@/components/gdpr/DataDeletionManager'),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  ),
  
  AuditLogViewer: dynamic(
    () => import('@/components/gdpr/AuditLogViewer'),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  ),
};

/**
 * Lazy load celebration animations (only needed on specific events)
 */
export const LazyCelebrationComponents = {
  CelebrationAnimation: dynamic(
    () => import('@/components/ui/celebration-animation'),
    {
      loading: () => null, // No loading state for animations
      ssr: false,
    }
  ),
};

// ============================================================================
// Page Component Lazy Loaders
// ============================================================================

/**
 * Lazy load page content components
 * These are used with Suspense boundaries in page components
 */
export const LazyPageComponents = {
  DashboardContent: dynamic(
    () => import('@/app/learn/DashboardContent'),
    {
      loading: DefaultLoadingComponent,
    }
  ),
  
  BrowseContent: dynamic(
    () => import('@/app/browse/BrowseContent').then(m => ({ default: m.BrowseContent })),
    {
      loading: DefaultLoadingComponent,
    }
  ),
  
  ProgressPageContent: dynamic(
    () => import('@/app/progress/ProgressPageContent').then(m => ({ default: m.ProgressPageContent })),
    {
      loading: DefaultLoadingComponent,
    }
  ),
  
  // LessonViewContent is directly in the page component, not a separate file
};

// ============================================================================
// Feature Component Lazy Loaders (Layer 2)
// ============================================================================

/**
 * Lazy load feature components that are conditionally rendered
 */
export const LazyFeatureComponents = {
  PracticeSetup: dynamic(
    () => import('@/components/learning-platform/layer-2-features').then(m => ({ default: m.PracticeSetup })),
    {
      loading: DefaultLoadingComponent,
    }
  ),
  
  PracticeSession: dynamic(
    () => import('@/components/learning-platform/layer-2-features').then(m => ({ default: m.PracticeSession })),
    {
      loading: DefaultLoadingComponent,
    }
  ),
  
  SearchInterface: dynamic(
    () => import('@/components/learning-platform/layer-2-features').then(m => ({ default: m.SearchInterface })),
    {
      loading: DefaultLoadingComponent,
    }
  ),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a lazy-loaded component with custom loading state
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    ssr: options?.ssr ?? true,
  });
}

/**
 * Preload a lazy component
 * Useful for prefetching components before they're needed
 */
export function preloadComponent(component: any) {
  if (component && typeof component.preload === 'function') {
    component.preload();
  }
}

// ============================================================================
// Bundle Size Validation
// ============================================================================

/**
 * Bundle size targets (in KB, gzipped)
 */
export const BUNDLE_SIZE_TARGETS = {
  initial: 200, // Initial bundle
  route: 100,   // Each route chunk
  vendor: 150,  // Shared vendor chunk
} as const;

/**
 * Check if running in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log bundle size warnings in development
 */
export function logBundleSizeWarning(componentName: string, size: number, target: number) {
  if (isDevelopment && size > target) {
    console.warn(
      `[Bundle Size Warning] ${componentName} exceeds target size: ${size}KB > ${target}KB`
    );
  }
}
