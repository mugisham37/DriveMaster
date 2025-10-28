'use client'

/**
 * OAuth Button Component with Provider-Specific Branding
 * 
 * Implements:
 * - Provider-specific branding and icons
 * - OAuth flow initiation with popup and redirect support
 * - State parameter generation and validation for CSRF protection
 * - OAuth error handling with specific error messages
 * - Requirements: 5.1, 5.2, 5.5, 1.2
 */

import React, { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { oauthClient } from '@/lib/auth/oauth-client'
import type { OAuthProviderType, OAuthError } from '@/types/auth-service'

// ============================================================================
// Provider Configuration
// ============================================================================

interface ProviderConfig {
  name: string
  displayName: string
  icon: React.ComponentType<{ className?: string }>
  brandColor: string
  textColor: string
  hoverColor: string
  focusColor: string
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const AppleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const FacebookIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const GitHubIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)

const MicrosoftIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
  </svg>
)

const PROVIDER_CONFIGS: Record<OAuthProviderType, ProviderConfig> = {
  google: {
    name: 'google',
    displayName: 'Google',
    icon: GoogleIcon,
    brandColor: 'bg-white border-gray-300 text-gray-700',
    textColor: 'text-gray-700',
    hoverColor: 'hover:bg-gray-50',
    focusColor: 'focus:ring-blue-500'
  },
  apple: {
    name: 'apple',
    displayName: 'Apple',
    icon: AppleIcon,
    brandColor: 'bg-black text-white',
    textColor: 'text-white',
    hoverColor: 'hover:bg-gray-800',
    focusColor: 'focus:ring-gray-500'
  },
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    icon: FacebookIcon,
    brandColor: 'bg-blue-600 text-white',
    textColor: 'text-white',
    hoverColor: 'hover:bg-blue-700',
    focusColor: 'focus:ring-blue-500'
  },
  github: {
    name: 'github',
    displayName: 'GitHub',
    icon: GitHubIcon,
    brandColor: 'bg-gray-900 text-white',
    textColor: 'text-white',
    hoverColor: 'hover:bg-gray-800',
    focusColor: 'focus:ring-gray-500'
  },
  microsoft: {
    name: 'microsoft',
    displayName: 'Microsoft',
    icon: MicrosoftIcon,
    brandColor: 'bg-blue-500 text-white',
    textColor: 'text-white',
    hoverColor: 'hover:bg-blue-600',
    focusColor: 'focus:ring-blue-500'
  }
}

// ============================================================================
// Component Props
// ============================================================================

export interface OAuthButtonProps {
  provider: OAuthProviderType
  mode?: 'signin' | 'signup' | 'link'
  flow?: 'redirect' | 'popup'
  redirectUrl?: string | undefined
  onSuccess?: (result: { user: unknown; isNewUser: boolean }) => void
  onError?: (error: OAuthError) => void
  disabled?: boolean
  loading?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'minimal'
  showIcon?: boolean
  children?: React.ReactNode
}

// ============================================================================
// OAuth Button Component
// ============================================================================

