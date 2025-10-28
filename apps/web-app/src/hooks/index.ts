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