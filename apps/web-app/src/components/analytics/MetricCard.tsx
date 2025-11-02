/**
 * MetricCard Component
 * 
 * Displays key analytics metrics in a card format with real-time updates,
 * loading states, and error handling.
 * 
 * Requirements: 3.1, 3.2, 6.3
 */

'use client'

import React, { memo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/common/Icon'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface MetricCardProps {
  title: string
  value: string | number
  previousValue?: string | number
  unit?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  trendPercentage?: number
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  isRealtime?: boolean
  lastUpdated?: Date
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  onClick?: () => void
}

// ============================================================================
// Component
// ============================================================================

export const MetricCard = memo<MetricCardProps>(({
  title,
  value,
  previousValue,
  unit,
  icon,
  trend,
  trendPercentage,
  isLoading = false,
  isError = false,
  errorMessage,
  isRealtime = false,
  lastUpdated,
  className,
  size = 'md',
  variant = 'default',
  onClick
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`
      }
      return val.toLocaleString()
    }
    return val
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up'
      case 'down':
        return 'trending-down'
      default:
        return 'minus'
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'p-3'
      case 'lg':
        return 'p-6'
      default:
        return 'p-4'
    }
  }

  return (
    <Card
      className={cn(
        'relative transition-all duration-200 hover:shadow-md',
        getVariantStyles(),
        getSizeStyles(),
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      {/* Real-time indicator */}
      {isRealtime && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon && (
            <div className="p-2 bg-gray-100 rounded-lg">
              <Icon icon={icon} className="w-4 h-4 text-gray-600" />
            </div>
          )}
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="small" />
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        ) : isError ? (
          <div className="text-red-600">
            <p className="text-sm font-medium">Error</p>
            {errorMessage && (
              <p className="text-xs text-red-500">{errorMessage}</p>
            )}
          </div>
        ) : (
          <>
            {/* Main value */}
            <div className="flex items-baseline space-x-1">
              <span className={cn(
                'font-bold',
                size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl'
              )}>
                {formatValue(value)}
              </span>
              {unit && (
                <span className="text-sm text-gray-500">{unit}</span>
              )}
            </div>

            {/* Trend indicator */}
            {trend && trendPercentage !== undefined && (
              <div className="flex items-center space-x-1">
                <Icon 
                  icon={getTrendIcon()} 
                  className={cn('w-3 h-3', getTrendColor())} 
                />
                <span className={cn('text-xs font-medium', getTrendColor())}>
                  {Math.abs(trendPercentage).toFixed(1)}%
                </span>
                {previousValue && (
                  <span className="text-xs text-gray-500">
                    vs {formatValue(previousValue)}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {lastUpdated && !isLoading && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      )}
    </Card>
  )
})

MetricCard.displayName = 'MetricCard'

// ============================================================================
// Metric Card Grid Component
// ============================================================================

export interface MetricCardGridProps {
  metrics: Array<MetricCardProps & { id: string }>
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export const MetricCardGrid: React.FC<MetricCardGridProps> = ({
  metrics,
  columns = 3,
  gap = 'md',
  className
}) => {
  const getGridCols = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1'
      case 2:
        return 'grid-cols-1 md:grid-cols-2'
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    }
  }

  const getGapSize = () => {
    switch (gap) {
      case 'sm':
        return 'gap-3'
      case 'lg':
        return 'gap-8'
      default:
        return 'gap-6'
    }
  }

  return (
    <div className={cn(
      'grid',
      getGridCols(),
      getGapSize(),
      className
    )}>
      {metrics.map(({ id, ...metricProps }) => (
        <MetricCard key={id} {...metricProps} />
      ))}
    </div>
  )
}