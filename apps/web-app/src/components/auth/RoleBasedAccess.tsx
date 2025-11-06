'use client'

/**
 * Role-Based Access Control Components
 * 
 * Implements:
 * - Conditional rendering based on user roles
 * - Permission-based component visibility
 * - Role validation utilities
 * - Requirements: 3.2, 3.3
 */

import React from 'react'
import { useAuthStatus } from '@/hooks/useAuthHooks'

// ============================================================================
// Role-Based Conditional Rendering
// ============================================================================

export interface RoleGuardProps {
  children: React.ReactNode
  /** Require authentication */
  requireAuth?: boolean
  /** Require mentor role */
  requireMentor?: boolean
  /** Require insider role */
  requireInsider?: boolean
  /** Fallback component when access is denied */
  fallback?: React.ReactNode
  /** Show loading during auth check */
  showLoading?: boolean
}

/**
 * Component that conditionally renders children based on user roles
 * Does not redirect - only controls visibility
 */
export function RoleGuard({
  children,
  requireAuth = false,
  requireMentor = false,
  requireInsider = false,
  fallback = null,
  showLoading = false
}: RoleGuardProps) {
  const authStatus = useAuthStatus()

  // Show loading if requested and auth is still initializing
  if (showLoading && !authStatus.isReady) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  // Check access requirements
  const hasAccess = checkAccess()

  return hasAccess ? <>{children}</> : <>{fallback}</>

  function checkAccess(): boolean {
    if (requireAuth && !authStatus.isAuthenticated) {
      return false
    }

    if (requireMentor && !authStatus.canAccessMentoring) {
      return false
    }

    if (requireInsider && !authStatus.canAccessInsiderFeatures) {
      return false
    }

    return true
  }
}

// ============================================================================
// Specific Role Components
// ============================================================================

export interface AuthenticatedOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showLoading?: boolean
}

/**
 * Component that only renders for authenticated users
 */
export function AuthenticatedOnly({ children, fallback = null, showLoading = false }: AuthenticatedOnlyProps) {
  return (
    <RoleGuard requireAuth showLoading={showLoading} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export interface MentorOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showLoading?: boolean
}

/**
 * Component that only renders for mentors
 */
export function MentorOnly({ children, fallback = null, showLoading = false }: MentorOnlyProps) {
  return (
    <RoleGuard requireMentor showLoading={showLoading} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export interface InsiderOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showLoading?: boolean
}

/**
 * Component that only renders for insiders
 */
export function InsiderOnly({ children, fallback = null, showLoading = false }: InsiderOnlyProps) {
  return (
    <RoleGuard requireInsider showLoading={showLoading} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

// ============================================================================
// Permission-Based Components
// ============================================================================

export interface PermissionGuardProps {
  children: React.ReactNode
  /** Required permissions */
  permissions: Array<'mentoring' | 'insider-features' | 'dashboard'>
  /** Whether all permissions are required (AND) or any (OR) */
  requireAll?: boolean
  /** Fallback component */
  fallback?: React.ReactNode
  /** Show loading during auth check */
  showLoading?: boolean
}

/**
 * Component that renders based on specific permissions
 */
export function PermissionGuard({
  children,
  permissions,
  requireAll = true,
  fallback = null,
  showLoading = false
}: PermissionGuardProps) {
  const authStatus = useAuthStatus()

  // Show loading if requested and auth is still initializing
  if (showLoading && !authStatus.isReady) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  const hasPermission = checkPermissions()

  return hasPermission ? <>{children}</> : <>{fallback}</>

  function checkPermissions(): boolean {
    const permissionChecks = permissions.map(permission => {
      switch (permission) {
        case 'mentoring':
          return authStatus.canAccessMentoring
        case 'insider-features':
          return authStatus.canAccessInsiderFeatures
        case 'dashboard':
          return authStatus.canAccessDashboard
        default:
          return false
      }
    })

    return requireAll 
      ? permissionChecks.every(Boolean)
      : permissionChecks.some(Boolean)
  }
}

// ============================================================================
// Conditional Authentication Components
// ============================================================================

export interface ConditionalAuthProps {
  children: React.ReactNode
  /** Condition that determines if auth is required */
  condition: boolean
  /** Fallback when condition is true but user is not authenticated */
  authFallback?: React.ReactNode
  /** Fallback when condition is false */
  noAuthFallback?: React.ReactNode
}

/**
 * Component that conditionally requires authentication based on a condition
 */
export function ConditionalAuth({
  children,
  condition,
  authFallback = null,
  noAuthFallback = null
}: ConditionalAuthProps) {
  const authStatus = useAuthStatus()

  if (!condition) {
    return noAuthFallback ? <>{noAuthFallback}</> : <>{children}</>
  }

  if (!authStatus.isAuthenticated) {
    return <>{authFallback}</>
  }

  return <>{children}</>
}

// ============================================================================
// Role Information Components
// ============================================================================

export interface RoleDisplayProps {
  /** Show user role badges */
  showBadges?: boolean
  /** Custom class names */
  className?: string
}

/**
 * Component that displays user role information
 */
export function RoleDisplay({ showBadges = true, className = '' }: RoleDisplayProps) {
  const authStatus = useAuthStatus()

  if (!authStatus.isAuthenticated || !authStatus.user) {
    return null
  }

  const roles = []
  if (authStatus.isMentor) roles.push('Mentor')
  if (authStatus.isInsider) roles.push('Insider')

  if (!showBadges || roles.length === 0) {
    return null
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {roles.map(role => (
        <span
          key={role}
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            role === 'Mentor' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-purple-100 text-purple-800'
          }`}
        >
          {role}
        </span>
      ))}
    </div>
  )
}

// ============================================================================
// Access Control Utilities
// ============================================================================

export interface AccessControlProps {
  children: React.ReactNode
  /** Access control configuration */
  access: {
    /** Public access (no auth required) */
    public?: boolean
    /** Authenticated users only */
    authenticated?: boolean
    /** Mentor access only */
    mentor?: boolean
    /** Insider access only */
    insider?: boolean
    /** Custom permission check */
    custom?: (authStatus: ReturnType<typeof useAuthStatus>) => boolean
  }
  /** Fallback component */
  fallback?: React.ReactNode
  /** Show loading during auth check */
  showLoading?: boolean
}

/**
 * Flexible access control component with multiple access patterns
 */
export function AccessControl({
  children,
  access,
  fallback = null,
  showLoading = false
}: AccessControlProps) {
  const authStatus = useAuthStatus()

  // Show loading if requested and auth is still initializing
  if (showLoading && !authStatus.isReady) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  const hasAccess = checkAccess()

  return hasAccess ? <>{children}</> : <>{fallback}</>

  function checkAccess(): boolean {
    // Public access - always allow
    if (access.public) {
      return true
    }

    // Custom access check
    if (access.custom) {
      return access.custom(authStatus)
    }

    // Specific role checks
    if (access.mentor) {
      return authStatus.canAccessMentoring
    }

    if (access.insider) {
      return authStatus.canAccessInsiderFeatures
    }

    // Basic authentication check
    if (access.authenticated) {
      return authStatus.isAuthenticated
    }

    // Default to public access if no restrictions specified
    return true
  }
}