/**
 * Higher-Order Component for Automatic Analytics Tracking
 * 
 * Wraps notification components to automatically track user interactions
 * including opens, clicks, dismissals, and other engagement events.
 * 
 * Requirements: 5.1, 5.2
 */

'use client'

import React, { useEffect, useRef, ComponentType } from 'react'
import { useAutoAnalyticsTracking } from '../../hooks/useNotificationAnalytics'
import { Notification } from '../../types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface WithAnalyticsTrackingProps {
  notification: Notification
  autoTrackView?: boolean
  trackingEnabled?: boolean
}

export interface AnalyticsTrackingHandlers {
  onOpen: () => void
  onClick: (action?: string) => void
  onDismiss: () => void
  onView: () => void
  onRead: () => void
  onArchive: () => void
  onDelete: () => void
  onClose: () => void
}

// ============================================================================
// HOC Implementation
// ============================================================================

/**
 * Higher-order component that adds analytics tracking to notification components
 */
export function withAnalyticsTracking<P extends object>(
  WrappedComponent: ComponentType<P & AnalyticsTrackingHandlers>
) {
  const WithAnalyticsTrackingComponent = (
    props: P & WithAnalyticsTrackingProps
  ) => {
    const { 
      notification, 
      autoTrackView = true, 
      trackingEnabled = true,
      ...restProps 
    } = props
    
    const { createTrackingHandlers } = useAutoAnalyticsTracking()
    const hasTrackedView = useRef(false)

    // Create tracking handlers for this notification
    const trackingHandlers = trackingEnabled 
      ? createTrackingHandlers(notification.id)
      : {
          onOpen: () => {},
          onClick: () => {},
          onDismiss: () => {},
          onView: () => {},
          onRead: () => {},
          onArchive: () => {},
          onDelete: () => {},
          onClose: () => {}
        }

    // Auto-track view when component mounts (if enabled)
    useEffect(() => {
      if (autoTrackView && trackingEnabled && !hasTrackedView.current) {
        trackingHandlers.onView()
        hasTrackedView.current = true
      }
    }, [autoTrackView, trackingEnabled, trackingHandlers])

    return (
      <WrappedComponent
        {...(restProps as P)}
        {...trackingHandlers}
      />
    )
  }

  WithAnalyticsTrackingComponent.displayName = 
    `withAnalyticsTracking(${WrappedComponent.displayName || WrappedComponent.name})`

  return WithAnalyticsTrackingComponent
}

// ============================================================================
// Hook for Manual Tracking
// ============================================================================

/**
 * Hook that provides analytics tracking handlers for manual use
 */
export function useNotificationAnalyticsTracking(
  notificationId: string,
  enabled: boolean = true
): AnalyticsTrackingHandlers {
  const { createTrackingHandlers } = useAutoAnalyticsTracking()
  
  return enabled 
    ? createTrackingHandlers(notificationId)
    : {
        onOpen: () => {},
        onClick: () => {},
        onDismiss: () => {},
        onView: () => {},
        onRead: () => {},
        onArchive: () => {},
        onDelete: () => {},
        onClose: () => {}
      }
}

// ============================================================================
// Intersection Observer Hook for View Tracking
// ============================================================================

/**
 * Hook that tracks when a notification becomes visible using Intersection Observer
 */
export function useViewTracking(
  notificationId: string,
  enabled: boolean = true,
  threshold: number = 0.5
) {
  const elementRef = useRef<HTMLElement>(null)
  const hasTracked = useRef(false)
  const { createTrackingHandlers } = useAutoAnalyticsTracking()
  
  useEffect(() => {
    if (!enabled || !elementRef.current || hasTracked.current) {
      return
    }

    const trackingHandlers = createTrackingHandlers(notificationId)
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            trackingHandlers.onView()
            hasTracked.current = true
          }
        })
      },
      { threshold }
    )

    observer.observe(elementRef.current)

    return () => {
      observer.disconnect()
    }
  }, [notificationId, enabled, threshold])

  return elementRef
}

// ============================================================================
// Analytics Context Provider
// ============================================================================

interface AnalyticsContextValue {
  trackingEnabled: boolean
  setTrackingEnabled: (enabled: boolean) => void
  batchSize: number
  setBatchSize: (size: number) => void
}

const AnalyticsContext = React.createContext<AnalyticsContextValue | null>(null)

export function AnalyticsProvider({ 
  children,
  defaultTrackingEnabled = true,
  defaultBatchSize = 10
}: {
  children: React.ReactNode
  defaultTrackingEnabled?: boolean
  defaultBatchSize?: number
}) {
  const [trackingEnabled, setTrackingEnabled] = React.useState(defaultTrackingEnabled)
  const [batchSize, setBatchSize] = React.useState(defaultBatchSize)

  const value: AnalyticsContextValue = {
    trackingEnabled,
    setTrackingEnabled,
    batchSize,
    setBatchSize
  }

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalyticsContext(): AnalyticsContextValue {
  const context = React.useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider')
  }
  return context
}

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Component that tracks clicks on any child element
 */
export function ClickTracker({ 
  notificationId, 
  action, 
  children,
  enabled = true 
}: {
  notificationId: string
  action?: string
  children: React.ReactNode
  enabled?: boolean
}) {
  const trackingHandlers = useNotificationAnalyticsTracking(notificationId, enabled)

  const handleClick = (event: React.MouseEvent) => {
    trackingHandlers.onClick(action)
    
    // Don't prevent default behavior, just track the click
  }

  return (
    <div onClick={handleClick} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}

/**
 * Component that tracks when it becomes visible
 */
export function ViewTracker({ 
  notificationId, 
  children,
  enabled = true,
  threshold = 0.5,
  className = ''
}: {
  notificationId: string
  children: React.ReactNode
  enabled?: boolean
  threshold?: number
  className?: string
}) {
  const elementRef = useViewTracking(notificationId, enabled, threshold)

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  )
}

export default withAnalyticsTracking