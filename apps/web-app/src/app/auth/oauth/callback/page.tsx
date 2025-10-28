'use client'

/**
 * OAuth Callback Handler Page
 * 
 * Handles OAuth callbacks from all providers and processes authorization codes
 * Implements state validation and error handling for OAuth flows
 * Requirements: 5.2, 5.3, 5.5
 */

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { oauthClient } from '@/lib/auth/oauth-client'
import { integratedTokenManager } from '@/lib/auth/token-manager'
import type { OAuthProviderType, OAuthError } from '@/types/auth-service'

// ============================================================================
// Callback State Types
// ============================================================================

type CallbackState = 
  | 'processing'
  | 'success'
  | 'error'
  | 'invalid_request'

interface CallbackResult {
  state: CallbackState
  error?: OAuthError
  provider?: OAuthProviderType
  isNewUser?: boolean
  redirectUrl?: string
}

// ============================================================================
// OAuth Callback Page Component
// ============================================================================

export default function OAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state: authState } = useAuth()
  
  const [result, setResult] = useState<CallbackResult>({
    state: 'processing'
  })
  
  // ============================================================================
  // Extract URL Parameters
  // ============================================================================
  
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const provider = searchParams.get('provider') as OAuthProviderType
  
  // ============================================================================
  // Process OAuth Callback
  // ============================================================================
  
  useEffect(() => {
    let isMounted = true
    
    const processCallback = async () => {
      try {
        // Check for OAuth provider errors first
        if (error) {
          const oauthError: OAuthError = {
            type: 'oauth',
            code: error === 'access_denied' ? 'OAUTH_DENIED' : 'OAUTH_ERROR',
            message: errorDescription || `OAuth authentication failed: ${error}`,
            provider: provider || undefined,
            recoverable: error !== 'access_denied'
          }
          
          if (isMounted) {
            setResult({
              state: 'error',
              error: oauthError,
              provider
            })
          }
          return
        }
        
        // Validate required parameters
        if (!code || !state) {
          if (isMounted) {
            setResult({
              state: 'invalid_request',
              error: {
                type: 'oauth',
                code: 'INVALID_CODE',
                message: 'Missing required OAuth parameters',
                recoverable: false
              }
            })
          }
          return
        }
        
        // Extract provider from state if not in URL
        let detectedProvider = provider
        if (!detectedProvider) {
          try {
            const stateData = JSON.parse(atob(state))
            detectedProvider = stateData.provider
          } catch {
            // State parsing failed, continue without provider detection
          }
        }
        
        if (!detectedProvider) {
          if (isMounted) {
            setResult({
              state: 'invalid_request',
              error: {
                type: 'oauth',
                code: 'OAUTH_ERROR',
                message: 'Unable to determine OAuth provider',
                recoverable: false
              }
            })
          }
          return
        }
        
        // Determine if this is a linking operation
        const isLinking = state.includes('operation') && state.includes('link')
        
        if (isLinking) {
          // Handle provider linking
          await oauthClient.linkProvider(detectedProvider, code, state)
          
          if (isMounted) {
            setResult({
              state: 'success',
              provider: detectedProvider,
              isNewUser: false
            })
          }
        } else {
          // Handle authentication
          const authResult = await oauthClient.handleCallback(detectedProvider, code, state)
          
          // Store tokens using integrated token manager
          await integratedTokenManager.storeTokens(
            authResult.tokens, 
            authResult.user as unknown as Record<string, unknown>
          )
          
          if (isMounted) {
            setResult({
              state: 'success',
              provider: detectedProvider,
              isNewUser: authResult.isNewUser
            })
          }
        }
      } catch (err) {
        console.error('OAuth callback processing failed:', err)
        
        if (isMounted) {
          const oauthError = err as OAuthError
          setResult({
            state: 'error',
            error: oauthError,
            provider: provider || undefined
          })
        }
      }
    }
    
    // Only process if we have the required parameters or an error
    if (code || error) {
      processCallback()
    } else {
      setResult({
        state: 'invalid_request',
        error: {
          type: 'oauth',
          code: 'INVALID_CODE',
          message: 'No OAuth response received',
          recoverable: false
        }
      })
    }
    
    return () => {
      isMounted = false
    }
  }, [code, state, error, errorDescription, provider])
  
  // ============================================================================
  // Handle Redirect After Processing
  // ============================================================================
  
  useEffect(() => {
    if (result.state === 'success') {
      // Extract redirect URL from state
      let redirectUrl = '/dashboard'
      
      if (state) {
        try {
          const stateData = JSON.parse(atob(state))
          redirectUrl = stateData.redirectUrl || redirectUrl
        } catch {
          // Use default redirect URL if state parsing fails
        }
      }
      
      // Delay redirect to show success message briefly
      const timer = setTimeout(() => {
        router.push(redirectUrl)
      }, 2000)
      
      return () => clearTimeout(timer)
    } else if (result.state === 'error' || result.state === 'invalid_request') {
      // Redirect to sign-in page with error after delay
      const timer = setTimeout(() => {
        const errorParam = encodeURIComponent(result.error?.message || 'OAuth authentication failed')
        router.push(`/auth/signin?error=${errorParam}`)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
    
    // Return undefined for other states
    return undefined
  }, [result, state, router])
  
  // ============================================================================
  // Render States
  // ============================================================================
  
  const renderProcessing = () => (
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Processing Authentication
      </h2>
      <p className="text-gray-600">
        Please wait while we complete your sign-in...
      </p>
    </div>
  )
  
  const renderSuccess = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
        <svg 
          className="h-6 w-6 text-green-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {result.provider ? `${result.provider.charAt(0).toUpperCase() + result.provider.slice(1)} ` : ''}
        Authentication Successful
      </h2>
      <p className="text-gray-600 mb-4">
        {result.isNewUser 
          ? 'Welcome! Your account has been created successfully.'
          : 'Welcome back! You have been signed in successfully.'
        }
      </p>
      <p className="text-sm text-gray-500">
        Redirecting you to your dashboard...
      </p>
    </div>
  )
  
  const renderError = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <svg 
          className="h-6 w-6 text-red-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Authentication Failed
      </h2>
      <p className="text-gray-600 mb-4">
        {result.error?.message || 'An error occurred during authentication.'}
      </p>
      {result.error?.recoverable && (
        <p className="text-sm text-gray-500 mb-4">
          You can try signing in again or use a different method.
        </p>
      )}
      <button
        onClick={() => router.push('/auth/signin')}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Back to Sign In
      </button>
    </div>
  )
  
  const renderInvalidRequest = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
        <svg 
          className="h-6 w-6 text-yellow-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Invalid Request
      </h2>
      <p className="text-gray-600 mb-4">
        The authentication request is invalid or has expired.
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Please start the sign-in process again.
      </p>
      <button
        onClick={() => router.push('/auth/signin')}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Back to Sign In
      </button>
    </div>
  )
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {result.state === 'processing' && renderProcessing()}
          {result.state === 'success' && renderSuccess()}
          {result.state === 'error' && renderError()}
          {result.state === 'invalid_request' && renderInvalidRequest()}
        </div>
        
        {/* Debug information in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 rounded-lg p-4 text-xs text-gray-600">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <div className="space-y-1">
              <div>Code: {code || 'None'}</div>
              <div>State: {state || 'None'}</div>
              <div>Error: {error || 'None'}</div>
              <div>Provider: {provider || 'None'}</div>
              <div>Auth State: {authState.isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}