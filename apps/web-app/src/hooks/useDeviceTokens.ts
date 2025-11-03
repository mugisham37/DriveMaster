/**
 * Device Token Management Hook
 * 
 * Provides hooks for push notification setup, device token registration,
 * browser permission management, and token lifecycle management.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationApiClient } from '@/lib/notification-service'
import { useAuth } from './useAuth'
import { requireStringUserId } from '@/utils/user-id-helpers'
import type {
  DeviceToken,
  DeviceTokenRequest,
  DeviceTokenResponse,
  DeviceTokenStats,
  DeviceMetadata,
  NotificationError
} from '@/types/notification-service'

// ============================================================================
// Query Keys
// ============================================================================

export const deviceTokenQueryKeys = {
  all: ['deviceTokens'] as const,
  lists: () => [...deviceTokenQueryKeys.all, 'list'] as const,
  list: (userId: string) => [...deviceTokenQueryKeys.lists(), userId] as const,
  stats: () => [...deviceTokenQueryKeys.all, 'stats'] as const,
  userStats: (userId: string) => [...deviceTokenQueryKeys.stats(), userId] as const,
}

// ============================================================================
// Permission Management
// ============================================================================

export type NotificationPermissionState = 
  | 'default' 
  | 'granted' 
  | 'denied' 
  | 'unsupported'
  | 'checking'

export interface UseNotificationPermissionResult {
  permission: NotificationPermissionState
  requestPermission: () => Promise<NotificationPermissionState>
  isSupported: boolean
  canRequest: boolean
}

/**
 * Hook for managing browser notification permissions
 * Requirements: 2.1, 2.2
 */
export function useNotificationPermission(): UseNotificationPermissionResult {
  const [permission, setPermission] = useState<NotificationPermissionState>('checking')
  const [isSupported, setIsSupported] = useState(false)

  // Check initial permission state
  useEffect(() => {
    const checkPermission = () => {
      if (!('Notification' in window)) {
        setPermission('unsupported')
        setIsSupported(false)
        return
      }

      setIsSupported(true)
      setPermission(Notification.permission as NotificationPermissionState)
    }

    checkPermission()

    // Listen for permission changes (some browsers support this)
    const handlePermissionChange = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission as NotificationPermissionState)
      }
    }

    // Some browsers support permission change events
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName })
        .then(permissionStatus => {
          permissionStatus.addEventListener('change', handlePermissionChange)
          return () => permissionStatus.removeEventListener('change', handlePermissionChange)
        })
        .catch(() => {
          // Fallback for browsers that don't support permission queries
        })
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!isSupported) {
      return 'unsupported'
    }

    if (permission === 'granted') {
      return 'granted'
    }

    if (permission === 'denied') {
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotificationPermissionState)
      return result as NotificationPermissionState
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return 'denied'
    }
  }, [isSupported, permission])

  const canRequest = isSupported && permission === 'default'

  return {
    permission,
    requestPermission,
    isSupported,
    canRequest
  }
}

// ============================================================================
// Device Token Registration
// ============================================================================

export interface UseDeviceTokenRegistrationOptions {
  autoRegister?: boolean
  vapidPublicKey?: string
}

export interface UseDeviceTokenRegistrationResult {
  isRegistered: boolean
  isRegistering: boolean
  registrationError: NotificationError | null
  register: () => Promise<DeviceTokenResponse | null>
  unregister: () => Promise<void>
  currentToken: string | null
}

/**
 * Hook for device token registration and management
 * Requirements: 2.1, 2.2, 2.3
 */
