/**
 * AnalyticsNavigation Component
 * 
 * Navigation components for analytics features integration
 * into the main application navigation and user interfaces.
 * 
 * Requirements: 5.1, 5.2, 7.3, 9.1
 */

'use client'

import React, { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/common/Icon'
import { cn } from '@/lib/utils'
import { useAnalyticsContext } from '@/contexts/AnalyticsContext'
import { useAlerts } from '@/hooks/useAnalytics'

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsNavItemProps {
  href: string
  icon: string
  label: string
  badge?: string | number
  isActive?: boolean
  disabled?: boolean
  className?: string
}

export interface AnalyticsNavigationProps {
  variant?: 'sidebar' | 'header' | 'dropdown'
  showBadges?: boolean
  className?: string
}

// ============================================================================
// Navigation Items Configuration
// ============================================================================

const analyticsNavItems = [
  {
    href: '/analytics',
    icon: 'bar-chart-2',
    label: 'Dashboard',
    key: 'dashboard'
  },
  {
    href: '/analytics/engagement',
    icon: 'users',
    label: 'User Engagement',
    key: 'engagement'
  },
  {
    href: '/analytics/progress',
    icon: 'trending-up',
    label: 'Learning Progress',
    key: 'progress'
  },
  {
    href: '/analytics/content',
    icon: 'file-text',
    label: 'Content Performance',
    key: 'content'
  },
  {
    href: '/analytics/system',
    icon: 'server',
    label: 'System Metrics',
    key: 'system'
  },
  {
    href: '/analytics/reports',
    icon: 'file-bar-chart',
    label: 'Reports',
    key: 'reports'
  }
]

// ============================================================================
// Analytics Nav Item Component
// ============================================================================

const AnalyticsNavItem = memo<AnalyticsNavItemProps>(({
  href,
  icon,
  label,
  badge,
  isActive = false,
  disabled = false,
  className
}) => {
  const baseClasses = cn(
    'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200',
    isActive 
      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  )

  const content = (
    <>
      <Icon name={icon} className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
      {badge && (
        <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs ml-auto">
          {badge}
        </Badge>
      )}
    </>
  )

  if (disabled) {
    return (
      <div className={baseClasses}>
        {content}
      </div>
    )
  }

  return (
    <Link href={href} className={baseClasses}>
      {content}
    </Link>
  )
})

AnalyticsNavItem.displayName = 'AnalyticsNavItem'

// ============================================================================
// Main Analytics Navigation Component
// ============================================================================

export const AnalyticsNavigation = memo<AnalyticsNavigationProps>(({
  variant = 'sidebar',
  showBadges = true,
  className
}) => {
  const pathname = usePathname()
  const { permissions, isServiceAvailable } = useAnalyticsContext()
  const { alerts } = useAlerts()

  // Get alert count for system metrics badge
  const systemAlertCount = alerts?.filter(alert => 
    alert.type === 'system_performance' && !alert.resolved
  ).length || 0

  // Check if user has permission to access analytics features
  const hasAnalyticsAccess = permissions?.viewEngagement || 
                            permissions?.viewProgress || 
                            permissions?.viewSystemMetrics

  if (!hasAnalyticsAccess) {
    return null
  }

  const getNavItemBadge = (key: string) => {
    if (!showBadges) return undefined
    
    switch (key) {
      case 'system':
        return systemAlertCount > 0 ? systemAlertCount : undefined
      default:
        return undefined
    }
  }

  const isNavItemDisabled = (key: string) => {
    if (!isServiceAvailable) return true
    
    switch (key) {
      case 'engagement':
        return !permissions?.viewEngagement
      case 'progress':
        return !permissions?.viewProgress
      case 'content':
        return !permissions?.viewContentMetrics
      case 'system':
        return !permissions?.viewSystemMetrics
      case 'reports':
        return !permissions?.generateReports
      default:
        return false
    }
  }

  const getContainerClasses = () => {
    switch (variant) {
      case 'header':
        return 'flex items-center space-x-1'
      case 'dropdown':
        return 'space-y-1 min-w-48'
      default:
        return 'space-y-1'
    }
  }

  return (
    <nav className={cn(getContainerClasses(), className)}>
      {variant === 'sidebar' && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Analytics
          </h3>
          {!isServiceAvailable && (
            <p className="text-xs text-yellow-600 mt-1">
              Service unavailable
            </p>
          )}
        </div>
      )}

      {analyticsNavItems.map((item) => (
        <AnalyticsNavItem
          key={item.key}
          href={item.href}
          icon={item.icon}
          label={item.label}
          badge={getNavItemBadge(item.key)}
          isActive={pathname === item.href}
          disabled={isNavItemDisabled(item.key)}
          className={variant === 'header' ? 'px-2 py-1' : undefined}
        />
      ))}
    </nav>
  )
})

AnalyticsNavigation.displayName = 'AnalyticsNavigation'

// ============================================================================
// Analytics Quick Access Component
// ============================================================================

export interface AnalyticsQuickAccessProps {
  className?: string
}

export const AnalyticsQuickAccess = memo<AnalyticsQuickAccessProps>(({
  className
}) => {
  const { isConnected, permissions } = useAnalyticsContext()
  const { alerts } = useAlerts()

  const criticalAlerts = alerts?.filter(alert => 
    alert.severity === 'critical' && !alert.resolved
  ).length || 0

  if (!permissions?.viewEngagement && !permissions?.viewSystemMetrics) {
    return null
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {/* Real-time Status Indicator */}
      <div className="flex items-center space-x-1">
        <div className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        )} />
        <span className="text-xs text-gray-500">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Critical Alerts Badge */}
      {criticalAlerts > 0 && (
        <Link href="/analytics/system" className="relative">
          <Icon name="alert-triangle" className="w-4 h-4 text-red-600" />
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 text-xs px-1 min-w-4 h-4"
          >
            {criticalAlerts}
          </Badge>
        </Link>
      )}

      {/* Quick Dashboard Link */}
      <Link 
        href="/analytics" 
        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        Analytics
      </Link>
    </div>
  )
})

AnalyticsQuickAccess.displayName = 'AnalyticsQuickAccess'

// ============================================================================
// Analytics Widget for User Dashboard
// ============================================================================

export interface AnalyticsWidgetProps {
  userId?: string
  showPersonalMetrics?: boolean
  className?: string
}

export const AnalyticsWidget = memo<AnalyticsWidgetProps>(({
  userId,
  showPersonalMetrics = true,
  className
}) => {
  const { permissions, isServiceAvailable } = useAnalyticsContext()

  // Mock personal analytics data
  const personalMetrics = {
    completedExercises: 42,
    currentStreak: 7,
    averageAccuracy: 0.85,
    timeSpentLearning: 120 // minutes
  }

  if (!permissions?.viewProgress || !isServiceAvailable) {
    return null
  }

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Your Progress</h3>
        <Link 
          href="/analytics/progress" 
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          View Details
        </Link>
      </div>

      {showPersonalMetrics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {personalMetrics.completedExercises}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {personalMetrics.currentStreak}
            </div>
            <div className="text-xs text-gray-500">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {(personalMetrics.averageAccuracy * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {Math.floor(personalMetrics.timeSpentLearning / 60)}h
            </div>
            <div className="text-xs text-gray-500">This Week</div>
          </div>
        </div>
      )}
    </div>
  )
})

AnalyticsWidget.displayName = 'AnalyticsWidget'