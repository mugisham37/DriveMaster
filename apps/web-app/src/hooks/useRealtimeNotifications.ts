/**
 * useRealtimeNotifications Hook
 * 
 * Manages real-time notification delivery via WebSocket
 * 
 * Features:
 * - WebSocket connection management
 * - Real-time notification events
 * - Automatic reconnection
 * - React Query cache updates
 * - Toast notifications
 * - Offline queuing
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 18.1, 18.2, 18.3
 * Task: 8.3
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { globalConnectionPool } from '@/channels/connection-pool';
import { RealtimeConnection } from '@/channels/connection';
import { useAuth } from './useAuth';

// ============================================================================
// Types
// ============================================================================

export interface NotificationEvent {
  type: 'notification.created' | 'notification.updated' | 'notification.deleted';
  data: {
    id: string;
    userId: string;
    title: string;
    body: string;
    priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
    type: string;
    actionUrl?: string;
    imageUrl?: string;
    createdAt: string;
  };
}

interface UseRealtimeNotificationsOptions {
  enabled?: boolean;
  onNotification?: (notification: NotificationEvent['data']) => void;
  showToast?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const {
    enabled = true,
    onNotification,
    showToast = true,
  } = options;

  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const subscriberIdRef = useRef(`notifications-${Math.random().toString(36).substr(2, 9)}`);

  // Handle incoming notification events
  const handleNotificationEvent = useCallback((event: NotificationEvent) => {
    const { type, data } = event;

    // Update React Query cache
    if (type === 'notification.created') {
      // Invalidate notification queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });

      // Show toast notification
      if (showToast) {
        const isPriority = ['urgent', 'critical'].includes(data.priority);
        
        toast(data.title, {
          description: data.body,
          duration: isPriority ? 10000 : 5000,
          action: data.actionUrl ? {
            label: 'View',
            onClick: () => window.location.href = data.actionUrl!,
          } : undefined,
          className: isPriority ? 'border-destructive' : undefined,
        });
      }

      // Call custom handler
      if (onNotification) {
        onNotification(data);
      }
    } else if (type === 'notification.updated') {
      // Invalidate specific notification and lists
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification', data.id] });
    } else if (type === 'notification.deleted') {
      // Remove from cache
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
    }
  }, [queryClient, showToast, onNotification]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.id) {
      return;
    }

    const setupConnection = async () => {
      try {
        // Get WebSocket URL from environment
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
        const notificationChannelUrl = `${wsUrl}/notifications/${user.id}`;

        // Get or create connection from pool
        const connection = await globalConnectionPool.getConnection(
          notificationChannelUrl,
          subscriberIdRef.current,
          {
            reconnectInterval: 1000,
            maxReconnectAttempts: 5,
            heartbeatInterval: 30000,
          }
        );

        connectionRef.current = connection;

        // Listen for messages
        const messageHandler = (event: { type: string; data?: Record<string, unknown> }) => {
          if (event.type === 'message' && event.data) {
            handleNotificationEvent(event.data as NotificationEvent);
          }
        };

        connection.on('message', messageHandler);

        // Handle connection events
        connection.on('connected', () => {
          console.log('✅ Notification WebSocket connected');
        });

        connection.on('disconnected', () => {
          console.log('⚠️ Notification WebSocket disconnected');
        });

        connection.on('error', (event) => {
          console.error('❌ Notification WebSocket error:', event.error);
        });

        // Cleanup
        return () => {
          connection.off('message', messageHandler);
          globalConnectionPool.releaseConnection(notificationChannelUrl, subscriberIdRef.current);
        };
      } catch (error) {
        console.error('Failed to setup notification WebSocket:', error);
      }
    };

    setupConnection();
  }, [enabled, isAuthenticated, user?.id, handleNotificationEvent]);

  return {
    isConnected: connectionRef.current?.isReady() || false,
  };
}
