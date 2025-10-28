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

// Export types
export type {
  RouteGuardProps,
  RouteGuardFallbackProps,
  RoleBasedAccessProps,
  ConditionalRenderProps,
  NavigationItemProps,
  NavigationMenuItem
} from './RoleBasedAccess'