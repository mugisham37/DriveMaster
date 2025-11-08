/**
 * User Context Propagation and Filtering
 *
 * Handles automatic user context inclusion in analytics requests,
 * user-specific data filtering, and permission-based UI rendering.
 *
 * Requirements: 7.3, 7.5, 9.1, 9.5
 */

import type {
  UserRole,
  AnalyticsPermissions,
  EngagementMetricsParams,
  ProgressMetricsParams,
  ContentMetricsParams,
  SystemMetricsParams,
  HistoricalQuery,
  ReportFilters,
} from "@/types/analytics-service";
import { getUserDataScope, hasPermission } from "./permissions";

// ============================================================================
// User Context Types
// ============================================================================

export interface UserContext {
  userId: string;
  role: UserRole;
  classIds?: string[] | undefined;
  permissions: AnalyticsPermissions;
  organizationId?: string | undefined;
  teamIds?: string[] | undefined;
}

export interface FilteredRequest<T = Record<string, unknown>> {
  originalParams: T;
  filteredParams: T;
  appliedFilters: string[];
  restrictions: string[];
}

// ============================================================================
// Context Propagation
// ============================================================================

/**
 * Adds user context to analytics requests automatically
 */
export function addUserContext<T extends Record<string, unknown>>(
  params: T,
  userContext: UserContext,
): T & { userContext: Partial<UserContext> } {
  return {
    ...params,
    userContext: {
      userId: userContext.userId,
      role: userContext.role,
      classIds: userContext.classIds,
      organizationId: userContext.organizationId,
      teamIds: userContext.teamIds,
      // Don't include full permissions in requests for security
    },
  };
}

/**
 * Extracts correlation ID for request tracking
 */
export function createCorrelationId(
  userContext: UserContext,
  operation: string,
): string {
  const timestamp = Date.now();
  const userHash = userContext.userId.slice(-6);
  return `analytics_${operation}_${userHash}_${timestamp}`;
}

// ============================================================================
// Data Filtering Functions
// ============================================================================

/**
 * Filters engagement metrics parameters based on user permissions and role
 */
export function filterEngagementParams(
  params: EngagementMetricsParams | undefined,
  userContext: UserContext,
): FilteredRequest<EngagementMetricsParams> {
  const originalParams = params || {};
  const filteredParams = { ...originalParams };
  const appliedFilters: string[] = [];
  const restrictions: string[] = [];

  // Check if user can view engagement data
  if (!hasPermission(userContext.permissions, "viewEngagement")) {
    restrictions.push("no-engagement-access");
    return {
      originalParams,
      filteredParams: {} as EngagementMetricsParams,
      appliedFilters,
      restrictions,
    };
  }

  const dataScope = getUserDataScope(userContext.role, userContext.userId);

  // Apply role-based filtering
  switch (dataScope.scope) {
    case "personal":
      filteredParams.userId = userContext.userId;
      appliedFilters.push("personal-data-only");
      break;

    case "class":
      if (userContext.classIds && userContext.classIds.length > 0) {
        // Add class filtering to the request
        filteredParams.classIds = userContext.classIds;
        appliedFilters.push("class-data-only");
      }
      break;

    case "system":
    case "global":
      // No additional filtering needed
      break;
  }

  // Apply time range restrictions for learners
  if (userContext.role === "learner") {
    const maxDaysBack = 30;
    const now = new Date();
    const maxStartDate = new Date(
      now.getTime() - maxDaysBack * 24 * 60 * 60 * 1000,
    );

    if (filteredParams.timeRange) {
      if (filteredParams.timeRange.start < maxStartDate) {
        filteredParams.timeRange.start = maxStartDate;
        appliedFilters.push("time-range-limited");
      }
    } else {
      filteredParams.timeRange = {
        start: maxStartDate,
        end: now,
      };
      appliedFilters.push("default-time-range-applied");
    }
  }

  return {
    originalParams,
    filteredParams,
    appliedFilters,
    restrictions,
  };
}

/**
 * Filters progress metrics parameters based on user permissions and role
 */
