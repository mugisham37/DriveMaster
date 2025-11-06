'use client'

/**
 * Authentication Context with Comprehensive State Management
 * 
 * Implements:
 * - Authentication reducer with explicit state transitions
 * - Loading states for all authentication operations
 * - Error states with proper error classification and recovery
 * - User profile state with preferences and track information
 * - Requirements: 1.1, 1.4, 7.1, 7.2, 7.3
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo } from 'react'
import { integratedTokenManager } from '@/lib/auth/token-manager'
import { authClient } from '@/lib/auth/api-client'
import { AuthErrorHandler } from '@/lib/auth/error-handler'

import { authResilience, initializeAuthResilience } from '@/lib/auth/resilience-integration'
import { 
  optimizedAuthOps, 
  useStableAuthCallback 
} from '@/lib/auth/performance-optimization'
import type { 
  UserProfile, 
  TokenPair, 
  AuthError,
  LoginCredentials,
  RegisterData,
  OAuthProviderType
} from '@/types/auth-service'
import { 
  isValidationError,
  isNetworkError,
  isAuthenticationError,
  isAuthorizationError,
  isOAuthError,
  isServerError
} from '@/types/auth-service'

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Type-safe conversion of UserProfile to Record<string, unknown>
 * This is needed for the token manager which expects a generic record
 */
function userProfileToRecord(user: UserProfile): Record<string, unknown> {
  return {
    id: user.id,
    handle: user.handle,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    reputation: user.reputation,
    flair: user.flair,
    isMentor: user.isMentor,
    isInsider: user.isInsider,
    seniority: user.seniority,
    totalDonatedInDollars: user.totalDonatedInDollars,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    preferences: user.preferences,
    tracks: user.tracks
  }
}

/**
 * Type-safe error handler with discriminated union support
 * Provides better error classification and handling
 */
function handleAuthError(error: unknown, context: string): AuthError {
  // If it's already an AuthError, return it
  if (error && typeof error === 'object' && 'type' in error) {
    return error as AuthError
  }

  // Process through AuthErrorHandler for proper classification
  return AuthErrorHandler.processError(error, context)
}

/**
 * Type-safe error classification helper
 * Uses discriminated unions for better type safety
 */
function classifyAuthError(error: AuthError): {
  isRecoverable: boolean
  shouldRetry: boolean
  shouldLogout: boolean
  userMessage: string
} {
  let isRecoverable = error.recoverable
  let shouldRetry = false
  let shouldLogout = false
  let userMessage = error.message

  if (isNetworkError(error)) {
    shouldRetry = true
    userMessage = 'Network connection issue. Please check your internet connection and try again.'
  } else if (isValidationError(error)) {
    // Validation errors are not recoverable through retry
    isRecoverable = false
    userMessage = `Please check your ${error.field}: ${error.message}`
  } else if (isAuthenticationError(error)) {
    shouldLogout = ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'SESSION_EXPIRED'].includes(error.code)
    if (shouldLogout) {
      userMessage = 'Your session has expired. Please sign in again.'
    }
  } else if (isAuthorizationError(error)) {
    userMessage = 'You do not have permission to perform this action.'
  } else if (isOAuthError(error)) {
    userMessage = 'Social login failed. Please try again or use email login.'
  } else if (isServerError(error)) {
    shouldRetry = error.code !== 'RATE_LIMITED'
    if (error.code === 'RATE_LIMITED') {
      userMessage = 'Too many requests. Please wait a moment before trying again.'
    } else {
      userMessage = 'Server is temporarily unavailable. Please try again later.'
    }
  }

  return {
    isRecoverable,
    shouldRetry,
    shouldLogout,
    userMessage
  }
}

// ============================================================================
// State Types
// ============================================================================

export interface AuthState {
  // User data
  user: UserProfile | null
  
  // Authentication status
  isAuthenticated: boolean
  isInitialized: boolean
  
  // Loading states for different operations
  isLoading: boolean
  isLoginLoading: boolean
  isRegisterLoading: boolean
  isLogoutLoading: boolean
  isRefreshLoading: boolean
  isProfileLoading: boolean
  isOAuthLoading: boolean
  
