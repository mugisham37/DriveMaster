'use client';

/**
 * SessionTimeoutWarning Component
 * Displays a warning modal before session timeout with countdown and extend option
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAuth, useAuthActions } from '@/hooks/useAuth';

export interface SessionTimeoutWarningProps {
  /** Total session timeout in milliseconds (default: 30 minutes) */
  sessionTimeout?: number;
  /** Warning time before timeout in milliseconds (default: 5 minutes) */
  warningTime?: number;
  /** Callback when session is extended */
  onExtend?: () => void;
  /** Callback when session times out */
  onTimeout?: () => void;
}

export function SessionTimeoutWarning({
  sessionTimeout = 30 * 60 * 1000, // 30 minutes
  warningTime = 5 * 60 * 1000, // 5 minutes
  onExtend,
  onTimeout,
}: SessionTimeoutWarningProps) {
  const { user } = useAuth();
  const { logout } = useAuthActions();

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Reset activity timer on user interaction
  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  // Extend session
  const handleExtend = useCallback(async () => {
    resetActivity();
    onExtend?.();

    // In a real implementation, you would call an API to extend the session
    // For now, we just reset the activity timer
    // await authServiceClient.extendSession();
  }, [resetActivity, onExtend]);

  // Handle timeout
  const handleTimeout = useCallback(async () => {
    setShowWarning(false);
    onTimeout?.();
    await logout();
  }, [logout, onTimeout]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => {
      window.addEventListener(event, resetActivity);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetActivity);
      });
    };
  }, [user, resetActivity]);

  // Check for timeout
  useEffect(() => {
    if (!user) return;

    const checkTimeout = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const timeUntilTimeout = sessionTimeout - timeSinceActivity;

      // Show warning if within warning time
      if (timeUntilTimeout <= warningTime && timeUntilTimeout > 0) {
        setShowWarning(true);
        setCountdown(Math.ceil(timeUntilTimeout / 1000));
      }

      // Timeout reached
      if (timeUntilTimeout <= 0) {
        handleTimeout();
      }
    };

    // Check every second
    const interval = setInterval(checkTimeout, 1000);

    return () => clearInterval(interval);
  }, [user, lastActivity, sessionTimeout, warningTime, handleTimeout]);

  // Countdown timer
  useEffect(() => {
    if (!showWarning || countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showWarning, countdown]);

  // Format countdown time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = (countdown / (warningTime / 1000)) * 100;

  if (!user || !showWarning) {
    return null;
  }

  return (
    <Dialog open={showWarning} onOpenChange={(open) => !open && handleExtend()}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleExtend();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        aria-describedby="session-timeout-description"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <DialogTitle className="text-left">Session Expiring Soon</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <DialogDescription id="session-timeout-description" className="text-left">
            Your session will expire due to inactivity. You will be automatically logged out in:
          </DialogDescription>

          <div className="flex items-center justify-center gap-3 rounded-lg bg-muted p-6">
            <Clock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div className="text-4xl font-bold tabular-nums" role="timer" aria-live="polite" aria-atomic="true">
              {formatTime(countdown)}
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progressPercentage} className="h-2" aria-label="Time remaining" />
            <p className="text-center text-xs text-muted-foreground">
              Click "Stay Signed In" to continue your session
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={handleTimeout} className="w-full sm:w-auto">
            Sign Out Now
          </Button>
          <Button onClick={handleExtend} className="w-full sm:w-auto">
            Stay Signed In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage session timeout
 */
export function useSessionTimeout(options?: SessionTimeoutWarningProps) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsActive(false);
      return;
    }

    setIsActive(true);
  }, [user]);

  return {
    isActive,
    SessionTimeoutWarning: isActive ? (
      <SessionTimeoutWarning {...options} />
    ) : null,
  };
}
