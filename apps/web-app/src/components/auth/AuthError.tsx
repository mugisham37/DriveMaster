'use client'

import { useSearchParams } from 'next/navigation'
import { AuthErrorDisplay } from '@/lib/auth/error-display'
import { AuthErrorHandler } from '@/lib/auth/error-handler'
import type { AuthError as AuthErrorType } from '@/types/auth-service'

export function AuthError() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  if (!errorParam) return null

  // Convert legacy error codes to new AuthError format
  const convertLegacyError = (errorCode: string): AuthErrorType => {
    switch (errorCode) {
      case 'CredentialsSignin':
        return {
          type: 'authentication',
          message: 'Invalid email or password. Please check your credentials and try again.',
          code: 'INVALID_CREDENTIALS',
          recoverable: true
        }
      case 'EmailNotVerified':
        return {
          type: 'authentication',
          message: 'Please verify your email address before signing in.',
          code: 'EMAIL_NOT_VERIFIED',
          recoverable: true
        }
      case 'AccountNotLinked':
      case 'OAuthAccountNotLinked':
        return {
          type: 'oauth',
          message: 'This email is already registered with a different sign-in method.',
          code: 'OAUTH_ERROR',
          recoverable: true
        }
      case 'SessionRequired':
        return {
          type: 'authentication',
          message: 'Please sign in to access this page.',
          code: 'SESSION_EXPIRED',
          recoverable: true
        }
      case 'Callback':
      case 'OAuthCallback':
        return {
          type: 'oauth',
          message: 'There was a problem with the authentication callback.',
          code: 'OAUTH_ERROR',
          recoverable: true
        }
      case 'OAuthCreateAccount':
        return {
          type: 'oauth',
          message: 'Could not create OAuth account.',
          code: 'OAUTH_ERROR',
          recoverable: true
        }
      case 'EmailCreateAccount':
        return {
          type: 'validation',
          message: 'Could not create account with this email.',
          recoverable: true
        }
      case 'Configuration':
        return {
          type: 'server',
          message: 'There is a problem with the server configuration.',
          code: 'INTERNAL_ERROR',
          recoverable: false
        }
      case 'AccessDenied':
        return {
          type: 'authorization',
          message: 'Access denied. You do not have permission to sign in.',
          code: 'INSUFFICIENT_PERMISSIONS',
          recoverable: false
        }
      case 'Verification':
        return {
          type: 'authentication',
          message: 'The verification token has expired or has already been used.',
          code: 'TOKEN_EXPIRED',
          recoverable: true
        }
      case 'mentor-required':
        return {
          type: 'authorization',
          message: 'This feature is only available to mentors.',
          code: 'MENTOR_REQUIRED',
          recoverable: false
        }
      case 'insider-required':
        return {
          type: 'authorization',
          message: 'This feature is only available to insiders.',
          code: 'INSIDER_REQUIRED',
          recoverable: false
        }
      default:
        return {
          type: 'server',
          message: 'An unexpected error occurred during authentication.',
          recoverable: true
        }
    }
  }

  const authError = convertLegacyError(errorParam)

  const handleRetry = () => {
    // Remove error from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    window.history.replaceState({}, '', url.toString())
  }

  const handleDismiss = () => {
    // Remove error from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <AuthErrorDisplay
      error={authError}
      context="authentication"
      onRetry={authError.recoverable ? handleRetry : undefined}
      onDismiss={handleDismiss}
      className="mb-4"
    />
  )
}