  // Error states with classification
  error: AuthError | null
  loginError: AuthError | null
  registerError: AuthError | null
  profileError: AuthError | null
  oauthError: AuthError | null
  
  // Session information
  sessionInfo: {
    lastActivity: Date | null
    tokenExpiration: Date | null
    isSessionValid: boolean
  }
  
  // OAuth state
  oauthState: {
    provider: OAuthProviderType | null
    isInitiating: boolean
    redirectUrl: string | null
  }
}

// ============================================================================
// Action Types
// ============================================================================

export type AuthAction =
  // Initialization
  | { type: 'INITIALIZE_START' }
  | { type: 'INITIALIZE_SUCCESS'; payload: { user: UserProfile | null; isAuthenticated: boolean } }
  | { type: 'INITIALIZE_ERROR'; payload: { error: AuthError } }
  
  // Login actions
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: UserProfile; tokens: TokenPair } }
  | { type: 'LOGIN_ERROR'; payload: { error: AuthError } }
  
  // Register actions
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: UserProfile; tokens: TokenPair } }
  | { type: 'REGISTER_ERROR'; payload: { error: AuthError } }
  
  // Logout actions
  | { type: 'LOGOUT_START' }
  | { type: 'LOGOUT_SUCCESS' }
  | { type: 'LOGOUT_ERROR'; payload: { error: AuthError } }
  
  // Token refresh actions
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; payload: { tokens: TokenPair } }
  | { type: 'REFRESH_ERROR'; payload: { error: AuthError } }
  
  // Profile actions
  | { type: 'PROFILE_FETCH_START' }
  | { type: 'PROFILE_FETCH_SUCCESS'; payload: { user: UserProfile } }
  | { type: 'PROFILE_FETCH_ERROR'; payload: { error: AuthError } }
  | { type: 'PROFILE_UPDATE_SUCCESS'; payload: { user: UserProfile } }
  
  // OAuth actions
  | { type: 'OAUTH_START'; payload: { provider: OAuthProviderType; redirectUrl?: string } }
  | { type: 'OAUTH_SUCCESS'; payload: { user: UserProfile; tokens: TokenPair } }
  | { type: 'OAUTH_ERROR'; payload: { error: AuthError } }
  
  // Session management
  | { type: 'SESSION_UPDATE'; payload: { lastActivity: Date; tokenExpiration: Date | null } }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'SESSION_INVALID' }
  
  // Cross-tab sync actions
  | { type: 'CROSS_TAB_LOGIN'; payload: { user: UserProfile; tokens: TokenPair } }
  | { type: 'CROSS_TAB_LOGOUT' }
  
  // Error management
  | { type: 'CLEAR_ERROR'; payload?: { errorType?: keyof Pick<AuthState, 'error' | 'loginError' | 'registerError' | 'profileError' | 'oauthError'> } }
  | { type: 'CLEAR_ALL_ERRORS' }

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  
  // Loading states
  isLoading: false,
  isLoginLoading: false,
  isRegisterLoading: false,
  isLogoutLoading: false,
  isRefreshLoading: false,
  isProfileLoading: false,
  isOAuthLoading: false,
  
  // Error states
  error: null,
  loginError: null,
  registerError: null,
  profileError: null,
  oauthError: null,
  
  // Session info
  sessionInfo: {
    lastActivity: null,
    tokenExpiration: null,
    isSessionValid: false
  },
  
  // OAuth state
  oauthState: {
    provider: null,
    isInitiating: false,
    redirectUrl: null
  }
}

