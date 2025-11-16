'use client';

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * Offline Banner Component
 * Displays a banner when the user is offline
 * Requirements: 14.1
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      
      // Hide reconnected message after 3 seconds
      setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic heartbeat check (every 30 seconds)
    const heartbeatInterval = setInterval(() => {
      // Try to fetch a small resource to verify connectivity
      fetch('/api/health', { method: 'HEAD', cache: 'no-cache' })
        .then(() => {
          if (!navigator.onLine) {
            // Browser thinks we're offline but we can reach the server
            handleOnline();
          }
        })
        .catch(() => {
          if (navigator.onLine) {
            // Browser thinks we're online but we can't reach the server
            handleOffline();
          }
        });
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(heartbeatInterval);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
        <Alert className="rounded-none border-x-0 border-t-0 bg-green-50 border-green-200">
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            You&apos;re back online! Your offline progress has been saved.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          You&apos;re offline. Some features are unavailable but you can continue learning with cached content.
        </AlertDescription>
      </Alert>
    </div>
  );
}
