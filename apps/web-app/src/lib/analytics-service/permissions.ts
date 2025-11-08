/**
 * Analytics Service Permissions
 *
 * Role-based access control for analytics features and data access.
 * Provides permission checking functions and filtering logic.
 *
 * Requirements: 7.3, 7.5, 9.5
 */

import type {
  AnalyticsPermissions,
  UserRole,
  AnalyticsFeature,
  AnalyticsDataType,
} from "@/types/analytics-service";

// ============================================================================
// Permission Definitions
// ============================================================================

/**
 * Default permissions for each user role
 */
export const ROLE_PERMISSIONS: Record<UserRole, AnalyticsPermissions> = {
  admin: {
    viewEngagement: true,
    viewProgress: true,
    viewContent: true,
    viewSystem: true,
    viewAlerts: true,
    viewInsights: true,
    viewReports: true,
    viewUserAnalytics: true,
    viewSystemMetrics: true,
    manageAlerts: true,
    exportData: true,
    viewRealtime: true,
  },

  mentor: {
    viewEngagement: true,
    viewProgress: true,
    viewContent: true,
    viewSystem: false,
    viewAlerts: false,
    viewInsights: true,
    viewReports: true,
    viewUserAnalytics: true,
    viewSystemMetrics: false,
    manageAlerts: false,
    exportData: true,
    viewRealtime: true,
  },

  learner: {
    viewEngagement: false,
    viewProgress: true,
    viewContent: false,
    viewSystem: false,
    viewAlerts: false,
    viewInsights: true,
    viewReports: false,
    viewUserAnalytics: true,
    viewSystemMetrics: false,
    manageAlerts: false,
    exportData: false,
    viewRealtime: false,
  },
};

/**
 * Feature to permission mapping
 */
export const FEATURE_PERMISSIONS: Record<
  AnalyticsFeature,
  keyof AnalyticsPermissions
> = {
  "engagement-dashboard": "viewEngagement",
  "progress-tracking": "viewProgress",
  "content-analytics": "viewContent",
  "system-monitoring": "viewSystem",
  "alert-management": "viewAlerts",
  "behavior-insights": "viewInsights",
  "effectiveness-reports": "viewReports",
  "user-analytics": "viewUserAnalytics",
  "system-metrics": "viewSystemMetrics",
  "data-export": "exportData",
  "realtime-updates": "viewRealtime",
};

/**
 * Data type to permission mapping
 */
export const DATA_TYPE_PERMISSIONS: Record<
  AnalyticsDataType,
  keyof AnalyticsPermissions
> = {
  engagement: "viewEngagement",
  progress: "viewProgress",
  content: "viewContent",
  system: "viewSystem",
  alerts: "viewAlerts",
  insights: "viewInsights",
  reports: "viewReports",
  "user-analytics": "viewUserAnalytics",
  "system-metrics": "viewSystemMetrics",
};

// ============================================================================
// Permission Checking Functions
// ============================================================================

/**
 * Gets permissions for a specific user role
 */
export function getPermissionsForRole(role: UserRole): AnalyticsPermissions {
  return { ...ROLE_PERMISSIONS[role] };
}

/**
 * Checks if a user has a specific permission
 */
export function hasPermission(
  permissions: AnalyticsPermissions,
  permission: keyof AnalyticsPermissions,
): boolean {
  return permissions[permission] === true;
}

/**
 * Checks if a user can access a specific analytics feature
 */
export function canAccessFeature(
  permissions: AnalyticsPermissions,
  feature: AnalyticsFeature,
): boolean {
  const requiredPermission = FEATURE_PERMISSIONS[feature];
  return hasPermission(permissions, requiredPermission);
}

/**
 * Checks if a user can access a specific data type
 */
export function canAccessDataType(
  permissions: AnalyticsPermissions,
  dataType: AnalyticsDataType,
): boolean {
  const requiredPermission = DATA_TYPE_PERMISSIONS[dataType];
  return hasPermission(permissions, requiredPermission);
}

/**
 * Checks if a user can perform an action on alerts
 */
export function canManageAlerts(permissions: AnalyticsPermissions): boolean {
  return hasPermission(permissions, "manageAlerts");
}

/**
 * Checks if a user can export analytics data
 */
export function canExportData(permissions: AnalyticsPermissions): boolean {
  return hasPermission(permissions, "exportData");
}

/**
 * Checks if a user can view real-time updates
 */
export function canViewRealtime(permissions: AnalyticsPermissions): boolean {
  return hasPermission(permissions, "viewRealtime");
}

// ============================================================================
// Data Filtering Functions
// ============================================================================

/**
 * Filters analytics endpoints based on user permissions
 */
export function filterAllowedEndpoints(
  permissions: AnalyticsPermissions,
  endpoints: string[],
): string[] {
  return endpoints.filter((endpoint) => {
    // Map endpoint patterns to permissions
    if (endpoint.includes("/engagement")) {
      return hasPermission(permissions, "viewEngagement");
    }
    if (endpoint.includes("/progress")) {
      return hasPermission(permissions, "viewProgress");
    }
    if (endpoint.includes("/content")) {
      return hasPermission(permissions, "viewContent");
    }
    if (endpoint.includes("/system")) {
      return hasPermission(permissions, "viewSystem");
    }
    if (endpoint.includes("/alerts")) {
      return hasPermission(permissions, "viewAlerts");
    }
    if (endpoint.includes("/insights")) {
      return hasPermission(permissions, "viewInsights");
    }
    if (endpoint.includes("/reports")) {
      return hasPermission(permissions, "viewReports");
    }
    if (endpoint.includes("/users")) {
      return hasPermission(permissions, "viewUserAnalytics");
    }
    if (endpoint.includes("/export")) {
      return hasPermission(permissions, "exportData");
    }

    // Default to allowing if no specific permission required
    return true;
  });
}

