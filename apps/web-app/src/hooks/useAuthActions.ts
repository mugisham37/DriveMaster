'use client'

/**
 * Authentication Actions Hook
 * 
 * Implements:
 * - Login action with credential validation and token storage
 * - Register action with form validation and success handling
 * - Logout action with complete state cleanup
 * - OAuth actions for all provider flows
 * - Requirements: 1.1, 1.2, 1.3, 5.1, 5.2
 */

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { authClient, oauthClient } from '@/lib/auth/api-client'
import { 
  useStableAuthCallback
} from '@/lib/auth/performance-optimization'
import type { 
  LoginCredentials, 
  RegisterData, 
  OAuthProviderType,
  AuthError,
  ValidationError
} from '@/types/auth-service'

// ============================================================================
// Validation Utilities
// ============================================================================

interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Validate login credentials
 */
function validateLoginCredentials(credentials: LoginCredentials): ValidationResult {
  const errors: Record<string, string> = {}
  
  // Email validation
  if (!credentials.email) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
    errors.email = 'Please enter a valid email address'
  }
  
  // Password validation
  if (!credentials.password) {
    errors.password = 'Password is required'
  } else if (credentials.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate registration data
 */
function validateRegistrationData(userData: RegisterData): ValidationResult {
  const errors: Record<string, string> = {}
  
  // Email validation
  if (!userData.email) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.email = 'Please enter a valid email address'
  }
  
  // Password validation
  if (!userData.password) {
    errors.password = 'Password is required'
  } else {
    if (userData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
  }
  
  // Country code validation
  if (!userData.countryCode) {
    errors.countryCode = 'Country is required'
  } else if (!/^[A-Z]{2}$/.test(userData.countryCode)) {
    errors.countryCode = 'Please select a valid country'
  }
  
  // Optional timezone validation
  if (userData.timezone && !Intl.supportedValuesOf('timeZone').includes(userData.timezone)) {
    errors.timezone = 'Invalid timezone'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export interface UseAuthActionsReturn {
  // Login actions
  login: (credentials: LoginCredentials, options?: LoginOptions) => Promise<void>
  validateAndLogin: (credentials: LoginCredentials, options?: LoginOptions) => Promise<void>
  
  // Registration actions
  register: (userData: RegisterData, options?: RegisterOptions) => Promise<void>
  validateAndRegister: (userData: RegisterData, options?: RegisterOptions) => Promise<void>
  
  // Logout actions
  logout: (options?: LogoutOptions) => Promise<void>
  logoutAllSessions: () => Promise<void>
  
  // OAuth actions
  initiateOAuth: (provider: OAuthProviderType, options?: OAuthOptions) => Promise<void>
  handleOAuthCallback: (provider: OAuthProviderType, code: string, state: string) => Promise<void>
  linkOAuthProvider: (provider: OAuthProviderType, code: string, state: string) => Promise<void>
  unlinkOAuthProvider: (provider: OAuthProviderType) => Promise<void>
  
  // Utility actions
  refreshSession: () => Promise<void>
  validateCredentials: (credentials: LoginCredentials) => ValidationResult
  validateRegistrationData: (userData: RegisterData) => ValidationResult
  
  // Error handling
  handleAuthError: (error: unknown) => AuthError
  isRecoverableError: (error: AuthError) => boolean
}

export interface LoginOptions {
  redirectTo?: string
  rememberMe?: boolean
  skipValidation?: boolean
}

export interface RegisterOptions {
  redirectTo?: string
  autoLogin?: boolean
  skipValidation?: boolean
}

export interface LogoutOptions {
  redirectTo?: string
  clearAllTabs?: boolean
}

export interface OAuthOptions {
  redirectUrl?: string
  linkAccount?: boolean
  state?: string
}

export function useAuthActions(): UseAuthActionsReturn {
  const auth = useAuth()
  const router = useRouter()
  
  // ============================================================================
  // Login Actions
  // ============================================================================
  
  const login = useStableAuthCallback(async (credentials: LoginCredentials, options: LoginOptions = {}) => {
    try {
      await auth.login(credentials)
      
      // Handle successful login
      const redirectTo = options.redirectTo ?? '/dashboard'
      router.push(redirectTo)
      
    } catch (error) {
      // Error is already handled by the auth context
      throw error
    }
  }, [auth, router])
  
  const validateAndLogin = useStableAuthCallback(async (credentials: LoginCredentials, options: LoginOptions = {}) => {
    // Skip validation if explicitly requested
    if (!options.skipValidation) {
      const validation = validateLoginCredentials(credentials)
      
      if (!validation.isValid) {
        const firstField = Object.keys(validation.errors)[0]
        const validationError: ValidationError = {
          type: 'validation',
          message: 'Please correct the following errors',
          field: firstField || 'credentials',
          constraints: Object.values(validation.errors),
          recoverable: true
        }
        throw validationError
      }
    }
    
    return login(credentials, options)
  }, [login])
  
  // ============================================================================
  // Registration Actions
  // ============================================================================
  
  const register = useStableAuthCallback(async (userData: RegisterData, options: RegisterOptions = {}) => {
    try {
      await auth.register(userData)
      
      // Handle successful registration
      const redirectTo = options.redirectTo ?? '/dashboard'
      router.push(redirectTo)
      
    } catch (error) {
      // Error is already handled by the auth context
      throw error
    }
  }, [auth, router])
  
  const validateAndRegister = useStableAuthCallback(async (userData: RegisterData, options: RegisterOptions = {}) => {
    // Skip validation if explicitly requested
    if (!options.skipValidation) {
      const validation = validateRegistrationData(userData)
      
      if (!validation.isValid) {
        const firstField = Object.keys(validation.errors)[0]
        const validationError: ValidationError = {
          type: 'validation',
          message: 'Please correct the following errors',
          field: firstField || 'userData',
          constraints: Object.values(validation.errors),
          recoverable: true
        }
        throw validationError
      }
    }
    
    return register(userData, options)
  }, [register])
  
  // ============================================================================
  // Logout Actions
  // ============================================================================
  
  const logout = useStableAuthCallback(async (options: LogoutOptions = {}) => {
    try {
      await auth.logout()
      
      // Handle successful logout
      const redirectTo = options.redirectTo ?? '/auth/signin'
      router.push(redirectTo)
      
    } catch (error) {
      // Even if logout fails, redirect to signin
      const redirectTo = options.redirectTo ?? '/auth/signin'
      router.push(redirectTo)
      throw error
    }
  }, [auth, router])
  
  const logoutAllSessions = useStableAuthCallback(async () => {
    try {
      // Get all sessions and invalidate them
      const sessionsResponse = await authClient.getSessions()
      
      if (sessionsResponse && typeof sessionsResponse === 'object' && 'sessions' in sessionsResponse) {
        const sessions = sessionsResponse.sessions as Array<{ id: string; isCurrent: boolean }>
        
        // Invalidate all sessions except current
        const invalidationPromises = sessions
          .filter((session) => !session.isCurrent)
          .map((session) => authClient.invalidateSession(session.id))
        
        await Promise.allSettled(invalidationPromises)
      }
      
      // Then logout current session
      await logout()
      
    } catch (error) {
      // Fallback to regular logout
      await logout()
      throw error
    }
  }, [logout])
  
  // ============================================================================
  // Error Handling
  // ============================================================================
  
  const handleAuthError = useStableAuthCallback((error: unknown): AuthError => {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as AuthError
    }
    
    if (error instanceof Error) {
      // Try to classify the error based on message
      const message = error.message.toLowerCase()
      
      if (message.includes('network') || message.includes('fetch')) {
        return {
          type: 'network',
          message: 'Network error. Please check your connection and try again.',
          recoverable: true,
          retryAfter: 5
        }
      }
      
      if (message.includes('validation') || message.includes('invalid')) {
        return {
          type: 'validation',
          message: error.message,
          recoverable: true
        }
      }
      
      if (message.includes('unauthorized') || message.includes('credentials')) {
        return {
          type: 'authentication',
          message: 'Invalid credentials. Please check your email and password.',
          recoverable: true
        }
      }
      
      if (message.includes('forbidden') || message.includes('permission')) {
        return {
          type: 'authorization',
          message: 'You do not have permission to perform this action.',
          recoverable: false
        }
      }
      
      return {
        type: 'server',
        message: error.message,
        recoverable: true
      }
    }
    
    return {
      type: 'server',
      message: 'An unexpected error occurred. Please try again.',
      recoverable: true
    }
  }, [])
  
  const isRecoverableError = useStableAuthCallback((error: AuthError): boolean => {
    return error.recoverable
  }, [])
  
  // ============================================================================
  // OAuth Actions
  // ============================================================================
  
  const initiateOAuth = useStableAuthCallback(async (provider: OAuthProviderType, options: OAuthOptions = {}) => {
    try {
      await auth.initiateOAuth(provider, options.redirectUrl)
    } catch (error) {
      throw error
    }
  }, [auth])
  
  const handleOAuthCallback = useStableAuthCallback(async (provider: OAuthProviderType, code: string, state: string) => {
    try {
      const response = await oauthClient.handleCallback(provider, code, state)
      
      if (response && typeof response === 'object' && 'user' in response) {
        const { user } = response
        
        // Store tokens and update auth state
        await auth.login({ email: user.email, password: '' }) // This will be handled by the OAuth flow
        
        // Redirect to dashboard or intended destination
        const redirectTo = sessionStorage.getItem('oauth_redirect_url') || '/dashboard'
        sessionStorage.removeItem('oauth_redirect_url')
        router.push(redirectTo)
      } else {
        throw new Error('OAuth callback failed')
      }
    } catch (error) {
      const authError = handleAuthError(error)
      auth.clearError('oauthError')
      throw authError
    }
  }, [auth, router, handleAuthError])
  
  const linkOAuthProvider = useStableAuthCallback(async (provider: OAuthProviderType, code: string, state: string) => {
    try {
      await oauthClient.linkProvider(provider, code, state)
      
      // Refresh user profile to get updated linked providers
      await auth.fetchProfile()
    } catch (error) {
      throw handleAuthError(error)
    }
  }, [auth, handleAuthError])
  
  const unlinkOAuthProvider = useStableAuthCallback(async (provider: OAuthProviderType) => {
    try {
      await oauthClient.unlinkProvider(provider)
      
      // Refresh user profile to get updated linked providers
      await auth.fetchProfile()
    } catch (error) {
      throw handleAuthError(error)
    }
  }, [auth, handleAuthError])
  
  // ============================================================================
  // Utility Actions
  // ============================================================================
  
  const refreshSession = useStableAuthCallback(async () => {
    try {
      await auth.refreshSession()
    } catch (error) {
      throw error
    }
  }, [auth])
  
  const validateCredentials = useStableAuthCallback((credentials: LoginCredentials): ValidationResult => {
    return validateLoginCredentials(credentials)
  }, [])
  
  const validateRegistrationDataCallback = useStableAuthCallback((userData: RegisterData): ValidationResult => {
    return validateRegistrationData(userData)
  }, [])
  
  // ============================================================================
  // Return Hook Interface (Memoized for Performance)
  // ============================================================================
  
  return useMemo(() => ({
    // Login actions
    login,
    validateAndLogin,
    
    // Registration actions
    register,
    validateAndRegister,
    
    // Logout actions
    logout,
    logoutAllSessions,
    
    // OAuth actions
    initiateOAuth,
    handleOAuthCallback,
    linkOAuthProvider,
    unlinkOAuthProvider,
    
    // Utility actions
    refreshSession,
    validateCredentials,
    validateRegistrationData: validateRegistrationDataCallback,
    
    // Error handling
    handleAuthError,
    isRecoverableError
  }), [
    login,
    validateAndLogin,
    register,
    validateAndRegister,
    logout,
    logoutAllSessions,
    initiateOAuth,
    handleOAuthCallback,
    linkOAuthProvider,
    unlinkOAuthProvider,
    refreshSession,
    validateCredentials,
    validateRegistrationDataCallback,
    handleAuthError,
    isRecoverableError
  ])
}

// ============================================================================
// Higher-Order Component for Auth Actions
// ============================================================================

export interface WithAuthActionsProps {
  authActions: UseAuthActionsReturn
}

export function withAuthActions<P extends WithAuthActionsProps>(
  Component: React.ComponentType<P>
): React.ComponentType<Omit<P, 'authActions'>> {
  const WithAuthActionsComponent: React.FC<Omit<P, 'authActions'>> = (props) => {
    const authActions = useAuthActions()
    
    return React.createElement(Component, { ...props, authActions } as P)
  }
  
  WithAuthActionsComponent.displayName = `withAuthActions(${Component.displayName || Component.name})`
  
  return WithAuthActionsComponent
}