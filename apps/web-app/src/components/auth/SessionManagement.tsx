'use client'

/**
 * Session Management Interface
 * 
 * Interface for viewing and managing active sessions
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { Session, AuthError as AuthErrorType } from '@/types/auth-service'

// ============================================================================
// Component Props
// ============================================================================

export interface SessionManagementProps {
  className?: string
  onSessionInvalidated?: (sessionId: string) => void
  onError?: (error: AuthErrorType) => void
}

// ============================================================================
// Session Management Component
// ============================================================================

export const SessionManagement: React.FC<SessionManagementProps> = ({
  className = '',
  onSessionInvalidated,
  onError
}) => {
  const { user } = useAuth()
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInvalidating, setIsInvalidating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // ============================================================================
  // Data Loading
  // ============================================================================
  
  const loadSessions = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to load sessions')
      }
      
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions'
      setError(errorMessage)
      
      const authError: AuthErrorType = {
        type: 'network',
        message: errorMessage,
        recoverable: true
      }
      onError?.(authError)
    } finally {
      setIsLoading(false)
    }
  }, [user, onError])
  
  // Helper function to get access token (would be implemented in auth context)
  const getAccessToken = async (): Promise<string> => {
    // This would be implemented to get the current access token
    return ''
  }
  
  useEffect(() => {
    loadSessions()
  }, [loadSessions])
  
  // ============================================================================
  // Session Actions
  // ============================================================================
  
  const handleInvalidateSession = useCallback(async (sessionId: string) => {
    if (isInvalidating) return
    
    setIsInvalidating(sessionId)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to invalidate session')
      }
      
      // Remove session from list
      setSessions(prev => prev.filter(session => session.id !== sessionId))
      setSuccess('Session invalidated successfully')
      onSessionInvalidated?.(sessionId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to invalidate session'
      setError(errorMessage)
      
      const authError: AuthErrorType = {
        type: 'network',
        message: errorMessage,
        recoverable: true
      }
      onError?.(authError)
    } finally {
      setIsInvalidating(null)
    }
  }, [isInvalidating, onSessionInvalidated, onError])
  
  const handleInvalidateAllOtherSessions = useCallback(async () => {
    if (isInvalidating) return
    
    setIsInvalidating('all')
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/auth/sessions/invalidate-others', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to invalidate sessions')
      }
      
      // Keep only current session
      setSessions(prev => prev.filter(session => session.isCurrent))
      setSuccess('All other sessions have been invalidated')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to invalidate sessions'
      setError(errorMessage)
      
      const authError: AuthErrorType = {
        type: 'network',
        message: errorMessage,
        recoverable: true
      }
      onError?.(authError)
    } finally {
      setIsInvalidating(null)
    }
  }, [isInvalidating, onError])
  
  const handleRefreshSessions = useCallback(() => {
    loadSessions()
  }, [loadSessions])
  
  // ============================================================================
  // Render Helpers
  // ============================================================================
  
  const formatLastActive = (lastActiveAt: Date): string => {
    const now = new Date()
    const diff = now.getTime() - lastActiveAt.getTime()
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
  
  const getDeviceIcon = (deviceInfo: string): React.ReactNode => {
    const info = deviceInfo.toLowerCase()
    
    if (info.includes('mobile') || info.includes('android') || info.includes('iphone')) {
      return (
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" />
        </svg>
      )
    }
    
    if (info.includes('tablet') || info.includes('ipad')) {
      return (
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
    
    // Default to desktop/laptop
    return (
      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  }
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please sign in to view session information.</p>
      </div>
    )
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage your active sessions across different devices and browsers.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleRefreshSessions}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="-ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
          
          {sessions.filter(s => !s.isCurrent).length > 0 && (
            <button
              type="button"
              onClick={handleInvalidateAllOtherSessions}
              disabled={isInvalidating === 'all'}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isInvalidating === 'all' ? 'Invalidating...' : 'Revoke All Others'}
            </button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Sessions List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No active sessions found.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <li key={session.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {getDeviceIcon(session.deviceInfo)}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {session.deviceInfo}
                        </p>
                        {session.isCurrent && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Current Session
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <p>IP: {session.ipAddress}</p>
                        <span className="mx-2">•</span>
                        <p>Last active: {formatLastActive(new Date(session.lastActiveAt))}</p>
                      </div>
                    </div>
                  </div>
                  
                  {!session.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleInvalidateSession(session.id)}
                      disabled={isInvalidating === session.id}
                      className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {isInvalidating === session.id ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Revoking...
                        </>
                      ) : (
                        'Revoke'
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Footer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Session Security
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Sessions are automatically invalidated after periods of inactivity. 
                If you notice any suspicious activity, revoke those sessions immediately 
                and change your password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default SessionManagement