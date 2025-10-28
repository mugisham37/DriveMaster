'use client'

/**
 * Session Timeout Detection and Management Hook
 * 
 * Implements:
 * - User activity tracking with mouse, keyboard, scroll events
 * - Session timeout warnings with countdown and extension options
 * - Automatic session extension on user activity
 * - Graceful session expiration with redirect to login
 * - Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { integratedTokenManager } from '@/lib/auth/token-manager'

// ============================================================================
// Configuration Constants
// ============================================================================

const DEFAULT_CONFIG = {
  // Session timeout in milliseconds (30 minutes)
  sessionTimeout: 30 * 60 * 1000,
  
  // Warning time before session expires (5 minutes)
  warningTime: 5 * 60 * 1000,
  
  // Activity check interval (30 seconds)
  activityCheckInterval: 30 * 1000,
  
  // Minimum time between activity updates (5 seconds)
  activityThrottle: 5 * 1000,
  
  // Events to track for user activity
  activityEvents: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'] as const
}

// ============================================================================
// Types
// ============================================================================

export interface SessionTimeoutConfig {
  sessionTimeout?: number
  warningTime?: number
  activityCheckInterval?: number
  activityThrottle?: number
  activityEvents?: readonly string[]
  onWarning?: (timeRemaining: number) => void
  onTimeout?: () => void
  onExtension?: () => void
  onActivityDetected?: () => void
}

export interface SessionTimeoutState {
  isActive: boolean
  lastActivity: Date | null
  sessionExpiration: Date | null
  timeRemaining: number
  isWarningShown: boolean
  isExpired: boolean
  warningStartTime: Date | null
}

export interface UseSessionTimeoutReturn {
  // State
  state: SessionTimeoutState
  
  // Actions
  extendSession: () => Promise<void>
  resetActivity: () => void
  forceTimeout: () => void
  
  // Computed properties
  isSessionValid: boolean
  shouldShowWarning: boolean
  timeUntilWarning: number
  timeUntilExpiration: number
  
  // Configuration
  updateConfig: (config: Partial<SessionTimeoutConfig>) => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSessionTimeout(config: SessionTimeoutConfig = {}): UseSessionTimeoutReturn {
  const auth = useAuth()
  const router = useRouter()
  
  // Merge config with defaults
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  // State
  const [state, setState] = useState<SessionTimeoutState>({
    isActive: false,
    lastActivity: null,
    sessionExpiration: null,
    timeRemaining: 0,
    isWarningShown: false,
    isExpired: false,
    warningStartTime: null
  })
  
  // Refs for cleanup and throttling
  const activityTimeoutRef = useRef<NodeJS.Timeout>()
  const checkIntervalRef = useRef<NodeJS.Timeout>()
  const lastActivityUpdateRef = useRef<Date>(new Date())
  const configRef = useRef(finalConfig)
  
  // Update config ref when config changes
  useEffect(() => {
    configRef.current = { ...DEFAULT_CONFIG, ...config }
  }, [config])
  
  // ============================================================================
  // Activity Tracking
  // ============================================================================
  
  const updateActivity = useCallback(() => {
    const now = new Date()
    const timeSinceLastUpdate = now.getTime() - lastActivityUpdateRef.current.getTime()
    
    // Throttle activity updates
    if (timeSinceLastUpdate < configRef.current.activityThrottle) {
      return
    }
    
    lastActivityUpdateRef.current = now
    
    setState(prevState => ({
      ...prevState,
      lastActivity: now,
      isWarningShown: false,
      warningStartTime: null
    }))
    
    // Update auth context activity
    auth.updateActivity()
    
    // Notify callback
    configRef.current.onActivityDetected?.()
    
    console.log('User activity detected, session extended')
  }, [auth])
  
  const handleActivity = useCallback(() => {
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
    
    // Debounce activity updates
    activityTimeoutRef.current = setTimeout(updateActivity, 100)
  }, [updateActivity])
  
  // ============================================================================
  // Session Management
  // ============================================================================
  
  const calculateSessionExpiration = useCallback((lastActivity: Date): Date => {
    return new Date(lastActivity.getTime() + configRef.current.sessionTimeout)
  }, [])
  
  const extendSession = useCallback(async () => {
    try {
      // Refresh the session tokens
      await auth.refreshSession()
      
      const now = new Date()
      const newExpiration = calculateSessionExpiration(now)
      
      setState(prevState => ({
        ...prevState,
        lastActivity: now,
        sessionExpiration: newExpiration,
        isWarningShown: false,
        isExpired: false,
        warningStartTime: null
      }))
      
      configRef.current.onExtension?.()
      
      console.log('Session extended successfully')
    } catch (error) {
      console.error('Failed to extend session:', error)
      // Force timeout on extension failure
      forceTimeout()
    }
  }, [auth, calculateSessionExpiration, forceTimeout])
  
  const resetActivity = useCallback(() => {
    const now = new Date()
    const newExpiration = calculateSessionExpiration(now)
    
    setState(prevState => ({
      ...prevState,
      lastActivity: now,
      sessionExpiration: newExpiration,
      isWarningShown: false,
      isExpired: false,
      warningStartTime: null
    }))
    
    console.log('Activity reset, session timer restarted')
  }, [calculateSessionExpiration])
  
  const forceTimeout = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isExpired: true,
      timeRemaining: 0
    }))
    
    // Clear auth state and redirect
    auth.logout().then(() => {
      router.push('/auth/signin?reason=session_expired')
    }).catch((logoutError) => {
      console.error('Error during forced logout:', logoutError)
      router.push('/auth/signin?reason=session_expired')
    })
    
    configRef.current.onTimeout?.()
    
    console.log('Session forcefully expired')
  }, [auth, router])
  
  // ============================================================================
  // Session Monitoring
  // ============================================================================
  
  const checkSessionStatus = useCallback(() => {
    if (!auth.isAuthenticated || !state.isActive) {
      return
    }
    
    const now = new Date()
    const { lastActivity, sessionExpiration } = state
    
    if (!lastActivity || !sessionExpiration) {
      return
    }
    
    const timeRemaining = sessionExpiration.getTime() - now.getTime()
    
    setState(prevState => ({
      ...prevState,
      timeRemaining: Math.max(0, timeRemaining)
    }))
    
    // Check if session has expired
    if (timeRemaining <= 0) {
      console.log('Session expired')
      forceTimeout()
      return
    }
    
    // Check if warning should be shown
    if (timeRemaining <= configRef.current.warningTime && !state.isWarningShown) {
      setState(prevState => ({
        ...prevState,
        isWarningShown: true,
        warningStartTime: now
      }))
      
      configRef.current.onWarning?.(timeRemaining)
      console.log(`Session warning: ${Math.ceil(timeRemaining / 1000)} seconds remaining`)
    }
  }, [auth.isAuthenticated, state, forceTimeout])
  
  // ============================================================================
  // Initialization and Cleanup
  // ============================================================================
  
  useEffect(() => {
    if (!auth.isAuthenticated) {
      setState(prevState => ({
        ...prevState,
        isActive: false,
        lastActivity: null,
        sessionExpiration: null,
        isWarningShown: false,
        isExpired: false,
        warningStartTime: null
      }))
      return
    }
    
    // Initialize session tracking
    const now = new Date()
    const sessionExpiration = calculateSessionExpiration(now)
    
    setState(prevState => ({
      ...prevState,
      isActive: true,
      lastActivity: now,
      sessionExpiration,
      timeRemaining: configRef.current.sessionTimeout,
      isWarningShown: false,
      isExpired: false,
      warningStartTime: null
    }))
    
    console.log('Session timeout tracking initialized')
  }, [auth.isAuthenticated, calculateSessionExpiration])
  
  // Set up activity event listeners
  useEffect(() => {
    if (!state.isActive) {
      return
    }
    
    const events = configRef.current.activityEvents
    
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })
    
    console.log('Activity event listeners added')
    
    return () => {
      // Remove event listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      
      console.log('Activity event listeners removed')
    }
  }, [state.isActive, handleActivity])
  
  // Set up session monitoring interval
  useEffect(() => {
    if (!state.isActive) {
      return
    }
    
    checkIntervalRef.current = setInterval(
      checkSessionStatus,
      configRef.current.activityCheckInterval
    )
    
    console.log('Session monitoring interval started')
    
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        console.log('Session monitoring interval cleared')
      }
    }
  }, [state.isActive, checkSessionStatus])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [])
  
  // ============================================================================
  // Token Manager Integration
  // ============================================================================
  
  useEffect(() => {
    if (!auth.isAuthenticated) return
    
    // Sync with token manager expiration
    const tokenInfo = integratedTokenManager.getTokenInfo()
    
    if (tokenInfo.accessTokenExpiration) {
      setState(prevState => ({
        ...prevState,
        sessionExpiration: tokenInfo.accessTokenExpiration
      }))
    }
  }, [auth.isAuthenticated, auth.state.sessionInfo.tokenExpiration])
  
  // ============================================================================
  // Computed Properties
  // ============================================================================
  
  const isSessionValid = state.isActive && !state.isExpired && state.timeRemaining > 0
  const shouldShowWarning = state.isWarningShown && !state.isExpired
  const timeUntilWarning = Math.max(0, state.timeRemaining - configRef.current.warningTime)
  const timeUntilExpiration = Math.max(0, state.timeRemaining)
  
  // ============================================================================
  // Configuration Update
  // ============================================================================
  
  const updateConfig = useCallback((newConfig: Partial<SessionTimeoutConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig }
  }, [])
  
  // ============================================================================
  // Return Hook Interface
  // ============================================================================
  
  return {
    // State
    state,
    
    // Actions
    extendSession,
    resetActivity,
    forceTimeout,
    
    // Computed properties
    isSessionValid,
    shouldShowWarning,
    timeUntilWarning,
    timeUntilExpiration,
    
    // Configuration
    updateConfig
  }
}

// ============================================================================
// Session Timeout Warning Component Hook
// ============================================================================

export interface UseSessionWarningReturn {
  isVisible: boolean
  timeRemaining: number
  timeRemainingFormatted: string
  extendSession: () => Promise<void>
  logout: () => void
}

export function useSessionWarning(): UseSessionWarningReturn {
  const auth = useAuth()
  const router = useRouter()
  
  const sessionTimeout = useSessionTimeout({
    onWarning: (timeRemaining) => {
      console.log(`Session warning triggered: ${Math.ceil(timeRemaining / 1000)}s remaining`)
    },
    onTimeout: () => {
      console.log('Session timeout triggered')
    }
  })
  
  const formatTimeRemaining = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.ceil(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    
    return `${seconds}s`
  }, [])
  
  const logout = useCallback(() => {
    auth.logout().then(() => {
      router.push('/auth/signin?reason=session_expired')
    }).catch((logoutError) => {
      console.error('Error during logout:', logoutError)
      router.push('/auth/signin?reason=session_expired')
    })
  }, [auth, router])
  
  return {
    isVisible: sessionTimeout.shouldShowWarning,
    timeRemaining: sessionTimeout.timeUntilExpiration,
    timeRemainingFormatted: formatTimeRemaining(sessionTimeout.timeUntilExpiration),
    extendSession: sessionTimeout.extendSession,
    logout
  }
}