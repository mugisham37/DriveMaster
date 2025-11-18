'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationTemplate, NotificationType, DeliveryChannel } from '@/types/notifications';

interface CreateTemplateData {
  name: string;
  description?: string;
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  supportedChannels: DeliveryChannel[];
  isActive: boolean;
}

interface UpdateTemplateData extends Partial<CreateTemplateData> {}

interface UseNotificationTemplatesReturn {
  templates: NotificationTemplate[] | undefined;
  isLoading: boolean;
  error: Error | null;
  createTemplate: (data: CreateTemplateData) => Promise<NotificationTemplate>;
  updateTemplate: (id: string, data: UpdateTemplateData) => Promise<NotificationTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  renderTemplate: (id: string, data: Record<string, unknown>) => Promise<{ title: string; body: string }>;
}

export function useNotificationTemplates(): UseNotificationTemplatesReturn {
  const queryClient = useQueryClient();

  // Fetch templates
  const {
    data: templates,
    isLoading,
    error,
  } = useQuery<NotificationTemplate[]>({
    queryKey: ['notificationTemplates'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      const response = await fetch('/api/notifications/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      // TODO: Replace with actual API call
      const response = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateData }) => {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/notifications/templates/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/notifications/templates/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
    },
  });

  // Render template mutation
  const renderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/notifications/templates/${id}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to render template');
      }
      return response.json();
    },
  });

  return {
    templates,
    isLoading,
    error: error as Error | null,
    createTemplate: (data: CreateTemplateData) => createMutation.mutateAsync(data),
    updateTemplate: (id: string, data: UpdateTemplateData) =>
      updateMutation.mutateAsync({ id, data }),
    deleteTemplate: (id: string) => deleteMutation.mutateAsync(id),
    renderTemplate: (id: string, data: Record<string, unknown>) =>
      renderMutation.mutateAsync({ id, data }),
  };
}
