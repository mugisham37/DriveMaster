'use client';

/**
 * OfflineModeIndicator Component
 * Displays an indicator when the app is running in offline/degraded mode
 */

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiOff, Database, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { authResilience } from '@/lib/auth/resilience-integration';

export interface OfflineModeIndicatorProps {
  className?: string;
  showDetails?: boolean;
  variant?: 'banner' | 'badge' | 'toast';
}

export function OfflineModeIndicator({
  className,
  showDetails = true,
  variant = 'banner',
}: OfflineModeIndicatorProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    // Check degradation status
    const checkDegradationStatus = () => {
      const status = authResilience.getResilienceStatus();
      setIsDegraded(!status.healthy);
      setUsingCache(status.degradation.cacheStats.size > 0);
    };

    // Initial check
    updateOnlineStatus();
    checkDegradationStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check degradation status periodically
    const interval = setInterval(checkDegradationStatus, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  // Don't show if everything is normal
  if (!isOffline && !isDegraded) {
    return null;
  }

  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
          className
        )}
        role="status"
        aria-live="polite"
      >
        {isOffline ? (
          <>
            <WifiOff className="h-3 w-3" aria-hidden="true" />
            <span>Offline</span>
          </>
        ) : (
          <>
            <Database className="h-3 w-3" aria-hidden="true" />
            <span>Limited Mode</span>
          </>
        )}
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20',
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {isOffline ? 'You are offline' : 'Limited connectivity'}
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {usingCache
              ? 'Showing cached data. Some features may be unavailable.'
              : 'Some features may be unavailable.'}
          </p>
        </div>
      </div>
    );
  }

  // Default: banner variant
  return (
    <Alert
      className={cn('border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20', className)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {isOffline ? (
          <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        ) : (
          <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        )}
        <div className="flex-1">
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            {isOffline ? 'Offline Mode' : 'Limited Connectivity'}
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {isOffline ? (
              <>
                You are currently offline. {usingCache && 'Showing cached data where available.'}
                {showDetails && ' Some features may be unavailable until you reconnect.'}
              </>
            ) : (
              <>
                The authentication service is experiencing issues.
                {usingCache && ' Using cached data where available.'}
                {showDetails && ' Some features may be temporarily limited.'}
              </>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

/**
 * Hook to check if the app is in offline/degraded mode
 */
export function useOfflineMode() {
  const [isOffline, setIsOffline] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setIsOffline(!navigator.onLine);
      const status = authResilience.getResilienceStatus();
      setIsDegraded(!status.healthy);
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  return {
    isOffline,
    isDegraded,
    isLimited: isOffline || isDegraded,
  };
}