// ============================================================================
// Reducer
// ============================================================================

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    // Initialization
    case 'INITIALIZE_START':
      return {
        ...state,
        isLoading: true,
        error: null
      }
    
    case 'INITIALIZE_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isInitialized: true,
        isAuthenticated: action.payload.isAuthenticated,
        user: action.payload.user,
        error: null,
        sessionInfo: {
          ...state.sessionInfo,
          isSessionValid: action.payload.isAuthenticated,
          lastActivity: action.payload.isAuthenticated ? new Date() : null
        }
      }
    
    case 'INITIALIZE_ERROR':
      return {
        ...state,
        isLoading: false,
        isInitialized: true,
        error: action.payload.error
      }
    
    // Login
    case 'LOGIN_START':
      return {
        ...state,
        isLoginLoading: true,
        loginError: null
      }
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoginLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        loginError: null,
        sessionInfo: {
          lastActivity: new Date(),
          tokenExpiration: new Date(Date.now() + action.payload.tokens.expiresIn * 1000),
          isSessionValid: true
        }
      }
    
    case 'LOGIN_ERROR':
      return {
        ...state,
        isLoginLoading: false,
        loginError: action.payload.error
      }
    
    // Register
    case 'REGISTER_START':
      return {
        ...state,
        isRegisterLoading: true,
        registerError: null
      }
    
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        isRegisterLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        registerError: null,
        sessionInfo: {
          lastActivity: new Date(),
          tokenExpiration: new Date(Date.now() + action.payload.tokens.expiresIn * 1000),
          isSessionValid: true
        }
      }
    
    case 'REGISTER_ERROR':
      return {
        ...state,
        isRegisterLoading: false,
        registerError: action.payload.error
      }
    
    // Logout
    case 'LOGOUT_START':
      return {
        ...state,
        isLogoutLoading: true
      }
    
    case 'LOGOUT_SUCCESS':
      return {
        ...initialState,
        isInitialized: true
      }
    
    case 'LOGOUT_ERROR':
      return {
        ...state,
        isLogoutLoading: false,
        error: action.payload.error
      }
    
    // Token refresh
    case 'REFRESH_START':
      return {
        ...state,
        isRefreshLoading: true
      }
    
    case 'REFRESH_SUCCESS':
      return {
        ...state,
        isRefreshLoading: false,
        sessionInfo: {
          ...state.sessionInfo,
          tokenExpiration: new Date(Date.now() + action.payload.tokens.expiresIn * 1000),
          lastActivity: new Date(),
          isSessionValid: true
        }
      }
    
    case 'REFRESH_ERROR':
      return {
        ...state,
        isRefreshLoading: false,
        error: action.payload.error,
        sessionInfo: {
          ...state.sessionInfo,
          isSessionValid: false
        }
      }
    
    // Profile
    case 'PROFILE_FETCH_START':
      return {
        ...state,
        isProfileLoading: true,
        profileError: null
      }
    
    case 'PROFILE_FETCH_SUCCESS':
    case 'PROFILE_UPDATE_SUCCESS':
      return {
        ...state,
        isProfileLoading: false,
        user: action.payload.user,
        profileError: null
      }
    
    case 'PROFILE_FETCH_ERROR':
      return {
        ...state,
        isProfileLoading: false,
        profileError: action.payload.error
      }
    
    // OAuth
    case 'OAUTH_START':
      return {
        ...state,
        isOAuthLoading: true,
        oauthError: null,
        oauthState: {
          provider: action.payload.provider,
          isInitiating: true,
          redirectUrl: action.payload.redirectUrl || null
        }
      }
    
    case 'OAUTH_SUCCESS':
      return {
        ...state,
        isOAuthLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        oauthError: null,
        oauthState: {
          provider: null,
          isInitiating: false,
          redirectUrl: null
        },
        sessionInfo: {
          lastActivity: new Date(),
          tokenExpiration: new Date(Date.now() + action.payload.tokens.expiresIn * 1000),
          isSessionValid: true
        }
      }
    
    case 'OAUTH_ERROR':
      return {
        ...state,
        isOAuthLoading: false,
        oauthError: action.payload.error,
        oauthState: {
          provider: null,
          isInitiating: false,
          redirectUrl: null
        }
      }
    
    // Session management
    case 'SESSION_UPDATE':
      return {
        ...state,
        sessionInfo: {
          lastActivity: action.payload.lastActivity,
          tokenExpiration: action.payload.tokenExpiration,
          isSessionValid: true
        }
      }
    
    case 'SESSION_EXPIRED':
    case 'SESSION_INVALID':
      return {
        ...initialState,
        isInitialized: true,
        error: {
          type: 'authentication',
          message: 'Your session has expired. Please sign in again.',
          code: 'SESSION_EXPIRED',
          recoverable: true
        }
      }
    
    // Cross-tab sync
    case 'CROSS_TAB_LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        sessionInfo: {
          lastActivity: new Date(),
          tokenExpiration: new Date(Date.now() + action.payload.tokens.expiresIn * 1000),
          isSessionValid: true
        }
      }
    
    case 'CROSS_TAB_LOGOUT':
      return {
        ...initialState,
        isInitialized: true
      }
    
    // Error management
    case 'CLEAR_ERROR':
      if (action.payload?.errorType) {
        return {
          ...state,
          [action.payload.errorType]: null
        }
      }
      return {
        ...state,
        error: null
      }
    
    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        error: null,
        loginError: null,
        registerError: null,
        profileError: null,
        oauthError: null
      }
    
    default:
      return state
  }
}