/**
 * Filters analytics features based on user permissions
 */
export function filterAllowedFeatures(
  permissions: AnalyticsPermissions,
  features: AnalyticsFeature[],
): AnalyticsFeature[] {
  return features.filter((feature) => canAccessFeature(permissions, feature));
}

/**
 * Filters data types based on user permissions
 */
export function filterAllowedDataTypes(
  permissions: AnalyticsPermissions,
  dataTypes: AnalyticsDataType[],
): AnalyticsDataType[] {
  return dataTypes.filter((dataType) =>
    canAccessDataType(permissions, dataType),
  );
}

// ============================================================================
// User Context Filtering
// ============================================================================

/**
 * Determines the data scope a user can access based on their role
 */
export function getUserDataScope(
  role: UserRole,
  userId: string,
): {
  scope: "personal" | "class" | "system" | "global";
  userIds?: string[];
  classIds?: string[];
  restrictions?: string[];
} {
  switch (role) {
    case "admin":
      return {
        scope: "global",
        restrictions: [],
      };

    case "mentor":
      return {
        scope: "class",
        restrictions: ["no-system-data", "no-admin-data"],
      };

    case "learner":
    default:
      return {
        scope: "personal",
        userIds: [userId],
        restrictions: ["personal-data-only", "no-system-data", "no-class-data"],
      };
  }
}

/**
 * Filters user IDs based on data scope permissions
 */
export function filterAllowedUserIds(
  role: UserRole,
  currentUserId: string,
  requestedUserIds: string[],
  classUserIds?: string[],
): string[] {
  const dataScope = getUserDataScope(role, currentUserId);

  switch (dataScope.scope) {
    case "global":
      return requestedUserIds;

    case "class":
      return requestedUserIds.filter(
        (id) => classUserIds?.includes(id) || id === currentUserId,
      );

    case "personal":
      return requestedUserIds.filter((id) => id === currentUserId);

    default:
      return [];
  }
}

// ============================================================================
// Permission Validation
// ============================================================================

/**
 * Validates that a user has all required permissions for an operation
 */
export function validatePermissions(
  userPermissions: AnalyticsPermissions,
  requiredPermissions: (keyof AnalyticsPermissions)[],
): {
  valid: boolean;
  missing: (keyof AnalyticsPermissions)[];
} {
  const missing = requiredPermissions.filter(
    (permission) => !hasPermission(userPermissions, permission),
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Creates a permission error message
 */
export function createPermissionError(
  operation: string,
  missing: (keyof AnalyticsPermissions)[],
): Error {
  const missingList = missing.join(", ");
  return new Error(
    `Insufficient permissions for ${operation}. Missing: ${missingList}`,
  );
}

// ============================================================================
// Permission Utilities
// ============================================================================

/**
 * Merges multiple permission sets (useful for custom roles)
 */
export function mergePermissions(
  ...permissionSets: Partial<AnalyticsPermissions>[]
): AnalyticsPermissions {
  const merged: AnalyticsPermissions = {
    viewEngagement: false,
    viewProgress: false,
    viewContent: false,
    viewSystem: false,
    viewAlerts: false,
    viewInsights: false,
    viewReports: false,
    viewUserAnalytics: false,
    viewSystemMetrics: false,
    manageAlerts: false,
    exportData: false,
    viewRealtime: false,
  };

  permissionSets.forEach((permissions) => {
    Object.entries(permissions).forEach(([key, value]) => {
      if (value === true && key in merged) {
        merged[key as keyof AnalyticsPermissions] = true;
      }
    });
  });

  return merged;
}

/**
 * Creates a permission summary for debugging
 */
export function getPermissionSummary(permissions: AnalyticsPermissions): {
  granted: (keyof AnalyticsPermissions)[];
  denied: (keyof AnalyticsPermissions)[];
  total: number;
} {
  const granted: (keyof AnalyticsPermissions)[] = [];
  const denied: (keyof AnalyticsPermissions)[] = [];

  Object.entries(permissions).forEach(([key, value]) => {
    if (value) {
      granted.push(key as keyof AnalyticsPermissions);
    } else {
      denied.push(key as keyof AnalyticsPermissions);
    }
  });

  return {
    granted,
    denied,
    total: granted.length + denied.length,
  };
}

// ============================================================================
// Permission Middleware
// ============================================================================

/**
 * Creates a permission check middleware for API requests
 */
export function createPermissionMiddleware(
  getUserPermissions: () => AnalyticsPermissions,
) {
  return {
    checkFeatureAccess: (feature: AnalyticsFeature) => {
      const permissions = getUserPermissions();
      if (!canAccessFeature(permissions, feature)) {
        throw createPermissionError(`access ${feature}`, [
          FEATURE_PERMISSIONS[feature],
        ]);
      }
    },

    checkDataAccess: (dataType: AnalyticsDataType) => {
      const permissions = getUserPermissions();
      if (!canAccessDataType(permissions, dataType)) {
        throw createPermissionError(`access ${dataType} data`, [
          DATA_TYPE_PERMISSIONS[dataType],
        ]);
      }
    },

    checkExportAccess: () => {
      const permissions = getUserPermissions();
      if (!canExportData(permissions)) {
        throw createPermissionError("export data", ["exportData"]);
      }
    },

    checkAlertManagement: () => {
      const permissions = getUserPermissions();
      if (!canManageAlerts(permissions)) {
        throw createPermissionError("manage alerts", ["manageAlerts"]);
      }
    },
  };
}