export function useDeviceTokenRegistration(
  options: UseDeviceTokenRegistrationOptions = {}
): UseDeviceTokenRegistrationResult {
  const { user } = useAuth()
  const { permission, requestPermission } = useNotificationPermission()
  const queryClient = useQueryClient()
  
  const {
    autoRegister = false,
    vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  } = options

  const [isRegistered, setIsRegistered] = useState(false)
  const [currentToken, setCurrentToken] = useState<string | null>(null)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  // Registration mutation
  const registrationMutation = useMutation({
    mutationFn: async (): Promise<DeviceTokenResponse> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      if (permission !== 'granted') {
        const newPermission = await requestPermission()
        if (newPermission !== 'granted') {
          throw new Error(`Notification permission ${newPermission}`)
        }
      }

      // Get service worker registration
      if (!registrationRef.current) {
        registrationRef.current = await navigator.serviceWorker.ready
      }

      // Subscribe to push notifications
      const subscriptionOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true
      }
      
      // Only add applicationServerKey if it's provided
      if (vapidPublicKey) {
        subscriptionOptions.applicationServerKey = vapidPublicKey
      }
      
      const subscription = await registrationRef.current.pushManager.subscribe(subscriptionOptions)

      // Extract token from subscription
      const token = subscription.endpoint

      // Prepare device metadata
      const metadata: DeviceMetadata = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        browserName: getBrowserName(),
        browserVersion: getBrowserVersion()
      }

      // Register with notification service
      const request: DeviceTokenRequest = {
        userId: requireStringUserId(user.id),
        token,
        platform: 'web',
        metadata
      }

      const response = await notificationApiClient.registerDeviceToken(request)
      
      setCurrentToken(token)
      setIsRegistered(true)
      
      // Invalidate device token queries
      const userIdStr = requireStringUserId(user.id)
      queryClient.invalidateQueries({ queryKey: deviceTokenQueryKeys.list(userIdStr) })
      queryClient.invalidateQueries({ queryKey: deviceTokenQueryKeys.userStats(userIdStr) })
      
      return response
    },
    onError: (error) => {
      console.error('Device token registration failed:', error)
      setIsRegistered(false)
      setCurrentToken(null)
    }
  })

  // Unregistration mutation
  const unregistrationMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user?.id || !currentToken) {
        return
      }

      // Unsubscribe from push manager
      if (registrationRef.current) {
        const subscription = await registrationRef.current.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
        }
      }

      // Remove from notification service - removeDeviceToken expects token ID, not token value
      // We'll need to fetch tokens first to find the ID
      const userIdStr = requireStringUserId(user.id)
      const tokens = await notificationApiClient.getDeviceTokens(userIdStr)
      const tokenToRemove = tokens.find(t => t.token === currentToken)
      if (tokenToRemove) {
        await notificationApiClient.removeDeviceToken(tokenToRemove.id)
      }
      
      setCurrentToken(null)
      setIsRegistered(false)
      
      // Invalidate device token queries
      queryClient.invalidateQueries({ queryKey: deviceTokenQueryKeys.list(userIdStr) })
      queryClient.invalidateQueries({ queryKey: deviceTokenQueryKeys.userStats(userIdStr) })
    },
    onError: (error) => {
      console.error('Device token unregistration failed:', error)
    }
  })

  // Check existing registration on mount
  useEffect(() => {
    const checkExistingRegistration = async () => {
      if (!user?.id || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        registrationRef.current = registration
        
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          setCurrentToken(subscription.endpoint)
          setIsRegistered(true)
        }
      } catch (error) {
        console.warn('Failed to check existing push subscription:', error)
      }
    }

    checkExistingRegistration()
  }, [user?.id])

  // Auto-register if enabled
  useEffect(() => {
    if (autoRegister && user?.id && permission === 'granted' && !isRegistered) {
      registrationMutation.mutate()
    }
  }, [autoRegister, user?.id, permission, isRegistered, registrationMutation])

  return {
    isRegistered,
    isRegistering: registrationMutation.isPending,
    registrationError: registrationMutation.error as NotificationError | null,
    register: () => registrationMutation.mutateAsync(),
    unregister: () => unregistrationMutation.mutateAsync(),
    currentToken
  }
}

// ============================================================================
// Device Token Management
// ============================================================================

export interface UseDeviceTokensOptions {
  platform?: 'ios' | 'android' | 'web'
  activeOnly?: boolean
  includeMetadata?: boolean
}

export interface UseDeviceTokensResult {
  deviceTokens: DeviceToken[]
  isLoading: boolean
  isError: boolean
  error: NotificationError | null
  refetch: () => void
  removeToken: (tokenId: string) => Promise<void>
  refreshToken: (tokenId: string) => Promise<DeviceToken>
  validateToken: (tokenId: string) => Promise<{ isValid: boolean; error?: string }>
  cleanupTokens: () => Promise<{ removed: number; remaining: number }>
}

/**
 * Hook for managing user's device tokens
 * Requirements: 2.2, 2.3, 2.5
 */