// ============================================================================
// Context Definition
// ============================================================================

export interface AuthContextValue {
  // State
  state: AuthState
  
  // Computed properties
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  isMentor: boolean
  isInsider: boolean
  
  // Authentication actions
  login: (credentials: LoginCredentials) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  
  // OAuth actions
  initiateOAuth: (provider: OAuthProviderType, redirectUrl?: string) => Promise<void>
  
  // Profile actions
  fetchProfile: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  
  // Error management
  clearError: (errorType?: keyof Pick<AuthState, 'error' | 'loginError' | 'registerError' | 'profileError' | 'oauthError'>) => void
  clearAllErrors: () => void
  
  // Session management
  updateActivity: () => void
  checkAuthStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

export interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  
  // ============================================================================
  // Initialization
  // ============================================================================
  
  useEffect(() => {
    let isMounted = true
    
    const initializeAuth = async () => {
      dispatch({ type: 'INITIALIZE_START' })
      
      try {
        // Initialize resilience systems
        const authServiceUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001'
        initializeAuthResilience(authServiceUrl)
        
        // Check if we have valid tokens
        const tokenInfo = integratedTokenManager.getTokenInfo()
        
        if (tokenInfo.hasAccessToken && tokenInfo.isAccessTokenValid) {
          // Try to fetch user profile with resilience
          try {
            const profileResult = await authResilience.getUserProfile(
              0, // We don't have user ID yet, will be handled by the fetch function
              () => authClient.getProfile()
            )
            
            if (isMounted && profileResult.data) {
              dispatch({ 
                type: 'INITIALIZE_SUCCESS', 
                payload: { 
                  user: profileResult.data, 
                  isAuthenticated: true 
                } 
              })
              
              // Log if we're using degraded mode
              if (profileResult.degraded) {
                console.warn('Authentication initialized in degraded mode:', profileResult.source)
              }
              
              return
            }
          } catch (error) {
            // Handle partial failure gracefully
            const failureResult = authResilience.handlePartialFailure(
              AuthErrorHandler.processError(error, 'initialization'),
              'profile'
            )
            
            if (!failureResult.shouldLogout) {
              console.warn('Profile fetch failed during initialization, continuing without user data:', failureResult.technicalMessage)
            }
          }
        }
        
        // No valid session found
        if (isMounted) {
          dispatch({ 
            type: 'INITIALIZE_SUCCESS', 
            payload: { 
              user: null, 
              isAuthenticated: false 
            } 
          })
        }
      } catch (error) {
        if (isMounted) {
          const authError = AuthErrorHandler.processError(error, 'initialization')
          dispatch({ 
            type: 'INITIALIZE_ERROR', 
            payload: { error: authError } 
          })
        }
      }
    }
    
    initializeAuth()
    
    return () => {
      isMounted = false
    }
  }, [])
  
  // ============================================================================
  // Token Manager Integration
  // ============================================================================
  
  useEffect(() => {
    const tokenManagerEvents = {
      onTokenRefresh: (tokens: TokenPair) => {
        dispatch({ type: 'REFRESH_SUCCESS', payload: { tokens } })
      },
      
      onTokenExpired: () => {
        dispatch({ type: 'SESSION_EXPIRED' })
      },
      
      onCrossTabLogin: (tokens: TokenPair, user: Record<string, unknown>) => {
        dispatch({ 
          type: 'CROSS_TAB_LOGIN', 
          payload: { 
            tokens, 
            user: user as unknown as UserProfile 
          } 
        })
      },
      
      onCrossTabLogout: () => {
        dispatch({ type: 'CROSS_TAB_LOGOUT' })
      },
      
      onError: (error: Error) => {
        dispatch({ 
          type: 'REFRESH_ERROR', 
          payload: { 
            error: {
              type: 'authentication',
              message: error.message,
              recoverable: true
            }
          } 
        })
      }
    }
    
    integratedTokenManager.initialize(tokenManagerEvents)
    
    return () => {
      // Cleanup is handled by the singleton
    }
  }, [])
  
