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

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import { integratedTokenManager } from '@/lib/auth/token-manager'
import { authClient } from '@/lib/auth/api-client'
import type { 
  UserProfile, 
  TokenPair, 
  AuthError,
  LoginCredentials,
  RegisterData,
  OAuthProviderType
} from '@/types/auth-service'

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
        // Check if we have valid tokens
        const tokenInfo = integratedTokenManager.getTokenInfo()
        
        if (tokenInfo.hasAccessToken && tokenInfo.isAccessTokenValid) {
          // Try to fetch user profile
          try {
            const user = await authClient.getProfile()
            
            if (isMounted && user) {
              dispatch({ 
                type: 'INITIALIZE_SUCCESS', 
                payload: { 
                  user, 
                  isAuthenticated: true 
                } 
              })
              return
            }
          } catch {
            // Log the error but continue with initialization
            console.warn('Failed to fetch profile during initialization')
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
      } catch {
        if (isMounted) {
          dispatch({ 
            type: 'INITIALIZE_ERROR', 
            payload: { 
              error: {
                type: 'authentication',
                message: 'Failed to initialize authentication',
                recoverable: true
              }
            } 
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
  
  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      const { tokens, user } = await authClient.login(credentials)
      
      // Store tokens using integrated token manager
      await integratedTokenManager.storeTokens(tokens, user as unknown as Record<string, unknown>)
      
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user, tokens } 
      })
    } catch (error) {
      const authError: AuthError = error instanceof Error 
        ? {
            type: 'authentication',
            message: error.message,
            recoverable: true
          }
        : {
            type: 'authentication',
            message: 'Login failed',
            recoverable: true
          }
      
      dispatch({ 
        type: 'LOGIN_ERROR', 
        payload: { error: authError } 
      })
      throw error
    }
  }, [])
  
  const register = useCallback(async (userData: RegisterData) => {
    dispatch({ type: 'REGISTER_START' })
    
    try {
      const { tokens, user } = await authClient.register(userData)
      
      // Store tokens using integrated token manager
      await integratedTokenManager.storeTokens(tokens, user as unknown as Record<string, unknown>)
      
      dispatch({ 
        type: 'REGISTER_SUCCESS', 
        payload: { user, tokens } 
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
            message: 'Registration failed',
            recoverable: true
          }
      
      dispatch({ 
        type: 'REGISTER_ERROR', 
        payload: { error: authError } 
      })
      throw error
    }
  }, [])
  
  const logout = useCallback(async () => {
    dispatch({ type: 'LOGOUT_START' })
    
    try {
      // Call logout API
      await authClient.logout()
      
      // Clear tokens using integrated token manager (broadcasts to other tabs)
      await integratedTokenManager.clearTokens()
      
      dispatch({ type: 'LOGOUT_SUCCESS' })
    } catch (error) {
      // Even if API call fails, clear local tokens
      await integratedTokenManager.clearTokens()
      
      const authError: AuthError = error instanceof Error 
        ? {
            type: 'network',
            message: error.message,
            recoverable: false
          }
        : {
            type: 'network',
            message: 'Logout failed',
            recoverable: false
          }
      
      dispatch({ 
        type: 'LOGOUT_ERROR', 
        payload: { error: authError } 
      })
      
      // Still dispatch success to clear local state
      dispatch({ type: 'LOGOUT_SUCCESS' })
    }
  }, [])
  
  const refreshSession = useCallback(async () => {
    dispatch({ type: 'REFRESH_START' })
    
    try {
      const accessToken = await integratedTokenManager.getValidAccessToken()
      
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
      const authError: AuthError = error instanceof Error 
        ? {
            type: 'authentication',
            message: error.message,
            recoverable: true
          }
        : {
            type: 'authentication',
            message: 'Session refresh failed',
            recoverable: true
          }
      
      dispatch({ 
        type: 'REFRESH_ERROR', 
        payload: { error: authError } 
      })
      throw error
    }
  }, [])
  
  // ============================================================================
  // OAuth Actions
  // ============================================================================
  
  const initiateOAuth = useCallback(async (provider: OAuthProviderType, redirectUrl?: string) => {
    dispatch({ 
      type: 'OAUTH_START', 
      payload: { 
        provider, 
        ...(redirectUrl && { redirectUrl })
      } 
    })
    
    try {
      const response = await authClient.initiateOAuth(provider, redirectUrl)
      
      if (response && typeof response === 'object' && 'authorizationUrl' in response) {
        // Redirect to OAuth provider
        window.location.href = response.authorizationUrl
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
  
  const fetchProfile = useCallback(async () => {
    dispatch({ type: 'PROFILE_FETCH_START' })
    
    try {
      const user = await authClient.getProfile()
      
      dispatch({ 
        type: 'PROFILE_FETCH_SUCCESS', 
        payload: { user } 
      })
    } catch (error) {
      const authError: AuthError = error instanceof Error 
        ? {
            type: 'network',
            message: error.message,
            recoverable: true
          }
        : {
            type: 'network',
            message: 'Failed to fetch profile',
            recoverable: true
          }
      
      dispatch({ 
        type: 'PROFILE_FETCH_ERROR', 
        payload: { error: authError } 
      })
      throw error
    }
  }, [])
  
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    dispatch({ type: 'PROFILE_FETCH_START' })
    
    try {
      const user = await authClient.updateProfile(updates)
      
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
  
  const clearError = useCallback((errorType?: keyof Pick<AuthState, 'error' | 'loginError' | 'registerError' | 'profileError' | 'oauthError'>) => {
    if (errorType) {
      dispatch({ type: 'CLEAR_ERROR', payload: { errorType } })
    } else {
      dispatch({ type: 'CLEAR_ERROR' })
    }
  }, [])
  
  const clearAllErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' })
  }, [])
  
  const updateActivity = useCallback(() => {
    const tokenInfo = integratedTokenManager.getTokenInfo()
    dispatch({ 
      type: 'SESSION_UPDATE', 
      payload: { 
        lastActivity: new Date(),
        tokenExpiration: tokenInfo.accessTokenExpiration
      } 
    })
  }, [])
  
  const checkAuthStatus = useCallback(async () => {
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
  // Context Value
  // ============================================================================
  
  const contextValue: AuthContextValue = {
    // State
    state,
    
    // Computed properties
    user: state.user,
    isLoading: state.isLoading || state.isLoginLoading || state.isRegisterLoading || state.isLogoutLoading,
    isAuthenticated: state.isAuthenticated,
    isInitialized: state.isInitialized,
    isMentor: state.user?.isMentor ?? false,
    isInsider: state.user?.isInsider ?? false,
    
    // Actions
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
  }
  
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