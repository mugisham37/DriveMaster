/**
 * Core Notification Hooks with React Query Integration
 * 
 * Provides hooks for notification list management, mutations, and real-time updates
 * with comprehensive caching, optimistic updates, and error handling.
 * 
 * Requirements: 1.1, 1.2, 1.3, 7.1, 7.2, 7.3
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { 
  notificationApiClient,
  getNotificationWebSocketClient
} from '@/lib/notification-service'
import { useAuth } from './useAuth'
import type {
  Notification,
  NotificationList,
  NotificationQueryParams,
  NotificationStatus,
  NotificationError
} from '@/types/notification-service'

// ============================================================================
// Query Keys
// ============================================================================

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationQueryKeys.all, 'list'] as const,
  list: (params: NotificationQueryParams) => [...notificationQueryKeys.lists(), params] as const,
  details: () => [...notificationQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationQueryKeys.details(), id] as const,
  counts: () => [...notificationQueryKeys.all, 'counts'] as const,
  userCounts: (userId: string) => [...notificationQueryKeys.counts(), userId] as const,
}

// ============================================================================
// Core Notification List Hook
// ============================================================================

export interface UseNotificationsOptions extends NotificationQueryParams {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
  cacheTime?: number
}

export interface UseNotificationsResult {
  notifications: Notification[]
  isLoading: boolean
  isError: boolean
  error: NotificationError | null
  refetch: () => void
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  unreadCount: number
  totalCount: number
}

/**
 * Hook for fetching and managing notification lists with pagination and filtering
 * Requirements: 1.1, 1.2, 7.1, 7.2
 */
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsResult {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const {
    enabled = true,
    refetchInterval = 60000, // 1 minute
    staleTime = 30000, // 30 seconds
    cacheTime = 300000, // 5 minutes
    ...queryParams
  } = options

  // Set userId from auth if not provided
  const params: NotificationQueryParams = {
    userId: user?.id,
    limit: 20,
    ...queryParams
  }

  const query = useQuery({
    queryKey: notificationQueryKeys.list(params),
    queryFn: () => notificationApiClient.getNotifications(params),
    enabled: enabled && !!user?.id,
    refetchInterval,
    staleTime,
    cacheTime,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error && typeof error === 'object' && 'type' in error && error.type === 'authentication') {
        return false
      }
      return failureCount < 3
    },
    onError: (error: NotificationError) => {
      console.error('Failed to fetch notifications:', error)
    }
  })

  // Set up real-time updates
  useEffect(() => {
    if (!user?.id || !enabled) return

    const wsClient = getNotificationWebSocketClient()
    
    const handleNewNotification = (notification: Notification) => {
      // Update the query cache with the new notification
      queryClient.setQueryData<NotificationList>(
        notificationQueryKeys.list(params),
        (oldData) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            results: [notification, ...oldData.results],
            meta: {
              ...oldData.meta,
              total: oldData.meta.total + 1,
              unreadCount: notification.status.isRead ? oldData.meta.unreadCount : oldData.meta.unreadCount + 1
            }
          }
        }
      )
    }

    const handleNotificationUpdated = (notification: Notification) => {
      // Update the specific notification in the cache
      queryClient.setQueryData<NotificationList>(
        notificationQueryKeys.list(params),
        (oldData) => {
          if (!oldData) return oldData
          
          const updatedResults = oldData.results.map(n => 
            n.id === notification.id ? notification : n
          )
          
          // Recalculate unread count
          const unreadCount = updatedResults.filter(n => !n.status.isRead).length
          
          return {
            ...oldData,
            results: updatedResults,
            meta: {
              ...oldData.meta,
              unreadCount
            }
          }
        }
      )
    }

    const handleNotificationDeleted = (notificationId: string) => {
      // Remove the notification from the cache
      queryClient.setQueryData<NotificationList>(
        notificationQueryKeys.list(params),
        (oldData) => {
          if (!oldData) return oldData
          
          const deletedNotification = oldData.results.find(n => n.id === notificationId)
          const updatedResults = oldData.results.filter(n => n.id !== notificationId)
          
          return {
            ...oldData,
            results: updatedResults,
            meta: {
              ...oldData.meta,
              total: Math.max(0, oldData.meta.total - 1),
              unreadCount: deletedNotification && !deletedNotification.status.isRead 
                ? Math.max(0, oldData.meta.unreadCount - 1)
                : oldData.meta.unreadCount
            }
          }
        }
      )
    }

    // Subscribe to real-time updates
    wsClient.on('notification.received', handleNewNotification)
    wsClient.on('notification.updated', handleNotificationUpdated)
    wsClient.on('notification.deleted', handleNotificationDeleted)

    // Subscribe to user notifications
    const subscriptionId = wsClient.subscribeToUserNotifications(user.id, {
      types: params.type ? (Array.isArray(params.type) ? params.type : [params.type]) : undefined,
      priorities: params.priority ? (Array.isArray(params.priority) ? params.priority : [params.priority]) : undefined,
      channels: params.channels
    })

    return () => {
      wsClient.off('notification.received')
      wsClient.off('notification.updated')
      wsClient.off('notification.deleted')
      wsClient.unsubscribe(subscriptionId)
    }
  }, [user?.id, enabled, queryClient, JSON.stringify(params)])

  return {
    notifications: query.data?.results || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    refetch: query.refetch,
    hasNextPage: query.data?.meta.hasMore || false,
    fetchNextPage: () => {
      // This would be implemented with cursor-based pagination
      // For now, just refetch
      query.refetch()
    },
    isFetchingNextPage: query.isFetching,
    unreadCount: query.data?.meta.unreadCount || 0,
    totalCount: query.data?.meta.total || 0
  }
}

