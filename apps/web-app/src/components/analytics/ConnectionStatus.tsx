/**
 * ConnectionStatus Component
 * 
 * Displays real-time connection status for analytics services with
 * health indicators, connection details, and retry functionality.
 * 
 * Requirements: 3.1, 3.2, 6.3
 */

'use client'

import React, { memo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/common/Icon'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { 
  ConnectionStatus as ConnectionStatusType,
  ServiceHealthStatus 
} from '@/types/analytics-service'

// ============================================================================
// Types
// ============================================================================

export interface ConnectionStatusProps {
  connectionStatus: ConnectionStatusType
  serviceHealth?: ServiceHealthStatus | null
  isConnected: boolean
  lastConnectionAttempt?: Date | null
  reconnectAttempts?: number
  maxReconnectAttempts?: number
  onRetryConnection?: () => void
  onToggleConnection?: () => void
  showDetails?: boolean
  className?: string
}

export interface ServiceStatusIndicatorProps {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  label: string
  details?: string
  className?: string
}

// ============================================================================
// Status Configuration
// ============================================================================

const connectionStatusConfig = {
  connected: {
    icon: 'wifi',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badgeVariant: 'default' as const,
    label: 'Connected'
  },
  connecting: {
    icon: 'loader',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeVariant: 'secondary' as const,
    label: 'Connecting'
  },
  disconnected: {
    icon: 'wifi-off',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    badgeVariant: 'outline' as const,
    label: 'Disconnected'
  },
  disconnecting: {
    icon: 'wifi-off',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    badgeVariant: 'outline' as const,
    label: 'Disconnecting'
  },
  reconnecting: {
    icon: 'refresh-cw',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeVariant: 'secondary' as const,
    label: 'Reconnecting'
  },
  error: {
    icon: 'alert-circle',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeVariant: 'destructive' as const,
    label: 'Connection Error'
  }
}

const healthStatusConfig = {
  healthy: {
    icon: 'check-circle',
    color: 'text-green-600',
    label: 'Healthy'
  },
  degraded: {
    icon: 'alert-triangle',
    color: 'text-yellow-600',
    label: 'Degraded'
  },
  unhealthy: {
    icon: 'x-circle',
    color: 'text-red-600',
    label: 'Unhealthy'
  },
  unknown: {
    icon: 'help-circle',
    color: 'text-gray-600',
    label: 'Unknown'
  }
}

// ============================================================================
// Service Status Indicator Component
// ============================================================================

const ServiceStatusIndicator = memo<ServiceStatusIndicatorProps>(({
  status,
  label,
  details,
  className
}) => {
  const config = healthStatusConfig[status]

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Icon 
        icon={config.icon} 
        className={cn('w-4 h-4', config.color)} 
      />
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          <Badge 
            variant={status === 'healthy' ? 'default' : status === 'degraded' ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {config.label}
          </Badge>
        </div>
        {details && (
          <p className="text-xs text-gray-500 mt-1">{details}</p>
        )}
      </div>
    </div>
  )
})

ServiceStatusIndicator.displayName = 'ServiceStatusIndicator'

// ============================================================================
// Main Connection Status Component
// ============================================================================

export const ConnectionStatus = memo<ConnectionStatusProps>(({
  connectionStatus,
  serviceHealth,
  isConnected,
  lastConnectionAttempt,
  reconnectAttempts = 0,
  maxReconnectAttempts = 5,
  onRetryConnection,
  onToggleConnection,
  showDetails = true,
  className
}) => {
  const [isRetrying, setIsRetrying] = useState(false)
  const config = connectionStatusConfig[connectionStatus]

  const handleRetryConnection = async () => {
    if (onRetryConnection && !isRetrying) {
      setIsRetrying(true)
      try {
        await onRetryConnection()
      } finally {
        setIsRetrying(false)
      }
    }
  }

  const formatLastAttempt = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)

    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffMins < 60) return `${diffMins}m ago`
    return date.toLocaleTimeString()
  }

  const getConnectionQuality = () => {
    if (!isConnected) return null
    
    // Simple connection quality based on reconnect attempts
    if (reconnectAttempts === 0) return 'Excellent'
    if (reconnectAttempts < 3) return 'Good'
    if (reconnectAttempts < 5) return 'Fair'
    return 'Poor'
  }

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Connection Status</h3>
        
        {onToggleConnection && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleConnection}
            className="text-xs"
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </Button>
        )}
      </div>

      {/* Main Status */}
      <div className={cn(
        'p-4 border rounded-lg mb-4',
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Icon 
                name={config.icon} 
                className={cn(
                  'w-6 h-6',
                  config.color,
                  connectionStatus === 'connecting' || connectionStatus === 'reconnecting' 
                    ? 'animate-spin' 
                    : ''
                )} 
              />
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{config.label}</span>
                <Badge variant={config.badgeVariant} className="text-xs">
                  {connectionStatus.toUpperCase()}
                </Badge>
              </div>
              
              {showDetails && (
                <div className="text-sm text-gray-600 mt-1">
                  {connectionStatus === 'connected' && getConnectionQuality() && (
                    <span>Quality: {getConnectionQuality()}</span>
                  )}
                  {connectionStatus === 'reconnecting' && (
                    <span>Attempt {reconnectAttempts + 1} of {maxReconnectAttempts}</span>
                  )}
                  {lastConnectionAttempt && (
                    <span className="ml-2">
                      Last attempt: {formatLastAttempt(lastConnectionAttempt)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Retry Button */}
          {!isConnected && onRetryConnection && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryConnection}
              disabled={isRetrying || connectionStatus === 'connecting'}
              className="text-xs"
            >
              {isRetrying ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <Icon icon="refresh-cw" className="w-3 h-3 mr-1" />
                  Retry
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Service Health Details */}
      {showDetails && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Service Health</h4>
          
          <div className="space-y-2">
            <ServiceStatusIndicator
              status={serviceHealth?.status || 'unknown'}
              label="Analytics Service"
              details={serviceHealth?.status === 'healthy' 
                ? 'All systems operational' 
                : serviceHealth?.status === 'degraded'
                ? 'Some features may be limited'
                : serviceHealth?.status === 'unhealthy'
                ? 'Service experiencing issues'
                : 'Unable to determine service status'
              }
            />
            
            <ServiceStatusIndicator
              status={isConnected ? 'healthy' : 'unhealthy'}
              label="WebSocket Connection"
              details={isConnected 
                ? 'Real-time updates active' 
                : 'Real-time updates unavailable'
              }
            />
            
            <ServiceStatusIndicator
              status={connectionStatus === 'connected' ? 'healthy' : 'degraded'}
              label="Data Synchronization"
              details={connectionStatus === 'connected'
                ? 'Data is up to date'
                : 'Using cached data'
              }
            />
          </div>

          {/* Additional Health Details */}
          {serviceHealth?.details && Object.keys(serviceHealth.details).length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Service Details
                </summary>
                <div className="mt-2 space-y-1 text-xs">
                  {Object.entries(serviceHealth.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500">{key}:</span>
                      <span className="text-gray-700 font-mono">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Connection Statistics */}
          {showDetails && isConnected && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-900">{reconnectAttempts}</div>
                <div className="text-xs text-gray-500">Reconnects</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-gray-900">
                  {serviceHealth?.timestamp 
                    ? formatLastAttempt(new Date(serviceHealth.timestamp))
                    : 'N/A'
                  }
                </div>
                <div className="text-xs text-gray-500">Last Check</div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
})

ConnectionStatus.displayName = 'ConnectionStatus'