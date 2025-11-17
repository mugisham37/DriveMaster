/**
 * Notification Templates Management Hook
 *
 * Provides hooks for template CRUD operations, rendering, and variable validation.
 * Admin-only functionality for managing notification templates.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { notificationApiClient } from "@/lib/notification-service";
import type {
  NotificationTemplate,
  RenderedNotification,
  TemplateRenderRequest,
  NotificationType,
  NotificationError,
} from "@/types/notification-service";

// ============================================================================
// Query Keys
// ============================================================================

export const templateQueryKeys = {
  all: ["notificationTemplates"] as const,
  lists: () => [...templateQueryKeys.all, "list"] as const,
  list: (type?: string) => [...templateQueryKeys.lists(), type] as const,
  detail: (id: string) => [...templateQueryKeys.all, "detail", id] as const,
  render: (templateId: string, data: Record<string, unknown>) =>
    [...templateQueryKeys.all, "render", templateId, data] as const,
};

// ============================================================================
// Templates List Hook
// ============================================================================

export interface UseNotificationTemplatesOptions {
  type?: NotificationType;
  activeOnly?: boolean;
}

export interface UseNotificationTemplatesResult {
  templates: NotificationTemplate[];
  isLoading: boolean;
  isError: boolean;
  error: NotificationError | null;
  refetch: () => void;
}

/**
 * Hook for fetching notification templates
 * Requirements: 13.1, 13.2
 */
export function useNotificationTemplates(
  options: UseNotificationTemplatesOptions = {},
): UseNotificationTemplatesResult {
  const { type, activeOnly = false } = options;

  const query = useQuery({
    queryKey: templateQueryKeys.list(type),
    queryFn: async () => {
      const templates = await notificationApiClient.getTemplates(type);
      return activeOnly ? templates.filter((t) => t.isActive) : templates;
    },
    staleTime: 300000, // 5 minutes - templates don't change often
    gcTime: 600000, // 10 minutes
  });

  return {
    templates: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    refetch: query.refetch,
  };
}

// ============================================================================
// Template Rendering Hook
// ============================================================================

export interface UseTemplateRenderResult {
  renderedNotification: RenderedNotification | null;
  isRendering: boolean;
  isError: boolean;
  error: NotificationError | null;
  render: (
    templateId: string,
    data: Record<string, unknown>,
    userId?: string,
  ) => Promise<RenderedNotification>;
}

/**
 * Hook for rendering notification templates with variable substitution
 * Requirements: 13.2, 13.3, 13.4
 */
export function useTemplateRender(): UseTemplateRenderResult {
  const renderMutation = useMutation({
    mutationFn: (request: TemplateRenderRequest) =>
      notificationApiClient.renderTemplate(request),
  });

  const render = useCallback(
    (templateId: string, data: Record<string, unknown>, userId?: string) => {
      return renderMutation.mutateAsync({ templateId, data, userId });
    },
    [renderMutation],
  );

  return {
    renderedNotification: renderMutation.data || null,
    isRendering: renderMutation.isPending,
    isError: renderMutation.isError,
    error: renderMutation.error as NotificationError | null,
    render,
  };
}

// ============================================================================
// Template Variable Validation Hook
// ============================================================================

export interface TemplateValidationResult {
  isValid: boolean;
  missingVariables: string[];
  extraVariables: string[];
  errors: string[];
}

export interface UseTemplateValidationResult {
  validateVariables: (
    template: NotificationTemplate,
    data: Record<string, unknown>,
  ) => TemplateValidationResult;
  extractVariables: (templateString: string) => string[];
  validateTemplateString: (templateString: string) => {
    isValid: boolean;
    errors: string[];
  };
}

/**
 * Hook for template variable validation
 * Requirements: 13.3, 13.4
 */
