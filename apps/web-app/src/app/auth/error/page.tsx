import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication Error - Exercism',
  description: 'An error occurred during authentication',
}

interface AuthErrorPageProps {
  searchParams: { error?: string }
}

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const error = searchParams.error

  const getErrorMessage = (error?: string) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      case 'OAuthSignin':
        return 'Error in retrieving information from OAuth provider.'
      case 'OAuthCallback':
        return 'Error in handling the response from OAuth provider.'
      case 'OAuthCreateAccount':
        return 'Could not create OAuth account.'
      case 'EmailCreateAccount':
        return 'Could not create account with this email.'
      case 'Callback':
        return 'Error in the OAuth callback handler route.'
      case 'OAuthAccountNotLinked':
        return 'This email is already registered with a different sign-in method.'
      case 'EmailSignin':
        return 'Check your email address.'
      case 'CredentialsSignin':
        return 'Sign in failed. Check the details you provided are correct.'
      case 'SessionRequired':
        return 'Please sign in to access this page.'
      default:
        return 'An unexpected error occurred during authentication.'
    }
  }

  const getErrorTitle = (error?: string) => {
    switch (error) {
      case 'AccessDenied':
        return 'Access Denied'
      case 'Configuration':
        return 'Server Configuration Error'
      case 'Verification':
        return 'Verification Failed'
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
        return 'OAuth Error'
      case 'EmailCreateAccount':
        return 'Account Creation Failed'
      case 'CredentialsSignin':
        return 'Sign In Failed'
      case 'SessionRequired':
        return 'Authentication Required'
      default:
        return 'Authentication Error'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-auto flex justify-center">
            <svg className="h-12 w-12 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {getErrorTitle(error)}
          </h2>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {getErrorMessage(error)}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link 
            href="/auth/signin" 
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try signing in again
          </Link>
          
          <div className="text-sm space-y-2">
            <Link 
              href="/auth/signup" 
              className="font-medium text-indigo-600 hover:text-indigo-500 block"
            >
              Create a new account
            </Link>
            <Link 
              href="/auth/forgot-password" 
              className="font-medium text-indigo-600 hover:text-indigo-500 block"
            >
              Reset your password
            </Link>
            <Link 
              href="/" 
              className="font-medium text-indigo-600 hover:text-indigo-500 block"
            >
              Go to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}