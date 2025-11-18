'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface NotificationCounts {
  total: number;
  unread: number;
  urgent: number;
  byType: Record<string, number>;
}

interface UseNotificationCountsReturn {
  total: number;
  unreadCount: number;
  urgentCount: number;
  byType: Record<string, number>;
  isLoading: boolean;
  error: Error | null;
}

export function useNotificationCounts(): UseNotificationCountsReturn {
  const { user } = useAuth();

  const {
    data: counts,
    isLoading,
    error,
  } = useQuery<NotificationCounts>({
    queryKey: ['notificationCounts', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // TODO: Replace with actual API call
      const response = await fetch(`/api/notifications/counts?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notification counts');
      }
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  return {
    total: counts?.total || 0,
    unreadCount: counts?.unread || 0,
    urgentCount: counts?.urgent || 0,
    byType: counts?.byType || {},
    isLoading,
    error: error as Error | null,
  };
}
