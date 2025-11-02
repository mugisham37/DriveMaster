export { useLogger } from './use-logger'
export { useDidMountEffect } from './use-did-mount-effect'
export { useTimeout } from './use-timeout'
export { useDebounce } from './use-debounce'
export { useScrollToTop } from './use-scroll-to-top'
export { useDropdown } from './useAdvancedDropdown'
export type { DropdownAttributes } from './useAdvancedDropdown'
export { useNavigationDropdown } from './useNavigationDropdown'

// Authentication hooks
export { useAuthActions } from './useAuthActions'
export type { UseAuthActionsReturn, LoginOptions, RegisterOptions, LogoutOptions, OAuthOptions } from './useAuthActions'
export { useSessionTimeout, useSessionWarning } from './useSessionTimeout'
export type { UseSessionTimeoutReturn, UseSessionWarningReturn, SessionTimeoutConfig } from './useSessionTimeout'

// Authentication hooks (new implementation)
export {
  useAuth,
  useRequireAuth,
  useRequireMentor,
  useRequireInsider,
  useAuthActions,
  useAuthStatus,
  useAuthRedirect,
  useAuthStateChange,
  useConditionalAuth,
  withAuth,
  withAuthActions,
  withRequireAuth,
  withRequireMentor,
  withRequireInsider
} from './useAuth'
export type {
  UseRequireAuthOptions,
  UseRequireAuthReturn,
  UseRequireMentorOptions,
  UseRequireMentorReturn,
  UseRequireInsiderOptions,
  UseRequireInsiderReturn,
  WithAuthProps,
  WithAuthActionsProps
} from './useAuth'

// Legacy authentication guard hooks (deprecated)
export {
  useAuth as useLegacyAuthGuard,
  useRequireAuth as useLegacyRequireAuth,
  useRequireMentor as useLegacyRequireMentor,
  useRequireInsider as useLegacyRequireInsider,
  useAuthActionsHook,
  useConditionalAuth as useLegacyConditionalAuth,
  useAuthStatus as useLegacyAuthStatus,
  useRouteProtection,
  useAuthRedirect as useLegacyAuthRedirect,
  useAuthStateChange as useLegacyAuthStateChange
} from './useAuthGuards'
export type {
  UseRequireAuthOptions as LegacyUseRequireAuthOptions,
  UseRequireAuthReturn as LegacyUseRequireAuthReturn,
  UseRequireMentorOptions as LegacyUseRequireMentorOptions,
  UseRequireMentorReturn as LegacyUseRequireMentorReturn,
  UseRequireInsiderOptions as LegacyUseRequireInsiderOptions,
  UseRequireInsiderReturn as LegacyUseRequireInsiderReturn,
  UseConditionalAuthOptions,
  UseRouteProtectionOptions,
  UseRouteProtectionReturn
} from './useAuthGuards'

// Notification hooks
export {
  useNotifications,
  useInfiniteNotifications,
  useNotificationMutations,
  useNotificationCounts,
  useNotification,
  notificationQueryKeys
} from './useNotifications'
export type {
  UseNotificationsOptions,
  UseNotificationsResult,
  UseInfiniteNotificationsResult,
  UseNotificationMutationsResult,
  UseNotificationCountsResult,
  UseNotificationResult
} from './useNotifications'

export {
  useNotificationPermission,
  useDeviceTokenRegistration,
  useDeviceTokens,
  useDeviceTokenStats,
  deviceTokenQueryKeys
} from './useDeviceTokens'
export type {
  NotificationPermissionState,
  UseNotificationPermissionResult,
  UseDeviceTokenRegistrationOptions,
  UseDeviceTokenRegistrationResult,
  UseDeviceTokensOptions,
  UseDeviceTokensResult,
  UseDeviceTokenStatsResult
} from './useDeviceTokens'

export {
  useRealtimeNotifications,
  useNotificationConnection
} from './useRealtimeNotifications'
export type {
  UseRealtimeNotificationsOptions,
  UseRealtimeNotificationsResult,
  UseNotificationConnectionResult
} from './useRealtimeNotifications'

export {
  useNotificationPreferences,
  usePreferenceValidation,
  preferencesQueryKeys
} from './useNotificationPreferences'
export type {
  UseNotificationPreferencesResult,
  PreferenceValidationResult
} from './useNotificationPreferences'

// Notification filtering hooks
export {
  useNotificationFiltering,
  useChannelNotifications,
  usePushNotifications,
  useInAppNotifications,
  useEmailNotifications,
  useNotificationTypeStatus,
  useNotificationInsights
} from './useNotificationFiltering'
export type {
  UseNotificationFilteringOptions,
  FilteredNotificationResult,
  UseNotificationFilteringResult
} from './useNotificationFiltering'

// Notification Analytics hooks
export {
  useAnalyticsTracking,
  useAnalyticsData,
  useRealtimeAnalytics,
  useAnalyticsMetrics,
  useAutoAnalyticsTracking,
  useAnalyticsSummary,
  analyticsQueryKeys
} from './useNotificationAnalytics'
export type {
  UseAnalyticsTrackingResult,
  UseAnalyticsDataOptions,
  UseAnalyticsDataResult,
  UseRealtimeAnalyticsOptions,
  UseRealtimeAnalyticsResult
} from './useNotificationAnalytics'

// Analytics Dashboard hooks
export {
  useAnalytics,
  useEngagementMetrics,
  useHourlyEngagement,
  useProgressMetrics,
  useUserJourney,
  useCohortRetention,
  useContentMetrics,
  useContentGaps,
  useSystemMetrics,
  useSystemStatus,
  useAlerts,
  useBehaviorInsights,
  useBehaviorPatterns,
  useEffectivenessReport,
  useHistoricalMetrics,
  useUserSegments,
  useRealtimeSnapshot,
  useHealthStatus,
  useSystemPerformance,
  useAnalyticsSummary as useAnalyticsDashboardSummary,
  useAnalyticsMutations
} from './useAnalytics'

export {
  useRealtimeMetrics,
  useRealtimeEngagement,
  useRealtimeAlerts,
  useRealtimeConnection
} from './useRealtimeMetrics'

export {
  useAnalyticsCrossTabSync,
  useAnalyticsOptimisticUpdates,
  useAnalyticsMutationsWithOptimistic,
  useAnalyticsSync
} from './useAnalyticsSync'

// Permission-aware analytics hooks
export {
  useAnalyticsWithPermissions,
  useEngagementMetricsWithPermissions,
  useHourlyEngagementWithPermissions,
  useProgressMetricsWithPermissions,
  useUserJourneyWithPermissions,
  useContentMetricsWithPermissions,
  useContentGapsWithPermissions,
  useSystemMetricsWithPermissions,
  useAlertsWithPermissions,
  useBehaviorInsightsWithPermissions,
  useEffectivenessReportWithPermissions,
  useHistoricalMetricsWithPermissions,
  useAnalyticsSummaryWithPermissions,
  useAnalyticsComponentVisibility
} from './useAnalyticsWithPermissions'