export function useTemplateValidation(): UseTemplateValidationResult {
  const extractVariables = useCallback((templateString: string): string[] => {
    // Extract variables in {{variable}} format
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(templateString)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }, []);

  const validateTemplateString = useCallback(
    (
      templateString: string,
    ): {
      isValid: boolean;
      errors: string[];
    } => {
      const errors: string[] = [];

      // Check for unmatched braces
      const openBraces = (templateString.match(/\{\{/g) || []).length;
      const closeBraces = (templateString.match(/\}\}/g) || []).length;

      if (openBraces !== closeBraces) {
        errors.push("Unmatched template braces");
      }

      // Check for nested braces
      if (/\{\{[^}]*\{\{/.test(templateString)) {
        errors.push("Nested template variables are not allowed");
      }

      // Check for empty variables
      if (/\{\{\s*\}\}/.test(templateString)) {
        errors.push("Empty template variables are not allowed");
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
    [],
  );

  const validateVariables = useCallback(
    (
      template: NotificationTemplate,
      data: Record<string, unknown>,
    ): TemplateValidationResult => {
      const errors: string[] = [];

      // Extract variables from title and body templates
      const titleVariables = extractVariables(template.titleTemplate);
      const bodyVariables = extractVariables(template.bodyTemplate);
      const allTemplateVariables = [
        ...new Set([...titleVariables, ...bodyVariables]),
      ];

      // Check for required variables
      const requiredVariables = template.requiredVariables || [];
      const providedVariables = Object.keys(data);

      const missingVariables = requiredVariables.filter(
        (variable) => !providedVariables.includes(variable),
      );

      // Check for extra variables (not used in template)
      const extraVariables = providedVariables.filter(
        (variable) => !allTemplateVariables.includes(variable),
      );

      // Validate template strings
      const titleValidation = validateTemplateString(template.titleTemplate);
      const bodyValidation = validateTemplateString(template.bodyTemplate);

      if (!titleValidation.isValid) {
        errors.push(...titleValidation.errors.map((e) => `Title: ${e}`));
      }

      if (!bodyValidation.isValid) {
        errors.push(...bodyValidation.errors.map((e) => `Body: ${e}`));
      }

      // Check for variables in template that aren't in required list
      const undeclaredVariables = allTemplateVariables.filter(
        (variable) => !requiredVariables.includes(variable),
      );

      if (undeclaredVariables.length > 0) {
        errors.push(
          `Variables used in template but not declared as required: ${undeclaredVariables.join(", ")}`,
        );
      }

      return {
        isValid: missingVariables.length === 0 && errors.length === 0,
        missingVariables,
        extraVariables,
        errors,
      };
    },
    [extractVariables, validateTemplateString],
  );

  return {
    validateVariables,
    extractVariables,
    validateTemplateString,
  };
}

// ============================================================================
// Template Preview Hook
// ============================================================================

export interface UseTemplatePreviewOptions {
  template: NotificationTemplate;
  sampleData?: Record<string, unknown>;
  autoRender?: boolean;
}

export interface UseTemplatePreviewResult {
  preview: RenderedNotification | null;
  isLoading: boolean;
  isError: boolean;
  error: NotificationError | null;
  updateSampleData: (data: Record<string, unknown>) => void;
  refresh: () => void;
}

/**
 * Hook for template preview with sample data
 * Requirements: 13.4, 13.5
 */
export function useTemplatePreview(
  options: UseTemplatePreviewOptions,
): UseTemplatePreviewResult {
  const { template, sampleData = {}, autoRender = true } = options;
  const { render } = useTemplateRender();

  // Generate default sample data based on required variables
  const getDefaultSampleData = useCallback((): Record<string, unknown> => {
    const defaults: Record<string, unknown> = {};

    if (template.requiredVariables) {
      template.requiredVariables.forEach((variable) => {
        defaults[variable] = `[${variable}]`;
      });
    }

    return { ...defaults, ...template.defaultData, ...sampleData };
  }, [template, sampleData]);

  const query = useQuery({
    queryKey: templateQueryKeys.render(template.id, getDefaultSampleData()),
    queryFn: () => render(template.id, getDefaultSampleData()),
    enabled: autoRender,
    staleTime: 0, // Always fresh for preview
  });

  const updateSampleData = useCallback(
    (data: Record<string, unknown>) => {
      // This will trigger a re-render with new data
      render(template.id, { ...getDefaultSampleData(), ...data });
    },
    [template.id, getDefaultSampleData, render],
  );

  return {
    preview: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    updateSampleData,
    refresh: query.refetch,
  };
}

// ============================================================================
// Template Helper Utilities
// ============================================================================

export interface UseTemplateHelpersResult {
  getVariableHelp: (variableName: string) => string;
  getCommonVariables: (type: NotificationType) => Record<string, string>;
  formatVariableForDisplay: (variableName: string) => string;
}

/**
 * Hook for template helper utilities
 * Requirements: 13.2, 13.4
 */
export function useTemplateHelpers(): UseTemplateHelpersResult {
  const getCommonVariables = useCallback(
    (type: NotificationType): Record<string, string> => {
      const common = {
        userName: "User's display name",
        userEmail: "User's email address",
        timestamp: "Current timestamp",
        appName: "Application name",
      };

      const typeSpecific: Record<NotificationType, Record<string, string>> = {
        achievement: {
          achievementName: "Name of the achievement",
          achievementDescription: "Description of the achievement",
          points: "Points earned",
          rarity: "Achievement rarity level",
        },
        spaced_repetition: {
          topicName: "Topic to review",
          itemCount: "Number of items due",
          difficulty: "Difficulty level",
          lastReviewDate: "Date of last review",
        },
        streak_reminder: {
          streakCount: "Current streak count",
          streakType: "Type of streak",
          motivationalMessage: "Motivational message",
          streakGoal: "Target streak goal",
        },
        mock_test_reminder: {
          testName: "Name of the test",
          testType: "Type of test",
          passRate: "User's pass rate",
          estimatedDuration: "Estimated test duration",
        },
        system: {
          messageType: "Type of system message",
          actionRequired: "Whether action is required",
          priority: "Message priority",
        },
        mentoring: {
          mentorName: "Mentor's name",
          messagePreview: "Preview of the message",
          conversationId: "Conversation identifier",
        },
        course_update: {
          courseName: "Name of the course",
          updateType: "Type of update",
          updateDescription: "Description of the update",
        },
        community: {
          postTitle: "Title of the post",
          authorName: "Author's name",
          communityName: "Name of the community",
        },
        marketing: {
          campaignName: "Marketing campaign name",
          offerDetails: "Details of the offer",
          expiryDate: "Offer expiry date",
        },
      };

      return { ...common, ...(typeSpecific[type] || {}) };
    },
    [],
  );

  const getVariableHelp = useCallback(
    (variableName: string): string => {
      const helpText: Record<string, string> = {
        userName: "The user's display name or full name",
        userEmail: "The user's email address",
        timestamp: "Current date and time in ISO format",
        appName: "The name of the application",
        // Add more as needed
      };

      return (
        helpText[variableName] ||
        `Variable: ${variableName} (no description available)`
      );
    },
    [],
  );

  const formatVariableForDisplay = useCallback((variableName: string): string => {
    // Convert camelCase to Title Case with spaces
    return variableName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }, []);

  return {
    getVariableHelp,
    getCommonVariables,
    formatVariableForDisplay,
  };
}