export const OAuthButton: React.FC<OAuthButtonProps> = ({
  provider,
  mode = 'signin',
  flow = 'redirect',
  redirectUrl,
  onSuccess,
  onError,
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
  variant = 'default',
  showIcon = true,
  children
}) => {
  const { state } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<OAuthError | null>(null)
  
  const config = PROVIDER_CONFIGS[provider]
  const isLoading = loading || isProcessing || state.isOAuthLoading
  const isDisabled = disabled || isLoading
  
  // ============================================================================
  // OAuth Flow Handlers
  // ============================================================================
  
  const handleRedirectFlow = useCallback(async () => {
    try {
      setError(null)
      setIsProcessing(true)
      
      let result
      if (mode === 'link') {
        result = await oauthClient.initiateOAuthForLinking(provider, redirectUrl)
      } else {
        result = await oauthClient.initiateOAuth(provider, redirectUrl)
      }
      
      // Redirect to OAuth provider
      window.location.href = result.authorizationUrl
    } catch (err) {
      const oauthError = err as OAuthError
      setError(oauthError)
      onError?.(oauthError)
      setIsProcessing(false)
    }
  }, [provider, mode, redirectUrl, onError])
  
  const handlePopupFlow = useCallback(async () => {
    try {
      setError(null)
      setIsProcessing(true)
      
      let result
      if (mode === 'link') {
        await oauthClient.linkProviderWithPopup(provider, redirectUrl)
        // For linking, we don't get user data back
        onSuccess?.({ user: null, isNewUser: false })
      } else {
        result = await oauthClient.authenticateWithPopup(provider, redirectUrl)
        onSuccess?.(result)
      }
    } catch (err) {
      const oauthError = err as OAuthError
      setError(oauthError)
      onError?.(oauthError)
    } finally {
      setIsProcessing(false)
    }
  }, [provider, mode, redirectUrl, onSuccess, onError])
  
  const handleClick = useCallback(async () => {
    if (isDisabled) return
    
    try {
      if (flow === 'popup') {
        await handlePopupFlow()
      } else {
        await handleRedirectFlow()
      }
    } catch (err) {
      console.error(`OAuth ${mode} failed for ${provider}:`, err)
    }
  }, [flow, handlePopupFlow, handleRedirectFlow, isDisabled, mode, provider])
  
  // ============================================================================
  // Styling
  // ============================================================================
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-lg'
      default:
        return 'px-4 py-2 text-base'
    }
  }
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return `border-2 bg-transparent ${config.textColor} border-current hover:bg-current hover:text-white`
      case 'minimal':
        return `bg-transparent ${config.textColor} hover:bg-gray-100 border-none`
      default:
        return `${config.brandColor} ${config.hoverColor} border border-transparent`
    }
  }
  
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-md
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.focusColor}
    disabled:opacity-50 disabled:cursor-not-allowed
    ${getSizeClasses()}
    ${getVariantClasses()}
    ${className}
  `.trim().replace(/\s+/g, ' ')
  
  // ============================================================================
  // Content
  // ============================================================================
  
  const getButtonText = () => {
    if (children) return children
    
    const action = mode === 'link' ? 'Link' : mode === 'signup' ? 'Sign up' : 'Sign in'
    return `${action} with ${config.displayName}`
  }
  
  const IconComponent = config.icon
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={baseClasses}
        aria-label={`${mode === 'link' ? 'Link' : 'Sign in with'} ${config.displayName}`}
      >
        {isLoading ? (
          <>
            <svg 
              className="animate-spin -ml-1 mr-3 h-5 w-5" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </>
        ) : (
          <>
            {showIcon && <IconComponent className="mr-3 h-5 w-5" />}
            {getButtonText()}
          </>
        )}
      </button>
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error.message}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// OAuth Button Group Component
// ============================================================================

export interface OAuthButtonGroupProps {
  providers: OAuthProviderType[]
  mode?: 'signin' | 'signup' | 'link'
  flow?: 'redirect' | 'popup'
  redirectUrl?: string | undefined
  onSuccess?: (result: { user: unknown; isNewUser: boolean; provider: OAuthProviderType }) => void
  onError?: (error: OAuthError, provider: OAuthProviderType) => void
  disabled?: boolean
  loading?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'minimal'
  layout?: 'vertical' | 'horizontal' | 'grid'
  showIcons?: boolean
}

export const OAuthButtonGroup: React.FC<OAuthButtonGroupProps> = ({
  providers,
  mode = 'signin',
  flow = 'redirect',
  redirectUrl,
  onSuccess,
  onError,
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
  variant = 'default',
  layout = 'vertical',
  showIcons = true
}) => {
  const getLayoutClasses = () => {
    switch (layout) {
      case 'horizontal':
        return 'flex flex-wrap gap-3'
      case 'grid':
        return 'grid grid-cols-2 gap-3'
      default:
        return 'space-y-3'
    }
  }
  
  const handleSuccess = useCallback((result: { user: unknown; isNewUser: boolean }, provider: OAuthProviderType) => {
    onSuccess?.({ ...result, provider })
  }, [onSuccess])
  
  const handleError = useCallback((error: OAuthError, provider: OAuthProviderType) => {
    onError?.(error, provider)
  }, [onError])
  
  return (
    <div className={`${getLayoutClasses()} ${className}`}>
      {providers.map((provider) => (
        <OAuthButton
          key={provider}
          provider={provider}
          mode={mode}
          flow={flow}
          redirectUrl={redirectUrl || undefined}
          onSuccess={(result) => handleSuccess(result, provider)}
          onError={(error) => handleError(error, provider)}
          disabled={disabled}
          loading={loading}
          size={size}
          variant={variant}
          showIcon={showIcons}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Provider Status Hook
// ============================================================================

export const useOAuthProviderStatus = (provider: OAuthProviderType) => {
  const [status, setStatus] = useState<{
    enabled: boolean
    available: boolean
    linked: boolean
    displayName: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  React.useEffect(() => {
    let isMounted = true
    
    const fetchStatus = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const providerStatus = await oauthClient.getProviderStatus(provider)
        
        if (isMounted) {
          setStatus(providerStatus)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch provider status'))
          setStatus({
            enabled: false,
            available: false,
            linked: false,
            displayName: PROVIDER_CONFIGS[provider].displayName
          })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    fetchStatus()
    
    return () => {
      isMounted = false
    }
  }, [provider])
  
  return { status, loading, error }
}

// ============================================================================
// Exports
// ============================================================================

export default OAuthButton
export { PROVIDER_CONFIGS }