export function filterProgressParams(
  params: ProgressMetricsParams | undefined,
  userContext: UserContext,
): FilteredRequest<ProgressMetricsParams> {
  const originalParams = params || {};
  const filteredParams = { ...originalParams };
  const appliedFilters: string[] = [];
  const restrictions: string[] = [];

  // Check if user can view progress data
  if (!hasPermission(userContext.permissions, "viewProgress")) {
    restrictions.push("no-progress-access");
    return {
      originalParams,
      filteredParams: {} as ProgressMetricsParams,
      appliedFilters,
      restrictions,
    };
  }

  const dataScope = getUserDataScope(userContext.role, userContext.userId);

  // Apply role-based filtering
  switch (dataScope.scope) {
    case "personal":
      filteredParams.userId = userContext.userId;
      appliedFilters.push("personal-progress-only");
      break;

    case "class":
      if (userContext.classIds && userContext.classIds.length > 0) {
        // Add class filtering to the request
        filteredParams.classIds = userContext.classIds;
        appliedFilters.push("class-progress-only");
      }
      break;

    case "system":
    case "global":
      // No additional filtering needed
      break;
  }

  return {
    originalParams,
    filteredParams,
    appliedFilters,
    restrictions,
  };
}

/**
 * Filters content metrics parameters based on user permissions and role
 */
export function filterContentParams(
  params: ContentMetricsParams | undefined,
  userContext: UserContext,
): FilteredRequest<ContentMetricsParams> {
  const originalParams = params || {};
  const filteredParams = { ...originalParams };
  const appliedFilters: string[] = [];
  const restrictions: string[] = [];

  // Check if user can view content data
  if (!hasPermission(userContext.permissions, "viewContent")) {
    restrictions.push("no-content-access");
    return {
      originalParams,
      filteredParams: {} as ContentMetricsParams,
      appliedFilters,
      restrictions,
    };
  }

  // Learners typically can't see content analytics
  if (userContext.role === "learner") {
    restrictions.push("learner-content-restriction");
    return {
      originalParams,
      filteredParams: {} as ContentMetricsParams,
      appliedFilters,
      restrictions,
    };
  }

  const dataScope = getUserDataScope(userContext.role, userContext.userId);

  // Apply role-based filtering
  switch (dataScope.scope) {
    case "class":
      if (userContext.classIds && userContext.classIds.length > 0) {
        // Add class filtering to the request
        filteredParams.classIds = userContext.classIds;
        appliedFilters.push("class-content-only");
      }
      break;

    case "system":
    case "global":
      // No additional filtering needed
      break;
  }

  return {
    originalParams,
    filteredParams,
    appliedFilters,
    restrictions,
  };
}

/**
 * Filters system metrics parameters based on user permissions and role
 */
export function filterSystemParams(
  params: SystemMetricsParams | undefined,
  userContext: UserContext,
): FilteredRequest<SystemMetricsParams> {
  const originalParams = params || {};
  const filteredParams = { ...originalParams };
  const appliedFilters: string[] = [];
  const restrictions: string[] = [];

  // Check if user can view system data
  if (!hasPermission(userContext.permissions, "viewSystem")) {
    restrictions.push("no-system-access");
    return {
      originalParams,
      filteredParams: {} as SystemMetricsParams,
      appliedFilters,
      restrictions,
    };
  }

  // Only admins can see detailed system metrics
  if (userContext.role !== "admin") {
    restrictions.push("admin-only-system-metrics");
    return {
      originalParams,
      filteredParams: {} as SystemMetricsParams,
      appliedFilters,
      restrictions,
    };
  }

  return {
    originalParams,
    filteredParams,
    appliedFilters,
    restrictions,
  };
}

/**
 * Filters historical query parameters based on user permissions and role
 */
