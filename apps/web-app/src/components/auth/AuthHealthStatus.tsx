'use client'

/**
 * Authentication Health Status Component
 * Displays the current health status of authentication systems
 */

import React, { useState, useEffect } from 'react'
import { authResilience } from '@/lib/auth/resilience-integration'

interface AuthHealthStatusProps {
  showDetails?: boolean
  className?: string
}

interface HealthStatus {
  healthy: boolean
  serviceHealth: {
    healthy: boolean
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: Array<{
      service: string
      healthy: boolean
      status: 'healthy' | 'degraded' | 'unhealthy'
      responseTime: number
      errorRate: number
    }>
  }
  circuitBreakers: {
    healthy: boolean
    circuitBreakers: Record<string, {
      healthy: boolean
      state: 'closed' | 'open' | 'half-open'
      failureRate: number
    }>
  }
  degradation: {
    degraded: boolean
    cacheStats: {
      size: number
      staleEntries: number
    }
    activeRetries: number
  }
  recommendations: string[]
}

export function AuthHealthStatus({ showDetails = false, className = '' }: AuthHealthStatusProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const updateHealthStatus = () => {
      try {
        const status = authResilience.getResilienceStatus()
        setHealthStatus(status)
        setLastUpdated(new Date())
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to get health status:', error)
        setIsLoading(false)
      }
    }

    // Initial load
    updateHealthStatus()

    // Update every 30 seconds
    const interval = setInterval(updateHealthStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleForceRecovery = async () => {
    try {
      setIsLoading(true)
      await authResilience.forceRecovery()
      
      // Wait a moment for systems to stabilize, then update status
      setTimeout(() => {
        const status = authResilience.getResilienceStatus()
        setHealthStatus(status)
        setLastUpdated(new Date())
        setIsLoading(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to force recovery:', error)
      setIsLoading(false)
    }
  }

  if (isLoading && !healthStatus) {
    return (
      <div className={`p-4 border rounded-lg bg-gray-50 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
          <span className="text-sm text-gray-600">Checking system health...</span>
        </div>
      </div>
    )
  }

  if (!healthStatus) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <div className="text-sm text-red-600">Unable to determine system health</div>
      </div>
    )
  }

  const getStatusColor = (healthy: boolean, degraded?: boolean) => {
    if (healthy && !degraded) return 'green'
    if (degraded || !healthy) return 'yellow'
    return 'red'
  }

  const getStatusIcon = (color: string) => {
    switch (color) {
      case 'green':
        return (
          <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'yellow':
        return (
          <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const overallColor = getStatusColor(healthStatus.healthy, healthStatus.degradation.degraded)

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      {/* Overall Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon(overallColor)}
          <span className="font-medium text-sm">
            Authentication System Status
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          
          {!healthStatus.healthy && (
            <button
              onClick={handleForceRecovery}
              disabled={isLoading}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              {isLoading ? 'Recovering...' : 'Force Recovery'}
            </button>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="text-sm mb-3">
        {healthStatus.healthy ? (
          <span className="text-green-700">All systems operational</span>
        ) : healthStatus.degradation.degraded ? (
          <span className="text-yellow-700">Running in degraded mode</span>
        ) : (
          <span className="text-red-700">System issues detected</span>
        )}
      </div>

      {/* Recommendations */}
      {healthStatus.recommendations.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-700 mb-1">Status:</div>
          <ul className="text-xs text-gray-600 space-y-1">
            {healthStatus.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start space-x-1">
                <span className="text-gray-400">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Status */}
      {showDetails && (
        <div className="space-y-3 pt-3 border-t border-gray-200">
          {/* Service Health */}
          <div>
            <div className="text-xs font-medium text-gray-700 mb-2">Service Health</div>
            <div className="space-y-1">
              {healthStatus.serviceHealth.services.map((service) => (
                <div key={service.service} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(getStatusColor(service.healthy))}
                    <span>{service.service}</span>
                  </div>
                  <div className="text-gray-500">
                    {service.responseTime}ms | {(service.errorRate * 100).toFixed(1)}% errors
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Circuit Breakers */}
          <div>
            <div className="text-xs font-medium text-gray-700 mb-2">Circuit Breakers</div>
            <div className="space-y-1">
              {Object.entries(healthStatus.circuitBreakers.circuitBreakers).map(([name, breaker]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(getStatusColor(breaker.healthy))}
                    <span>{name}</span>
                  </div>
                  <div className="text-gray-500">
                    {breaker.state} | {(breaker.failureRate * 100).toFixed(1)}% failures
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cache Status */}
          {healthStatus.degradation.degraded && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-2">Cache Status</div>
              <div className="text-xs text-gray-600">
                <div>Cached items: {healthStatus.degradation.cacheStats.size}</div>
                <div>Stale entries: {healthStatus.degradation.cacheStats.staleEntries}</div>
                <div>Active retries: {healthStatus.degradation.activeRetries}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Compact health indicator for use in headers/status bars
 */
export function AuthHealthIndicator({ className = '' }: { className?: string }) {
  const [isHealthy, setIsHealthy] = useState(true)
  const [isDegraded, setIsDegraded] = useState(false)

  useEffect(() => {
    const checkHealth = () => {
      try {
        const status = authResilience.getResilienceStatus()
        setIsHealthy(status.healthy)
        setIsDegraded(status.degradation.degraded)
      } catch (error) {
        setIsHealthy(false)
        setIsDegraded(false)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)

    return () => clearInterval(interval)
  }, [])

  if (isHealthy && !isDegraded) {
    return null // Don't show indicator when everything is fine
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`h-2 w-2 rounded-full ${isDegraded ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
      <span className="text-xs text-gray-600">
        {isDegraded ? 'Limited' : 'Issues'}
      </span>
    </div>
  )
}