export function useDeviceTokens(): UseDeviceTokensResult {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Convert user ID to string safely
  const userIdStr = user?.id ? requireStringUserId(user.id) : ''

  // Fetch device tokens
  const query = useQuery({
    queryKey: deviceTokenQueryKeys.list(userIdStr),
    queryFn: async () => {
      if (!userIdStr) throw new Error('User not authenticated')
      // getDeviceTokens only accepts userId parameter, options are not supported
      return await notificationApiClient.getDeviceTokens(userIdStr)
    },
    enabled: !!userIdStr,
    staleTime: 60000,
    gcTime: 300000 // gcTime replaces cacheTime in newer versions of react-query
  })

  // Remove token mutation
  const removeTokenMutation = useMutation({
    mutationFn: (tokenId: string) => notificationApiClient.removeDeviceToken(tokenId),
    onSuccess: () => {
      if (userIdStr) {
        queryClient.invalidateQueries({ queryKey: deviceTokenQueryKeys.list(userIdStr) })
        queryClient.invalidateQueries({ queryKey: deviceTokenQueryKeys.userStats(userIdStr) })
      }
    }
  })

  // Note: The following methods are not implemented in the API client yet
  // They will need to be added to notificationApiClient
  
  // Refresh token mutation - placeholder until API method is implemented
  const refreshTokenMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (_tokenId: string): Promise<DeviceToken> => {
      // TODO: Implement refreshDeviceToken in NotificationApiClient
      throw new Error('refreshDeviceToken not implemented yet')
    },
    onSuccess: () => {
      if (userIdStr) {
        queryClient.invalidateQueries({ queryKey: deviceTokenQueryKeys.list(userIdStr) })
      }
    }
  })

  // Validate token mutation - placeholder until API method is implemented
  const validateTokenMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (_tokenId: string): Promise<{ isValid: boolean; error?: string }> => {
      // TODO: Implement validateDeviceToken in NotificationApiClient
      throw new Error('validateDeviceToken not implemented yet')
    }
  })

  // Cleanup tokens mutation - placeholder until API method is implemented
  const cleanupTokensMutation = useMutation({
    mutationFn: async (): Promise<{ removed: number; remaining: number }> => {
      if (!userIdStr) throw new Error('User not authenticated')
      // TODO: Implement cleanupDeviceTokens in NotificationApiClient
      throw new Error('cleanupDeviceTokens not implemented yet')
    },
    onSuccess: () => {
      if (userIdStr) {
        queryClient.invalidateQueries({ queryKey: deviceTokenQueryKeys.list(userIdStr) })
        queryClient.invalidateQueries({ queryKey: deviceTokenQueryKeys.userStats(userIdStr) })
      }
    }
  })

  return {
    deviceTokens: (query.data as DeviceToken[]) || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    refetch: query.refetch,
    removeToken: removeTokenMutation.mutateAsync,
    refreshToken: refreshTokenMutation.mutateAsync,
    validateToken: validateTokenMutation.mutateAsync,
    cleanupTokens: cleanupTokensMutation.mutateAsync
  }
}

// ============================================================================
// Device Token Statistics
// ============================================================================

export interface UseDeviceTokenStatsResult {
  total: number
  active: number
  byPlatform: Record<string, number>
  lastRegistered?: Date
  oldestToken?: Date
  isLoading: boolean
  isError: boolean
  error: NotificationError | null
}

/**
 * Hook for fetching device token statistics
 * Requirements: 2.2, 2.5
 */
export function useDeviceTokenStats(): UseDeviceTokenStatsResult {
  const { user } = useAuth()
  
  // Convert user ID to string safely
  const userIdStr = user?.id ? requireStringUserId(user.id) : ''

  const query = useQuery({
    queryKey: deviceTokenQueryKeys.userStats(userIdStr),
    queryFn: async (): Promise<DeviceTokenStats> => {
      if (!userIdStr) throw new Error('User not authenticated')
      // TODO: getDeviceTokenStats needs to be implemented in NotificationApiClient
      // For now, we'll return a mock response
      throw new Error('getDeviceTokenStats not implemented yet')
    },
    enabled: !!userIdStr,
    staleTime: 60000,
    gcTime: 300000 // gcTime replaces cacheTime
  })

  const stats = query.data as DeviceTokenStats | undefined

  return {
    total: stats?.total || 0,
    active: stats?.active || 0,
    byPlatform: stats?.byPlatform || {},
    ...(stats?.lastRegistered && { lastRegistered: stats.lastRegistered }),
    ...(stats?.oldestToken && { oldestToken: stats.oldestToken }),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detects browser name from user agent
 */
function getBrowserName(): string {
  const userAgent = navigator.userAgent.toLowerCase()
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'Chrome'
  if (userAgent.includes('firefox')) return 'Firefox'
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari'
  if (userAgent.includes('edg')) return 'Edge'
  if (userAgent.includes('opera')) return 'Opera'
  
  return 'Unknown'
}

/**
 * Detects browser version from user agent
 */
function getBrowserVersion(): string {
  const userAgent = navigator.userAgent
  
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/)
  if (chromeMatch && chromeMatch[1]) return chromeMatch[1]
  
  const firefoxMatch = userAgent.match(/Firefox\/(\d+)/)
  if (firefoxMatch && firefoxMatch[1]) return firefoxMatch[1]
  
  const safariMatch = userAgent.match(/Version\/(\d+)/)
  if (safariMatch && safariMatch[1] && userAgent.includes('Safari')) return safariMatch[1]
  
  const edgeMatch = userAgent.match(/Edg\/(\d+)/)
  if (edgeMatch && edgeMatch[1]) return edgeMatch[1]
  
  return 'Unknown'
}