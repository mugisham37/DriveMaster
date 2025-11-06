/**
 * Authentication Components Export
 * 
 * Centralized exports for all authentication-related components
 */

// Route Protection Components
export {
  default as ProtectedRoute,
  BasicProtectedRoute,
  MentorProtectedRoute,
  InsiderProtectedRoute,
  FlexibleProtectedRoute,
  LoadingSpinner,
  ErrorDisplay
} from './ProtectedRoute'

// Role-Based Access Control Components
export {
  RoleGuard,
  AuthenticatedOnly,
  MentorOnly,
  InsiderOnly,
  PermissionGuard,
  ConditionalAuth,
  RoleDisplay,
  AccessControl
} from './RoleBasedAccess'

// Export types
export type {
  ProtectedRouteProps,
  BasicProtectedRouteProps,
  MentorProtectedRouteProps,
  InsiderProtectedRouteProps,
  FlexibleProtectedRouteProps
} from './ProtectedRoute'

export type {
  RoleGuardProps,
  AuthenticatedOnlyProps,
  MentorOnlyProps,
  InsiderOnlyProps,
  PermissionGuardProps,
  ConditionalAuthProps,
  RoleDisplayProps,
  AccessControlProps
} from './RoleBasedAccess'