export function filterHistoricalQuery(
  query: HistoricalQuery,
  userContext: UserContext,
): FilteredRequest<HistoricalQuery> {
  const originalParams = query;
  const filteredParams = { ...query };
  const appliedFilters: string[] = [];
  const restrictions: string[] = [];

  const dataScope = getUserDataScope(userContext.role, userContext.userId);

  // Filter metrics based on permissions
  const allowedMetrics = filteredParams.metrics.filter((metric) => {
    if (
      metric.includes("engagement") &&
      !hasPermission(userContext.permissions, "viewEngagement")
    ) {
      return false;
    }
    if (
      metric.includes("progress") &&
      !hasPermission(userContext.permissions, "viewProgress")
    ) {
      return false;
    }
    if (
      metric.includes("content") &&
      !hasPermission(userContext.permissions, "viewContent")
    ) {
      return false;
    }
    if (
      metric.includes("system") &&
      !hasPermission(userContext.permissions, "viewSystem")
    ) {
      return false;
    }
    return true;
  });

  if (allowedMetrics.length !== filteredParams.metrics.length) {
    filteredParams.metrics = allowedMetrics;
    appliedFilters.push("metrics-filtered-by-permissions");
  }

  // Apply role-based data scope filtering
  switch (dataScope.scope) {
    case "personal":
      filteredParams.filters = {
        ...filteredParams.filters,
        userId: userContext.userId,
      };
      appliedFilters.push("personal-historical-data");
      break;

    case "class":
      if (userContext.classIds && userContext.classIds.length > 0) {
        filteredParams.filters = {
          ...filteredParams.filters,
          classIds: userContext.classIds,
        };
        appliedFilters.push("class-historical-data");
      }
      break;
  }

  // Limit time range for non-admin users
  if (userContext.role !== "admin") {
    const maxDaysBack = userContext.role === "learner" ? 30 : 90;
    const now = new Date();
    const maxStartDate = new Date(
      now.getTime() - maxDaysBack * 24 * 60 * 60 * 1000,
    );

    if (filteredParams.timeRange.start < maxStartDate) {
      filteredParams.timeRange.start = maxStartDate;
      appliedFilters.push("time-range-limited");
    }
  }

  return {
    originalParams,
    filteredParams,
    appliedFilters,
    restrictions,
  };
}

/**
 * Filters report parameters based on user permissions and role
 */
export function filterReportParams(
  params: ReportFilters | undefined,
  userContext: UserContext,
): FilteredRequest<ReportFilters> {
  const originalParams = params || {};
  const filteredParams = { ...originalParams };
  const appliedFilters: string[] = [];
  const restrictions: string[] = [];

  // Check if user can view reports
  if (!hasPermission(userContext.permissions, "viewReports")) {
    restrictions.push("no-reports-access");
    return {
      originalParams,
      filteredParams: {} as ReportFilters,
      appliedFilters,
      restrictions,
    };
  }

  const dataScope = getUserDataScope(userContext.role, userContext.userId);

  // Apply role-based filtering
  switch (dataScope.scope) {
    case "personal":
      // Add user filtering to the request
      filteredParams.userId = userContext.userId;
      appliedFilters.push("personal-reports-only");
      break;

    case "class":
      if (userContext.classIds && userContext.classIds.length > 0) {
        // Add class filtering to the request
        filteredParams.classIds = userContext.classIds;
        appliedFilters.push("class-reports-only");
      }
      break;

    case "system":
    case "global":
      // No additional filtering needed
      break;
  }

  return {
    originalParams,
    filteredParams,
    appliedFilters,
    restrictions,
  };
}

// ============================================================================
// Permission-Based UI Rendering
// ============================================================================

/**
 * Determines if a UI component should be rendered based on permissions
 */
export function shouldRenderComponent(
  componentType: string,
  userContext: UserContext,
): boolean {
  const { permissions } = userContext;

  switch (componentType) {
    case "engagement-dashboard":
      return hasPermission(permissions, "viewEngagement");

    case "progress-dashboard":
      return hasPermission(permissions, "viewProgress");

    case "content-analytics":
      return hasPermission(permissions, "viewContent");

    case "system-monitoring":
      return hasPermission(permissions, "viewSystem");

    case "alert-management":
      return (
        hasPermission(permissions, "viewAlerts") ||
        hasPermission(permissions, "manageAlerts")
      );

    case "behavior-insights":
      return hasPermission(permissions, "viewInsights");

    case "effectiveness-reports":
      return hasPermission(permissions, "viewReports");

    case "user-analytics":
      return hasPermission(permissions, "viewUserAnalytics");

    case "system-metrics":
      return hasPermission(permissions, "viewSystemMetrics");

    case "data-export":
      return hasPermission(permissions, "exportData");

    case "realtime-updates":
      return hasPermission(permissions, "viewRealtime");

    default:
      return false;
  }
}

