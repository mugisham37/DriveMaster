'use client'

/**
 * Role-Based Access Control Components
 * 
 * Implements:
 * - Mentor privilege checking with dashboard redirect for non-mentors
 * - Insider privilege checking with appropriate access control
 * - Permission-based component rendering
 * - Role-based navigation menu filtering
 * - Requirements: 4.4, 9.2
 */

import React, { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// ============================================================================
// Types
// ============================================================================

export interface RoleBasedAccessProps {
  children: ReactNode
  requireMentor?: boolean
  requireInsider?: boolean
  requireAuthentication?: boolean
  fallback?: ReactNode
  showFallback?: boolean
}

export interface ConditionalRenderProps {
  children: ReactNode
  condition: boolean
  fallback?: ReactNode
}

export interface NavigationItemProps {
  children: ReactNode
  requireAuth?: boolean
  requireMentor?: boolean
  requireInsider?: boolean
  hideWhenUnavailable?: boolean
}

// ============================================================================
// Core Role-Based Access Component
// ============================================================================

export function RoleBasedAccess({
  children,
  requireMentor = false,
  requireInsider = false,
  requireAuthentication = false,
  fallback = null,
  showFallback = true
}: RoleBasedAccessProps) {
  const auth = useAuth()

  // Don't render anything during initialization
  if (!auth.isInitialized) {
    return null
  }

  // Check authentication requirement
  if (requireAuthentication && !auth.isAuthenticated) {
    return showFallback ? <>{fallback}</> : null
  }

  // Check mentor requirement
  if (requireMentor && (!auth.isAuthenticated || !auth.isMentor)) {
    return showFallback ? <>{fallback}</> : null
  }

  // Check insider requirement
  if (requireInsider && (!auth.isAuthenticated || !auth.isInsider)) {
    return showFallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}

// ============================================================================
// Convenience Components for Specific Roles
// ============================================================================

/**
 * Only renders content for authenticated users
 */
export function AuthenticatedContent({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <RoleBasedAccess requireAuthentication={true} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  )
}

/**
 * Only renders content for unauthenticated users
 */
export function UnauthenticatedContent({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  const auth = useAuth()

  if (!auth.isInitialized) {
    return null
  }

  if (auth.isAuthenticated) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Only renders content for mentors
 */
export function MentorContent({ 
  children, 
  fallback = null,
  showFallback = true 
}: { 
  children: ReactNode
  fallback?: ReactNode
  showFallback?: boolean 
}) {
  return (
    <RoleBasedAccess 
      requireMentor={true} 
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </RoleBasedAccess>
  )
}

/**
 * Only renders content for insiders
 */
export function InsiderContent({ 
  children, 
  fallback = null,
  showFallback = true 
}: { 
  children: ReactNode
  fallback?: ReactNode
  showFallback?: boolean 
}) {
  return (
    <RoleBasedAccess 
      requireInsider={true} 
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </RoleBasedAccess>
  )
}

/**
 * Only renders content for non-mentors (regular users)
 */
export function NonMentorContent({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  const auth = useAuth()

  if (!auth.isInitialized) {
    return null
  }

  if (auth.isAuthenticated && auth.isMentor) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Only renders content for non-insiders (regular users)
 */
export function NonInsiderContent({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  const auth = useAuth()

  if (!auth.isInitialized) {
    return null
  }

  if (auth.isAuthenticated && auth.isInsider) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// ============================================================================
// Navigation-Specific Components
// ============================================================================

/**
 * Navigation item that respects role-based access control
 * Useful for filtering navigation menus based on user roles
 */
export function NavigationItem({
  children,
  requireAuth = false,
  requireMentor = false,
  requireInsider = false,
  hideWhenUnavailable = true
}: NavigationItemProps) {
  const auth = useAuth()

  // Don't render during initialization
  if (!auth.isInitialized) {
    return null
  }

  // Check access requirements
  const hasAccess = checkNavigationAccess()

  if (!hasAccess && hideWhenUnavailable) {
    return null
  }

  // If access is denied but we don't hide, render as disabled
  if (!hasAccess) {
    return (
      <div className="opacity-50 cursor-not-allowed" title="Not available">
        {children}
      </div>
    )
  }

  return <>{children}</>

  function checkNavigationAccess(): boolean {
    if (requireAuth && !auth.isAuthenticated) {
      return false
    }

    if (requireMentor && (!auth.isAuthenticated || !auth.isMentor)) {
      return false
    }

    if (requireInsider && (!auth.isAuthenticated || !auth.isInsider)) {
      return false
    }

    return true
  }
}

/**
 * Conditional render component for complex access logic
 */
export function ConditionalRender({
  children,
  condition,
  fallback = null
}: ConditionalRenderProps) {
  return condition ? <>{children}</> : <>{fallback}</>
}

// ============================================================================
// Permission-Based Component Rendering
// ============================================================================

/**
 * Higher-order component for permission-based rendering
 */
export function withRoleBasedAccess<P extends object>(
  Component: React.ComponentType<P>,
  accessConfig: {
    requireAuth?: boolean
    requireMentor?: boolean
    requireInsider?: boolean
    fallback?: React.ComponentType<P>
  }
) {
  const WrappedComponent: React.FC<P> = (props) => {
    const auth = useAuth()

    if (!auth.isInitialized) {
      return null
    }

    const hasAccess = checkAccess()

    if (!hasAccess) {
      if (accessConfig.fallback) {
        const FallbackComponent = accessConfig.fallback
        return <FallbackComponent {...props} />
      }
      return null
    }

    return <Component {...props} />

    function checkAccess(): boolean {
      if (accessConfig.requireAuth && !auth.isAuthenticated) {
        return false
      }

      if (accessConfig.requireMentor && (!auth.isAuthenticated || !auth.isMentor)) {
        return false
      }

      if (accessConfig.requireInsider && (!auth.isAuthenticated || !auth.isInsider)) {
        return false
      }

      return true
    }
  }

  WrappedComponent.displayName = `withRoleBasedAccess(${Component.displayName || Component.name})`

  return WrappedComponent
}

// ============================================================================
// Utility Functions for Role Checking
// ============================================================================

/**
 * Hook for checking user permissions
 */
export function usePermissions() {
  const auth = useAuth()

  return {
    isAuthenticated: auth.isAuthenticated,
    isMentor: auth.isMentor,
    isInsider: auth.isInsider,
    isInitialized: auth.isInitialized,
    
    // Permission checking functions
    canAccessMentoring: () => auth.isAuthenticated && auth.isMentor,
    canAccessInsiderFeatures: () => auth.isAuthenticated && auth.isInsider,
    canAccessDashboard: () => auth.isAuthenticated,
    canAccessPublicContent: () => true,
    
    // Role checking functions
    hasRole: (role: 'mentor' | 'insider' | 'user') => {
      switch (role) {
        case 'mentor':
          return auth.isAuthenticated && auth.isMentor
        case 'insider':
          return auth.isAuthenticated && auth.isInsider
        case 'user':
          return auth.isAuthenticated
        default:
          return false
      }
    },
    
    // Multiple role checking
    hasAnyRole: (roles: Array<'mentor' | 'insider' | 'user'>) => {
      return roles.some(role => {
        switch (role) {
          case 'mentor':
            return auth.isAuthenticated && auth.isMentor
          case 'insider':
            return auth.isAuthenticated && auth.isInsider
          case 'user':
            return auth.isAuthenticated
          default:
            return false
        }
      })
    },
    
    hasAllRoles: (roles: Array<'mentor' | 'insider' | 'user'>) => {
      return roles.every(role => {
        switch (role) {
          case 'mentor':
            return auth.isAuthenticated && auth.isMentor
          case 'insider':
            return auth.isAuthenticated && auth.isInsider
          case 'user':
            return auth.isAuthenticated
          default:
            return false
        }
      })
    }
  }
}

// ============================================================================
// Navigation Menu Filtering Utilities
// ============================================================================

export interface NavigationMenuItem {
  id: string
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  requireAuth?: boolean
  requireMentor?: boolean
  requireInsider?: boolean
  children?: NavigationMenuItem[]
}

/**
 * Filter navigation menu items based on user permissions
 */
export function filterNavigationItems(
  items: NavigationMenuItem[],
  permissions: ReturnType<typeof usePermissions>
): NavigationMenuItem[] {
  return items.filter(item => {
    // Check access requirements
    if (item.requireAuth && !permissions.isAuthenticated) {
      return false
    }

    if (item.requireMentor && !permissions.canAccessMentoring()) {
      return false
    }

    if (item.requireInsider && !permissions.canAccessInsiderFeatures()) {
      return false
    }

    // Recursively filter children
    if (item.children) {
      const filteredChildren = filterNavigationItems(item.children, permissions)
      return {
        ...item,
        children: filteredChildren
      }
    }

    return true
  })
}

/**
 * Hook for filtered navigation items
 */
export function useFilteredNavigation(items: NavigationMenuItem[]) {
  const permissions = usePermissions()
  
  if (!permissions.isInitialized) {
    return []
  }
  
  return filterNavigationItems(items, permissions)
}