// ============================================================================
// Infinite Notifications Hook
// ============================================================================

export interface UseInfiniteNotificationsResult {
  notifications: Notification[]
  isLoading: boolean
  isError: boolean
  error: NotificationError | null
  hasNextPage: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  refetch: () => void
}

/**
 * Hook for infinite scrolling notifications with cursor-based pagination
 * Requirements: 1.2, 7.4
 */
export function useInfiniteNotifications(
  params: Omit<NotificationQueryParams, 'cursor'> = {}
): UseInfiniteNotificationsResult {
  const { user } = useAuth()

  const query = useInfiniteQuery({
    queryKey: [...notificationQueryKeys.lists(), 'infinite', params],
    queryFn: ({ pageParam = undefined }) => 
      notificationApiClient.getNotifications({
        userId: user?.id,
        limit: 20,
        ...params,
        cursor: pageParam
      }),
    enabled: !!user?.id,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor || undefined,
    staleTime: 30000,
    cacheTime: 300000
  })

  const notifications = query.data?.pages.flatMap(page => page.results) || []

  return {
    notifications,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    hasNextPage: query.hasNextPage || false,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch
  }
}

// ============================================================================
// Notification Mutations Hook
// ============================================================================

export interface UseNotificationMutationsResult {
  markAsRead: {
    mutate: (notificationId: string) => void
    isLoading: boolean
    error: NotificationError | null
  }
  markAllAsRead: {
    mutate: () => void
    isLoading: boolean
    error: NotificationError | null
  }
  deleteNotification: {
    mutate: (notificationId: string) => void
    isLoading: boolean
    error: NotificationError | null
  }
  updateStatus: {
    mutate: (params: { notificationId: string; status: Partial<NotificationStatus> }) => void
    isLoading: boolean
    error: NotificationError | null
  }
}

/**
 * Hook for notification mutations with optimistic updates
 * Requirements: 1.3, 7.3
 */
