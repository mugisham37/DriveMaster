'use client'

/**
 * Route Guard Usage Examples
 * 
 * This file demonstrates how to use the new route guard components
 * and hooks in various scenarios.
 */

import React from 'react'
import { 
  RouteGuard, 
  AuthenticatedOnly, 
  MentorOnly, 
  InsiderOnly,
  RoleBasedAccess,
  MentorContent,
  InsiderContent,
  NavigationItem
} from '@/components/auth'
import { 
  useRequireAuth, 
  useRequireMentor, 
  useRequireInsider,
  useAuthStatus,
  usePermissions
} from '@/hooks'

// ============================================================================
// Basic Route Protection Examples
// ============================================================================

/**
 * Example: Basic authenticated route
 */
export function AuthenticatedPage() {
  return (
    <AuthenticatedOnly>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p>This content is only visible to authenticated users.</p>
      </div>
    </AuthenticatedOnly>
  )
}

/**
 * Example: Mentor-only route
 */
export function MentorPage() {
  return (
    <MentorOnly>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Mentor Dashboard</h1>
        <p>This content is only visible to mentors.</p>
      </div>
    </MentorOnly>
  )
}

/**
 * Example: Insider-only route
 */
export function InsiderPage() {
  return (
    <InsiderOnly>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Insider Features</h1>
        <p>This content is only visible to Exercism Insiders.</p>
      </div>
    </InsiderOnly>
  )
}

// ============================================================================
// Advanced Route Protection Examples
// ============================================================================

/**
 * Example: Custom route guard with fallback
 */
export function CustomProtectedPage() {
  const CustomFallback = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Access Required</h2>
        <p className="text-gray-600 mb-4">You need special permissions to view this page.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Request Access
        </button>
      </div>
    </div>
  )

  return (
    <RouteGuard 
      requireAuth={true}
      requireMentor={true}
      fallback={CustomFallback}
      preserveCallback={true}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Advanced Mentor Tools</h1>
        <p>This page has custom access control logic.</p>
      </div>
    </RouteGuard>
  )
}

// ============================================================================
// Hook Usage Examples
// ============================================================================

/**
 * Example: Using authentication hooks
 */
export function HookExamplePage() {
  // Basic auth requirement with redirect
  const auth = useRequireAuth({
    redirectTo: '/auth/signin',
    preserveCallback: true
  })

  // Show loading state during redirect
  if (auth.isRedirecting) {
    return <div>Redirecting to sign in...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome, {auth.user?.handle}!</h1>
      <p>This page uses the useRequireAuth hook.</p>
    </div>
  )
}

/**
 * Example: Using mentor requirement hook
 */
export function MentorHookExamplePage() {
  const auth = useRequireMentor({
    mentorRedirectTo: '/dashboard?error=mentor-required'
  })

  if (auth.isRedirecting || auth.isMentorRedirecting) {
    return <div>Checking permissions...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Mentor Dashboard</h1>
      <p>Welcome, Mentor {auth.user?.handle}!</p>
    </div>
  )
}

/**
 * Example: Using auth status without redirects
 */
export function ConditionalContentPage() {
  const authStatus = useAuthStatus()

  if (!authStatus.isReady) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Mixed Content Page</h1>
      
      {authStatus.isAuthenticated ? (
        <div className="mb-4">
          <p>Welcome back, {authStatus.user?.handle}!</p>
          
          {authStatus.canAccessMentoring && (
            <p className="text-green-600">You have mentor privileges.</p>
          )}
          
          {authStatus.canAccessInsiderFeatures && (
            <p className="text-purple-600">You have insider access.</p>
          )}
        </div>
      ) : (
        <div className="mb-4">
          <p>Please sign in to access personalized features.</p>
        </div>
      )}
      
      <p>This content is visible to everyone.</p>
    </div>
  )
}

// ============================================================================
// Role-Based Content Examples
// ============================================================================

/**
 * Example: Mixed content with role-based sections
 */
export function MixedContentPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Community Page</h1>
      
      {/* Public content */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Public Discussions</h2>
        <p>This content is visible to everyone.</p>
      </section>
      
      {/* Authenticated content */}
      <RoleBasedAccess requireAuthentication={true}>
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Member Discussions</h2>
          <p>This content is only visible to authenticated users.</p>
        </section>
      </RoleBasedAccess>
      
      {/* Mentor content */}
      <MentorContent>
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Mentor Tools</h2>
          <p>This section is only visible to mentors.</p>
        </section>
      </MentorContent>
      
      {/* Insider content */}
      <InsiderContent>
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Insider Features</h2>
          <p>This section is only visible to insiders.</p>
        </section>
      </InsiderContent>
    </div>
  )
}

// ============================================================================
// Navigation Examples
// ============================================================================

/**
 * Example: Role-based navigation menu
 */
export function NavigationExample() {
  const permissions = usePermissions()

  const navigationItems = [
    { label: 'Home', href: '/', public: true },
    { label: 'Dashboard', href: '/dashboard', requireAuth: true },
    { label: 'Mentoring', href: '/mentoring', requireMentor: true },
    { label: 'Insider Features', href: '/insiders', requireInsider: true },
  ]

  return (
    <nav className="bg-gray-800 text-white p-4">
      <ul className="flex space-x-4">
        {navigationItems.map((item) => (
          <NavigationItem
            key={item.href}
            requireAuth={item.requireAuth}
            requireMentor={item.requireMentor}
            requireInsider={item.requireInsider}
            hideWhenUnavailable={true}
          >
            <li>
              <a 
                href={item.href}
                className="hover:text-blue-300 transition-colors"
              >
                {item.label}
              </a>
            </li>
          </NavigationItem>
        ))}
      </ul>
      
      {/* User status indicator */}
      <div className="mt-2 text-sm text-gray-300">
        {permissions.isAuthenticated ? (
          <span>
            Signed in
            {permissions.isMentor && ' • Mentor'}
            {permissions.isInsider && ' • Insider'}
          </span>
        ) : (
          <span>Not signed in</span>
        )}
      </div>
    </nav>
  )
}

// ============================================================================
// Error Handling Examples
// ============================================================================

/**
 * Example: Custom error handling
 */
export function ErrorHandlingExample() {
  const auth = useRequireAuth()

  // Handle authentication errors
  if (auth.state.error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded">
        <h2 className="text-red-800 font-semibold mb-2">Authentication Error</h2>
        <p className="text-red-600 mb-4">{auth.state.error.message}</p>
        
        {auth.state.error.recoverable && (
          <button 
            onClick={() => auth.clearError()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Protected Content</h1>
      <p>This page demonstrates error handling.</p>
    </div>
  )
}