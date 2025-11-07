/**
 * Alert System Component
 * 
 * Real-time alert monitoring and notification system
 * Requirements: 7.1, 7.2
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { errorMonitor, type ErrorAlert, type AlertSeverity } from '../../utils/error-monitor'

interface AlertSystemProps {
  maxVisibleAlerts?: number
  autoHideDelay?: number
  showToasts?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

interface AlertToastProps {
  alert: ErrorAlert
  onDismiss: (alertId: string) => void
  onAcknowledge: (alertId: string) => void
  autoHide?: boolean
  hideDelay?: number
}

const AlertToast: React.FC<AlertToastProps> = ({
  alert,
  onDismiss,
  onAcknowledge,
  autoHide = true,
  hideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(hideDelay)

  useEffect(() => {
    if (!autoHide || alert.severity === 'critical') return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          setIsVisible(false)
          setTimeout(() => onDismiss(alert.id), 300)
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [autoHide, alert.severity, alert.id, onDismiss, hideDelay])

  const getSeverityStyles = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-900'
      case 'error':
        return 'bg-red-50 border-red-300 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-300 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-300 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-300 text-gray-800'
    }
  }

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📢'
    }
  }

  if (!isVisible) return null

  return (
    <div className={`
      transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto border-l-4
      ${getSeverityStyles(alert.severity)}
    `}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
          </div>
          <div className="ml-3 w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {alert.title}
              </p>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => onDismiss(alert.id)}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm">
              {alert.message}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {alert.timestamp.toLocaleTimeString()}
              </div>
              {!alert.acknowledged && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
                >
                  Acknowledge
                </button>
              )}
            </div>
            {autoHide && alert.severity !== 'critical' && timeLeft > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-gray-400 h-1 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / hideDelay) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface AlertListProps {
  alerts: ErrorAlert[]
  onAcknowledge: (alertId: string) => void
  onDismiss: (alertId: string) => void
}

const AlertList: React.FC<AlertListProps> = ({
  alerts,
  onAcknowledge,
  onDismiss
}) => {
  const groupedAlerts = alerts.reduce((groups, alert) => {
    const key = alert.acknowledged ? 'acknowledged' : 'active'
    if (!groups[key]) groups[key] = []
    groups[key]!.push(alert)
    return groups
  }, {} as Record<string, ErrorAlert[]>)

  return (
    <div className="space-y-4">
      {/* Active Alerts */}
      {groupedAlerts.active && groupedAlerts.active.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Active Alerts ({groupedAlerts.active.length})
          </h3>
          <div className="space-y-2">
            {groupedAlerts.active
              .sort((a, b) => {
                const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 }
                return severityOrder[b.severity] - severityOrder[a.severity]
              })
              .map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                    alert.severity === 'error' ? 'bg-red-50 border-red-400' :
                    alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">
                          {alert.severity === 'critical' ? '🚨' :
                           alert.severity === 'error' ? '❌' :
                           alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                        </span>
                        <h4 className="font-medium">{alert.title}</h4>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                          alert.severity === 'error' ? 'bg-red-100 text-red-700' :
                          alert.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{alert.message}</p>
                      <div className="mt-2 text-xs text-gray-500 space-x-4">
                        <span>Time: {alert.timestamp.toLocaleString()}</span>
                        <span>Threshold: {alert.threshold}</span>
                        <span>Current: {alert.currentValue}</span>
                        {alert.errorType && <span>Type: {alert.errorType}</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Acknowledged Alerts */}
      {groupedAlerts.acknowledged && groupedAlerts.acknowledged.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Acknowledged Alerts ({groupedAlerts.acknowledged.length})
          </h3>
          <div className="space-y-2">
            {groupedAlerts.acknowledged
              .slice(0, 10) // Show only last 10 acknowledged
              .map(alert => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-gray-50 border border-gray-200 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-sm mr-2">✅</span>
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">{alert.message}</p>
                      <div className="mt-1 text-xs text-gray-500">
                        Acknowledged by {alert.acknowledgedBy} at {alert.acknowledgedAt?.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => onDismiss(alert.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">✅</div>
          <p>No alerts at this time</p>
          <p className="text-sm">System is operating normally</p>
        </div>
      )}
    </div>
  )
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  maxVisibleAlerts = 5,
  autoHideDelay = 5000,
  showToasts = true,
  position = 'top-right'
}) => {
  const [alerts, setAlerts] = useState<ErrorAlert[]>([])
  const [visibleToasts, setVisibleToasts] = useState<ErrorAlert[]>([])
  const [showPanel, setShowPanel] = useState(false)

  // Subscribe to new alerts
  useEffect(() => {
    const unsubscribe = errorMonitor.subscribeToAlerts((newAlert) => {
      setAlerts(prev => [newAlert, ...prev])
      
      if (showToasts) {
        setVisibleToasts(prev => {
          const updated = [newAlert, ...prev.slice(0, maxVisibleAlerts - 1)]
          return updated
        })
      }
    })

    // Load existing alerts
    setAlerts(errorMonitor.getAlerts())

    return unsubscribe
  }, [maxVisibleAlerts, showToasts])

  const handleAcknowledge = useCallback((alertId: string) => {
    const success = errorMonitor.acknowledgeAlert(alertId, 'user') // In real app, get actual user ID
    if (success) {
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true, acknowledgedBy: 'user', acknowledgedAt: new Date() }
          : alert
      ))
    }
  }, [])

  const handleDismiss = useCallback((alertId: string) => {
    setVisibleToasts(prev => prev.filter(alert => alert.id !== alertId))
    // Note: We don't remove from main alerts array as they should remain for history
  }, [])

  const handleClearAll = useCallback(() => {
    setVisibleToasts([])
  }, [])

  const activeAlerts = alerts.filter(alert => !alert.acknowledged)
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical')

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  return (
    <>
      {/* Alert Badge/Button */}
      <div className={`fixed z-50 ${getPositionClasses()}`}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className={`
            relative p-3 rounded-full shadow-lg transition-all duration-200
            ${activeAlerts.length > 0 
              ? criticalAlerts.length > 0 
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
            }
          `}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {activeAlerts.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {activeAlerts.length > 99 ? '99+' : activeAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Toast Notifications */}
      {showToasts && visibleToasts.length > 0 && (
        <div className={`fixed z-40 ${getPositionClasses()} space-y-2 pointer-events-none`}>
          <div className="space-y-2 pointer-events-auto">
            {visibleToasts.map(alert => (
              <AlertToast
                key={alert.id}
                alert={alert}
                onDismiss={handleDismiss}
                onAcknowledge={handleAcknowledge}
                autoHide={alert.severity !== 'critical'}
                hideDelay={autoHideDelay}
              />
            ))}
            {visibleToasts.length > 1 && (
              <button
                onClick={handleClearAll}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
              >
                Clear all notifications
              </button>
            )}
          </div>
        </div>
      )}

      {/* Alert Panel */}
      {showPanel && (
        <div className="fixed inset-0 z-30 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">Alert Center</h2>
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <AlertList
                  alerts={alerts}
                  onAcknowledge={handleAcknowledge}
                  onDismiss={handleDismiss}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AlertSystem