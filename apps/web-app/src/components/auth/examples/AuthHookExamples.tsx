'use client'

/**
 * Authentication Hook Usage Examples
 * 
 * This file demonstrates how to use the new authentication hooks
 * for different component scenarios.
 */

import React from 'react'
import { 
  useAuth, 
  useRequireAuth, 
  useRequireMentor, 
  useRequireInsider,
  useAuthActions,
  useAuthStatus,
  useAuthRedirect,
  withRequireAuth,
  withRequireMentor,
  withRequireInsider
} from '@/hooks/useAuth'

// ============================================================================
// Basic Authentication Hook Usage
// ============================================================================

/**
 * Example: Basic authentication state access
 */
export function BasicAuthExample() {
  const auth = useAuth()

  if (!auth.isInitialized) {
    return <div>Initializing authentication...</div>
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Authentication Status</h3>
      <div className="space-y-2">
        <p>Authenticated: {auth.isAuthenticated ? 'Yes' : 'No'}</p>
        <p>Loading: {auth.isLoading ? 'Yes' : 'No'}</p>
        {auth.user && (
          <div>
            <p>User: {auth.user.handle}</p>
            <p>Email: {auth.user.email}</p>
            <p>Mentor: {auth.isMentor ? 'Yes' : 'No'}</p>
            <p>Insider: {auth.isInsider ? 'Yes' : 'No'}</p>
          </div>
        )}
        {auth.state.error && (
          <p className="text-red-600">Error: {auth.state.error.message}</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Authentication Requirement Hook Usage
// ============================================================================

/**
 * Example: Component that requires authentication
 */
export function RequireAuthExample() {
  const { shouldRender, isRedirecting } = useRequireAuth({
    redirectTo: '/auth/signin',
    preserveCallback: true
  })

  if (isRedirecting) {
    return <div>Redirecting to sign in...</div>
  }

  if (!shouldRender) {
    return null
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Protected Content</h3>
      <p>This content is only visible to authenticated users.</p>
    </div>
  )
}

// ============================================================================
// Mentor Requirement Hook Usage
// ============================================================================

/**
 * Example: Component that requires mentor privileges
 */
export function RequireMentorExample() {
  const { shouldRender, isRedirecting, isMentorRedirecting } = useRequireMentor({
    redirectTo: '/auth/signin',
    mentorRedirectTo: '/dashboard?error=mentor-required',
    preserveCallback: true
  })

  if (isRedirecting) {
    return <div>Redirecting to sign in...</div>
  }

  if (isMentorRedirecting) {
    return <div>Redirecting to dashboard...</div>
  }

  if (!shouldRender) {
    return null
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Mentor Dashboard</h3>
      <p>This content is only visible to mentors.</p>
    </div>
  )
}

// ============================================================================
// Insider Requirement Hook Usage
// ============================================================================

/**
 * Example: Component that requires insider privileges
 */
export function RequireInsiderExample() {
  const { shouldRender, isRedirecting, isInsiderRedirecting } = useRequireInsider({
    redirectTo: '/auth/signin',
    insiderRedirectTo: '/insiders?error=insider-required',
    preserveCallback: true
  })

  if (isRedirecting) {
    return <div>Redirecting to sign in...</div>
  }

  if (isInsiderRedirecting) {
    return <div>Redirecting to insiders page...</div>
  }

  if (!shouldRender) {
    return null
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Insider Features</h3>
      <p>This content is only visible to insiders.</p>
    </div>
  )
}

// ============================================================================
// Authentication Actions Hook Usage
// ============================================================================

/**
 * Example: Component using authentication actions
 */
export function AuthActionsExample() {
  const authActions = useAuthActions()
  const [isLoggingIn, setIsLoggingIn] = React.useState(false)

  const handleLogin = async () => {
    setIsLoggingIn(true)
    try {
      await authActions.validateAndLogin({
        email: 'user@example.com',
        password: 'password123'
      }, {
        redirectTo: '/dashboard'
      })
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authActions.logout({
        redirectTo: '/auth/signin'
      })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      await authActions.initiateOAuth(provider, {
        redirectUrl: '/dashboard'
      })
    } catch (error) {
      console.error('OAuth login failed:', error)
    }
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Authentication Actions</h3>
      <div className="space-y-2">
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isLoggingIn ? 'Logging in...' : 'Login'}
        </button>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Logout
        </button>
        <button
          onClick={() => handleOAuthLogin('google')}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Login with Google
        </button>
        <button
          onClick={() => handleOAuthLogin('github')}
          className="px-4 py-2 bg-gray-800 text-white rounded"
        >
          Login with GitHub
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Authentication Status Hook Usage
// ============================================================================

/**
 * Example: Component using authentication status without redirects
 */
export function AuthStatusExample() {
  const status = useAuthStatus()

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Authentication Status</h3>
      <div className="space-y-2">
        <p>Ready: {status.isReady ? 'Yes' : 'No'}</p>
        <p>Authenticated: {status.isAuthenticated ? 'Yes' : 'No'}</p>
        <p>Can Access Mentoring: {status.canAccessMentoring ? 'Yes' : 'No'}</p>
        <p>Can Access Insider Features: {status.canAccessInsiderFeatures ? 'Yes' : 'No'}</p>
        <p>Has Mentor Role: {status.hasRole('mentor') ? 'Yes' : 'No'}</p>
        <p>Has Insider Role: {status.hasRole('insider') ? 'Yes' : 'No'}</p>
        <p>Has User Role: {status.hasRole('user') ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Authentication Redirect Hook Usage
// ============================================================================

/**
 * Example: Component using manual authentication redirects
 */
export function AuthRedirectExample() {
  const { redirectToLogin, redirectToDashboard, redirectToInsiders } = useAuthRedirect()

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Manual Redirects</h3>
      <div className="space-y-2">
        <button
          onClick={() => redirectToLogin()}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Redirect to Login
        </button>
        <button
          onClick={() => redirectToDashboard()}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Redirect to Dashboard
        </button>
        <button
          onClick={() => redirectToInsiders()}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Redirect to Insiders
        </button>
        <button
          onClick={() => redirectToDashboard('access-denied')}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Redirect with Error
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Higher-Order Component Examples
// ============================================================================

/**
 * Example: Component using withRequireAuth HOC
 */
const ProtectedComponent: React.FC = () => (
  <div className="p-4 border rounded">
    <h3 className="text-lg font-semibold mb-2">HOC Protected Component</h3>
    <p>This component is wrapped with withRequireAuth HOC.</p>
  </div>
)

export const ProtectedWithAuth = withRequireAuth(ProtectedComponent, {
  redirectTo: '/auth/signin',
  preserveCallback: true
})

/**
 * Example: Component using withRequireMentor HOC
 */
const MentorComponent: React.FC = () => (
  <div className="p-4 border rounded">
    <h3 className="text-lg font-semibold mb-2">HOC Mentor Component</h3>
    <p>This component is wrapped with withRequireMentor HOC.</p>
  </div>
)

export const MentorWithAuth = withRequireMentor(MentorComponent, {
  redirectTo: '/auth/signin',
  mentorRedirectTo: '/dashboard?error=mentor-required',
  preserveCallback: true
})

/**
 * Example: Component using withRequireInsider HOC
 */
const InsiderComponent: React.FC = () => (
  <div className="p-4 border rounded">
    <h3 className="text-lg font-semibold mb-2">HOC Insider Component</h3>
    <p>This component is wrapped with withRequireInsider HOC.</p>
  </div>
)

export const InsiderWithAuth = withRequireInsider(InsiderComponent, {
  redirectTo: '/auth/signin',
  insiderRedirectTo: '/insiders?error=insider-required',
  preserveCallback: true
})

// ============================================================================
// Combined Examples Page
// ============================================================================

/**
 * Main examples page showing all authentication hook usage patterns
 */
export function AuthHookExamplesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Authentication Hook Examples</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BasicAuthExample />
        <RequireAuthExample />
        <RequireMentorExample />
        <RequireInsiderExample />
        <AuthActionsExample />
        <AuthStatusExample />
        <AuthRedirectExample />
        <ProtectedWithAuth />
        <MentorWithAuth />
        <InsiderWithAuth />
      </div>
    </div>
  )
}