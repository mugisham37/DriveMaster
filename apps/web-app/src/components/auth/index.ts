export { AuthError } from './AuthError'
export { ProtectedRoute, UnauthenticatedOnly } from './ProtectedRoute'
export { SessionTimeoutWarning, SessionTimeoutProvider } from './SessionTimeoutWarning'

// New route guard components
export { 
  RouteGuard,
  AuthenticatedOnly,
  MentorOnly,
  InsiderOnly,
  UnauthenticatedOnly as NewUnauthenticatedOnly
} from './RouteGuard'

// Role-based access control components
export {
  RoleBasedAccess,
  AuthenticatedContent,
  UnauthenticatedContent,
  MentorContent,
  InsiderContent,
  NonMentorContent,
  NonInsiderContent,
  NavigationItem,
  ConditionalRender,
  withRoleBasedAccess,
  usePermissions,
  filterNavigationItems,
  useFilteredNavigation
} from './RoleBasedAccess'

// OAuth Components
export { OAuthButton, OAuthButtonGroup, useOAuthProviderStatus, PROVIDER_CONFIGS } from './OAuthButton'
export { OAuthProviderManager } from './OAuthProviderManager'

// Authentication Forms
export { SignInForm } from './SignInForm'
export { SignUpForm } from './SignUpForm'
export { ForgotPasswordForm } from './ForgotPasswordForm'
export { ResetPasswordForm } from './ResetPasswordForm'

// Profile Management
export { ProfileManagement } from './ProfileManagement'

// Session Management
export { SessionExpiredDialog } from './SessionExpiredDialog'
export { SessionManagement } from './SessionManagement'

// Export types
export type {
  RoleBasedAccessProps,
  ConditionalRenderProps,
  NavigationItemProps,
  NavigationMenuItem
} from './RoleBasedAccess'

// OAuth component types are exported from their respective modules