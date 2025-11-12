'use client';

/**
 * ResilientAuthWrapper Component
 * Wraps authentication pages with all resilience features
 */

import { ReactNode } from 'react';
import { AuthErrorBoundary } from './AuthErrorBoundary';
import { OfflineModeIndicator } from './OfflineModeIndicator';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';
import { useAuthResilience } from '@/hooks/useAuthResilience';
import { toast } from 'sonner';

export interface ResilientAuthWrapperProps {
  children: ReactNode;
  /** Show offline mode indicator */
  showOfflineIndicator?: boolean;
  /** Enable session timeout warning */
  enableSessionTimeout?: boolean;
  /** Session timeout in milliseconds (default: 30 minutes) */
  sessionTimeout?: number;
  /** Warning time before timeout in milliseconds (default: 5 minutes) */
  warningTime?: number;
  /** Show error boundary */
  showErrorBoundary?: boolean;
  /** Show technical error details (development only) */
  showErrorDetails?: boolean;
}

export function ResilientAuthWrapper({
  children,
  showOfflineIndicator = true,
  enableSessionTimeout = true,
  sessionTimeout = 30 * 60 * 1000,
  warningTime = 5 * 60 * 1000,
  showErrorBoundary = true,
  showErrorDetails = false,
}: ResilientAuthWrapperProps) {
  const { isOffline, isDegraded, recommendations } = useAuthResilience();

  // Show toast notifications for resilience status changes
  const handleSessionExtend = () => {
    toast.success('Session extended successfully');
  };

  const handleSessionTimeout = () => {
    toast.error('Session expired. Please sign in again.');
  };

  const content = (
    <>
      {/* Offline Mode Indicator */}
      {showOfflineIndicator && (isOffline || isDegraded) && (
        <div className="sticky top-0 z-50">
          <OfflineModeIndicator variant="banner" showDetails />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">{children}</div>

      {/* Session Timeout Warning */}
      {enableSessionTimeout && (
        <SessionTimeoutWarning
          sessionTimeout={sessionTimeout}
          warningTime={warningTime}
          onExtend={handleSessionExtend}
          onTimeout={handleSessionTimeout}
        />
      )}

      {/* Show recommendations if system is degraded */}
      {recommendations.length > 0 && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <div className="rounded-lg border bg-card p-4 shadow-lg">
            <h4 className="mb-2 font-semibold">System Status</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {recommendations.map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );

  // Wrap with error boundary if enabled
  if (showErrorBoundary) {
    return (
      <AuthErrorBoundary
        showDetails={showErrorDetails}
        onError={(error, errorInfo) => {
          console.error('Auth page error:', error, errorInfo);
        }}
        onReset={() => {
          toast.info('Attempting to recover...');
        }}
      >
        {content}
      </AuthErrorBoundary>
    );
  }

  return content;
}

/**
 * HOC to wrap a component with resilient auth features
 */
export function withResilientAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ResilientAuthWrapperProps, 'children'>
) {
  return function WithResilientAuth(props: P) {
    return (
      <ResilientAuthWrapper {...options}>
        <Component {...props} />
      </ResilientAuthWrapper>
    );
  };
}
