'use client'

/**
 * Enhanced Sign In Form with OAuth Integration
 * 
 * Replaces NextAuth.js with direct auth-service integration
 * Supports all five OAuth providers with proper branding
 * Requirements: 1.1, 1.2, 1.4, 5.1, 5.2, 7.4
 */

import React, { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { OAuthButtonGroup } from './OAuthButton'
import { AuthError } from './AuthError'
import type { 
  LoginCredentials, 
  OAuthProviderType, 
  OAuthError,
  AuthError as AuthErrorType 
} from '@/types/auth-service'

// ============================================================================
// Component Props
// ============================================================================

export interface SignInFormProps {
  className?: string
  redirectUrl?: string | undefined
  showOAuth?: boolean
  oauthProviders?: OAuthProviderType[]
  oauthFlow?: 'redirect' | 'popup'
  onSuccess?: (result: { user: unknown; isNewUser: boolean }) => void
  onError?: (error: AuthErrorType) => void
}

// ============================================================================
// Sign In Form Component
// ============================================================================

export const SignInForm: React.FC<SignInFormProps> = ({
  className = '',
  redirectUrl,
  showOAuth = true,
  oauthProviders = ['google', 'github', 'apple', 'facebook', 'microsoft'],
  oauthFlow = 'redirect',
  onSuccess,
  onError
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, state, clearError } = useAuth()
  
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  })
  const [formErrors, setFormErrors] = useState<Partial<LoginCredentials>>({})
  const [showPassword, setShowPassword] = useState(false)
  
  const callbackUrl = redirectUrl || searchParams.get('callbackUrl') || '/dashboard'
  const urlError = searchParams.get('error')
  
  // ============================================================================
  // Form Validation
  // ============================================================================
  
  const validateForm = useCallback((): boolean => {
    const errors: Partial<LoginCredentials> = {}
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])
  
  // ============================================================================
  // Form Handlers
  // ============================================================================
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear field error when user starts typing
    if (formErrors[name as keyof LoginCredentials]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }, [formErrors])
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    clearError('loginError')
    
    try {
      await login(formData)
      
      // Success - redirect or call success callback
      if (onSuccess) {
        onSuccess({ user: state.user as unknown, isNewUser: false })
      } else {
        router.push(callbackUrl)
      }
    } catch (error) {
      const authError = error as AuthErrorType
      onError?.(authError)
    }
  }, [formData, validateForm, clearError, login, onSuccess, state.user, router, callbackUrl, onError])
  
  // ============================================================================
  // OAuth Handlers
  // ============================================================================
  
  const handleOAuthSuccess = useCallback((result: { user: unknown; isNewUser: boolean; provider: OAuthProviderType }) => {
    if (onSuccess) {
      onSuccess(result)
    } else {
      router.push(callbackUrl)
    }
  }, [onSuccess, router, callbackUrl])
  
  const handleOAuthError = useCallback((error: OAuthError, provider: OAuthProviderType) => {
    console.error(`OAuth ${provider} error:`, error)
    onError?.(error)
  }, [onError])
  
  // ============================================================================
  // Render Helpers
  // ============================================================================
  
  const renderFormField = (
    name: keyof LoginCredentials,
    type: string,
    placeholder: string,
    autoComplete: string,
    required: boolean = true
  ) => (
    <div>
      <label htmlFor={name} className="sr-only">
        {placeholder}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          autoComplete={autoComplete}
          required={required}
          className={`
            appearance-none relative block w-full px-3 py-2 border 
            ${formErrors[name] ? 'border-red-300' : 'border-gray-300'}
            placeholder-gray-500 text-gray-900 
            ${name === 'email' ? 'rounded-t-md' : 'rounded-b-md -mt-px'}
            focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          placeholder={placeholder}
          value={formData[name]}
          onChange={handleInputChange}
          disabled={state.isLoginLoading}
        />
        {name === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            <svg 
              className="h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {showPassword ? (
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                />
              ) : (
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              )}
            </svg>
          </button>
        )}
      </div>
      {formErrors[name] && (
        <p className="mt-1 text-sm text-red-600">{formErrors[name]}</p>
      )}
    </div>
  )
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto h-12 w-auto flex justify-center">
          <svg className="h-12 w-12 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link 
            href="/auth/signup" 
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            create a new account
          </Link>
        </p>
      </div>

      {/* Error Display */}
      <AuthError />
      
      {urlError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{decodeURIComponent(urlError)}</p>
            </div>
          </div>
        </div>
      )}

      {state.loginError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{state.loginError.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* OAuth Buttons */}
      {showOAuth && oauthProviders.length > 0 && (
        <div className="space-y-4">
          <OAuthButtonGroup
            providers={oauthProviders}
            mode="signin"
            flow={oauthFlow}
            redirectUrl={callbackUrl}
            onSuccess={handleOAuthSuccess}
            onError={handleOAuthError}
            disabled={state.isLoginLoading}
            size="md"
            variant="default"
            layout="vertical"
          />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>
        </div>
      )}

      {/* Email/Password Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-md shadow-sm -space-y-px">
          {renderFormField('email', 'email', 'Email address', 'email')}
          {renderFormField('password', showPassword ? 'text' : 'password', 'Password', 'current-password')}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link 
              href="/auth/forgot-password" 
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={state.isLoginLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isLoginLoading ? (
              <>
                <svg 
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
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
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>

      {/* Additional Links */}
      <div className="text-center space-y-2">
        <Link 
          href="/auth/confirm-email" 
          className="font-medium text-indigo-600 hover:text-indigo-500 block text-sm"
        >
          Didn&apos;t receive confirmation email?
        </Link>
        <Link 
          href="/auth/unlock-account" 
          className="font-medium text-indigo-600 hover:text-indigo-500 block text-sm"
        >
          Didn&apos;t receive unlock instructions?
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default SignInForm