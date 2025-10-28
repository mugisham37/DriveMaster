'use client'

/**
 * OAuth Provider Management Component
 * 
 * Handles linking and unlinking OAuth providers for authenticated users
 * Displays linked providers with management options
 * Requirements: 5.4, 9.2, 9.5
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { oauthClient } from '@/lib/auth/oauth-client'
import { OAuthButton, PROVIDER_CONFIGS } from './OAuthButton'
import type { 
  OAuthProviderType, 
  OAuthError 
} from '@/types/auth-service'

// ============================================================================
// Component Props
// ============================================================================

export interface OAuthProviderManagerProps {
  className?: string
  onProviderLinked?: (provider: OAuthProviderType) => void
  onProviderUnlinked?: (provider: OAuthProviderType) => void
  onError?: (error: OAuthError, provider: OAuthProviderType) => void
}

// ============================================================================
// Provider Status Types
// ============================================================================

interface ProviderStatus {
  provider: OAuthProviderType
  enabled: boolean
  available: boolean
  linked: boolean
  displayName: string
  linkedAt?: string | undefined
  providerUsername?: string | undefined
}

// ============================================================================
// OAuth Provider Manager Component
// ============================================================================

export const OAuthProviderManager: React.FC<OAuthProviderManagerProps> = ({
  className = '',
  onProviderLinked,
  onProviderUnlinked,
  onError
}) => {
  const { isAuthenticated } = useAuth()
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingProvider, setProcessingProvider] = useState<OAuthProviderType | null>(null)
  
  // ============================================================================
  // Load Provider Data
  // ============================================================================
  
  const loadProviderData = useCallback(async () => {
    if (!isAuthenticated) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Get all provider statuses and linked providers in parallel
      const [allStatuses, linkedProvidersData] = await Promise.all([
        oauthClient.getAllProvidersStatus(),
        oauthClient.getLinkedProviders()
      ])
      
      // Convert to array format with linked information
      const providerList: ProviderStatus[] = Object.entries(allStatuses).map(([providerKey, status]) => {
        const provider = providerKey as OAuthProviderType
        const linkedProvider = linkedProvidersData.find(lp => lp.provider === provider && lp.isActive)
        
        return {
          provider,
          ...status,
          linkedAt: linkedProvider?.linkedAt || undefined,
          providerUsername: linkedProvider?.providerUsername || undefined
        }
      })
      
      setProviders(providerList)
    } catch (err) {
      console.error('Failed to load provider data:', err)
      setError('Failed to load OAuth provider information')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])
  
  useEffect(() => {
    loadProviderData()
  }, [loadProviderData])
  
  // ============================================================================
  // Provider Actions
  // ============================================================================
  
  const handleLinkSuccess = useCallback((provider: OAuthProviderType) => {
    setProcessingProvider(null)
    onProviderLinked?.(provider)
    // Reload provider data to reflect changes
    loadProviderData()
  }, [onProviderLinked, loadProviderData])
  
  const handleLinkError = useCallback((error: OAuthError, provider: OAuthProviderType) => {
    setProcessingProvider(null)
    onError?.(error, provider)
  }, [onError])
  
  const handleUnlinkProvider = useCallback(async (provider: OAuthProviderType) => {
    if (!window.confirm(`Are you sure you want to unlink your ${PROVIDER_CONFIGS[provider].displayName} account?`)) {
      return
    }
    
    setProcessingProvider(provider)
    
    try {
      await oauthClient.unlinkProvider(provider)
      onProviderUnlinked?.(provider)
      // Reload provider data to reflect changes
      await loadProviderData()
    } catch (err) {
      const oauthError = err as OAuthError
      onError?.(oauthError, provider)
    } finally {
      setProcessingProvider(null)
    }
  }, [onProviderUnlinked, onError, loadProviderData])
  
  // ============================================================================
  // Render Helpers
  // ============================================================================
  
  const renderProviderCard = (providerStatus: ProviderStatus) => {
    const config = PROVIDER_CONFIGS[providerStatus.provider]
    const IconComponent = config.icon
    const isProcessing = processingProvider === providerStatus.provider
    
    return (
      <div 
        key={providerStatus.provider}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <IconComponent className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {providerStatus.displayName}
              </h3>
              {providerStatus.linked ? (
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    Connected
                  </div>
                  {providerStatus.providerUsername && (
                    <div>as {providerStatus.providerUsername}</div>
                  )}
                  {providerStatus.linkedAt && (
                    <div>
                      since {new Date(providerStatus.linkedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  <div className="flex items-center">
                    <span className="inline-block w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
                    Not connected
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0">
            {!providerStatus.enabled ? (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                Disabled
              </span>
            ) : providerStatus.linked ? (
              <button
                onClick={() => handleUnlinkProvider(providerStatus.provider)}
                disabled={isProcessing}
                className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Unlinking...' : 'Unlink'}
              </button>
            ) : (
              <OAuthButton
                provider={providerStatus.provider}
                mode="link"
                flow="popup"
                onSuccess={() => handleLinkSuccess(providerStatus.provider)}
                onError={(error) => handleLinkError(error, providerStatus.provider)}
                disabled={isProcessing}
                size="sm"
                variant="outline"
                showIcon={false}
                className="text-xs"
              >
                {isProcessing ? 'Linking...' : 'Link'}
              </OAuthButton>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  if (!isAuthenticated) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500">Please sign in to manage OAuth providers.</p>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadProviderData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
  
  const linkedCount = providers.filter(p => p.linked).length
  const availableCount = providers.filter(p => p.enabled).length
  
  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Connected Accounts
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Link your social accounts to sign in more easily. You have {linkedCount} of {availableCount} available providers connected.
        </p>
      </div>
      
      <div className="space-y-3">
        {providers.map(renderProviderCard)}
      </div>
      
      {linkedCount === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400 mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            No Connected Accounts
          </h3>
          <p className="text-sm text-gray-500">
            Link your social accounts to make signing in faster and more convenient.
          </p>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg 
              className="h-5 w-5 text-blue-400" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Security Note
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Linking multiple accounts provides backup sign-in methods and makes it easier to access your account. 
                You can unlink accounts at any time, but make sure you have at least one way to sign in.
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

export default OAuthProviderManager