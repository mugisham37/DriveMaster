'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScheduledNotification } from '@/types/notifications';

interface UseScheduledNotificationsReturn {
  scheduledNotifications: ScheduledNotification[] | undefined;
  isLoading: boolean;
  error: Error | null;
  cancelScheduledNotification: (id: string, mode: 'single' | 'series') => Promise<void>;
  rescheduleNotification: (id: string, newDate: Date) => Promise<void>;
}

export function useScheduledNotifications(userId: string): UseScheduledNotificationsReturn {
  const queryClient = useQueryClient();

  // Fetch scheduled notifications
  const {
    data: scheduledNotifications,
    isLoading,
    error,
  } = useQuery<ScheduledNotification[]>({
    queryKey: ['scheduledNotifications', userId],
    queryFn: async () => {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/notifications/schedule?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled notifications');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    enabled: !!userId,
  });

  // Cancel scheduled notification mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: 'single' | 'series' }) => {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/notifications/schedule/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      });
      if (!response.ok) {
        throw new Error('Failed to cancel notification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledNotifications', userId] });
    },
  });

  // Reschedule notification mutation
  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: Date }) => {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/notifications/schedule/${id}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduledFor: newDate.toISOString() }),
      });
      if (!response.ok) {
        throw new Error('Failed to reschedule notification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledNotifications', userId] });
    },
  });

  return {
    scheduledNotifications,
    isLoading,
    error: error as Error | null,
    cancelScheduledNotification: (id: string, mode: 'single' | 'series') =>
      cancelMutation.mutateAsync({ id, mode }),
    rescheduleNotification: (id: string, newDate: Date) =>
      rescheduleMutation.mutateAsync({ id, newDate }),
  };
}
