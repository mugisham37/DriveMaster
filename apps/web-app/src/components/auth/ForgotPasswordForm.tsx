'use client'

/**
 * Forgot Password Form Component
 * 
 * Handles password reset requests through auth-service
 * Requirements: 1.4, 7.4
 */

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import { AuthError } from './AuthError'
import type { AuthError as AuthErrorType } from '@/types/auth-service'

// ============================================================================
// Component Props
// ============================================================================

export interface ForgotPasswordFormProps {
  className?: string
  onSuccess?: (email: string) => void
  onError?: (error: AuthErrorType) => void
}

// ============================================================================
// Forgot Password Form Component
// ============================================================================

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  className = '',
  onSuccess,
  onError
}) => {

  
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  
  // ============================================================================
  // Form Validation
  // ============================================================================
  
  const validateEmail = useCallback((email: string): boolean => {
    if (!email.trim()) {
      setEmailError('Email is required')
      return false
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    
    setEmailError(null)
    return true
  }, [])
  
  // ============================================================================
  // Form Handlers
  // ============================================================================
  
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    
    // Clear error when user starts typing
    if (emailError) {
      setEmailError(null)
    }
    if (error) {
      setError(null)
    }
  }, [emailError, error])
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEmail(email)) {
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Call auth service to request password reset
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to send password reset email')
      }
      
      setIsSubmitted(true)
      onSuccess?.(email)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
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
  }, [email, validateEmail, onSuccess, onError])
  
  // ============================================================================
  // Success State
  // ============================================================================
  
  if (isSubmitted) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <div className="mx-auto h-12 w-auto flex justify-center">
            <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ve sent password reset instructions to{' '}
            <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Email sent successfully
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Please check your email and click the link to reset your password. 
                  The link will expire in 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>Didn&apos;t receive the email?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
            </ul>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false)
              setEmail('')
              setError(null)
              setEmailError(null)
            }}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try a different email address
          </button>
        </div>

        <div className="text-center">
          <Link 
            href="/auth/signin" 
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Main Form Render
  // ============================================================================
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto h-12 w-auto flex justify-center">
          <svg className="h-12 w-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Forgot your password?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {/* Error Display */}
      <AuthError />
      
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

      {/* Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={`
              appearance-none relative block w-full px-3 py-2 border 
              ${emailError ? 'border-red-300' : 'border-gray-300'}
              placeholder-gray-500 text-gray-900 rounded-md
              focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            placeholder="Enter your email address"
            value={email}
            onChange={handleEmailChange}
            disabled={isLoading}
          />
          {emailError && (
            <p className="mt-1 text-sm text-red-600">{emailError}</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
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
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </div>
      </form>

      {/* Additional Links */}
      <div className="text-center space-y-2">
        <Link 
          href="/auth/signin" 
          className="font-medium text-indigo-600 hover:text-indigo-500 block text-sm"
        >
          Back to sign in
        </Link>
        <Link 
          href="/auth/signup" 
          className="font-medium text-indigo-600 hover:text-indigo-500 block text-sm"
        >
          Don&apos;t have an account? Sign up
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default ForgotPasswordForm