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
export const DefaultLoadingComponent = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

/**
 * Loading component for chart components
 */
export const ChartLoadingComponent = () => (
  <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg animate-pulse">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-sm text-muted-foreground">Loading chart...</p>
    </div>
  </div>
);

/**
 * Loading component for media components
 */
export const MediaLoadingComponent = () => (
  <div className="flex items-center justify-center aspect-video bg-muted/20 rounded-lg animate-pulse">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-sm text-muted-foreground">Loading media...</p>
    </div>
  </div>
);

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
  
  AccuracyTrendChart: dynamic(
    () => import('@/app/progress/sections/charts/AccuracyTrendChart').then(m => ({ default: m.AccuracyTrendChart })),
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
  
  MediaViewer: dynamic(
    () => import('@/components/content/media/media-viewer').then(m => ({ default: m.MediaViewer })),
    {
      loading: MediaLoadingComponent,
      ssr: false,
    }
  ),
};

/**
 * Lazy load bulk operation components (admin/content management)
 */
export const LazyBulkComponents = {
  BulkOperationsPanel: dynamic(
    () => import('@/components/content/content/bulk-operations-panel').then(m => ({ default: m.BulkOperationsPanel })),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  ),
  
  BulkActionsToolbar: dynamic(
    () => import('@/components/content/content/bulk-actions-toolbar').then(m => ({ default: m.BulkActionsToolbar })),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  ),
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
  
  LessonViewContent: dynamic(
    () => import('@/app/learn/lesson/[lessonId]/LessonViewContent').then(m => ({ default: m.LessonViewContent })),
    {
      loading: DefaultLoadingComponent,
    }
  ),
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
    loading?: ComponentType;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || DefaultLoadingComponent,
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