export function useNotificationMutations(): UseNotificationMutationsResult {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationApiClient.markAsRead(notificationId),
    onMutate: async (notificationId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationQueryKeys.lists() })

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: notificationQueryKeys.lists() })

      // Optimistically update all notification lists
      queryClient.setQueriesData<NotificationList>(
        { queryKey: notificationQueryKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData

          const updatedResults = oldData.results.map(notification =>
            notification.id === notificationId
              ? {
                  ...notification,
                  status: {
                    ...notification.status,
                    isRead: true,
                    readAt: new Date()
                  }
                }
              : notification
          )

          // Recalculate unread count
          const unreadCount = updatedResults.filter(n => !n.status.isRead).length

          return {
            ...oldData,
            results: updatedResults,
            meta: {
              ...oldData.meta,
              unreadCount
            }
          }
        }
      )

      return { previousData }
    },
    onError: (error, notificationId, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.lists() })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.userCounts(user.id) })
      }
    }
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('User not authenticated')
      return notificationApiClient.markAllAsRead(user.id)
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationQueryKeys.lists() })

      const previousData = queryClient.getQueriesData({ queryKey: notificationQueryKeys.lists() })

      // Optimistically mark all notifications as read
      queryClient.setQueriesData<NotificationList>(
        { queryKey: notificationQueryKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData

          const updatedResults = oldData.results.map(notification => ({
            ...notification,
            status: {
              ...notification.status,
              isRead: true,
              readAt: new Date()
            }
          }))

          return {
            ...oldData,
            results: updatedResults,
            meta: {
              ...oldData.meta,
              unreadCount: 0
            }
          }
        }
      )

      return { previousData }
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.lists() })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.userCounts(user.id) })
      }
    }
  })

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationApiClient.deleteNotification(notificationId),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationQueryKeys.lists() })

      const previousData = queryClient.getQueriesData({ queryKey: notificationQueryKeys.lists() })

      // Optimistically remove notification
      queryClient.setQueriesData<NotificationList>(
        { queryKey: notificationQueryKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData

          const deletedNotification = oldData.results.find(n => n.id === notificationId)
          const updatedResults = oldData.results.filter(n => n.id !== notificationId)

          return {
            ...oldData,
            results: updatedResults,
            meta: {
              ...oldData.meta,
              total: Math.max(0, oldData.meta.total - 1),
              unreadCount: deletedNotification && !deletedNotification.status.isRead
                ? Math.max(0, oldData.meta.unreadCount - 1)
                : oldData.meta.unreadCount
            }
          }
        }
      )

      return { previousData }
    },
    onError: (error, notificationId, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.lists() })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.userCounts(user.id) })
      }
    }
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ notificationId, status }: { notificationId: string; status: Partial<NotificationStatus> }) =>
      notificationApiClient.updateNotificationStatus(notificationId, status),
    onMutate: async ({ notificationId, status }) => {
      await queryClient.cancelQueries({ queryKey: notificationQueryKeys.lists() })

      const previousData = queryClient.getQueriesData({ queryKey: notificationQueryKeys.lists() })

      // Optimistically update notification status
      queryClient.setQueriesData<NotificationList>(
        { queryKey: notificationQueryKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData

          const updatedResults = oldData.results.map(notification =>
            notification.id === notificationId
              ? {
                  ...notification,
                  status: {
                    ...notification.status,
                    ...status
                  }
                }
              : notification
          )

          // Recalculate unread count if read status changed
          const unreadCount = status.isRead !== undefined
            ? updatedResults.filter(n => !n.status.isRead).length
            : oldData.meta.unreadCount

          return {
            ...oldData,
            results: updatedResults,
            meta: {
              ...oldData.meta,
              unreadCount
            }
          }
        }
      )

      return { previousData }
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.lists() })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.userCounts(user.id) })
      }
    }
  })

  return {
    markAsRead: {
      mutate: markAsReadMutation.mutate,
      isLoading: markAsReadMutation.isLoading,
      error: markAsReadMutation.error as NotificationError | null
    },
    markAllAsRead: {
      mutate: markAllAsReadMutation.mutate,
      isLoading: markAllAsReadMutation.isLoading,
      error: markAllAsReadMutation.error as NotificationError | null
    },
    deleteNotification: {
      mutate: deleteNotificationMutation.mutate,
      isLoading: deleteNotificationMutation.isLoading,
      error: deleteNotificationMutation.error as NotificationError | null
    },
    updateStatus: {
      mutate: updateStatusMutation.mutate,
      isLoading: updateStatusMutation.isLoading,
      error: updateStatusMutation.error as NotificationError | null
    }
  }
}

// ============================================================================
// Notification Counts Hook
// ============================================================================

export interface UseNotificationCountsResult {
  total: number
  unread: number
  read: number
  byType: Record<string, number>
  byPriority: Record<string, number>
  isLoading: boolean
  isError: boolean
  error: NotificationError | null
}

/**
 * Hook for fetching notification counts and statistics
 * Requirements: 1.1, 7.1
 */
export function useNotificationCounts(): UseNotificationCountsResult {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: notificationQueryKeys.userCounts(user?.id || ''),
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated')
      return notificationApiClient.getNotificationCounts(user.id)
    },
    enabled: !!user?.id,
    staleTime: 30000,
    cacheTime: 300000,
    refetchInterval: 60000
  })

  return {
    total: query.data?.total || 0,
    unread: query.data?.unread || 0,
    read: query.data?.read || 0,
    byType: query.data?.byType || {},
    byPriority: query.data?.byPriority || {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null
  }
}

// ============================================================================
// Single Notification Hook
// ============================================================================

export interface UseNotificationResult {
  notification: Notification | null
  isLoading: boolean
  isError: boolean
  error: NotificationError | null
  refetch: () => void
}

/**
 * Hook for fetching a single notification by ID
 * Requirements: 1.1, 7.1
 */
export function useNotification(notificationId: string): UseNotificationResult {
  const query = useQuery({
    queryKey: notificationQueryKeys.detail(notificationId),
    queryFn: () => notificationApiClient.getNotification(notificationId),
    enabled: !!notificationId,
    staleTime: 60000,
    cacheTime: 300000
  })

  return {
    notification: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as NotificationError | null,
    refetch: query.refetch
  }
}