/**
 * Gets the appropriate data view level for a user
 */
export function getDataViewLevel(
  userContext: UserContext,
): "summary" | "detailed" | "full" {
  switch (userContext.role) {
    case "admin":
      return "full";

    case "mentor":
      return "detailed";

    case "learner":
    default:
      return "summary";
  }
}

/**
 * Filters navigation items based on user permissions
 */
export function filterNavigationItems(
  navigationItems: Array<{
    id: string;
    label: string;
    component: string;
    requiredPermissions?: (keyof AnalyticsPermissions)[];
  }>,
  userContext: UserContext,
): Array<{
  id: string;
  label: string;
  component: string;
  requiredPermissions?: (keyof AnalyticsPermissions)[];
}> {
  return navigationItems.filter((item) => {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }

    return item.requiredPermissions.every((permission) =>
      hasPermission(userContext.permissions, permission),
    );
  });
}

// ============================================================================
// Permission Change Handling
// ============================================================================

/**
 * Handles permission changes and user role updates
 */
export function handlePermissionChange(
  oldPermissions: AnalyticsPermissions,
  newPermissions: AnalyticsPermissions,
  onPermissionLost?: (permission: keyof AnalyticsPermissions) => void,
  onPermissionGained?: (permission: keyof AnalyticsPermissions) => void,
): void {
  const permissionKeys = Object.keys(
    newPermissions,
  ) as (keyof AnalyticsPermissions)[];

  permissionKeys.forEach((permission) => {
    const hadPermission = oldPermissions[permission];
    const hasPermission = newPermissions[permission];

    if (hadPermission && !hasPermission) {
      onPermissionLost?.(permission);
    } else if (!hadPermission && hasPermission) {
      onPermissionGained?.(permission);
    }
  });
}

/**
 * Creates a permission change summary
 */
export function createPermissionChangeSummary(
  oldPermissions: AnalyticsPermissions,
  newPermissions: AnalyticsPermissions,
): {
  gained: (keyof AnalyticsPermissions)[];
  lost: (keyof AnalyticsPermissions)[];
  unchanged: (keyof AnalyticsPermissions)[];
} {
  const gained: (keyof AnalyticsPermissions)[] = [];
  const lost: (keyof AnalyticsPermissions)[] = [];
  const unchanged: (keyof AnalyticsPermissions)[] = [];

  const permissionKeys = Object.keys(
    newPermissions,
  ) as (keyof AnalyticsPermissions)[];

  permissionKeys.forEach((permission) => {
    const hadPermission = oldPermissions[permission];
    const hasPermission = newPermissions[permission];

    if (hadPermission && !hasPermission) {
      lost.push(permission);
    } else if (!hadPermission && hasPermission) {
      gained.push(permission);
    } else {
      unchanged.push(permission);
    }
  });

  return { gained, lost, unchanged };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a user context from user data
 */
export function createUserContext(
  user: {
    id: string;
    role: UserRole;
    classIds?: string[] | undefined;
    organizationId?: string | undefined;
    teamIds?: string[] | undefined;
  },
  permissions: AnalyticsPermissions,
): UserContext {
  return {
    userId: user.id,
    role: user.role,
    classIds: user.classIds || [],
    organizationId: user.organizationId || undefined,
    teamIds: user.teamIds || [],
    permissions,
  };
}

/**
 * Validates user context completeness
 */
export function validateUserContext(userContext: UserContext): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!userContext.userId) {
    missing.push("userId");
  }

  if (!userContext.role) {
    missing.push("role");
  }

  if (!userContext.permissions) {
    missing.push("permissions");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
