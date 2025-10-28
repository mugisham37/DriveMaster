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
export { SignInForm } from './SignInForm'

// Export types
export type {
  RouteGuardProps,
  RouteGuardFallbackProps,
  RoleBasedAccessProps,
  ConditionalRenderProps,
  NavigationItemProps,
  NavigationMenuItem
} from './RoleBasedAccess'

// OAuth component types are exported from their respective modules