  // ============================================================================
  // Authentication Actions
  // ============================================================================
  
  const login = useStableAuthCallback(async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      // Use optimized login with caching and deduplication
      const { tokens, user }: { tokens: TokenPair; user: UserProfile } = await optimizedAuthOps.login(
        credentials,
        async (creds: LoginCredentials) => {
          return await authResilience.executeWithResilience(
            () => authClient.login(creds),
            {
              operationType: 'login',
              cacheKey: `login_${creds.email}`,
              retryAttempts: 3
            }
          )
        }
      )
      
      // Store tokens using integrated token manager
      await integratedTokenManager.storeTokens(tokens, userProfileToRecord(user))
      
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user, tokens } 
      })
    } catch (error) {
      const authError: AuthError = handleAuthError(error, 'login')
      const errorClassification = classifyAuthError(authError)
      
      // Handle partial failure gracefully
      const failureResult = authResilience.handlePartialFailure(authError, 'login')
      
      dispatch({ 
        type: 'LOGIN_ERROR', 
        payload: { error: { ...authError, message: errorClassification.userMessage } } 
      })
      
      // Log technical details for debugging
      console.error('Login failed:', {
        type: authError.type,
        code: authError.code,
        classification: errorClassification,
        technicalMessage: failureResult.technicalMessage
      })
      
      throw authError
    }
  }, [])
  
  const register = useStableAuthCallback(async (userData: RegisterData): Promise<void> => {
    dispatch({ type: 'REGISTER_START' })
    
    try {
      // Use optimized register with deduplication
      const { tokens, user }: { tokens: TokenPair; user: UserProfile } = await optimizedAuthOps.register(
        userData,
        async (data: RegisterData) => {
          return await authResilience.executeWithResilience(
            () => authClient.register(data),
            {
              operationType: 'register',
              cacheKey: `register_${data.email}`,
              retryAttempts: 3
            }
          )
        }
      )
      
      // Store tokens using integrated token manager
      await integratedTokenManager.storeTokens(tokens, userProfileToRecord(user))
      
      dispatch({ 
        type: 'REGISTER_SUCCESS', 
        payload: { user, tokens } 
      })
    } catch (error) {
      const authError: AuthError = handleAuthError(error, 'register')
      const errorClassification = classifyAuthError(authError)
      
      dispatch({ 
        type: 'REGISTER_ERROR', 
        payload: { error: { ...authError, message: errorClassification.userMessage } } 
      })
      
      // Log technical details for debugging
      console.error('Registration failed:', {
        type: authError.type,
        code: authError.code,
        classification: errorClassification
      })
      
      throw authError
    }
  }, [])
  
  const logout = useStableAuthCallback(async (): Promise<void> => {
    dispatch({ type: 'LOGOUT_START' })
    
    try {
      // Try to call logout API with resilience
      await authResilience.executeWithResilience(
        () => authClient.logout(),
        {
          operationType: 'logout',
          retryAttempts: 2 // Fewer retries for logout
        }
      )
      
      // Clear tokens using integrated token manager (broadcasts to other tabs)
      await integratedTokenManager.clearTokens()
      
      // Clear authentication caches
      if (state.user?.id) {
        optimizedAuthOps.invalidateUserCache(state.user.id)
      }
      
      dispatch({ type: 'LOGOUT_SUCCESS' })
    } catch (error) {
      // Even if API call fails, clear local tokens for graceful degradation
      await integratedTokenManager.clearTokens()
      
      // Clear authentication caches
      if (state.user?.id) {
        optimizedAuthOps.invalidateUserCache(state.user.id)
      }
      
      const authError = AuthErrorHandler.processError(error, 'logout')
      
      // Handle partial failure - logout should always succeed locally
      const failureResult = authResilience.handlePartialFailure(authError, 'profile')
      
      console.warn('Logout API failed, but local state cleared:', failureResult.technicalMessage)
      
      dispatch({ 
        type: 'LOGOUT_ERROR', 
        payload: { error: authError } 
      })
      
      // Still dispatch success to clear local state for graceful degradation
      dispatch({ type: 'LOGOUT_SUCCESS' })
    }
  }, [state.user?.id])
  
  const refreshSession = useStableAuthCallback(async (): Promise<void> => {
    dispatch({ type: 'REFRESH_START' })
    
    try {
      // Use optimized token refresh with deduplication
      const accessToken: string = await optimizedAuthOps.refreshTokens(
        async (): Promise<string> => {
          return await authResilience.executeWithResilience(
            () => integratedTokenManager.getValidAccessToken(),
            {
              operationType: 'refresh',
              cacheKey: 'token_refresh',
              retryAttempts: 2
            }
          )
        }
      )
      
      if (accessToken) {
        const tokenInfo = integratedTokenManager.getTokenInfo()
        dispatch({ 
          type: 'REFRESH_SUCCESS', 
          payload: { 
            tokens: {
              accessToken,
              refreshToken: '', // Refresh token is stored securely and not exposed
              expiresIn: Math.floor((tokenInfo.accessTokenExpiration?.getTime() || Date.now()) - Date.now()) / 1000
            }
          } 
        })
      } else {
        throw new Error('Failed to refresh tokens')
      }
    } catch (error) {
      const authError = AuthErrorHandler.processError(error, 'token_refresh')
      
      // Handle partial failure - check if we should logout
      const failureResult = authResilience.handlePartialFailure(authError, 'refresh')
      
      dispatch({ 
        type: 'REFRESH_ERROR', 
        payload: { error: authError } 
      })
      
      // If we should logout due to refresh failure, trigger session expiry
      if (failureResult.shouldLogout) {
        console.warn('Token refresh failed, triggering logout:', failureResult.technicalMessage)
        dispatch({ type: 'SESSION_EXPIRED' })
      }
      
      throw authError
    }
  }, [])
  
  // ============================================================================
  // OAuth Actions
  // ============================================================================
  
  const initiateOAuth = useStableAuthCallback(async (provider: OAuthProviderType, redirectUrl?: string): Promise<void> => {
    dispatch({ 
      type: 'OAUTH_START', 
      payload: { 
        provider, 
        ...(redirectUrl && { redirectUrl })
      } 
    })
    
    try {
      // Use optimized OAuth initiation with deduplication
      const response: unknown = await optimizedAuthOps.initiateOAuth(
        provider,
        redirectUrl,
        (prov: OAuthProviderType, redirUrl?: string) => authClient.initiateOAuth(prov, redirUrl)
      )
      
      if (response && typeof response === 'object' && 'authorizationUrl' in response) {
        // Redirect to OAuth provider
        const oauthResponse = response as { authorizationUrl: string }
        window.location.href = oauthResponse.authorizationUrl
      } else {
        throw new Error('OAuth initiation failed')
      }
    } catch (error) {
      const authError: AuthError = error instanceof Error 
        ? {
            type: 'oauth',
            message: error.message,
            recoverable: true
          }
        : {
            type: 'oauth',
            message: 'OAuth initiation failed',
            recoverable: true
          }
      
      dispatch({ 
        type: 'OAUTH_ERROR', 
        payload: { error: authError } 
      })
      throw error
    }
  }, [])
  
  // ============================================================================
  // Profile Actions
  // ============================================================================
  
  const fetchProfile = useStableAuthCallback(async (): Promise<void> => {
    dispatch({ type: 'PROFILE_FETCH_START' })
    
    try {
      // Use optimized profile fetching with caching and deduplication
      const user: UserProfile = await optimizedAuthOps.getProfile(
        async (): Promise<UserProfile> => {
          const profileResult = await authResilience.getUserProfile(
            state.user?.id || 0,
            () => authClient.getProfile()
          )
          
          // Log if we're using degraded mode
          if (profileResult.degraded) {
            console.info('Profile loaded from cache/fallback:', profileResult.source)
          }
          
          return profileResult.data
        },
        state.user?.id
      )
      
      dispatch({ 
        type: 'PROFILE_FETCH_SUCCESS', 
        payload: { user } 
      })
    } catch (error) {
      const authError = AuthErrorHandler.processError(error, 'profile')
      
      // Handle partial failure gracefully
      const failureResult = authResilience.handlePartialFailure(authError, 'profile')
      
      dispatch({ 
        type: 'PROFILE_FETCH_ERROR', 
        payload: { error: authError } 
      })
      
      // Don't logout for profile fetch failures unless it's an auth error
      if (!failureResult.shouldLogout) {
        console.warn('Profile fetch failed, continuing with existing data:', failureResult.technicalMessage)
      }
      
      throw error
    }
  }, [state.user?.id])
  
  const updateProfile = useStableAuthCallback(async (updates: Partial<UserProfile>): Promise<void> => {
    dispatch({ type: 'PROFILE_FETCH_START' })
    
    try {
      const user: UserProfile = await authClient.updateProfile(updates)
      
      // Invalidate profile cache after update
      optimizedAuthOps.invalidateUserCache(user.id)
      
      dispatch({ 
        type: 'PROFILE_UPDATE_SUCCESS', 
        payload: { user } 
      })
    } catch (error) {
      const authError: AuthError = error instanceof Error 
        ? {
            type: 'validation',
            message: error.message,
            recoverable: true
          }
        : {
            type: 'validation',
            message: 'Failed to update profile',
            recoverable: true
          }
      
      dispatch({ 
        type: 'PROFILE_FETCH_ERROR', 
        payload: { error: authError } 
      })
      throw error
    }
  }, [])
  
  // ============================================================================
  // Utility Actions
  // ============================================================================
  
  const clearError = useStableAuthCallback((errorType?: keyof Pick<AuthState, 'error' | 'loginError' | 'registerError' | 'profileError' | 'oauthError'>) => {
    if (errorType) {
      dispatch({ type: 'CLEAR_ERROR', payload: { errorType } })
    } else {
      dispatch({ type: 'CLEAR_ERROR' })
    }
  }, [])
  
  const clearAllErrors = useStableAuthCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' })
  }, [])
  
  const updateActivity = useStableAuthCallback(() => {
    const tokenInfo = integratedTokenManager.getTokenInfo()
    dispatch({ 
      type: 'SESSION_UPDATE', 
      payload: { 
        lastActivity: new Date(),
        tokenExpiration: tokenInfo.accessTokenExpiration
      } 
    })
  }, [])
  
  const checkAuthStatus = useStableAuthCallback(async () => {
    if (!state.isAuthenticated) return
    
    try {
      const isValid = integratedTokenManager.isAccessTokenValid()
      
      if (!isValid) {
        // Try to refresh
        await refreshSession()
      }
    } catch (sessionError) {
      // Session is invalid
      console.warn('Session validation failed:', sessionError)
      dispatch({ type: 'SESSION_INVALID' })
    }
  }, [state.isAuthenticated, refreshSession])
  
  // ============================================================================
  // Context Value with Performance Optimization
  // ============================================================================
  
  const contextValue: AuthContextValue = useMemo(() => ({
    // State
    state,
    
    // Computed properties
    user: state.user,
    isLoading: state.isLoading || state.isLoginLoading || state.isRegisterLoading || state.isLogoutLoading,
    isAuthenticated: state.isAuthenticated,
    isInitialized: state.isInitialized,
    isMentor: state.user?.isMentor ?? false,
    isInsider: state.user?.isInsider ?? false,
    
    // Actions (already optimized with useStableAuthCallback)
    login,
    register,
    logout,
    refreshSession,
    initiateOAuth,
    fetchProfile,
    updateProfile,
    clearError,
    clearAllErrors,
    updateActivity,
    checkAuthStatus
  }), [
    state,
    login,
    register,
    logout,
    refreshSession,
    initiateOAuth,
    fetchProfile,
    updateProfile,
    clearError,
    clearAllErrors,
    updateActivity,
    checkAuthStatus
  ])
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}